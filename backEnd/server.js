const express = require("express");
const cors = require("cors");
const path = require('path');
const cookiesParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { connectStorageEmulator } = require("firebase/storage");
const fs = require('fs');
const { Poppler } = require('node-poppler');
const poppler = new Poppler();
const app = express();
const axios = require('axios');
const bcrypt = require('bcrypt');
const { generateThumbnail } = require('pdf-thumbnail');
const { Blob } = require('buffer');
const multer = require('multer');
const mongoose = require("mongoose");
require("dotenv").config();

const nextId = require("./models/nextId");
const User = require("./models/User");
const Question = require("./models/Question");
const Vote = require("./models/Vote");
const Comment = require("./models/Comment");
const CommentVote = require("./models/CommentVote");
const Note = require("./models/Note");
const NoteVote = require("./models/NoteVote");
const Tag = require("./models/Tag");
const QuestionTag = require("./models/QuestionTag");
const MarkedQuestion = require("./models/MarkedQuestion");
const MarkedNote = require("./models/MarkedNote");

let mongoLastError = null;
mongoose.connection.on("connected", () => {
  mongoLastError = null;
  console.log("MongoDB connected");
});
mongoose.connection.on("error", (err) => {
  mongoLastError = err;
  console.error("MongoDB connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

async function connectMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("MONGO_URI is not set; MongoDB will not connect.");
    return;
  }
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "8000", 10),
      connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || "8000", 10),
    });
  } catch (err) {
    mongoLastError = err;
    console.error("Failed to connect to MongoDB:", err);
  }
}

connectMongo();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || `${25 * 1024 * 1024}`, 10), // 25 MiB default
  },
});
const FormData = require('form-data'); // If using node-fetch or axios, still use form-data

const PORT = parseInt(process.env.PORT || "8081", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const PYTHON_BASE_URL = (process.env.PYTHON_BASE_URL || "http://localhost:8082").replace(/\/+$/, "");
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser clients
  if (CORS_ORIGINS.includes("*")) return true;
  if (CORS_ORIGINS.includes(origin)) return true;

  // Allow Vercel preview/prod frontends by default (common deployment for this repo).
  // If you need stricter control, set CORS_ORIGINS explicitly in your environment.
  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) return true;
  } catch {
    // ignore invalid Origin header
  }
  return false;
}

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-insecure-change-me") {
  console.warn("JWT_SECRET is not set; set it in production.");
}

app.set("trust proxy", 1);

app.get('/pdf-thumbnail', async (req, res) => {
  try {
    const pdfUrl = req.query.url;
    if (!pdfUrl) return res.status(400).json({ error: "Missing url" });

    const parsed = new URL(pdfUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid url protocol" });
    }

    const thumbnail = await generateThumbnail(pdfUrl);
    res.type('image/jpeg').send(thumbnail);
  } catch (e) {
    res.status(500).json({ error: "Failed to generate thumbnail" });
  }
});


app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin) and allowlisted browser origins.
    if (isAllowedOrigin(origin)) return callback(null, true);
    // Don't throw (which becomes a 500/HTML error). Return a clean 403 instead.
    return callback(Object.assign(new Error("Not allowed by CORS"), { statusCode: 403 }));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use(cookiesParser());

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // In production, the frontend may be hosted on a different origin (e.g. Vercel) than the API (e.g. Render).
    // SameSite=None is required for cross-site XHR with credentials.
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };
}

app.get("/healthz", async (req, res) => {
  try {
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ status: "error" });
  }
});

app.get("/readyz", async (req, res) => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }
    if (mongoose.connection.readyState !== 1) {
      const detail =
        process.env.NODE_ENV === "production"
          ? ""
          : (mongoLastError?.message ? ` (${mongoLastError.message})` : "");
      throw new Error(`Database not connected${detail}`);
    }
    await axios.get(`${PYTHON_BASE_URL}/healthz`, { timeout: 3000 });
    res.json({ status: "ready" });
  } catch (e) {
    res.status(503).json({
      status: "not_ready",
      ...(process.env.NODE_ENV === "production" ? {} : { error: e?.message || "not_ready" }),
    });
  }
});

//idint = 5;
app.post("/signup", async (req, res) => {
  const saltRounds = 10;

  try {
    if (!process.env.MONGO_URI) {
      return res.status(503).json({ Message: "Server not configured (MONGO_URI missing)" });
    }
    if (mongoose.connection.readyState !== 1) {
      const detail =
        process.env.NODE_ENV === "production"
          ? ""
          : (mongoLastError?.message ? `: ${mongoLastError.message}` : "");
      return res.status(503).json({ Message: `Database not connected${detail}` });
    }

    if (await checkPrevRecord(req)) {
      // console.log("LA")
      return res.json({ Message: "Already Registered" });
    } else {
      console.log("AL");
      const hashedPassword = await bcrypt.hash(req.body.password.toString(), 9);

       try {
         await User.create({
           id: await nextId("users"),
           name: req.body.name,
           email: req.body.email,
           password: hashedPassword,
           token: null,
         });
         return res.json({ Status: "Success" });
       } catch (err) {
         if (err && err.code === 11000) {
           return res
             .status(409)
             .json({ Message: "Username or Email already exists" });
         }
         console.error(err);
         return res.status(500).json({
           Message:
             process.env.NODE_ENV === "production"
               ? "Server Error"
               : `Server Error: ${err?.message || "unknown error"}`,
         });
       }
     }
   } catch (err) {
     console.error(err);
     return res.status(500).json({
       Message:
         process.env.NODE_ENV === "production"
           ? "Server Error"
           : `Server Error: ${err?.message || "unknown error"}`,
     });
   }
});

async function checkPrevRecord(req) {
  console.log("data");
  const existing = await User.findOne({ email: req.body.email }).select({ id: 1 });
  return !!existing;
}

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  //console.log(req)

  if (!token) {
    return res.json({ Message: "We need token Provoide it..." });
  } else {
    jwt.verify(token, JWT_SECRET, (err, decode) => {
      if (err) {
        return res.json({ Message: "Authentication error" });
      } else {
        req.name = decode.name;

        next();
      }
    });
  }
};
app.get("/", verifyUser, async (req, res) => {
  try {
    return res.json({ Status: "Success", name: req.name });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

// Deployment-friendly auth check endpoint (avoids conflicting with SPA "/" route on the frontend host).
app.get("/auth", verifyUser, async (req, res) => {
  try {
    return res.json({ Status: "Success", name: req.name });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

async function updateToken(email, token) {
  await User.updateOne({ email }, { $set: { token } });
}

// app.post("/login", (req, res) => {
//   const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
//   const values = [req.body.email, req.body.password];
//   db.query(sql, [req.body.email, req.body.password], (err, data) => {
//     if (err) {
//       console.log(err + "H");
//       return res.json("Error");
//     }
//     if (data.length > 0) {
//       // console.log("Done");
//       // return res.json("Login Done!");
//       const name = data[0].name;
//       const token = jwt.sign({ name }, "secret-key", { expiresIn: "1d" });
//       res.cookie("token", token);

//       updateToken(values[0], token);

//       //const sql2 = "UPDATE users SET token=? where email=?";

//       // const otherValues=[
//       //     token,
//       //     values[0]
//       // ];
//       // console.log(otherValues)
//       // db.query(sql2, [token, values[0]], (err, data) =>{
//       //     //console.log(values);
//       //     if(err){
//       //         console.log(err + "H");
//       //         return res.json("Error");
//       //     }
//       //     console.log(data + "H");
//       //     return res.json(data);
//       // });
//       return res.json({ Status: "Success" });
//     } else {
//       console.log(data);
//       return res.json({ Message: "No Record... Signup!" });
//     }
//   });
// });
app.post("/login", async (req, res) => {
  const values = [req.body.email];
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.log("", []);
      return res.json({ Message: "No Record... Signup!" });
    }

    const validPassword = await bcrypt.compare(
      req.body.password.toString(),
      user.password
    );

    if (validPassword) {
      console.log("YEeY validpass");
      const token = jwt.sign({ name: user.name }, JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, cookieOptions());
      await updateToken(values[0], token);
      return res.json({ Status: "Success" });
    } else {
      console.log(
        "NO>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      );
      return res.json({ Message: "Invalid email or password" });
    }
  } catch (err) {
    console.log(err + "H");
    return res.json("Error");
  }
});

async function checkPass(req, res, values) {
  try {
    const user = await User.findOne({ password: req.body.password });
    if (user) {
      const token = jwt.sign({ name: user.name }, JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, cookieOptions());
      await updateToken(values[0], token);
      return res.json({ Status: "Success" });
    } else {
      console.log([]);
      return res.json({ Message: "Wrong Password!" });
    }
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
}

app.get("/logout", async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions());
    return res.json({ Status: "Success" });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

async function get_author_id(token) {
  const user = await User.findOne({ token }).select({ id: 1 });
  if (!user) {
    throw new Error("No user found for the provided token");
  }
  return user.id;
}

// app.post("/question", async (req, res) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.json({ Message: "We need token Provoide it..." });
//   }

//   try {
//     const authorId = await get_author_id(token);

//     const sql =
//       "INSERT INTO questions(title, content, author_id, image_url) VALUES(?)";
//     const values = [req.body.title, req.body.question, authorId, req.body.url];

//     db.query(sql, [values], (err, data) => {
//       if (err) {
//         console.error(err);
//         return res.json("Error");
//       }
//       console.log(data);
//       return res.json(data);
//     });
//   } catch (error) {
//     console.error(error);
//     return res.json("Error");
//   }
// });

// Adding tags  
app.post("/question", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token. Please provide it." });
  }

  try {
    const authorId = await get_author_id(token);

    let question;
    try {
      question = await Question.create({
        id: await nextId("questions"),
        title: req.body.title,
        content: req.body.question,
        author_id: authorId,
        image_url: req.body.url,
      });
    } catch (err) {
      console.error(err);
      return res.json("Error inserting question");
    }

    const questionId = question.id;

    if (!req.body.tags || req.body.tags.length === 0) {
      return res.json({ success: true, questionId });
    }

    const tags = req.body.tags;
    try {
      for (const tagName of tags) {
        const existing = await Tag.findOne({ name: tagName }).select({ id: 1 });
        if (!existing) {
          try {
            await Tag.create({ id: await nextId("tags"), name: tagName });
          } catch (err) {
            if (!(err && err.code === 11000)) {
              throw err;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      return res.json("Error inserting tags");
    }

    let tagDocs;
    try {
      tagDocs = await Tag.find({ name: { $in: tags } }).select({ id: 1 });
    } catch (err) {
      console.error(err);
      return res.json("Error retrieving tag IDs");
    }

    try {
      const questionTags = [];
      for (const tagDoc of tagDocs) {
        questionTags.push({
          id: await nextId("question_tags"),
          question_id: questionId,
          tag_id: tagDoc.id,
        });
      }
      if (questionTags.length > 0) {
        await QuestionTag.insertMany(questionTags);
      }
      return res.json({ success: true, questionId });
    } catch (err) {
      console.error(err);
      return res.json("Error linking tags to question");
    }
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});



// app.post('/question', (req, res) =>{
//     const token = req.cookies.token;
//     // console.log(token)
//     if(!token){
//         console.log("login!");
//         return res.json({Message: "We need token Provoide it..."})
//     }else{
//         the_id=-1;
//         get_author_id(token, the_id);
//     }
//     console.log(the_id)
//     const sql = "INSERT INTO questions(title, content, author_id) VALUES(?)";
//         const values =[
//             req.body.title,
//             req.body.content,
//             the_id
//         ]
//         db.query(sql, [values], (err, data) =>{
//             //console.log(values);
//             if(err){
//                 console.log(err + "H");
//                 return res.json("Error");
//             }
//             console.log(data + "H");
//             return res.json(data);
//         })
// })

app.get("/allquestions", async (req, res) => {
  try {
    const data = await Question.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

async function updateVote(req, newValue, existingVoteid, existingvotevalue) {
  const updateResult = await Vote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await updateRating(req, existingvotevalue, newValue);
  console.log(updateResult);
  return updateResult;
}

async function addVote(req, user_id, target_id, vote_type, is_comment) {
  const voteDoc = {
    id: await nextId("votes"),
    user_id,
    value: vote_type,
    question_id: is_comment ? null : target_id,
    comment_id: is_comment ? target_id : null,
  };
  const insertResult = await Vote.create(voteDoc);
  await addRating(req);
  console.log(insertResult);
  return insertResult;
}
async function addRating(req) {
  // add rating
  const insertResult = await Question.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  console.log(insertResult);
  return insertResult;
}

async function updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Question.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  console.log(insertResult);
  return insertResult;
}

app.post("/vote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const filter = { user_id };
    if (isComment) {
      filter.comment_id = req.body.target_id;
    } else {
      filter.question_id = req.body.target_id;
    }

    const results = await Vote.find(filter);
    console.log("***********" + results);

    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");
      try {
        await updateVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await addVote(req, user_id, req.body.target_id, req.body.vote_type, isComment);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});

app.post("/uservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await Vote.find({
      question_id: req.body.target_id,
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/questionrating", async (req, res) => {
  try {
    const questions = await Question.find({ id: req.body.target_id }).select({
      rating: 1,
    });
    return res.json(questions.map((q) => ({ rating: q.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/comment", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provoide it..." });
  }

  try {
    const authorId = await get_author_id(token);
    await Comment.create({
      id: await nextId("comments"),
      content: req.body.comment_content,
      user_id: authorId,
      question_id: req.body.question_id,
    });
    return res.json({ Status: "Success" });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/allcomments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await Comment.find({ question_id: id });
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.post("/commentrating", async (req, res) => {
  const targetIds = req.body.target_ids;
  try {
    const comments = await Comment.find({ id: { $in: targetIds } }).select({
      rating: 1,
    });
    return res.json(comments.map((c) => ({ rating: c.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/usercommentvote", async (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await CommentVote.find({
      comment_id: { $in: targetIds },
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

async function updatecommVote(req, newValue, existingVoteid, existingVotevalue) {
  const updateResult = await CommentVote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await updatecommRating(req, existingVotevalue, newValue);
  console.log(updateResult);
  return updateResult;
}

async function addcommVote(req, user_id, target_id, vote_type, is_comment) {
  const insertResult = await CommentVote.create({
    id: await nextId("comment_votes"),
    user_id,
    comment_id: target_id,
    value: vote_type,
  });
  await addcommRating(req);
  console.log(insertResult);
  return insertResult;
}
async function addcommRating(req) {
  // add rating
  const insertResult = await Comment.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  console.log(insertResult);
  return insertResult;
}

async function updatecommRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Comment.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  console.log(insertResult);
  return insertResult;
}

app.post("/commentvote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const results = await CommentVote.find({
      user_id,
      comment_id: req.body.target_id,
    });
    console.log("***********" + results);

    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");

      try {
        await updatecommVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await addcommVote(req, user_id, req.body.target_id, req.body.vote_type, isComment);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});

app.get("/allcomments", async (req, res) => {
  try {
    const data = await Comment.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/userInfo", async (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const data = await User.find({ token }).select({
      id: 1,
      name: 1,
      email: 1,
      password: 1,
      token: 1,
    });
    return res.json(data);
  } catch (err) {
    console.log(err + "H");
    return res.json("Error");
  }
});



app.get("/allnotes", async (req, res) => {
  console.log("ds");
  try {
    const data = await Note.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});


app.post("/noteupload", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication token not provided." });
  }

  try {
    const authorId = await get_author_id(token);
    try {
      const result = await Note.create({
        id: await nextId("notes"),
        course_name: req.body.course_name,
        semester: req.body.semester,
        prof_name: req.body.prof_name,
        course_description: req.body.course_description,
        author_id: authorId,
        votes: 0,
        pdf: req.body.pdf_url,
        file_name: req.body.file_name,
        file_size: req.body.file_size,
      });
      console.log("Note inserted successfully:", result);
      return res.status(200).json({ message: "Note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting note into database." });
    }
  } catch (error) {
    console.error("Error uploading note:", error);
    return res.status(500).json({ message: "Error uploading note." });
  }
});


async function get_user_name(id) {
  const user = await User.findOne({ id }).select({ name: 1 });
  if (!user) {
    throw new Error("No user found for the provided id");
  }
  return user.name;
}


app.post("/username", async (req, res) => {
  console.log("request ", req);
  const id = req.body.id;
  if (id === undefined) {
    return res.json(null);
  }
  try {
    const name = await get_user_name(id);
    console.log("get_user_name ", name);
    return res.json(name);
  } catch (err) {
    console.error(err);
    return res.json(null);
  }
  // try {
  //   const username = get_user_name(id);
  //   console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&s", username)
  //   return res.json(username);
  // } catch (error) {
  //   console.error(error);
  //   return res.json("Error");
  // }
});


// app.get('/pdf-preview/:filename', async (req, res) => {
//   const pdfPath = path.join(__dirname, 'pdfs', req.params.filename); // Adjust the path as necessary

//   if (!fs.existsSync(pdfPath)) {
//     return res.status(404).send('PDF not found');
//   }

//   const outputPath = path.join(__dirname, 'previews', `${path.basename(req.params.filename, '.pdf')}.png`);

//   if (!fs.existsSync(outputPath)) {
//     try {
//       await poppler.convert(pdfPath, {
//         format: 'png',
//         out_dir: path.join(__dirname, 'previews'),
//         out_prefix: path.basename(req.params.filename, '.pdf'),
//         page: 1
//       });
//     } catch (error) {
//       return res.status(500).send('Error generating preview');
//     }
//   }

//   res.sendFile(outputPath);
// });




async function notes_updateVote(req, newValue, existingVoteid, existingvotevalue) {
  const updateResult = await NoteVote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await notes_updateRating(req, existingvotevalue, newValue);
  return updateResult;
}

async function notes_addVote(req, user_id, target_id, vote_type, is_comment) {
  const insertResult = await NoteVote.create({
    id: await nextId("note_vote"),
    user_id,
    note_id: target_id,
    value: vote_type,
  });
  await notes_addRating(req);
  return insertResult;
}
async function notes_addRating(req) {
  // add rating
  const insertResult = await Note.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  return insertResult;
}

async function notes_updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Note.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  return insertResult;
}


app.post("/noterating", async (req, res) => {
  try {
    const notes = await Note.find({ id: req.body.target_id }).select({ rating: 1 });
    return res.json(notes.map((n) => ({ rating: n.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/noteuservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await NoteVote.find({
      note_id: req.body.target_id,
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/notevote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const results = await NoteVote.find({ user_id, note_id: req.body.target_id });
    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");
      try {
        await notes_updateVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await notes_addVote(req, user_id, req.body.target_id, req.body.vote_type);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});



app.post("/question_marked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedQuestion.create({
        id: await nextId("marked_questions"),
        user_id,
        question_id: req.body.question_id,
      });
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/note_marked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedNote.create({
        id: await nextId("marked_notes"),
        user_id,
        note_id: req.body.note_id,
      });
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});
app.post("/question_unmarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedQuestion.deleteMany({
        user_id,
        question_id: req.body.question_id,
      });
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/note_unmarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedNote.deleteMany({
        user_id,
        note_id: req.body.note_id,
      });
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});
app.post("/ismarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    try {
      const exists = await MarkedQuestion.exists({
        user_id,
        question_id: req.body.question_id,
      });
      const result = [{ row_exists: exists ? 1 : 0 }];
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ result });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/ismarkednote", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    try {
      const exists = await MarkedNote.exists({
        user_id,
        note_id: req.body.note_id,
      });
      const result = [{ row_exists: exists ? 1 : 0 }];
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ result });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});

//tags search
app.get("/alltags", async (req, res) => {
  try {
    const data = await Tag.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});
app.get("/question_tags", async (req, res) => {
  try {
    const data = await QuestionTag.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/questionswithtag", async (req, res) => {
  const tagId = req.query.target_id; // Retrieve tag_id from the query parameters
  
  try {
    const results = await QuestionTag.find({ tag_id: tagId }).select({ question_id: 1 });
    return res.json(results.map((r) => ({ question_id: r.question_id })));
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/questionswithuserid", async (req, res) => {
  const tagId = req.query.user_id; // Retrieve tag_id from the query parameters
  
  try {
    const results = await QuestionTag.find({ author_id: tagId }).select({ question_id: 1 });
    return res.json(results.map((r) => ({ question_id: r.question_id })));
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});


app.get("/questionwithIDs", async (req, res) => {
  let questionIds = req.query.ids; // here there will be an array of question IDs

  if (!questionIds || questionIds.length === 0) {
    return res.status(400).json({ error: "No question IDs provided" });
  }

  if (typeof questionIds === "string") {
    questionIds = questionIds.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(questionIds)) {
    questionIds = [questionIds];
  }

  try {
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/top-questions", async (req, res) => {
  try {
    const results = await Question.find({}).sort({ rating: -1 }).limit(10);
    return res.json(results);
  } catch (err) {
    console.error("Error fetching top questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/top-notes", async (req, res) => {
  try {
    const results = await Note.find({}).sort({ rating: -1 }).limit(6);
    return res.json(results);
  } catch (err) {
    console.error("Error fetching top questions:", err);
    return res.status(500).send("Server error");
  }
});


// Define the route to fetch questions by user_id
app.get('/api/questions/user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const results = await Question.find({ author_id: userId });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});
app.get('/api/notes/user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const results = await Note.find({ author_id: userId });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});


app.get('/api/questions/liked/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const votes = await Vote.find({ user_id: userId, value: 1 }).select({
      question_id: 1,
    });
    const questionIds = votes.map((v) => v.question_id).filter((id) => id != null);
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
});
app.get('/api/questions/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {
    if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);
  try {
    const marked = await MarkedQuestion.find({ user_id }).select({ question_id: 1 });
    const questionIds = marked.map((m) => m.question_id).filter((id) => id != null);
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
  }
});
app.get('/api/notes/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {
    if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);
  try {
    const marked = await MarkedNote.find({ user_id }).select({ note_id: 1 });
    const noteIds = marked.map((m) => m.note_id).filter((id) => id != null);
    const results = await Note.find({ id: { $in: noteIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
  }
});
app.get('/api/notes/liked/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const votes = await NoteVote.find({ user_id: userId, value: 1 }).select({
      note_id: 1,
    });
    const noteIds = votes.map((v) => v.note_id).filter((id) => id != null);
    const results = await Note.find({ id: { $in: noteIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
});

app.get('/api/tags/:questionId', async (req, res) => {
  try {
      const questionId = req.params.questionId;
      const links = await QuestionTag.find({ question_id: questionId }).select({
        tag_id: 1,
      });
      const tagIds = links.map((l) => l.tag_id).filter((id) => id != null);
      const tags = await Tag.find({ id: { $in: tagIds } }).select({ id: 1, name: 1 });
      const results = tags.map((t) => ({ tag_id: t.id, tag_name: t.name }));
      return res.json(results);  // only results are sent as JSON
  } catch (error) {
      return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/answers/count/:questionId', async (req, res) => {
  const questionId = req.params.questionId;
  try {
      const count = await Comment.countDocuments({ question_id: questionId });
      return res.json({ answer_count: count }); // Returning the count result
  } catch (error) {
      return res.status(500).json({ error: 'Server error' });
  }
});




app.post('/processpdf', upload.array('pdfFiles'), async (req, res) => {
  console.log("HI PDF");
  try {
      const formData = new FormData();
      console.log(req.files); // Log the uploaded files

      // Use Buffer instead of Blob
      req.files.forEach(file => {
          formData.append('pdfFiles', file.buffer, { filename: file.originalname, contentType: file.mimetype });
      });

      // Send the form data to another server
      const response = await axios.post(`${PYTHON_BASE_URL}/process_pdf`, formData, {
          headers: formData.getHeaders()
      });

      console.log(response.data);
      res.json(response.data);
  } catch (error) {
      console.error("PDF Error", error);
      res.status(500).json({ error: error.message });
  }
});

app.post('/ask_question', async (req, res) => {
  try {
      const { question } = req.body;
      const response = await axios.post(`${PYTHON_BASE_URL}/ask_question`, { question });

      res.json(response.data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});



// Ensure middleware errors (e.g. CORS) return JSON instead of an HTML 500 page.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err?.statusCode || err?.status || 500;
  const message =
    status === 403 && err?.message === "Not allowed by CORS"
      ? "Origin not allowed"
      : process.env.NODE_ENV === "production"
        ? "Server Error"
        : (err?.message || "Server Error");
  return res.status(status).json({ Message: message });
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

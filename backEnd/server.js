const express = require("express");
const mysql = require("mysql2");
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
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI)
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
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use(cookiesParser());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "signup",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
  queueLimit: 0,
});

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
  };
}

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/readyz", async (req, res) => {
  try {
    await db.promise().query("SELECT 1");
    await axios.get(`${PYTHON_BASE_URL}/healthz`, { timeout: 3000 });
    res.json({ status: "ready" });
  } catch (e) {
    res.status(503).json({ status: "not_ready" });
  }
});

//idint = 5;
app.post("/signup", async (req, res) => {
  const saltRounds = 10;
  
  if(await checkPrevRecord(req)){
    // console.log("LA")
    return res.json({ Message: "Already Registered" });
  }else{
    console.log("AL")
    const hashedPassword = await bcrypt.hash(req.body.password.toString(), 9);

    const sql = "INSERT INTO users(name, email, password) VALUES(?)";
    const values = [req.body.name, req.body.email, hashedPassword];
    db.query(sql, [values], (err, data) => {
      //console.log(values);
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Handle duplicate entry error
          return res.status(409).json({ Message: "Username or Email already exists" });
        } else {
          // Handle other types of errors
          console.error(err);
          return res.status(500).json({ Message: "Server Error" });
        }
      }
      console.log(data + "H");
      return res.json({ Status: "Success" });
    }); 
  }
});
function checkPrevRecord(req) {
  return new Promise((resolve, reject) => {
    console.log("data")
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [req.body.email],
      (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        if (data.length > 0) {
          resolve(true);
        }else {
          console.log(data);
          resolve(false);

        }
      }
    );
  });
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
app.get("/", verifyUser, (req, res) => {
  return res.json({ Status: "Success", name: req.name });
});

function updateToken(email, token) {
  const sql = "UPDATE users SET token=? WHERE email=?";
  const values = [token, email];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
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
app.post("/login", (req, res) => {
  const sql = "SELECT * FROM users WHERE email = ?";
  const values = [req.body.email];
  db.query(sql, [req.body.email], async (err, data) => {
    if (err) {
      console.log(err + "H");
      return res.json("Error");
    }
    if (data.length > 0) {
      // console.log("Done");
      // return res.json("Login Done!");
       
      // await checkPass(req, res, values);
      // const validPassword = await bcrypt.compare(req.body.password, data[0].password);
      // let password = String(req.body.password); // Convert to string if necessary
      // let tp = password.toString()
      // console.log(req.body.password)
    const validPassword = await bcrypt.compare(req.body.password.toString(), data[0].password);
    
    if (validPassword) {
        console.log("YEeY validpass")
        const token = jwt.sign({ name: data[0].name }, JWT_SECRET, { expiresIn: "1d" });
        res.cookie("token", token, cookieOptions());
        updateToken(values[0], token);
        return res.json({ Status: "Success" });
      } else {
        console.log("NO>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
        return res.json({ Message: "Invalid email or password" });
      }
    } else {
      console.log("", data);
      return res.json({ Message: "No Record... Signup!" });
    }
  });
});
function checkPass(req, res, values) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM users WHERE password = ?",
      [req.body.password],
      (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        if (data.length > 0) {
          const name = data[0].name;
          const token = jwt.sign({ name }, JWT_SECRET, { expiresIn: "1d" });
          res.cookie("token", token, cookieOptions());

          updateToken(values[0], token);

          return res.json({ Status: "Success" });
        }else {
          console.log(data);
          return res.json({ Message: "Wrong Password!"});
        }
      }
    );
  });
}

app.get("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions());
  return res.json({ Status: "Success" });
});

function get_author_id(token) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id FROM users WHERE token = ?";
    const values = [token];

    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length === 0) {
        reject(new Error("No user found for the provided token"));
      } else {
        resolve(results[0].id);
      }
    });
  });
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

    // Insert the question into the 'questions' table
    const sqlInsertQuestion =
      "INSERT INTO questions (title, content, author_id, image_url) VALUES (?, ?, ?, ?)";
    const questionValues = [
      req.body.title,
      req.body.question,
      authorId,
      req.body.url,
    ];

    db.query(sqlInsertQuestion, questionValues, (err, result) => {
      if (err) {
        console.error(err);
        return res.json("Error inserting question");
      }

      const questionId = result.insertId; // Retrieve the inserted question ID

      // If there are no tags, return success response
      if (!req.body.tags || req.body.tags.length === 0) {
        return res.json({ success: true, questionId });
      }

      // Insert tags into 'tags' table if they don't already exist
      const tags = req.body.tags; // Assuming tags are sent as an array in the request body
      const tagPlaceholders = tags.map(() => "(?)").join(",");
      const sqlInsertTags = `INSERT IGNORE INTO tags (name) VALUES ${tagPlaceholders}`;

      db.query(sqlInsertTags, tags, (err, tagResult) => {
        if (err) {
          console.error(err);
          return res.json("Error inserting tags");
        }

        // Retrieve tag IDs for the inserted or existing tags
        const sqlSelectTags = `SELECT id FROM tags WHERE name IN (${tagPlaceholders})`;
        db.query(sqlSelectTags, tags, (err, tagIds) => {
          if (err) {
            console.error(err);
            return res.json("Error retrieving tag IDs");
          }

          // Insert into 'question_tags' junction table
          const questionTagValues = tagIds.map((tag) => [
            questionId,
            tag.id,
          ]);
          const sqlInsertQuestionTags =
            "INSERT INTO question_tags (question_id, tag_id) VALUES ?";
          db.query(
            sqlInsertQuestionTags,
            [questionTagValues],
            (err, finalResult) => {
              if (err) {
                console.error(err);
                return res.json("Error linking tags to question");
              }

              return res.json({ success: true, questionId });
            }
          );
        });
      });
    });
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

app.get("/allquestions", (req, res) => {
  try {
    db.query("SELECT * FROM questions", (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(data);
    });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

function updateVote(req, newValue, existingVoteid, existingvotevalue) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE votes SET value = ? WHERE id = ?",
      [newValue, existingVoteid],
      async (err, updateResult) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        await updateRating(req, existingvotevalue, newValue);
        console.log(updateResult);
        resolve(updateResult);
      }
    );
  });
}

async function addVote(req, user_id, target_id, vote_type, is_comment) {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO votes (user_id, " +
        (is_comment ? "comment_id" : "question_id") +
        ", value) VALUES (?, ?, ?)",
      [user_id, target_id, vote_type],
      async (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }
        await addRating(req);
        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}
function addRating(req) {
  // add rating
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE questions SET rating = rating+? WHERE id = ?",
      [req.body.vote_type, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}

function updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE questions SET rating = rating-?+? WHERE id = ?",
      [existingvalue, newValue, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}

app.post("/vote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  const user_id = await get_author_id(token);
  console.log("---------" + user_id);
  const sql = `SELECT * FROM votes WHERE user_id = ? AND ${
    isComment ? "comment_id" : "question_id"
  } = ?`;
  const values = [user_id, req.body.target_id];
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        console.log(err + "H");
        reject(err);
      } else {
        console.log("***********" + results);
        resolve(results);
      }
    });
  })
    .then(async (results) => {
      if (results.length > 0) {
        const existingVote = results[0];
        const newValue =
          existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
        console.log("U");
        try {
          await updateVote(req, newValue, existingVote.id, results[0].value);

          return res.json(results);
        } catch (updateError) {
          console.error(updateError);
          return res.json("Error updating vote");
        }
      } else {
        console.log("i");
        try {
          await addVote(
            req,
            user_id,
            req.body.target_id,
            req.body.vote_type,
            isComment
          );

          return res.json("done");
        } catch (addError) {
          console.error(addError);
          return res.json("Error adding vote");
        }
      }
    })
    .catch((error) => {
      console.error(error);
      return res.json("Error querying database");
    });
});

app.post("/uservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const user_id = await get_author_id(token);
  db.query(
    "SELECT value FROM votes WHERE question_id = ? AND user_id = ?",
    [req.body.target_id, user_id],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

app.post("/questionrating", (req, res) => {
  db.query(
    "SELECT rating FROM questions WHERE id = ?",
    [req.body.target_id],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

app.post("/comment", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provoide it..." });
  }

  try {
    const authorId = await get_author_id(token);

    const sql = "INSERT INTO comments(content, user_id, question_id) VALUES(?)";
    const values = [req.body.comment_content, authorId, req.body.question_id];

    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      console.log(data);
      return res.json({ Status: "Success" });
    });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/allcomments/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.query(
      "SELECT * FROM comments WHERE question_id = ?",
      [id],
      (err, data) => {
        if (err) {
          console.error(err);
          return res.json("Error");
        }
        // console.log(data);

        return res.json(data);
      }
    );
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.post("/commentrating", (req, res) => {
  const targetIds = req.body.target_ids;
  db.query(
    "SELECT rating FROM comments WHERE id IN ?",
    [targetIds],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

app.post("/usercommentvote", async (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const user_id = await get_author_id(token);
  db.query(
    "SELECT value FROM comment_votes WHERE comment_id IN ? AND user_id = (?)",
    [targetIds, user_id],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

function updatecommVote(req, newValue, existingVoteid, existingVotevalue) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE comment_votes SET value = ? WHERE id = ?",
      [newValue, existingVoteid],
      async (err, updateResult) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        await updatecommRating(req, existingVotevalue, newValue);
        console.log(updateResult);
        resolve(updateResult);
      }
    );
  });
}

function addcommVote(req, user_id, target_id, vote_type, is_comment) {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO comment_votes (user_id, comment_id ,value) VALUES (?, ?, ?)",
      [user_id, target_id, vote_type],
      async (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }
        await addcommRating(req);
        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}
function addcommRating(req) {
  // add rating
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE comments SET rating = rating+? WHERE id = ?",
      [req.body.vote_type, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}

function updatecommRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE comments SET rating = rating-?+? WHERE id = ?",
      [existingvalue, newValue, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}

app.post("/commentvote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  const user_id = await get_author_id(token);
  console.log("---------" + user_id);
  const sql = `SELECT * FROM comment_votes WHERE user_id = ?  AND comment_id = ?`;
  const values = [user_id, req.body.target_id];
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        console.log(err + "H");
        reject(err);
      } else {
        console.log("***********" + results);
        resolve(results);
      }
    });
  })
    .then(async (results) => {
      if (results.length > 0) {
        const existingVote = results[0];
        const newValue =
          existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
        console.log("U");

        try {
          await updatecommVote(
            req,
            newValue,
            existingVote.id,
            results[0].value
          );
          return res.json(results);
        } catch (updateError) {
          console.error(updateError);
          return res.json("Error updating vote");
        }
      } else {
        console.log("i");
        // await addcommRating(req);
        try {
          await addcommVote(
            req,
            user_id,
            req.body.target_id,
            req.body.vote_type,
            isComment
          );
          return res.json("done");
        } catch (addError) {
          console.error(addError);
          return res.json("Error adding vote");
        }
      }
    })
    .catch((error) => {
      console.error(error);
      return res.json("Error querying database");
    });
});

app.get("/allcomments", (req, res) => {
  try {
    db.query("SELECT * FROM comments", (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(data);
    });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/userInfo", (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const sql = "SELECT * FROM users WHERE token = ?";
  db.query(sql, [token], async (err, data) => {
    if (err) {
      console.log(err + "H");
      return res.json("Error");
    }
    
      return res.json(data);
  });
});



app.get("/allnotes", (req, res) => {
  console.log("ds")
  try {
    db.query("SELECT * FROM notes", (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(data);
    });
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

      const sql = "INSERT INTO notes (course_name, semester, prof_name, course_description, author_id, votes, pdf, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
      const values = [
          req.body.course_name,
          req.body.semester,
          req.body.prof_name,
          req.body.course_description,
          authorId,
          0,  
          req.body.pdf_url,
          req.body.file_name,
          req.body.file_size  
      ];

      db.query(sql, values, (err, result) => {
          if (err) {
              console.error('Error inserting note into database:', err);
              return res.status(500).json({ message: "Error inserting note into database." });
          }
          console.log('Note inserted successfully:', result);
          return res.status(200).json({ message: "Note uploaded successfully." });
      });

  } catch (error) {
      console.error('Error uploading note:', error);
      return res.status(500).json({ message: "Error uploading note." });
  }
});


function get_user_name(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT name FROM users WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length === 0) {
        reject(new Error("No user found for the provided id"));
      } else {
        // console.log("get_user_name ", results[0].name);
        resolve(results[0].name);
      }
    });
  });
}


app.post("/username", (req, res) => {
  console.log("request ", req)
  const id= req.body.id;
  if(id === undefined){
    return res.json(null)
  }
  return new Promise((resolve, reject) => {
    const sql = `SELECT name FROM users WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length === 0) {
        reject(new Error("No user found for the provided id"));
      } else {
        console.log("get_user_name ", results[0].name);
        data = results[0].name
        return res.json(data);
      }
    });
  });
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




function notes_updateVote(req, newValue, existingVoteid, existingvotevalue) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE note_vote SET value = ? WHERE id = ?",
      [newValue, existingVoteid],
      async (err, updateResult) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        await notes_updateRating(req, existingvotevalue, newValue);
        // console.log(updateResult);
        resolve(updateResult);
      }
    );
  });
}

async function notes_addVote(req, user_id, target_id, vote_type, is_comment) {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO note_vote (user_id, note_id, value) VALUES (?, ?, ?)",
      [user_id, target_id, vote_type],
      async (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }
        await notes_addRating(req);
        // console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}
function notes_addRating(req) {
  // add rating
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE notes SET rating = rating+? WHERE id = ?",
      [req.body.vote_type, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        // console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}

function notes_updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE notes SET rating = rating-?+? WHERE id = ?",
      [existingvalue, newValue, req.body.target_id],
      (err, insertResult) => {
        if (err) {
          // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
          console.error(err);
          reject(err);
        }

        // console.log(insertResult);
        resolve(insertResult);
      }
    );
  });
}


app.post("/noterating", (req, res) => {
  db.query(
    "SELECT rating FROM notes WHERE id = ?",
    [req.body.target_id],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

app.post("/noteuservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const user_id = await get_author_id(token);
  db.query(
    "SELECT value FROM note_vote WHERE note_id = ? AND user_id = ?",
    [req.body.target_id, user_id],
    (err, getVote) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(getVote);
    }
  );
});

app.post("/notevote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  console.log(req);

  const user_id = await get_author_id(token);
  console.log("---------" + user_id);
  const sql = `SELECT * FROM note_vote WHERE user_id = ? AND note_id = ?`;
  const values = [user_id, req.body.target_id];
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        console.log(err + "H");
        reject(err);
      } else {
        // console.log("***********" + results);
        resolve(results);
      }
    });
  })
    .then(async (results) => {
      if (results.length > 0) {
        const existingVote = results[0];
        const newValue =
          existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
        console.log("U");
        try {
          await notes_updateVote(req, newValue, existingVote.id, results[0].value);

          return res.json(results);
        } catch (updateError) {
          console.error(updateError);
          return res.json("Error updating vote");
        }
      } else {
        console.log("i");
        try {
          await notes_addVote(
            req,
            user_id,
            req.body.target_id,
            req.body.vote_type,
          );

          return res.json("done");
        } catch (addError) {
          console.error(addError);
          return res.json("Error adding vote");
        }
      }
    })
    .catch((error) => {
      console.error(error);
      return res.json("Error querying database");
    });
});



app.post("/question_marked", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try{
    const user_id = await get_author_id(token);
    const sql = `INSERT INTO marked_questions (user_id, question_id) VALUES (?, ?)`;
    db.query(sql, [user_id, req.body.question_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked question into database:', err);
        return res.status(500).json({ message: "Error inserting marked que into database." });
      }
      console.log('marked que inserted successfully:', result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    });
  }catch (error) {
    console.error('Error uploading marked que:', error);
  }
});
app.post("/note_marked", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try{
    const user_id = await get_author_id(token);
    const sql = `INSERT INTO marked_notes (user_id, note_id) VALUES (?, ?)`;
    db.query(sql, [user_id, req.body.note_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked note into database:', err);
        return res.status(500).json({ message: "Error inserting marked note into database." });
      }
      console.log('marked note inserted successfully:', result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    });
  }catch (error) {
    console.error('Error uploading marked note:', error);
  }
});
app.post("/question_unmarked", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try{
    const user_id = await get_author_id(token);
    const sql = `DELETE FROM marked_questions 
WHERE user_id = ? 
  AND question_id = ?;`;
    db.query(sql, [user_id, req.body.question_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked question into database:', err);
        return res.status(500).json({ message: "Error inserting marked que into database." });
      }
      console.log('marked que inserted successfully:', result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    });
  }catch (error) {
    console.error('Error uploading marked que:', error);
  }
});
app.post("/note_unmarked", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try{
    const user_id = await get_author_id(token);
    const sql = `DELETE FROM marked_notes 
WHERE user_id = ? 
  AND note_id = ?;`;
    db.query(sql, [user_id, req.body.note_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked note into database:', err);
        return res.status(500).json({ message: "Error inserting marked note into database." });
      }
      console.log('marked note inserted successfully:', result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    });
  }catch (error) {
    console.error('Error uploading marked note:', error);
  }
});
app.post("/ismarked", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try{
    const user_id = await get_author_id(token);
    const sql = `SELECT EXISTS (
    SELECT 1 
    FROM marked_questions 
    WHERE user_id = ? 
      AND question_id = ?
) AS row_exists;
`;
    db.query(sql, [user_id, req.body.question_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked question into database:', err);
        return res.status(500).json({ message: "Error inserting marked que into database." });
      }
      console.log('marked que inserted successfully:', result);
      return res.status(200).json({ result });
    });
  }catch (error) {
    console.error('Error uploading marked que:', error);
  }
});
app.post("/ismarkednote", async (req, res) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try{
    const user_id = await get_author_id(token);
    const sql = `SELECT EXISTS (
    SELECT 1 
    FROM marked_notes 
    WHERE user_id = ? 
      AND note_id = ?
) AS row_exists;
`;
    db.query(sql, [user_id, req.body.note_id], (err, result) => {
      if (err) {
        console.error('Error inserting marked note into database:', err);
        return res.status(500).json({ message: "Error inserting marked note into database." });
      }
      console.log('marked note inserted successfully:', result);
      return res.status(200).json({ result });
    });
  }catch (error) {
    console.error('Error uploading marked note:', error);
  }
});

//tags search
app.get("/alltags", (req, res) => {
  try {
    db.query("SELECT * FROM tags", (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(data);
    });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});
app.get("/question_tags", (req, res) => {
  try {
    db.query("SELECT * FROM question_tags", (err, data) => {
      if (err) {
        console.error(err);
        return res.json("Error");
      }
      // console.log(data);

      return res.json(data);
    });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/questionswithtag", (req, res) => {
  const tagId = req.query.target_id; // Retrieve tag_id from the query parameters
  
  const sqlQuery = 'SELECT question_id FROM question_tags WHERE tag_id = ?';

  db.query(sqlQuery, [tagId], (err, results) => {
    if (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).send("Server error");
    }
    
    res.json(results);
  });
});

app.get("/questionswithuserid", (req, res) => {
  const tagId = req.query.user_id; // Retrieve tag_id from the query parameters
  
  const sqlQuery = 'SELECT question_id FROM question_tags WHERE author_id = ?';

  db.query(sqlQuery, [tagId], (err, results) => {
    if (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).send("Server error");
    }
    
    res.json(results);
  });
});


app.get("/questionwithIDs", (req, res) => {
  const questionIds = req.query.ids; // here there will be an array of question IDs

  if (!questionIds || questionIds.length === 0) {
    return res.status(400).json({ error: "No question IDs provided" });
  }

  const sqlQuery = `SELECT * FROM questions WHERE id IN (?)`;
  
  db.query(sqlQuery, [questionIds], (err, results) => {
    if (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).send("Server error");
    }
    
    res.json(results);
  });
});

app.get("/top-questions", (req, res) => {
  const sqlQuery = `SELECT * FROM questions ORDER BY rating DESC LIMIT 10`;

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error fetching top questions:", err);
      return res.status(500).send("Server error");
    }
    
    res.json(results);
  });
});

app.get("/top-notes", (req, res) => {
  const sqlQuery = `SELECT * FROM notes ORDER BY rating DESC LIMIT 6`;

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error fetching top questions:", err);
      return res.status(500).send("Server error");
    }
    
    res.json(results);
  });
});


// Define the route to fetch questions by user_id
app.get('/api/questions/user/:userId', (req, res) => {
  const userId = req.params.userId;

  // SQL query to fetch questions by user_id
  db.query('SELECT * FROM questions WHERE author_id = ?', [userId], (error, results) => {
      if (error) {
          console.error('Error fetching questions:', error);
          res.status(500).json({ error: 'Failed to fetch questions' });
      } else {
          res.json(results); // Send the results back as JSON
      }
  });
});
app.get('/api/notes/user/:userId', (req, res) => {
  const userId = req.params.userId;

  // SQL query to fetch questions by user_id
  db.query('SELECT * FROM notes WHERE author_id = ?', [userId], (error, results) => {
      if (error) {
          console.error('Error fetching questions:', error);
          res.status(500).json({ error: 'Failed to fetch questions' });
      } else {
          res.json(results); // Send the results back as JSON
      }
  });
});


app.get('/api/questions/liked/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = `
      SELECT q.*
      FROM questions q
      INNER JOIN votes v ON q.id = v.question_id
      WHERE v.user_id = ? AND v.value = 1
  `;

  db.query(query, [userId], (error, results) => {
      if (error) {
          console.error('Error fetching liked questions:', error);
          res.status(500).json({ error: 'Failed to fetch liked questions' });
      } else {
          res.json(results);
      }
  });
});
app.get('/api/questions/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);

  const query = `
      SELECT q.*
      FROM questions q
      JOIN marked_questions mq ON q.id = mq.question_id
      WHERE mq.user_id = ?
  `;

  db.query(query, [user_id], (error, results) => {
      if (error) {
          console.error('Error fetching liked questions:', error);
          res.status(500).json({ error: 'Failed to fetch liked questions' });
      } else {
          res.json(results);
          // console.log(user_id)
      }
  });}
});
app.get('/api/notes/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);

  const query = `
      SELECT q.*
      FROM notes q
      JOIN marked_notes mq ON q.id = mq.note_id
      WHERE mq.user_id = ?
  `;

  db.query(query, [user_id], (error, results) => {
      if (error) {
          console.error('Error fetching liked questions:', error);
          res.status(500).json({ error: 'Failed to fetch liked questions' });
      } else {
          res.json(results);
          // console.log(user_id)
      }
  });}
});
app.get('/api/notes/liked/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = `
      SELECT n.*
      FROM notes n
      INNER JOIN note_vote v ON n.id = v.note_id
      WHERE v.user_id = ? AND v.value = 1
  `;

  db.query(query, [userId], (error, results) => {
      if (error) {
          console.error('Error fetching liked questions:', error);
          res.status(500).json({ error: 'Failed to fetch liked questions' });
      } else {
          res.json(results);
      }
  });
});

app.get('/api/tags/:questionId', async (req, res) => {
  try {
      const questionId = req.params.questionId;
      const query = `SELECT t.id AS tag_id, t.name AS tag_name FROM tags t JOIN question_tags qt ON t.id = qt.tag_id WHERE qt.question_id = ?`;
      db.query(query, [questionId], (err, results) => {
          if (err) {
              res.status(500).json({ error: 'Database error' });
          } else {
              res.json(results);  // only results are sent as JSON
          }
      });
  } catch (error) {
      res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/answers/count/:questionId', async (req, res) => {
  const questionId = req.params.questionId;
  try {
      const query = `SELECT COUNT(*) AS answer_count FROM comments WHERE question_id = ?`;
      db.query(query, [questionId], (err, results) => {
          if (err) {
              return res.status(500).json({ error: 'Database error' });
          }
          res.json(results[0]);  // Returnin the count result
      });
  } catch (error) {
      res.status(500).json({ error: 'Server error' });
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



app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

import React, { useEffect, useState } from "react";
import classNames from "classnames";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./youComponents/youPage.css";
import { Container } from "reactstrap";
import userImg from '../user.png';
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { safeFormatDistance } from "../utils/date";


const You = ({ isOpen }) => {
  //.....
  axios.defaults.withCredentials = true;
  //.......
  
  const [questions, setQuestions] = useState([]);
  const [likedQuestions, setLikedQuestions] = useState([]);
  const [notes, setNotes] = useState([]);
  // const [username, setUsernames] = useState([])
  const [questionTags, setQuestionTags] = useState({});
  const [answer_count, setAnswer_count] = useState({});

  const fetchTags = async (questionId) => {
    console.log(questionId);
    const response = await fetch(
      `http://localhost:8081/api/tags/${questionId}`
    );
    const data = await response.text(); // Change to text to inspect the raw response
    console.log(data); // This will help you see if the response is HTML or JSON

    const tags = JSON.parse(data); // Convert to JSON if the response is correct
    setQuestionTags((prevState) => ({
      ...prevState,
      [questionId]: tags,
    }));

  };

  const fetchAnswerCount = async (questionId) => {
    try {
        const response = await fetch(`http://localhost:8081/api/answers/count/${questionId}`);
        const { answer_count } = await response.json();
        setAnswer_count((prev) => ({
          ...prev,
          [questionId]: answer_count,
        }))
    } catch (error) {
        console.error('Error fetching answer count:', error);
    }
};
    
  const decodePdfUrl = (pdf_url) => {
    let pdfUrlString = '';
    if (pdf_url && pdf_url.type === 'Buffer') {
      pdfUrlString = new TextDecoder().decode(new Uint8Array(pdf_url.data));
    } else {
      pdfUrlString = pdf_url;
    }
    return pdfUrlString;
  };



  const navigate = useNavigate();

  const handleLogout = () => {
    axios
      .get("http://localhost:8081/logout")
      .then((res) => {
        if (res.data.Status === "Success") {
          window.location.reload(true);
        } else { 
          alert("error");
        }
      })
      .catch((err) => console.log(err));

      navigate("/Home");
  };
  const [user, setUser] = useState({
    name: "",
    email: "",
  });
  useEffect(() => {
    axios
      .get("http://localhost:8081/userInfo")
      .then((res) => {
        setUser(res.data);
      })
      .catch((error) => console.error("Error fetching questions:", error));
    console.log("N");
  }, []);

  useEffect(() => {
    
    const fetchQuestions = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/api/questions/user/${user[0].id}`);
            console.log("hi", response)
            setQuestions(response.data);
            response.data.forEach((q) => {
              fetchTags(q.id);
              fetchAnswerCount(q.id);
    
            })
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    fetchQuestions();
}, [user]);
  useEffect(() => {
    
    const fetchNotes = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/api/notes/user/${user[0].id}`);
            // console.log("hi", response)
            setNotes(response.data);
        } catch (error) {
            console.error('Error fetching Notes:', error);
        }
    };

    fetchNotes();
}, [user]);


useEffect(() => {
  const fetchLikedQuestions = async () => {
      try {
          const response = await axios.get(`http://localhost:8081/api/questions/liked/${user[0].id}`);
          setLikedQuestions(response.data);
      } catch (err) {
        console.log("Hi")
          console.error('Error fetching liked questions:', err);

      } 
  };

  fetchLikedQuestions();
}, [user]);

  console.log(likedQuestions)
  const checkRating =(rating) =>{
    if(rating === null){
      return 0;
    }

    return rating;
  }

  const [choice, setChoice] = useState("Your Questions");
  const handleChoiceChange = (event) => {
    console.log(event.target.getAttribute("value"));
    setChoice(event.target.getAttribute("value"));
  };
  console.log(choice);

  const renderContent = () => {
    switch (choice) {
      case "about":
        return (
          <>
            <div className="containerinyou">
              <div
                className="about"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  color: "#6d7fcc",
                  fontSize: "34px",
                }}
              >
                Your Notes
              </div>
              {/* <button id="edit">Edit</button> */}
            </div>
            <ol className="notelist">
        {notes.map((note) => (
          <li className="note" key={note.id}>
            <Link to={`/note/${note.id}`} state={{ note }}>
              <div className="homenote-card">
                <div className="cardincard">
                <div className="pdfCover"></div>
                  <div className="pdf-preview">
                    {note.pdf ? (
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                          <Viewer fileUrl={decodePdfUrl(note.pdf)} style={{ width: '100%', height: '100%' }} defaultScale={0.421}>
                            <div>Loading PDF...</div>
                          </Viewer>
                        </Worker>
                        // <iframe
                        //   src={`${decodePdfUrl(note.pdf)}#page=0`}
                        //   width="200"
                        //   height="300"
                        //   title="PDF Preview"
                        // />
                        // <iframe
                        //   id="pdf-iframe"
                        //   src={decodePdfUrl(note.pdf)}
                        //   width="200"
                        //   height="300"
                        //   title="PDF Preview"
                        //   onLoad={() => renderFirstPage(decodePdfUrl(note.pdf))}
                        // />
                      ) : (
                        <div>Loading...</div>
                      )}
                  </div>
                  <div className="hideScroll"></div>

                </div>
                  <div className="hideScrollX"></div>
                <div className="noteuserContainer">
                  <div className="noteuser">
                    <div className="noteuserImgContainer">
                      <img src={userImg} className="nuser-image" />
                    </div>
                  </div>
                  <div className="noteInfo">
                    <h5 className="noteHead">{note.course_name}</h5>
                    <h6 className="writer">
                      {user[0].name || "Loading..."}
                    </h6>
                    <div className="likesntime">
                      <div className="noteLikes">{checkRating(note.rating)} Votes</div>
                      <div className="dot">•</div>
                      <div className="notetime">
                       {safeFormatDistance(note?.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
          </>
        );

      case "Your Questions":
        return (
          <>
            <div
              className="questions"
              style={{
                fontFamily: "Poppins, sans-serif",
                color: "#6d7fcc",
                fontSize: "34px",
              }}
            >
              Your Questions
            </div>
            <ul>
              
            {questions.map((question) => (
              
            <li
              className="questionHome"
              /*onClick={() => handelQueClick(question)}*/ key={question.id}
            >
              {/*{question.title}, {question.content}*/}
              {/* Question display */}
              <Link to={`/question/${question.id}`} state={{ question }}>

              
                <div class="centered-boxHome">
                  <div className="boxinbox">
                    <div className="questionHeadingHome">
                      <h3>
                        {question.title.length > 121
                          ? question.title.substring(0, 121) + "..."
                          : question.title}
                      </h3>
                    </div>

                    <div className="other">
                      {/* <div id="views">100 views</div> */}
                      <div id="votes">{question.rating} votes</div>
                      <div id="answers">{answer_count[question.id]} answers</div>
                    </div>
                  </div>
                  <div className="hometagsnuser">
                  <div id="youquetags">
                        {questionTags[question.id] ? (
                          questionTags[question.id].slice(0,3).map((tag) => (
                            <span key={tag.tag_id} id="quetagresult">
                              {tag.tag_name}
                            </span>
                          ))
                        ) : (
                          <p>loading tags ... </p>
                          // <button onClick={() => fetchTags(question.id)}>
                          //     Load Tags
                          // </button>
                        )}
                      </div>
                    <div className="user">
                      <div>
                        <img src={userImg} className="user-image" />
                      </div>
                      <div className="name">{user[0].name}</div>
                    </div>
                    <div className="time">{safeFormatDistance(question?.created_at)}</div>
                  </div>
                </div>
                
              </Link>
            </li>
            
          ))}
        </ul>
            
          </>
        );
      // case "Your Answers":
      //   return (
      //     <>
      //       <div
      //         className="answers"
      //         style={{
      //           fontFamily: "Poppins, sans-serif",
      //           color: "#6d7fcc",
      //           fontSize: "34px",
      //         }}
      //       >
      //         Your Answers
      //       </div>
      //       <p className="about-content">user-about</p>
      //     </>
      //   );
      case "Liked Questions":
        return (
          <>
            <div
              className="likedQuestions"
              style={{
                fontFamily: "Poppins, sans-serif",
                color: "#6d7fcc",
                fontSize: "34px",
              }}
            >
              Liked Questions
            </div>
            
            <ul>
              
            {likedQuestions.map((question) => (
              
            <li
              className="questionHome"
              /*onClick={() => handelQueClick(question)}*/ key={question.id}
            >
              {/*{question.title}, {question.content}*/}
              {/* Question display */}
              <Link to={`/question/${question.id}`} state={{ question }}>

              
                <div class="centered-boxHome">
                  <div className="boxinbox">
                    <div className="questionHeadingHome">
                      <h3>
                        {question.title.length > 121
                          ? question.title.substring(0, 121) + "..."
                          : question.title}
                      </h3>
                    </div>

                    <div className="other">
                      {/* <div id="views">100 views</div> */}
                      <div id="votes">10 votes</div>
                      <div id="answers">50 answers</div>
                    </div>
                  </div>
                  <div className="tagsnuser">
                    <div className="tags">
                      <div className="tag">npm</div>
                      <div className="tag">java</div>
                      <div className="tag">gpt</div>
                    </div>
                    <div className="user">
                      <div>
                        <img src={userImg} className="user-image" />
                      </div>
                      <div className="name">@soham_the_legend</div>
                    </div>
                    <div className="time">3 min ago</div>
                  </div>
                </div>
                
              </Link>
            </li>
            
          ))}
        </ul>
          </>
        );
      case "Liked Notes":
        return (
          <>
            <div
              className="likeanswers"
              style={{
                fontFamily: "Poppins, sans-serif",
                color: "#6d7fcc",
                fontSize: "34px",
              }}
            >
              Liked Notes
            </div>
            <p className="about-content">user-about</p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <main className={classNames("you-content", { "-youactive": !isOpen })}>

      <div class="you-body">
        <div class="container-you">
        <hr/>
          <div class="leftbox-you">
            <nav className="nav-you">
            <img src={userImg} className="youuser-image" />
            </nav>
          </div>

          <div class="rightbox-you">
            {user[0] ? (
              <div class="profile-you">
                <div className="containerinyou">
                <h1 className={classNames("h1-you", { "-activeh1-you": !isOpen })}>{user[0].name}</h1>
                {/* <div className="edit1"><button id="edit1">Edit</button></div> */}
                </div>
                {/* <h2 className="h2-you">Name</h2>
                <p className="p-you">
                  {user[0].name} <button class="btn-you">update</button>
                </p> */}
                {/* <h2 className="h2-you">Email</h2> */}
                <p className={classNames("p-you", { "-activep-you": !isOpen })}>
                  {user[0].email}{" "}
                  <button className="Logout" id="logout" onClick={handleLogout}>
                    Logout
                  </button>
                </p>
                {/* <h2 className="h2-you">About</h2>
              <p className="p-you">blha blah blha <button class="btn-you">update</button></p> */}
              </div>
            ) : (
              <div></div>
            )}
            <div
              class="btn-group"
              role="group"
              aria-label="Basic radio toggle button group"
            >

              <input
                type="radio"
                class="btn-check"
                name="btnradio"
                id="btnradio2"
                value="Your Questions" // Set value to "Your Questions"
                defaultChecked
                autocomplete="off"
                onChange={handleChoiceChange} // Add onChange event handler
                checked={choice === "Your Questions"}
              />
              <label class="btn btn-outline-primary" for="btnradio2">
                Your Questions
              </label>

              
              <input
                type="radio"
                class="btn-check"
                name="btnradio"
                id="btnradio1"
                value="about" // Set value to "about"
                
                autocomplete="off"
                onChange={handleChoiceChange} // Add onChange event handler
              />
              <label class="btn btn-outline-primary" for="btnradio1">
                Your Notes
              </label>

              <button
                class="btn btn-secondary dropdown-toggle"
                type="button"
                id="likedrop"
                data-bs-toggle="dropdown"
                aria-expanded="false"

              >
                Liked
              </button>
              <ul class="dropdown-menu">
                <li>
                  <a
                    class="dropdown-item"
                    value="Like Que"
                    href="/likedQue"
                  >
                    Questions
                  </a>
                </li>
                
                <li>
                  <a
                    class="dropdown-item"
                    value="Like notes"
                    href="likedNotes"
                  >
                    Notes
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
                
        <div class="you">{renderContent()}</div>
      </div>
    </main>
  );
};
export default You;

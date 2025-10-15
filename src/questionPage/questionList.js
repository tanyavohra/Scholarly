import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import classNames from "classnames";
import "../components/page.css";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./questionsPage.css";
import user from "../user.png";
import { safeFormatDistance } from "../utils/date";
import { connectStorageEmulator } from "firebase/storage";

const QuestionList = ({ isOpen, toggle }) => {
  const [questions, setQuestions] = useState([]);
  const [questionTags, setQuestionTags] = useState({});
  const [answer_count, setAnswer_count] = useState({});
  const [title, setTitle] = useState([]);
  const [usernames, setUsernames] = useState({});
  const get_userName = async (id) => {
    try {
      const res = await axios.post("http://localhost:8081/username", { id });
      setUsernames((prevUsernames) => ({
        ...prevUsernames,
        [id]: res.data,
      }));
      console.log(res.data);
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

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


  useEffect(() => {
    axios
      .get("http://localhost:8081/allquestions")
      .then((response) => {
        setQuestions(response.data);
        response.data.forEach((que) => {
          get_userName(que.author_id);
          fetchAnswerCount(que.id);
          fetchTags(que.id);
        });
      })
      .catch((error) => console.error("Error fetching questions:", error));
    console.log("N");
  }, []);

  const titleTrunacate = ({ title, maxlength = 124 }) => {
    if (typeof title === "string" && title.length > maxlength) {
      return title.substring(0, maxlength - 3) + "...";
    }
    return title;
  };

  // useEffect(() => {

  //   axios.get("http://localhost:8081/allquestions").then((res) => {
  //     // console.log(res.data.Status)
  //     if (res.data !== "") {
  //       console.log(res.data)
  //       setTitle(res.data.title);
  //       setQuestions(res.data.content)
  //     } else {
  //       console.log(res.error);
  //     }
  //   });
  // }, []);

  const navigate = useNavigate();
  // const handelQueClick= (question) => {
  //   navigate(`/question/${question.id}`);
  // };

  return (
    <main
      className={classNames("main-content", { "-active": !isOpen })}
      id="que-page"
    >
      <div>
        <h1 className="que_heading">Questions</h1>
        <ul>
          {questions
            .slice()
            .reverse()
            .map((question) => (
              <li
                className="question"
                /*onClick={() => handelQueClick(question)}*/ key={question.id}
              >
                {/*{question.title}, {question.content}*/}
                {/* Question display */}
                <Link to={`/question/${question.id}`} state={{ question }}>
                  <div class="centered-box">
                    <div className="boxinbox">
                      <div className="questionHeading">
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
                    <div className="tagsnuser">
                      {/* <div className="tags">
                      <div className="tag">npm</div>
                      <div className="tag">java</div>
                      <div className="tag">gpt</div>
                    </div> */}
                      <div id="quetags">
                        {questionTags[question.id] ? (
                          questionTags[question.id].slice(0, 3).map((tag) => (
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
                          <img src={user} className="user-image" />
                        </div>
                        <div className="name">
                          {usernames[question.author_id] || "Loading..."}
                        </div>
                      </div>
                      <div className="time">{safeFormatDistance(question?.created_at)}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </main>
  );
};

export default QuestionList;

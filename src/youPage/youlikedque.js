import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import axios from "axios";
import "./youComponents/youPage.css";
import userImg from '../user.png';
import { safeFormatDistance } from "../utils/date";
import { API_BASE_URL } from "../config";


const LikedQue = ({isOpen}) => {
    const [usernames, setUsernames] = useState({});
      // const [username, setUsernames] = useState([])
  const [questionTags, setQuestionTags] = useState({});
  const [answer_count, setAnswer_count] = useState({});

  const fetchTags = async (questionId) => {
    console.log(questionId);
    const response = await fetch(
      `${API_BASE_URL}/api/tags/${questionId}`
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
        const response = await fetch(`${API_BASE_URL}/api/answers/count/${questionId}`);
        const { answer_count } = await response.json();
        setAnswer_count((prev) => ({
          ...prev,
          [questionId]: answer_count,
        }))
    } catch (error) {
        console.error('Error fetching answer count:', error);
    }
};

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
    const [user, setUser] = useState({
        name: "",
        email: "",
      });
      const [likedQuestions, setLikedQuestions] = useState([]);
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
        const fetchLikedQuestions = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/api/questions/liked/${user[0].id}`);
                setLikedQuestions(response.data);
                response.data.forEach((que) => {
                    get_userName(que.author_id);
                    fetchTags(que.id);
              fetchAnswerCount(que.id);
                  });
            } catch (err) {
              console.log("Hi")
                console.error('Error fetching liked questions:', err);
      
            } 
        };
      
        fetchLikedQuestions();
      }, [user]);

    return (
        <div className="main_liked">

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
                        <img src={userImg} className="user-image" alt="User avatar" />
                      </div>
                      <div className="name">{usernames[question.author_id] || "Loading..."}</div>
                    </div>
                    <div className="time">{safeFormatDistance(question?.created_at)}</div>
                  </div>
              </div>
            </Link>
          </li>
          
        ))}
      </ul>
        </div>
      );
}

export default LikedQue

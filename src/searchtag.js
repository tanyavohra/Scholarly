import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./search.css";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";


const SearchTag = () =>{
    const location = useLocation();
    const tag = location.state?.tag;
    const [questionIDs, setQuestionIDs] = useState([])
    const [questions, setQuestions] = useState([])

    const navigate = useNavigate();
    const handleback = (event) => {
        navigate(-1);
      };
    useEffect(() => {
        axios.get("http://localhost:8081/questionswithtag", { params: { target_id: tag.id } })
          .then(response => {
            const questionIds = response.data.map(item => item.question_id);
            setQuestionIDs(questionIds);
          })
          .catch(error => console.error("Error fetching questions:", error));
    }, [tag.id]);

    useEffect(() => {
        if (questionIDs.length > 0) {
            axios.get("http://localhost:8081/questionwithIDs", { params: { ids: questionIDs } })
              .then(response => {
                setQuestions(response.data);
              })
              .catch(error => console.error("Error fetching questions:", error));
        }
      }, [questionIDs]); // we write this to make it depend on 'questionzIds' to trigger when question IDs are updated
    
    console.log(questions);

    return(
        <>
        {tag && (
            <main>
            <div className="upsearchcontainer">

            <div className="backformsearch" onClick={handleback}>
                ←
            </div>
            <h2 className="tagSearch">
                Search results for tag #{tag.name} ...
            </h2>
            </div>
            <div className="searchtagresults">
            <ul className="ul_search">

            {questions.map((question) => (
                <Link key={question.id} to={`/question/${question.id}`} state={{ question }}>
                <div id="sresult">
                <li>
                  {question.title ? (
                    <div >
                      <h3 id="shead">{question.title}</h3>
                      <p id="sp" style={{ whiteSpace: 'pre-wrap' }} >{question.content}</p>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }} >{question.content}</div>
                  )}
                </li>
                </div>
              </Link>
            ))}
            </ul>
            </div>
            </main>
        )}
        </>
        
    )
}

export default SearchTag
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import "./search.css";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";


const Alltags = () =>{

    const [questions, setQuestions] = useState([]);
    const [tags, setTags] = useState([]);
    const [question_tags, setQuestion_tags] = useState([]);

    const navigate = useNavigate();
    const handleback = (event) => {
        navigate(-1);
    };

    useEffect(() => {
        axios.get("http://localhost:8081/allquestions")
          .then(response => {
            const questions = response.data.map(item => ({ ...item, type: 'question' }));
            setQuestions(questions);
          })
          .catch(error => console.error("Error fetching questions:", error));
      }, [questions]);

      useEffect(() => {
        axios.get("http://localhost:8081/alltags")
          .then(response => {
            const tags = response.data.map(item => ({ ...item, type: 'tag' }));
            setTags(tags);
          })
          .catch(error => console.error("Error fetching tags:", error));
      }, [tags]);
    
      useEffect(() => {
        axios.get("http://localhost:8081/question_tags")
          .then(response => {
            const que_tags = response.data.map(item => ({ ...item, type: 'que_tags' }));
            setQuestion_tags(que_tags);
          })
          .catch(error => console.error("Error fetching quetags:", error));
      }, [question_tags]);

      const questionsMap = new Map(questions.map(q => [q.id, q]));
      const question_tagsMap = new Map(question_tags.map(q => [q.tag_id, q]));
    
    
      const getQueID = (tagId) =>{
        console.log(question_tagsMap.get(tagId))
        if(question_tagsMap.get(tagId) !== undefined){
            return question_tagsMap.get(tagId).question_id
        }
        return 0;
      }

    return(
        <main>
            <div className="upsearchcontainer">

            <div className="backformsearch" onClick={handleback}>
                ←
            </div>
            <h2 className="tagSearchalltags">
                All tags here
            </h2>
            </div>
            <div className="tagsbox">
            {/* <ul className="allthetags"> */}
            {tags.slice().reverse().map((tag) => (
                // <Link key={tag.id} to={`/question/${getQueID(tag.id)}`} state={{ question: questionsMap.get(getQueID(tag.id)) }}>
                <Link key={tag.id} to={`/search/${getQueID(tag.id)}`} state={{tag}}>
                <div id="salltagresult">
                  {/* <li> */}
                  {tag.name}
                  {/* </li> */}
                  </div>
                </Link>
              ))}
            {/* </ul> */}
            </div>
            </main>
    );
}

export default Alltags
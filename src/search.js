import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./search.css";
import Fuse from 'fuse.js';
import { Link } from "react-router-dom";

const Search = () => {
  const navigate = useNavigate();
  const handleback = (event) => {
    navigate(-1);
  };
  
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [data, setData] = useState([]);
  const [fuse, setFuse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [question_tags, setQuestion_tags] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const questionsResponse = await axios.get("http://localhost:8081/allquestions");
      const answersResponse = await axios.get("http://localhost:8081/allcomments");
      const notesResponse = await axios.get("http://localhost:8081/allnotes");
      const tagsResponse = await axios.get("http://localhost:8081/alltags");
      const questionTagsResponse = await axios.get("http://localhost:8081/question_tags");

      const questions = questionsResponse.data.map(item => ({ ...item, type: 'question' }));
      const answers = answersResponse.data.map(item => ({ ...item, type: 'answer' }));
      const notes = notesResponse.data.map(item => ({ ...item, type: 'note', title: item.course_name, content: item.course_description }));
      const tags = tagsResponse.data.map(item => ({ ...item, type: 'tag',  content: item.name }))
      //que with tags
      const tagquestions = questionsResponse.data.map(item => ({
        ...item,
        type: 'tagquestion',
        tags: []
      }));
      
      const questionTags = questionTagsResponse.data;
      questionTags.forEach(({ question_id, tag_id }) => {
        const question = tagquestions.find(q => q.id === question_id);
        const tag = tagsResponse.data.find(t => t.id === tag_id);
        if (question && tag) {
          question.tags.push(tag.name);
        }
      });
      const allData = [...questions, ...answers, ...notes, ...tags];
      setData(allData);
      

      const fuseInstance = new Fuse(allData, {
        keys: ["title", "content"],
        threshold: 0.3
      });

      setFuse(fuseInstance);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (fuse && query) {
      const results = fuse.search(query);
      setSearchResults(results.map(result => result.item));
    } else {
      setSearchResults(data); // Show all data if query is empty
    }
  }, [query, fuse, data]);

  const handleSearch = (event) => {
    setQuery(event.target.value);
  };
  


  useEffect(() => {
    axios.get("http://localhost:8081/allquestions")
      .then(response => {
        const questions = response.data.map(item => ({ ...item, type: 'question' }));
        setQuestions(questions);
      })
      .catch(error => console.error("Error fetching questions:", error));
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8081/allcomments")
      .then(response => {
        const answers = response.data.map(item => ({ ...item, type: 'answer' }));
        setAnswers(answers);
      })
      .catch(error => console.error("Error fetching answers:", error));
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8081/allnotes")
      .then(response => {
        const notes = response.data.map(item => ({ ...item, type: 'note' }));
        setNotes(notes);
      })
      .catch(error => console.error("Error fetching notes:", error));
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8081/alltags")
      .then(response => {
        const tags = response.data.map(item => ({ ...item, type: 'tag' }));
        setTags(tags);
      })
      .catch(error => console.error("Error fetching tags:", error));
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8081/question_tags")
      .then(response => {
        const que_tags = response.data.map(item => ({ ...item, type: 'que_tags' }));
        setQuestion_tags(que_tags);
      })
      .catch(error => console.error("Error fetching quetags:", error));
  }, []);

  const questionsMap = new Map(questions.map(q => [q.id, q]));
  const question_tagsMap = new Map(question_tags.map(q => [q.tag_id, q]));


  const getQueID = (tagId) =>{
    console.log(question_tagsMap.get(tagId))
    return question_tagsMap.get(tagId).question_id
  }
  console.log(searchResults)  
  
  return (
    <main>
      <div className="upsearchcontainer">
        <div className="backformsearch" onClick={handleback}>
          ←
        </div>
        <div className="upSearchBar">
        <input
            type="text"
            id="upsearchbar"
            class="no-outline"
            placeholder="Search anything ..."
            value={query}
            onChange={handleSearch}
          />

        
        </div>
      </div>
      
      {/* <ul className="ul_search">
        {searchResults.map(item => (
      <Link
                to={`/${item.type}/${item.id}`}
                key={`${item.type}_${item.id}`}
                className="search-result"
                style={{ display: 'block', margin: '10px 0' }}
                state={questionsResponse}
              >
          <div id="sresult" key={`${item.type}_${item.id}`}>
            <small id="stype"> {item.type} </small>
            <h3 id="shead">{item.title || item.name}</h3>
            <p id="sp">{item.content || item.description}</p>
          </div>
        </Link>
        ))}
      </ul> */}

{query.trim() && (
  <div className="bigsearch">
    <ul className="ul_search">
      {searchResults.map(result => {
        // <div id="sresults">
        switch (result.type) {
          case 'note':
            return notes.map(note =>
              note.id === result.id ? (
                <Link key={note.id} to={`/note/${note.id}`} state={{ note }}>
                  <div id="sresult">
                  <li>
                    {result.title ? (
                      <div >
                        <small id="stype"> {result.type} </small>
                        <h3 id="shead">{result.title}</h3>
                        <p id="sp" style={{ whiteSpace: 'pre-wrap' }}>{result.content}</p>
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{result.content}</div>
                    )}
                  </li>
                  </div>
                </Link>
              ) : null
            );

          case 'question':
            return questions.map(question =>
              question.id === result.id ? (
                <Link key={question.id} to={`/question/${question.id}`} state={{ question }}>
                <div id="sresult">
                  <li>
                    {result.title ? (
                      <div >
                      <small id="stype"> {result.type} </small>
                      <h3 id="shead">{result.title}</h3>
                      <p id="sp" style={{ whiteSpace: 'pre-wrap' }}>{result.content}</p>
                    </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{result.content}</div>
                    )}
                  </li>
                  </div>
                </Link>
              ) : null
            );

          case 'tag':
            return tags.map(tag =>
              tag.name === result.name ? (
                // <Link key={tag.id} to={`/question/${getQueID(tag.id)}`} state={{ question: questionsMap.get(getQueID(tag.id)) }}>
                <Link key={tag.id} to={`/search/${getQueID(tag.id)}`} state={{tag}}>
                <div id="stagresult">
                  <li>
                    {result.title ? (
                      <div >
                      <small id="stype"> {result.type} </small>
                      <h3 id="shead">{result.title}</h3>
                      <p id="sp">{result.content}</p>
                    </div>
                    ) : (
                      <div>#{result.content}</div>
                    )}
                  </li>
                  </div>
                </Link>
                
                // <>hi</>
              ) : null
            );
            
          case 'answer':
            return answers.map(answer =>
              answer.id === result.id ? (
                <Link key={answer.id} to={`/question/${answer.question_id}`} state={{ question: questionsMap.get(answer.question_id) }}>
                <div id="sresult">
                  <li>
                    {result.title ? (
                      <div >
                      <small id="stype"> answer </small>
                      <h3 id="shead">{result.title}</h3>
                      <p id="sp" style={{ whiteSpace: 'pre-wrap' }}>{result.content}</p>
                    </div>
                    ) : (
                      <>
                      <small id="stype"> answer </small>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{result.content}</div>
                      </>
                    )}
                  </li>
                  </div>
                </Link>
              ) : null
            );

          default:
            return null;
        }
        // </div>
      })}
    </ul>
    <div className="cantFind">
      <h2 >
        Can't find the Question?
      </h2>
      <a href="/ask">
      <button className="ask-buttonsearch">
                  Post Your Question 
                </button>
      </a>
    </div>
  </div>
)
}
    </main>
  );
};

export default Search;

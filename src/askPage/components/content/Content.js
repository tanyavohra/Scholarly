import { React, useState } from "react";
import classNames from "classnames";
import { Container } from "reactstrap";
import { Switch, Route, Routes, useNavigate } from "react-router-dom";
import "../../../components/page.css";
import Topbar from "./top.js";
import axios from "axios";

function Content({ sidebarIsOpen, toggleSidebar }) {
  // const [title, setTitle] = useState("");
  // const [question, setQuestion] = useState("");
  const[values, setValues] = useState({
    title:'',
    question:''
  })

  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues(prev => ({...prev, [event.target.name]: [event.target.value]}))
  }

  console.log(values);
  const handlePost = (event) =>{
    event.preventDefault();
    if(values.question !== "" && values.title !== ""){
      axios.post('http://localhost:8081/question', values)
        .then(res =>{
          console.log(res);
          navigate('/Home');
        })
        .catch(err => console.log(err));
    }
  }






  return (
    <Container
      fluid
      className={classNames("content", { "is-open": sidebarIsOpen })}
    >
      <Topbar toggleSidebar={toggleSidebar} />
      <Routes>
        <Route exact path="/" component={() => "Hello"} />
        <Route exact path="/about" component={() => "About"} />
        <Route exact path="/Pages" component={() => "Pages"} />
        <Route exact path="/faq" component={() => "FAQ"} />
        <Route exact path="/contact" component={() => "Contact"} />
        <Route exact path="/Home-1" component={() => "Home-1"} />
        <Route exact path="/Home-2" component={() => "Home-2"} />
        <Route exact path="/Home-3" component={() => "Home-3"} />
        <Route exact path="/Page-1" component={() => "Page-1"} />
        <Route exact path="/Page-2" component={() => "Page-2"} />
        <Route exact path="/page-1" component={() => "page-1"} />
        <Route exact path="/page-2" component={() => "page-2"} />
        <Route exact path="/page-3" component={() => "page-3"} />
        <Route exact path="/page-4" component={() => "page-4"} />
      </Routes>
      <main class="main-content">
        <h3 id="heading">Let's start ... </h3>

        <form>
          <div className="title">
            <div class="title-box">
              <h5 id="title" className="title-content">
                Title
              </h5>
              <p className="title-content">
                boil down your problem in one line
              </p>
              <div className="bottom">
                <input
                  type="text"
                  name="title"
                  className="title-content"
                  id="search-input"
                  onChange={handleInput}
                  placeholder="ex: What is a Object in Javascript?"
                />
                <button id="next" className="title-content">
                  Next
                </button>
              </div>
            </div>
            <div class="side-box-title">
              <h6 className="side-box-title-content">
                write your title as much attractive as possible
              </h6>
            </div>
          </div>

          <div className="title">
            <div class="question-box">
              <h5 id="title" className="title-content">
                Share the details of your problem
              </h5>
              <p className="title-content">
                Describe the problem in detail. Minimum 20 chars
              </p>
              <div className="bottom">
                <textarea
                name="question"
                  onChange={handleInput}
                  className="title-content"
                  id="question-input"
                  rows={2}
                  cols={70}
                  defaultValue={""}
                />
                <button id="next" className="title-content">
                  Next
                </button>
              </div>
            </div>
            <div class="side-box-title">
              <h6 className="side-box-title-content">
                Describe what you tried, what you expected to happen, and what
                actually resulted.
              </h6>
            </div>
          </div>
          <div className="title">
            <div class="pic-box">
              <h5 id="title" className="title-content">
                Any Picture?
              </h5>
              <p className="title-content">
                You can picture related to your problem.
              </p>
              <div className="bottom">
                <div>
                  <div className="title-content">
                    <label htmlFor="imageInput">Select an image:</label>
                    <br />
                    <input
                      type="file"
                      id="imageInput"
                      name="imageInput"
                      accept="image/*"
                    />
                    <button id="submit" onclick="submitImage()">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="side-box-title">
              <h6 className="side-box-title-content">It is optional...</h6>
            </div>
          </div>

          <button type={"submit"} id="done" onClick={handlePost} class="btn btn-outline-primary">
            Done
          </button>
        </form>
      </main>
    </Container>
  );
}
export default Content;

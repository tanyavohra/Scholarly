import {React} from "react";
import classNames from "classnames";
import { Container } from "reactstrap";
import { Switch, Route, Routes , useNavigate} from "react-router-dom";
import "../page.css";
import Topbar from "./top.js";
import axios from "axios";

function Content({ sidebarIsOpen, toggleSidebar }){
  
  
  const navigate = useNavigate();
  const handelClick= () => {
          navigate("/q1");
  };

  return  (
  <Container
    fluid
    className={classNames("content", { "is-open": sidebarIsOpen })}
  >
    <Topbar toggleSidebar={toggleSidebar} />
    </Container>
);
  }
export default Content;
{/* <main class="main-content">
      {" "}

      <div className="topBar">
        <h1 id="topQuestions">Today's Burning Questions ...</h1>
        <div className="filters">
          <div
            className="btn-group"
            role="group"
            aria-label="Button group with nested dropdown"
          >
            <input
              type="radio"
              className="btn-check"
              name="btnradio"
              id="btnradio1"
              autoComplete="off"
              defaultChecked
            />
            <label className="btn btn-outline-primary" htmlFor="btnradio1">
              Bounty
            </label>
            <input
              type="radio"
              className="btn-check"
              name="btnradio"
              id="btnradio2"
              autoComplete="off"
            />
            <label className="btn btn-outline-primary" htmlFor="btnradio2">
              Recent
            </label>
            <input
              type="radio"
              className="btn-check"
              name="btnradio"
              id="btnradio3"
              autoComplete="off"
            />
            <label className="btn btn-outline-primary" htmlFor="btnradio3">
              Most Upvoted
            </label>

            <div className="btn-group" role="group">
              <button
                type="button"
                className="btn btn-primary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Dropdown
              </button>
              <ul className="dropdown-menu">
                <li>
                  <a className="dropdown-item" href="#">
                    Dropdown link
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    Dropdown link
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <ol class="grid-question-container">
        <li className="question" onClick={handelClick}>
          <div
            id="que"
            class="navbar shadow-sm p-3 mb-5 bg-white rounded navbar navbar-expand-md navbar-1 ight bg-light"
          >
            <div className="questionContent">
              <h3>Why Java is better than c++?</h3>
            </div>
              <div className="Upvotes">
                <button >upvote</button>
                <button>Mark</button>
              </div>
            <div className="other">
              <div id="answers">3 answers</div>
              <div id="postTime">2 days ago</div>
            </div>
          </div>
        </li>
        <li className="question">
          <div
            id="que"
            class="navbar shadow-sm p-3 mb-5 bg-white rounded navbar navbar-expand-md navbar-1 ight bg-light"
          >
            <div className="questionContent">
              <h3>Why Java is better than c++?</h3>
            </div>

              <div className="Upvotes">
                <button>upvote</button>
                <button>Mark</button>
              </div>
            <div className="other">
              <div id="answers">3 answers</div>
              <div id="postTime">2 days ago</div>
            </div>
          </div>
        </li>
        <li className="question">
          <div
            id="que"
            class="navbar shadow-sm p-3 mb-5 bg-white rounded navbar navbar-expand-md navbar-1 ight bg-light"
          >
            <div className="questionContent">
              <h3>Why Java is better than c++?</h3>
            </div>
              <div className="Upvotes">
                <button>upvote</button>
                <button>mark</button>
              </div>
            <div className="other">
              <div id="answers">3 answers</div>
              <div id="postTime">2 days ago</div>
            </div>
          </div>
        </li>
        <li className="question">
          <div
            id="que"
            class="navbar shadow-sm p-3 mb-5 bg-white rounded navbar navbar-expand-md navbar-1 ight bg-light"
          >
            <div className="questionContent">
              <h3>Why Java is better than c++?</h3>
            </div>
              <div className="Upvotes">
                <button>upvote</button>
                <button>Mark</button>
              </div>
            <div className="other">
              <div id="answers">3 answers</div>
              <div id="postTime">2 days ago</div>
            </div>
          </div>
        </li>
      </ol>
    </main> */}
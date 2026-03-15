import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
//import './components/NavbarStyle.css';
import HomeContent from "./components/HomeContent";
import "./components/page.css";

function Home() {
  const [auth, setAuth] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  //.....
  axios.defaults.withCredentials = true;
  //.......N

  useEffect(() => {
    axios.get("http://localhost:8081/auth").then((res) => {
      // console.log(res.data.Status)
      if (res.data.Status === "Success") {
        setAuth(true);
        setName(res.data.name);
      } else {
        //console.log("S");
        setAuth(false);
        setMessage(res.data.Message);
      }
    });
  }, []);

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
  };

  return (
    <>
      {auth ? (
        <div>
          {/* <button className='btn btn-danger' onClick={handleLogout}>Logout</button> */}
          <header>
            <nav className="navbar">
              <div className="brand">iiitr-*-Scholarly</div>
              <div className="search-bar">
                <input type="text" placeholder="Search..." />
                <button className="search-button">Search</button>
              </div>
              <div className="action-buttons">
                <button className="ask-button">Ask Question</button>
                <div className="login-logout">
                  <div className="login-circle">
                    <div className="user-icon" />
                  </div>
                  <button className="login-button">Mr.{name}</button>
                </div>
              </div>
            </nav>
          </header>
        </div>
      ) : (
        <div>
          <div>{message}</div>
          <div>No Acesses</div>
          <header>
            <nav className="navbar">
              <div className="container-fluid">
                <a className="navbar-brand" href="#">
                  iiitr-*-Scholarly
                </a>
                <button
                  className="navbar-toggler"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <span className="navbar-toggler-icon" />
                </button>
                <div
                  className="collapse navbar-collapse"
                  id="navbarSupportedContent"
                >
                  <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                    <form className="d-flex" role="search">
                      <input
                        className="form-control me-2"
                        type="search"
                        placeholder="Search here..."
                        aria-label="Search"
                      />
                      <button className="btn btn-outline-success" type="submit">
                        Search
                      </button>
                    </form>
                    <li className="nav-item">
                      <button className="btn btn-outline-success">
                        Ask Your Question!
                      </button>
                    </li>
                    <li className="nav-item">
                      <Link to="/" className="btn btn-primary">
                        Login!
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </header>
        </div>
      )}
    </>
  );
}

export default Home;

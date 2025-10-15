// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";
// import {
//   Navbar,
//   Button,
//   NavbarToggler,
//   Collapse,
//   Nav,
//   NavItem,
//   NavLink,
// } from "reactstrap";
// import { Link } from "react-router-dom";
// import '../page.css'
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import "bootstrap/dist/css/bootstrap.min.css";
// import '../NavbarStyle.css';

// const Topbar = ({ toggleSidebar }) => {
//   const [topbarIsOpen, setTopbarOpen] = useState(true);
//   const toggleTopbar = () => setTopbarOpen(!topbarIsOpen);

//   const [auth, setAuth] = useState(false);
//   const [name, setName] = useState("");
//   const [message, setMessage] = useState("");

//   //.....
//   axios.defaults.withCredentials = true;
//   //.......

//   useEffect(() => {
//     axios.get("http://localhost:8081").then((res) => {
//       // console.log(res.data.Status)
//       if (res.data.Status === "Success") {
//         setAuth(true);
//         setName(res.data.name);
//       } else {
//         //console.log("S");
//         setAuth(false);
//         setMessage(res.data.Message);
//       }
//     });
//   }, []);

//   const handleLogout = () => {
//     axios
//       .get("http://localhost:8081/logout")
//       .then((res) => {
//         if (res.data.Status === "Success") {
//           window.location.reload(true);
//         } else {
//           alert("error");
//         }
//       })
//       .catch((err) => console.log(err));
//   };

//   return (
//     <Navbar
//       color="light"
//       light
//       className="navbar shadow-sm p-3 mb-5 bg-white rounded"
//       expand="md"
//     >
//       <Button color="info" onClick={toggleSidebar}>
//         <FontAwesomeIcon icon={faAlignLeft} />
//       </Button>
//       <NavbarToggler onClick={toggleTopbar} />
//       <Collapse isOpen={topbarIsOpen} navbar>
//         <Nav className="ml-auto" navbar>
//         <>
//       {auth ? (
//         <div>
//           {/* <button className='btn btn-danger' onClick={handleLogout}>Logout</button> */}
//           <header>
//             <nav className="navbar">
//               <div className="brand">iiitr-*-Scholarly</div>
//               <div className="search-bar">
//                 <input type="text" placeholder="Search..." />
//                 <button className="search-button">Search</button>
//               </div>
//               <div className="action-buttons">
//                 <button className="ask-button">Ask Question</button>
//                 <div className="login-logout">
//                   <div className="login-circle">
//                     <div className="user-icon" />
//                   </div>
//                   <button className="login-button">Mr.{name}</button>
//                 </div>
//               </div>
//             </nav>
//           </header>

//         </div>
//       ) : (
//         <div>
//           <div>{message}</div>
//           <div>No Acesses</div>
//           <header>
//             <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow shadow-lg">
//               <div className="container-fluid">
//                 <a className="navbar-brand" href="#">
//                   iiitr-*-Scholarly
//                 </a>
//                 <button
//                   className="navbar-toggler"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#navbarSupportedContent"
//                   aria-controls="navbarSupportedContent"
//                   aria-expanded="false"
//                   aria-label="Toggle navigation"
//                 >
//                   <span className="navbar-toggler-icon" />
//                 </button>
//                 <div
//                   className="collapse navbar-collapse"
//                   id="navbarSupportedContent"
//                 >
//                   <ul className="navbar-nav me-auto mb-2 mb-lg-0">
//                     <form className="d-flex" role="search">
//                       <input
//                         className="form-control me-2"
//                         type="search"
//                         placeholder="Search here..."
//                         aria-label="Search"
//                       />
//                       <button className="btn btn-outline-success" type="submit">
//                         Search
//                       </button>
//                     </form>
//                     <li className="nav-item">
//                       <button className="btn btn-outline-success">
//                         Ask Your Question!
//                       </button>
//                     </li>
//                     <li className="nav-item">
//                       <a href="/" className="btn btn-primary">
//                         Login!
//                       </a>
//                     </li>
//                   </ul>
//                 </div>
//               </div>
//             </nav>
//           </header>
//         </div>
//       )}
//     </>
//         </Nav>
//       </Collapse>
//     </Navbar>
//   );
// };

//export default Topbar;

import { faImage } from "@fortawesome/free-solid-svg-icons";
import lunr from "lunr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import {
  Navbar,
  Button,
  NavbarToggler,
  Collapse,
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import "../page.css";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";




const Topbar = ({ isOpen, toggle, toggleSidebar }) => {
  const [topbarIsOpen, setTopbarOpen] = useState(true);
  const toggleTopbar = () => setTopbarOpen(!topbarIsOpen);

  const [auth, setAuth] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  //.....
  axios.defaults.withCredentials = true;
  //.......

  useEffect(() => {
    axios.get("http://localhost:8081").then((res) => {
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

  const navigate = useNavigate();
  // const [questionsData, setQuestionsData] = useState([]);

  
  const [searchResults, setSearchResults] = useState([]);
  const indexRef = useRef(null);

  

  // useEffect(() => {
  //   if (questions.length > 0) {
  //     createLunrIndex();
  //   }
  // }, [questions, answers]);

  // function createLunrIndex() {
  //   const index = lunr(function () {
  //     this.ref("id");
  //     this.field("title", { boost: 10 });
  //     this.field("content");

  //     questions.forEach((question) => {
  //       this.add({
  //         id: question.id,
  //         title: question.title,
  //         content: question.content,
  //       });
  //     });
  //     answers.forEach((ans) => {
  //       this.add({
  //         id: ans.id,
  //         title: "",
  //         content: ans.content,
  //       });
  //     });
  //   });

  //   indexRef.current = index;
  // }

  const handleSearch = (event) => {
    navigate("/search");
  };

  // useEffect(() => {
  //   if (query.length > 0 && indexRef.current) {
  //     console.log(indexRef.current);
  //     console.log(questions);
  //     const results = indexRef.current.search(query);
  //     setSearchResults(
  //       results.map((result) => {
  //         const { ref } = result;
  //         // Determine whether the reference corresponds to a question or an answer
  //         if (ref <= questions.length) {
  //           // If it's within the range of questions, return the question
  //           return questions[ref - 1];
  //         } else {
  //           // Otherwise, subtract the length of questions to get the index in the answers array
  //           const ansIndex = ref - questions.length - 1;
  //           return answers[ansIndex];
  //         }
  //       })
  //     );
  //     console.log(searchResults);
  //   } else {
  //     setSearchResults([]);
  //   }
  // }, [query, questions, answers]);

  // searchResults.map((result) => console.log(result));
  // // Render your search input and results here

  // // const handleClick = (id) => {
  // //   navigate(`/question/${id}`);
  // //   window.location.reload(true);
  // //   // navigate('/questions');
  // //   // setTimeout(()=>{
  // //   //   console.log("HI")
  // //   //   navigate(`question/${id}`)
  // //   //   window.location.reload(true);
  // //   // }, 1000)
  // //   // console.log(id)
  // // };
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     // Check if the click occurred outside of the search results area
  //     if (!event.target.closest(".search-results")) {
  //       setSearchResults([]);
  //     }
  //   };

  //   // Add event listener to handle clicks outside of the search results
  //   document.body.addEventListener("click", handleClickOutside);

    // Cleanup function to remove event listener when component unmounts
  //   return () => {
  //     document.body.removeEventListener("click", handleClickOutside);
  //   };
  // }, [searchResults]);

  return (
    <>
    <Navbar
      light
      className={classNames("navbar posfix", { "-active": !isOpen })}
      expand="md"
    >
      <Button
        color="info"
        onClick={() => {
          toggleSidebar();
          toggle();
        }}
      >
        <FontAwesomeIcon icon={faAlignLeft} />
      </Button>
      <NavbarToggler onClick={toggleTopbar} />
      <Collapse isOpen={topbarIsOpen} navbar>
        <Nav className="ml-auto" navbar>
          <div className="top-container">
            <NavItem>
              <div className="search-container">
                <div className={classNames("search", {
                    "-activesearch": !isOpen,
                  })}>
                  <input
                    // type="none"
                    id="search-bar"
                    placeholder="Search anything ..."
                    class="no-outline"
                    // value={query}
                    // onChange={handleSearch}
                    onClick={handleSearch}
                  />
                </div>
                
              </div>
              
            </NavItem>
            
            <NavItem>
              <a href="/ask">
                <button
                  className={classNames("ask-button", {
                    "-askactive": !isOpen,
                  })}
                >
                  Ask Question 
                </button>
              </a>
            </NavItem>
            <div className="you-button">
              {auth ? (
                <NavLink tag={Link} to={"/you"}>
                  <button
                    className={classNames("login-button", {
                      "-active": !isOpen,
                    })}
                  >
                    You
                  </button>
                </NavLink>
              ) : (
                <NavLink tag={Link} to={"/"}>
                  <a href="/">
                    <button className="login-buttonb">Login!</button>
                  </a>
                </NavLink>
              )}
            </div>
          </div>
        </Nav>
        
      </Collapse>
    </Navbar>
    <div
  className={classNames(
    "search-results",
    { "-nores": searchResults.length === 0 },
    { "-activeresult": !isOpen } // Add this condition for the "-active" class
  )}
>
      {/* <ul id="search-results">
        {searchResults.length > 0 ? (
          searchResults.map((result) =>
            result ? (
              questions.map((question) =>
                question.id == result.id ? (
                  <Link to={`/question/${result.id}`} state={{ question }}>
                    <li key={result.id}>
                      {result.title ? (
                        <div className="resultTitle">
                          <strong>{result.title}</strong>
                        </div>
                      ) : (
                        <div>{result.content}</div>
                      )}
                    </li>
                  </Link>
                ) : null
              )
            ) : null
          )
        ) : (
          null
        )}
      </ul> */}
    </div>
  </>
  );
};

export default Topbar;

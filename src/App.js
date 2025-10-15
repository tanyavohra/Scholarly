import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Container } from "reactstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import HomeContent from "./components/HomeContent";
import Login from "./login";
import Search from "./search";
// import Signup from "./signup";
import You from "./youPage/you";
import Ask from "./askPage/ask";
import QuestionList from "./questionPage/questionList";
import Question from "./questionPage/question";
import SideBar from "./components/sidebar/Side";
import Content from "./components/content/Content";
import Topbar from "./components/content/top.js";
import Notes from "./notesPage/notes.js";
import AddNote from "./addNotePage/addNote.js";
import Note from "./notesPage/note.js";
import Test from "./Test.js";
import SearchTag from "./searchtag.js";
import Alltags from "./alltags.js";
import LikedQue from "./youPage/youlikedque.js";
import LikedNotes from "./youPage/youlikednotes.js";
import MarkedQue from "./marked/markedQue.js";
import MarkedNotes from "./marked/markedNote.js";
import PdfChat from "./chat_with_pdf.js/pdfChat.js";

function App() {
  const [sidebarIsOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarIsOpen);

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/test" element={<Test />} />
          {/* <Route path="/signup" element={<Signup />} /> */}
          <Route path="/search" element={<Search />} />
          <Route path="/search/:id" element={<SearchTag />} />
          <Route path="/alltags" element={<Alltags />} />
          <Route path="/pdfchat/:id" element={<PdfChat />} />
          <Route
            path="/*"
            element={
              <React.Fragment>
                <Topbar
                  toggleSidebar={toggleSidebar}
                  sidebarIsOpen={sidebarIsOpen}
                  toggle={toggleSidebar}
                  isOpen={sidebarIsOpen}
                />
                <SideBar toggle={toggleSidebar} isOpen={sidebarIsOpen} />
                <Container>
                  <Routes>
                    <Route
                      path="/you"
                      element={<You isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/Home"
                      element={<HomeContent isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/likedQue"
                      element={<LikedQue isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/markedque"
                      element={<MarkedQue isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/markednotes"
                      element={<MarkedNotes isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/likedNotes"
                      element={<LikedNotes isOpen={sidebarIsOpen} />}
                    />
                    <Route path="/ask" element={<Ask />} />
                    <Route
                      path="/question/:id"
                      element={
                        <Question
                          toggle={toggleSidebar}
                          isOpen={sidebarIsOpen}
                        />
                      }
                    />
                    <Route
                      path="/notes"
                      element={<Notes isOpen={sidebarIsOpen} />}
                    />
                    <Route
                      path="/note/:id"
                      element={<Note isOpen={sidebarIsOpen} />}
                    />
                    <Route path="/addnote" element={<AddNote />} />
                    <Route
                      path="/questions"
                      element={
                        <QuestionList
                          toggle={toggleSidebar}
                          isOpen={sidebarIsOpen}
                        />
                      }
                    />
                  </Routes>
                </Container>
              </React.Fragment>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

// import "bootstrap/dist/css/bootstrap.min.css";
// import "./App.css";
// import HomeContent from "./components/HomeContent";
// import Login from "./login";
// import Signup from "./signup";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import React, { useState } from "react";
// import You from "./youPage/you"
// import Ask from "./askPage/ask"
// import QuestionList from "./questionPage/questionList"
// import Question from './questionPage/question'
// import "./components/page.css"
// import SideBar from "./components/sidebar/Side";
// import Content from "./components/content/Content";
// import "./components/page.css";
// import Topbar from "./components/content/top.js";
// import { Container } from "reactstrap";

// function App() {
//   const [sidebarIsOpen, setSidebarOpen] = useState(true);
//   const toggleSidebar = () => setSidebarOpen(!sidebarIsOpen);

//   return (

//     <div >
//         <BrowserRouter>
//           <Topbar toggleSidebar={toggleSidebar} sidebarIsOpen={sidebarIsOpen}/>

//           <Routes>
//             <Route path="/" element={<Login />}></Route>
//             <Route path="/signup" element={<Signup />}></Route>
//             <Route path="/you" element={<You />}></Route>
//             <Route path="/Home" element={<HomeContent />}></Route>
//             <Route path="/ask" element={<Ask />}></Route>
//             <Route path="/question/:id" element={<Question />} />
//             <Route path="/questions" element={<QuestionList />}></Route>
//           </Routes>
// <SideBar toggle={toggleSidebar} isOpen={sidebarIsOpen} />

//         </BrowserRouter>
//     </div>

//   );
// }

// export default App;

{
  /* 
    <BurningQuestions/> */
}

// import 'bootstrap/dist/css/bootstrap.min.css'
// import './App.css'
// import Nav from './components/Navbar'
// import HomeContent from './components/HomeContent'
// import Login from './login'
// import Signup from './signup'
// import Home from './Home'
// import {BrowserRouter, Routes, Route} from 'react-router-dom'

// function App() {
//   return ( // we are returning all this inside the body tag of public/index.html which will reder by index.js
//     <BrowserRouter>
//           <Routes>
//             <Route path='/' element={<Login/>}></Route>
//             <Route path='/signup' element={<Signup/>}></Route>
//             <Route path='/Home' element={<Home/>}></Route>
//           </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;

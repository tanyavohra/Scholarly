// import React, { useEffect, useState } from "react";
// import classNames from "classnames";
// import "bootstrap/dist/css/bootstrap.min.css";
// import { useNavigate, Link } from "react-router-dom";
// import axios from "axios";
// import "./youComponents/youPage.css";
// import { Container } from "reactstrap";
// import userImg from '../user.png';
// import { isElementOfType } from "react-dom/test-utils";
// import "./youComponents/youPage.css";


// const LikedAns = ({isOpen}) => {
//     const [user, setUser] = useState({
//         name: "",
//         email: "",
//       });
//       const [likedQuestions, setLikedQuestions] = useState([]);
//       useEffect(() => {
//         axios
//           .get("http://localhost:8081/userInfo")
//           .then((res) => {
//             setUser(res.data);
//           })
//           .catch((error) => console.error("Error fetching questions:", error));
//         console.log("N");
//       }, []);
      
//       useEffect(() => {
//         const fetchLikedQuestions = async () => {
//             try {
//                 const response = await axios.get(`http://localhost:8081/api/answers/liked/${user[0].id}`);
//                 setLikedQuestions(response.data);
//             } catch (err) {
//               console.log("Hi")
//                 console.error('Error fetching liked questions:', err);
      
//             } 
//         };
      
//         fetchLikedQuestions();
//       }, [user]);

//     return (
//         <div className="main_liked">

//           <div
//             className="likedQuestions"
//             style={{
//               fontFamily: "Poppins, sans-serif",
//               color: "#6d7fcc",
//               fontSize: "34px",
//             }}
//           >
//             Liked Questions
//           </div>
          
//           <ul>
            
//           {likedQuestions.map((question) => (
            
//           <li
//             className="questionHome"
//             /*onClick={() => handelQueClick(question)}*/ key={question.id}
//           >
//             {/*{question.title}, {question.content}*/}
//             {/* Question display */}
//             <Link to={`/question/${question.id}`} state={{ question }}>

            
//               <div class="centered-boxHome">
//                 <div className="boxinbox">
//                   <div className="questionHeadingHome">
//                     <h3>
//                       {question.title.length > 121
//                         ? question.title.substring(0, 121) + "..."
//                         : question.title}
//                     </h3>
//                   </div>

//                   <div className="other">
//                     {/* <div id="views">100 views</div> */}
//                     <div id="votes">10 votes</div>
//                     <div id="answers">50 answers</div>
//                   </div>
//                 </div>
//                 <div className="tagsnuser">
//                   <div className="tags">
//                     <div className="tag">npm</div>
//                     <div className="tag">java</div>
//                     <div className="tag">gpt</div>
//                   </div>
//                   <div className="user">
//                     <div>
//                       <img src={userImg} className="user-image" />
//                     </div>
//                     <div className="name">@soham_the_legend</div>
//                   </div>
//                   <div className="time">3 min ago</div>
//                 </div>
//               </div>
              
//             </Link>
//           </li>
          
//         ))}
//       </ul>
//         </div>
//       );
// }

// export default LikedAns
/* {checkpoint 1
//import { React, useEffect } from "react";
// import { useLocation, useNavigate} from "react-router-dom";
// import "./comments.css";
// import axios from "axios";
// import { useState } from "react";

// function CommentList({ questionId }) {
//   const [comments, setComments] = useState([]);
//   const [isUpvoted, setUpvoted] = useState("");
//   const [isDownvoted, setDownvoted] = useState("");
//   useEffect(() => {
//     const fetchComments = async () => {
//       try {
//         const response = await axios.get("http://localhost:8081/allcomments");
//         setComments(response.data);
//       } catch (error) {
//         console.error(error);
//       }
//     };

//     fetchComments();
//   }, [questionId]);

//   const [rating, setRating] = useState(comments.rating);
//   const fetchCommentRating = async () => {
//     try {
//       const response = await axios.post(
//         "http://localhost:8081/commentrating",
//         { target_id: comments.id }
//       );
//       console.log(response);
//       setRating(response.data[0].rating);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     fetchCommentRating(); // Call the fetchUserVote function on component mount
//   }, [comments]); // Call fetchUserVote whenever the comment changes

//   const [userVote, setUserVote] = useState(0); // Initialize userVote state

//   const fetchUserVote = async () => {
//     try {
//       const response = await axios.post("http://localhost:8081/uservote", {
//         target_id: comments.id,
//       });
//       console.log(response.data[0].value);
//       setUserVote(response.data[0].value); // Set userVote state after receiving response
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     fetchUserVote(); // Call the fetchUserVote function on component mount
//   }, [comments]); // Call fetchUserVote whenever the question changes

//   useEffect(() => {
//     if (userVote === 1) {
//       setUpvoted(true);
//       setDownvoted(false);
//     } else if (userVote === -1) {
//       setUpvoted(false);
//       setDownvoted(true);
//     }
//   }, [userVote]);

//   const [values, setValues] = useState({
//     vote_type: "", // 1 for upvote, -1 for downvote
//     target_id: ""
//   });

//   const handleDownVote = () => {
//     setUpvoted(false);
//     setDownvoted(!isDownvoted);
//     values.vote_type = -1;
//     console.log(values);
//     if (
//       values.vote_type !== "" &&
//       values.target_id !== "" &&
//       values.is_comment !== ""
//     ) {
//       axios
//         .post("http://localhost:8081/commentvote", values)
//         .then((res) => {
//           window.location.reload(true);
//           console.log(res);
//         })
//         .catch((err) => console.log(err));
//     }
//   };
//   const handleUpVote = () => {
//     setUpvoted(!isUpvoted);
//     setDownvoted(false);
//     values.vote_type = 1;
//     console.log(values);
//     if (
//       values.vote_type !== "" &&
//       values.target_id !== "" &&
//       values.is_comment !== ""
//     ) {
//       axios
//         .post("http://localhost:8081/commentvote", values)
//         .then((res) => {
//           window.location.reload(true);
//           console.log(res);
//         })
//         .catch((err) => console.log(err));
//     }
//   };

//   return (
//     <ol className="comment-list">
//       {comments.map((comment) => (
//         <li key={comment.id}>
//           <div class="theContainerComm">
//             <div class="buttons-containerComm">
//               <div class="voting-buttonsComm">
//                 <button
//                   onClick={handleUpVote}
//                   className={`btn btn-${isUpvoted ? 'successComm' : 'defaultComm'}`} id="upvote-buttonComm"
//                 >
//                   <span
//                     className={`${
//                       isUpvoted ? "upvote-icon-clickedComm" : "upvote-iconComm"
//                     }`}
//                   >
//                     ▲
//                   </span>
//                 </button>
//               </div>
//               <div Name="voting-buttonsComm">
//                 <span class="vote-scoreComm">{"r"}</span>
//               </div>
//               <div class="voting-buttonsComm">
//                 <button
//                   onClick={handleDownVote}
//                   className={`btn btn-${isDownvoted ? 'dangerComm' : 'defaultComm'}`} id="downvote-buttonComm"
//                 >
//                   <span
//                     className={`${
//                       isDownvoted ? "downvote-icon-clickedComm" : "downvote-iconComm"
//                     }`}
//                   >
//                     ▼
//                   </span>
//                 </button>
//               </div>
//             </div>
//             <div>{comment.content}</div>
//           </div>
//           <hr />
//         </li>
//       ))}
//     </ol>
//   );
// }

// export default CommentList;
------}*/

// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";

// export default function CommentList({ questionId }) {
//   const [comments, setComments] = useState([]);
//   const [userVotes, setUserVotes] = useState([]); // Store individual user votes for each comment
//   const [isUpvoted, setUpvoted] = useState([]);
//   const [isDownvoted, setDownvoted] = useState([]);
//   const [commentrating, setcommentRating] = useState([]);
//   const [theFirstId, setFIrstId] = useState(0);

//   var thecommentrating = [];

//   useEffect(() => {
//     const fetchComments = async () => {
//       try {
//         const response = await axios.get(
//           `http://localhost:8081/allcomments/${questionId}`
//         );
//         setComments(response.data);
//         const commentIds = response.data.map((comment) => comment.id);
//         setFIrstId(commentIds[0]);

//         thecommentrating = response.data.map((comment) => comment.rating);
//         setcommentRating(thecommentrating);
//         fetchUserVotes(commentIds);
//         fetchCommentRating(commentIds);
//       } catch (error) {
//         console.error(error);
//       }
//     };

//     fetchComments();
//   }, [questionId]);

//   const fetchCommentRating = async (commentIds) => {
//     console.log(commentrating);
//     try {
//       const response = await axios.post("http://localhost:8081/commentrating", {
//         target_ids: [commentIds],
//       });
//       console.log(response);
//       setcommentRating(response.data.map((comment) => comment.rating));
//       console.log(commentrating);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const fetchUserVotes = async (commentIds) => {
//     try {
//       const response = await axios.post(
//         "http://localhost:8081/usercommentvote",
//         {
//           target_ids: [commentIds], // Send multiple comment IDs in one request
//         }
//       );
//       const votes = {};
//       console.log();
//       var i = 1;
//       for (const vote of response.data) {
//         votes[i] = vote.value;
//         i++;
//       }
//       console.log(votes);
//       setUserVotes(votes);
//     } catch (error) {
//       console.error(error);
//     }
//   };
//   console.log(userVotes);

//   // useEffect(() => {
//   //     console.log("Ya")
//   //     if (userVotes[commentId] === 1) {
//   //       // setUpvoted((prev)=> prev[commentId] = (true));
//   //       setUpvoted((prev) => {
//   //         const updatedDictionary = { ...prev };
//   //         updatedDictionary[1] = true;

//   //         return updatedDictionary;
//   //       });
//   //       console.log(isUpvoted)
//   //       // setDownvoted((prev) => prev[1] = (false));
//   //     } else if (userVotes[1] === -1) {
//   //       setUpvoted((prev) => prev[1] = (false));
//   //       // setDownvoted((prev)=> prev[1] = (true));
//   //     }
//   // }, {userVotes});

//   const prevUserVotes = useRef(userVotes); // Initialize with initial value
//   useEffect(() => {
//     // Update reference on each change
//     prevUserVotes.current = userVotes;
//   }, [userVotes]); // Add this dependency to update prevUserVotes on userVotes change

//   console.log("______________YS__________")

//   console.log(commentrating);
//   const handleVote = async (commentId, voteType) => {
//     console.log(commentId)
//     try {
//       const response = await axios.post("http://localhost:8081/commentvote", {
//         target_id: commentId,
//         vote_type: voteType,
//       });
//       setUserVotes({
//         ...userVotes,
//         [commentId+1]: response.data.new_vote_value,
//       });
//       if (voteType === 1) {
//         console.log("yss");
//         if (userVotes[commentId] === 1) {
//           // setUserVotes((prev) => prev[commentId] = 0);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = 0;

//             return updatedDictionary;
//           });

//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] -= 1;
//             return updatedArray;
//           });
//         } else if (userVotes[commentId] === -1) {
//           // setUserVotes((prev) => prev[commentId] = 1);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = 1;

//             return updatedDictionary;
//           });
//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] += 2;
//             return updatedArray;
//           });
//         } else {
//           // setUserVotes((prev) => prev[commentId] = 1);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = 1;

//             return updatedDictionary;
//           });
//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] += 1;
//             return updatedArray;
//           });
//         }
//       } else {
//         if (userVotes[commentId] === -1) {
//           // console.log("FJKFsfdfsdadghkfjkhjdfh")
//           // setUserVotes((prev) => prev[commentId] = 0);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = 0;

//             return updatedDictionary;
//           });
//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] += 1;
//             return updatedArray;
//           });
//         } else if (userVotes[commentId] === 1) {
//           // setUserVotes((prev) => prev[commentId] = -1);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = -1;

//             return updatedDictionary;
//           });
//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] -= 2;
//             return updatedArray;
//           });
//         } else {
//           // setUserVotes((prev) => prev[commentId] = -1);
//           setUserVotes((prev) => {
//             const updatedDictionary = { ...prev };
//             updatedDictionary[commentId] = -1;

//             return updatedDictionary;
//           });
//           setcommentRating((prevRating) => {
//             const updatedArray = [...prevRating];
//             updatedArray[commentId] -= 1;
//             return updatedArray;
//           });
//         }
//       }
//       // }else{
//         //   setUpvoted[commentId](false);
//       //   setDownvoted[commentId](!isDownvoted);
//       //     if(isUpvoted){
//         //       setcommentRating[commentId](prevRating => prevRating - 1);

//         //     }else{
//           //       setcommentRating[commentId](prevRating => prevRating + 1);

//           //     }
//           // }
//         } catch (error) {
//           console.error(error);
//         }
//       };

//       useEffect(() => {

//         const changedCommentIds = Object.keys(userVotes).filter((commentId) => {
//           // Check if the vote value for `commentId` changed compared to the previous state
//           return userVotes[commentId-1] !== prevUserVotes[commentId-1];
//         });

//         changedCommentIds.forEach((commentId) => {
//           const newIsUpvoted = userVotes[commentId-1] === 1;
//           const newIsDownvoted = userVotes[commentId-1] === -1;

//           setUpvoted((prevIsUpvoted) => ({
//             ...prevIsUpvoted,
//             [commentId-1]: newIsUpvoted,
//           }));

//           setDownvoted((prevIsDownvoted) => ({
//             ...prevIsDownvoted,
//             [commentId-1]: newIsDownvoted,
//           }));
//         });
//       }, [userVotes]);

//       console.log(isDownvoted)

//       return (
//         <ol className="comment-list">
//       {comments.map((comment) => (
//         <li key={comment.id}>
//           <div className="theContainerComm">
//             <div className="buttons-containerComm">
//               <div className="voting-buttonsComm">
//                 <button
//                   className={`btn btn-${
//                     isUpvoted[comment.id-1]
//                       ? "upvote-icon-clickedComm"
//                       : "upvote-iconComm"
//                   }`}
//                   id={`upvote-buttonComm-${comment.id-1}`}
//                   onClick={() => handleVote(comment.id-1, 1)}
//                 >
//                   <span
//                     className={`${
//                       isUpvoted[comment.id-1]
//                         ? "upvote-icon-clickedComm"
//                         : "upvote-iconComm"
//                     }`}
//                   >
//                     ▲
//                   </span>
//                 </button>
//               </div>
//               <div className="voting-buttonsComm">
//                 <span className="vote-scoreComm">{commentrating[comment.id-1]}</span>
//               </div>
//               <div className="voting-buttonsComm">
//                 <button
//                   className={`btn btn-${
//                     isDownvoted[comment.id-1] ? "dangerComm" : "defaultComm"
//                   }`}
//                   id={`downvote-buttonComm-${comment.id-1}`}
//                   onClick={() => handleVote(comment.id-1, -1)}
//                 >
//                   <span
//                     className={`${
//                       isDownvoted[comment.id-1]
//                         ? "downvote-icon-clickedComm"
//                         : "downvote-iconComm"
//                     }`}
//                   >
//                     ▼
//                   </span>
//                 </button>
//               </div>
//             </div>
//             <div>{comment.content}</div>
//           </div>
//           <hr />
//         </li>
//       ))}
//     </ol>
//   );
// }

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { safeFormatDistance } from "../utils/date";
import userImg from "../user.png";
import './comments.css'

export default function CommentList({ questionId }) {
  const [comments, setComments] = useState([]);
  const [userNames, setUsernames] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [isUpvoted, setIsUpvoted] = useState({});
  const [isDownvoted, setIsDownvoted] = useState({});
  const [commentrating, setcommentRating] = useState({});
  const [isVotingDisabled, setIsVotingDisabled] = useState(false);
  const voteDelay = 100;
 


  // useEffect(() => {
  //   get_userName(comment.author_id)
  // }, []);
  const get_userName = useCallback(async (id, commId) => {
    if(id !== undefined){

      try {
        const res = await axios.post("http://localhost:8081/username", { id });
        setUsernames((prevUsernames) => ({
          ...prevUsernames,
          [commId]: res.data,
        }));
        console.log(res.data);
      } catch (error) {
        console.error("Error fetching username:", error);
      }
    }
  }, []);
  // const [theFirstId, setFIrstId] = useState(0);

  const fetchCommentRating = useCallback(async (commentIds) => {
    try {
      const response = await axios.post("http://localhost:8081/commentrating", {
        target_ids: [commentIds],
      });
      console.log(response);
      const ratings = {};
      for (let i = 0; i < response.data.length; i++) {
        const commentId = commentIds[i];
        ratings[commentId] = response.data[i].rating;
      }

      console.log(ratings);
      setcommentRating(ratings);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const fetchUserVotes = useCallback(async (commentIds) => {
    try {
      const response = await axios.post("http://localhost:8081/usercommentvote", {
        target_ids: [commentIds],
      });

      console.log(response);
      const votes = {};
      for (let i = 0; i < response.data.length; i++) {
        const vote = response.data[i];
        const commentId = commentIds[i];
        votes[commentId] = vote.value;
      }

      console.log(votes);
      setUserVotes(votes);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8081/allcomments/${questionId}`
        );
        setComments(response.data);
        const commentIds = response.data.map((comment) => comment.id);
        response.data.forEach((comment) => get_userName(comment.user_id, comment.id));
        // setFIrstId(commentIds[0]);

        const initialRatings = {};
        response.data.forEach((comment) => {
          initialRatings[comment.id] = comment.rating;
        });
        setcommentRating(initialRatings);
        fetchUserVotes(commentIds);
        fetchCommentRating(commentIds);
        
      } catch (error) {
        console.error(error);
      }
    };

    fetchComments();
  }, [fetchCommentRating, fetchUserVotes, get_userName, questionId]);

  useEffect(() => {
    console.log("1", userVotes)
    if(userVotes !== null){
      for(let i=0; i<userVotes.length; i++){
        console.log("2", userVotes)
        if(userVotes[i] !== undefined){
          if (userVotes[i] === 1) {
            setIsUpvoted(true);
            setIsDownvoted(false);
          } else if (userVotes[i] === -1) {
            setIsUpvoted(false);
            setIsDownvoted(true);
          }
        }
      }

    }
  }, [userVotes]);

  console.log(userVotes);

  const prevUserVotes = useRef(userVotes); // Initialize with initial value
  useEffect(() => {
    // Update reference on each change
    prevUserVotes.current = userVotes;
  }, [userVotes]); // Add this dependency to update prevUserVotes on userVotes change

  console.log("______________YS__________");


  console.log(commentrating);
  const handleVote = async (commentId, voteType) => {
    setIsVotingDisabled(true); 
    try {
      const response = await axios.post("http://localhost:8081/commentvote", {
        target_id: commentId,
        vote_type: voteType,
      });
      console.log(response.data);
      setUserVotes((prevUserVotes) => ({
        ...prevUserVotes,
        [commentId]: response.data.new_vote_value,
      }));

      // const updatedIsUpvoted = { ...isUpvoted };
      // const updatedIsDownvoted = { ...isDownvoted };
      // const updatedCommentRating = { ...commentrating };

      // if (voteType === 1) {
      //   if (userVotes[commentId] === 1) {
      //     updatedIsUpvoted[commentId] = false;
      //     updatedIsDownvoted[commentId] = false;
      //     updatedCommentRating[commentId] -= 1;
      //   } else {
      //     updatedIsUpvoted[commentId] = true;
      //     updatedIsDownvoted[commentId] = false;
      //     updatedCommentRating[commentId] += 1;
      //   }
      // } else {
      //   if (userVotes[commentId] === -1) {
      //     updatedIsUpvoted[commentId] = false;
      //     updatedIsDownvoted[commentId] = false;
      //     updatedCommentRating[commentId] += 1;
      //   } else {
      //     updatedIsUpvoted[commentId] = false;
      //     updatedIsDownvoted[commentId] = true;
      //     updatedCommentRating[commentId] -= 1;
      //   }
      // }

      // setIsUpvoted(updatedIsUpvoted);
      // setIsDownvoted(updatedIsDownvoted);
      // setcommentRating(updatedCommentRating);
      if (voteType === 1) {
        console.log("yss");
        if (userVotes[commentId] === 1) {
          // setUserVotes((prev) => prev[commentId] = 0);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = 0;

            return updatedDictionary;
          });

          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] -= 1;
            return updatedArray;
          });
        } else if (userVotes[commentId] === -1) {
          // setUserVotes((prev) => prev[commentId] = 1);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = 1;

            return updatedDictionary;
          });
          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] += 2;
            return updatedArray;
          });
        } else {
          // setUserVotes((prev) => prev[commentId] = 1);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = 1;

            return updatedDictionary;
          });
          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] += 1;
            return updatedArray;
          });
        }
      } else {
        if (userVotes[commentId] === -1) {
          // console.log("FJKFsfdfsdadghkfjkhjdfh")
          // setUserVotes((prev) => prev[commentId] = 0);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = 0;

            return updatedDictionary;
          });
          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] += 1;
            return updatedArray;
          });
        } else if (userVotes[commentId] === 1) {
          // setUserVotes((prev) => prev[commentId] = -1);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = -1;

            return updatedDictionary;
          });
          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] -= 2;
            return updatedArray;
          });
        } else {
          // setUserVotes((prev) => prev[commentId] = -1);
          setUserVotes((prev) => {
            const updatedDictionary = { ...prev };
            updatedDictionary[commentId] = -1;

            return updatedDictionary;
          });
          setcommentRating((prevRating) => {
            const updatedArray = {...prevRating};
            updatedArray[commentId] -= 1;
            return updatedArray;
          });
        }
      }
      setTimeout(() => {
        setIsVotingDisabled(false);
      }, voteDelay);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const changedCommentIds = Object.keys(userVotes).filter((commentId) => {
      // Check if the vote value for `commentId` changed compared to the previous state
      return userVotes[commentId] !== prevUserVotes.current?.[commentId];
    });

    changedCommentIds.forEach((commentId) => {
      const newIsUpvoted = userVotes[commentId] === 1;
      const newIsDownvoted = userVotes[commentId] === -1;

      setIsUpvoted((prevIsUpvoted) => ({
        ...prevIsUpvoted,
        [commentId]: newIsUpvoted,
      }));

      setIsDownvoted((prevIsDownvoted) => ({
        ...prevIsDownvoted,
        [commentId]: newIsDownvoted,
      }));
    });
  }, [userVotes]);

  console.log(commentrating);
  // console.log(get_userName())

  return (
    <ol className="comment-list">
      {comments.map((comment) => (
        <li key={comment.id}>
          <div className="commtopcontainer">
            <div><img src={userImg} className="noteuserimg" alt="User avatar" /></div>
                <div className="usernote"> {userNames[comment.id] || "Loading..."}</div>
                <div className="created_time">
                 {safeFormatDistance(comment?.created_at)}
                </div>
          </div>
          <div className="theContainerComm">
            <div className="buttons-containerComm">
              <div className="voting-buttonsComm">
                <button
                  className={`btn btn-${
                    isUpvoted[comment.id]
                      ? "upvote-icon-clickedComm"
                      : "upvote-iconComm"
                  }`}
                  id={`upvote-buttonComm-${comment.id}`}
                   disabled={isVotingDisabled}
                  onClick={() => handleVote(comment.id, 1)}
                >
                  <span
                    className={`${
                      isUpvoted[comment.id]
                        ? "upvote-icon-clickedComm"
                        : "upvote-iconComm"
                    }`}
                  >
                    ▲
                  </span>
                </button>
              </div>
              <div className="voting-buttonsComm">
                <span className="vote-scoreComm">
                  {commentrating[comment.id]}
                </span>
              </div>
              <div className="voting-buttonsComm">
                <button
                  className={`btn btn-${
                    isDownvoted[comment.id] ? "dangerComm" : "defaultComm"
                  }`}
                  id={`downvote-buttonComm-${comment.id}`}
                   disabled={isVotingDisabled}
                  onClick={() => handleVote(comment.id, -1)}
                >
                  <span
                    className={`${
                      isDownvoted[comment.id]
                        ? "downvote-icon-clickedComm"
                        : "downvote-iconComm"
                    }`}
                  >
                    ▼
                  </span>
                </button>
              </div>
            </div>
            
            <div id="commcontent" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</div>
          </div>
          <hr />
        </li>
      ))}
    </ol>
  );
}

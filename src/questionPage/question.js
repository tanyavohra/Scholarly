import React, { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { useLocation } from "react-router-dom";
import "./questionPage.css";
import axios from "axios";
import CommentList from "./commentList";
import ImageComponent from './imageComponent';
import userImg from "../user.png";
import { safeFormatDistance } from "../utils/date";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faBookmark} from "@fortawesome/free-solid-svg-icons";
import { API_BASE_URL } from "../config";



const Question = ({ isOpen, toggle }) => {
  const location = useLocation();
  const question = location.state?.question;
  const [isMarked, setIsMarked]  = useState("");
  
  const imageUrl = question.image_url;
  const [isUpvoted, setUpvoted] = useState("");
  const [isDownvoted, setDownvoted] = useState("");
  const [isVotingDisabled, setIsVotingDisabled] = useState(false);
  // const [isDownvotingDisabled, setIsDownvotingDisabled] = useState(false);
  const voteDelay = 800;
  const [userName, setUserName] = useState("");
  const [questionTags, setQuestionTags] = useState({});

  useEffect(() => {
    if (!question?.id) return;
    const fetchTags = async () => {
      console.log(question.id);
      const response = await fetch(`${API_BASE_URL}/api/tags/${question.id}`);
      const data = await response.text();
      console.log(data);
      const tags = JSON.parse(data);
      setQuestionTags((prevState) => ({
        ...prevState,
        [question.id]: tags,
      }));
    };

    fetchTags().catch((err) => console.error("Error fetching tags:", err));
  }, [question?.id]);

  useEffect(() => {
    if (!question?.author_id) return;
    const getUserName = async () => {
      try {
        const res = await axios.post("http://localhost:8081/username", {
          id: question.author_id,
        });
        setUserName(res.data);
        console.log(res.data);
      } catch (error) {
        console.error("Error fetching username:", error);
      }
    };

    getUserName();
  }, [question?.author_id]);

  const fetchIsMarked = useCallback(async () => {
    if (!question?.id) return;
    try {
      const res = await axios.post("http://localhost:8081/ismarked", {
        question_id: question.id,
      });
      setIsMarked(res.data.result[0].row_exists);
      console.log(res.data.result[0].row_exists);
    } catch (error) {
      console.error("Error fetching isMarked:", error);
    }
  }, [question?.id]);

  useEffect(() => {
    fetchIsMarked();
  }, [fetchIsMarked]);
  
  const [content, setContent] = useState("");
  const url = "";

  // const submitImage = (event) => {
  //   event.preventDefault();
  //   if (imageUpload == null) return;
  //   const imageRef = ref(storage, `queimages/${imageUpload.name + v4()}`);
  //   uploadBytes(imageRef, imageUpload).then(async (snapshot) => {
  //     const imageUrl = await  getDownloadURL(snapshot.ref);
  //     // setImageUrls((prevImageUrls) => [...prevImageUrls, imageUrl]);
  //     setUrl(imageUrl);
  //     alert("Image Uploaded");
  //   });
  // };


  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8081/comment", {
        comment_content: content,
        question_id: question.id,
        url: url
      });

      if (response.data.Status !== "Success") {
        // "success" flag in response
        throw new Error(`Failed to create comment: ${response.data.message}`);
      }

      window.location.reload(true);

      // Update the comment list state (omitted for brevity)
    } catch (error) {
      console.error(error);
      // Handle the error appropriately
    }
  };

  const [rating, setRating] = useState(question.rating !== null ? question.rating : 0);
  const fetchQuestionRating = useCallback(async () => {
    if (!question?.id) return;
    try {
      const response = await axios.post(
        "http://localhost:8081/questionrating",
        { target_id: question.id }
      );
      // console.log(response);
      setRating(response.data[0].rating !== null ? response.data[0].rating : 0);
    } catch (error) {
      console.log(error);
    }
  }, [question?.id]);

  useEffect(() => {
    fetchQuestionRating(); // Call the fetchUserVote function on component mount
  }, [fetchQuestionRating]); // Call fetchUserVote whenever the question changes

  //{ var userVote = 0;
  // const userValues = {target_id:question.id}
  // axios
  //   .post("http://localhost:8081/uservote", userValues)
  //   .then((res) => {
  //     console.log(res.data[0].value);
  //     userVote = res.data[0].value;
  //     //console.log("thisssssssssssssss"+userVote)
  //   })
  //   .catch((err) => console.log(err));

  //   console.log("thisssssssssssssss"+userVote)
  // if(userVote === 1){
  //   setUpvoted(true);
  //   setDownvoted(false);
  // }else if(userVote === -1){
  //   setUpvoted(false);
  //   setDownvoted(true);
  // }
  //}

  const [userVote, setUserVote] = useState(0); // Initialize userVote state
  
  const fetchUserVote = useCallback(async () => {
    if (!question?.id) return;
    try {
      const response = await axios.post("http://localhost:8081/uservote", {
        target_id: question.id,
      });
      // console.log(response.data[0].value);
      setUserVote(response.data[0].value); // Set userVote state after receiving response
    } catch (error) {
      console.log(error);
    }
  }, [question?.id]);

  useEffect(() => {
    fetchUserVote(); // Call the fetchUserVote function on component mount
    
  }, [fetchUserVote]); // Call fetchUserVote whenever the question changes

  useEffect(() => {
    if (userVote === 1) {
      setUpvoted(true);
      setDownvoted(false);
    } else if (userVote === -1) {
      setUpvoted(false);
      setDownvoted(true);
    }
  }, [userVote]);

  const [values, setValues] = useState({
    vote_type: "", // 1 for upvote, -1 for downvote
    target_id: "",
    is_comment: "", // Boolean value indicating whether the target is a comment or not
  });
  // values.target_id = question.id;
  // values.is_comment = false;

  useEffect(() => {
    if (!question?.id) return;
    setValues((prev) => ({
      ...prev,
      target_id: question.id,
      is_comment: false,
    }));
  }, [question?.id]);

  const handelMarked =async () =>{
    console.log("clik")
    try {
      await axios.post("http://localhost:8081/question_marked", {
        question_id: question.id,
        user_id: question.author_id
      });
      fetchIsMarked();
      // console.log(response.data[0].value);
      // setMarked(response.data[0].value); // Set userVote state after receiving response
    } catch (error) {
      console.log(error);
    }
  }
  const handelunMarked =async () =>{
    console.log("clik")
    try {
      await axios.post("http://localhost:8081/question_unmarked", {
        question_id: question.id,
        user_id: question.author_id
      });
      fetchIsMarked();
      // console.log(response.data[0].value);
      // setMarked(response.data[0].value); // Set userVote state after receiving response
    } catch (error) {
      console.log(error);
    }
  }
  
  const handleDownVote = () => {
    values.vote_type = -1;
    //console.log(values.vote_type + "L")
    // setValues({ ...values, vote_type: '-1' });
    // setValues(prevValues => ({ ...prevValues, vote_type: -1 }));
    console.log(values);
    if (
      values.vote_type !== "" &&
      values.target_id !== "" &&
      values.is_comment !== ""
    ) {
      setIsVotingDisabled(true); // Disable the downvote button
      axios
        .post("http://localhost:8081/vote", values)
        .then((res) => {
          setUpvoted(false);
          setDownvoted(!isDownvoted);
          if (isDownvoted) {
            setRating((prevRating) => prevRating + 1);
          } else if(isUpvoted){
            setRating((prevRating) => prevRating - 2);
          }else{
            setRating((prevRating) => prevRating - 1);
          }
          // setIsDownvotingDisabled(false);
          // Re-enable the downvote button after a delay
          setTimeout(() => {
            setIsVotingDisabled(false);
          }, voteDelay);
          // console.log(res);
        })
        .catch((err) => console.log(err));
    }
  };
  const handleUpVote = () => {
    // setUpvoted(!isUpvoted);
    // setDownvoted(false);
    values.vote_type = 1;
    // setValues({ ...values, vote_type: '1' });
    // setValues(prevValues => ({ ...prevValues, vote_type: 1 }));
    // console.log(values);
    if (
      values.vote_type !== "" &&
      values.target_id !== "" &&
      values.is_comment !== ""
    ) {
      setIsVotingDisabled(true); // Disable the upvote button
      axios
        .post("http://localhost:8081/vote", values)
        .then((res) => {
          setUpvoted(!isUpvoted);
          setDownvoted(false);
          if (isUpvoted) {
            setRating((prevRating) => prevRating - 1);
          } else if(isDownvoted) {
            setRating((prevRating) => prevRating + 2);
          }else{
            setRating((prevRating) =>prevRating + 1)
          }
          // Re-enable the upvote button after a delay
          setTimeout(() => {
            setIsVotingDisabled(false);
          }, voteDelay);
          // increaseRating(res);
          // console.log(res);
        })
        .catch((err) => console.log(err));
    }
  };
console.log(isMarked)

  return (
    <div>
      {question && (
        <main className={classNames("main-content", { "-active": !isOpen })}>
          <div className="userdate">
          <div><img src={userImg} className="noteuserimg" alt="User avatar" /></div>
          <div className={classNames("usernote", { "-activeusernote": !isOpen })}> {userName || "Loading..."}</div>
 {safeFormatDistance(question?.created_at)}

          </div>
          <div className="titleContainer">
            <div className="titleContent">
              <h1 id="questionTitle" >{question.title}</h1>
            </div>
            <div className="mark">
              {isMarked === 0 ? (<button id="marked" onClick={handelMarked}><FontAwesomeIcon icon={faBookmark}></FontAwesomeIcon> Mark  </button>):(
                <button id="unmarked" onClick={handelunMarked}> Unmark  </button>
              )}
              
            </div>
          </div>
          
          <strong>
            <hr />
          </strong>
   
          
          <div class="theContainer">
            <div class="buttons-container">
              <div class="voting-buttons">
                <button
                  onClick={handleUpVote}
                  /*className={`btn btn-${isUpvoted ? 'success' : 'default'}`}*/ id="upvote-button"
                  disabled={isVotingDisabled}
                >
                  <span
                    className={`${
                      isUpvoted ? "upvote-icon-clicked" : "upvote-icon"
                    }`}
                  >
                    ▲
                  </span>
                </button>
              </div>
              <div className="voting-score">
                <span class="vote-score">{rating}</span>
              </div>
              <div class="voting-buttons">
                <button
                  onClick={handleDownVote}
                  /*className={`btn btn-${isDownvoted ? 'danger' : 'default'}`}*/ id="downvote-button"
                  disabled={isVotingDisabled}
                >
                  <span
                    className={`${
                      isDownvoted ? "downvote-icon-clicked" : "downvote-icon"
                    }`}
                  >
                    ▼
                  </span>
                </button>
              </div>
            </div>
            <div class="content-container">
              <div className="qu">
                <div className="content-of-question">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{question.content}</p>
            
                  {imageUrl? (<div className="queImg" ><ImageComponent id="qimg" imageUrl={imageUrl} /> </div>) :
                  null}
                </div>
              </div>
            </div>
          </div>
          <div className="theQtags">  <div id="innerquetags">
                        {questionTags[question.id] ? (
                          questionTags[question.id].map((tag) => (
                            <span key={tag.tag_id} id="quetagresult">
                              {tag.tag_name}
                            </span>
                          ))
                        ) : (
                          <p>loading tags ... </p>
                          // <button onClick={() => fetchTags(question.id)}>
                          //     Load Tags
                          // </button>
                        )}
                      </div></div>
          <hr />
          <div className="commentWord">comments</div>
          <hr />
          <CommentList questionId={question.id} />

          {/* 
          <div
            style={{
              color: "gray",
              fontSize: "1.3em",
              padding: "60px",
              paddingLeft: "30%",
            }}
            className="questionAns"
          >
            No answer till Now ...!
          </div> */}
          <hr />

          <div className="yourAns">
            <h4>Write Your Answer</h4>
            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="answerContent"
                id="answerInput"
                rows={2}
                cols={70}
                placeholder="Your answer here ..."
                required
              />
              <div className="submitPictureBox">
                {/* <h5 id="title" className="title-content">
                  Any Picture?
                </h5>
                <p className="title-content">
                  You can picture related to your answer.
                </p> */}

                {/* <div>
                  <div className="title-content">
                    <label htmlFor="imageInput">Select an image:</label>
                    <br />
                    <input
                      type="file"
                      id="imageInput"
                      name="imageInput"
                      accept="image/*"
                      onChange={(event) => {
                        setImageUpload(event.target.files[0])
                      }}
                    />
                    <button id="upload_file" onclick={submitImage}>
                      Submit
                    </button>
                  </div>
                </div> */}

                <button
                  type="submit"
                  id="postAns"
                  /*onClick={handlePost}*/ class="btn btn-outline-primary"
                >
                  Post Answer
                </button>
              </div>
            </form>
          </div>
        </main>
      )}
    </div>
  );
}

export default Question;

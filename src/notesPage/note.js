import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Modal from "react-modal";
import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { toolbarPlugin } from "@react-pdf-viewer/toolbar";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "./note.css";
import classNames from "classnames";
import { safeFormatDistance } from "../utils/date";
import user from "../user.png";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faBookmark} from "@fortawesome/free-solid-svg-icons";
import "../questionPage/questionPage.css";


const Note = ({ isOpen }) => {
  const location = useLocation();
  const note = location.state?.note;
  const [username, setUsernames] = useState();
  const defaultLayoutPluginInstance = defaultLayoutPlugin(); // pdf layout


  const [isUpvoted, setUpvoted] = useState("");
  const [isDownvoted, setDownvoted] = useState("");
  const [isVotingDisabled, setIsVotingDisabled] = useState(false);
  // const [isDownvotingDisabled, setIsDownvotingDisabled] = useState(false);
  const voteDelay = 800;

  const [isMarked, setIsMarked]  = useState("");

  const  fetchIsMarked = async () => {
    try {
      const res = await axios.post("http://localhost:8081/ismarkednote", { note_id :note.id });
      setIsMarked(res.data.result[0].row_exists);
      console.log(res.data.result[0].row_exists);
    } catch (error) {
      console.error("Error fetching username:", error);
      return "Unknown"
    }
  } 
  useEffect(() => {
    fetchIsMarked()

  }, []);
  const handelMarked =async () =>{
    console.log("clik")
    try {
      const response = await axios.post("http://localhost:8081/note_marked", {
        note_id: note.id,
        user_id: note.author_id
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
      const response = await axios.post("http://localhost:8081/note_unmarked", {
        note_id: note.id,
        user_id: note.author_id
      });
      fetchIsMarked();
      // console.log(response.data[0].value);
      // setMarked(response.data[0].value); // Set userVote state after receiving response
    } catch (error) {
      console.log(error);
    }
  }


  const [rating, setRating] = useState(note.rating !== null ? note.rating : 0);
  const fetchnoteRating = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8081/noterating",
        { target_id: note.id }
      );
      // console.log(response);
      setRating(response.data[0].rating !== null ? response.data[0].rating : 0);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchnoteRating(); // Call the fetchUserVote function on component mount
  }, [note]);

  const [userVote, setUserVote] = useState(0); // Initialize userVote state

  const fetchUserVote = async () => {
    try {
      const response = await axios.post("http://localhost:8081/noteuservote", {
        target_id: note.id,
      });
      // console.log(response.data[0].value);
      setUserVote(response.data[0].value); // Set userVote state after receiving response
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUserVote(); // Call the fetchUserVote function on component mount
  }, [note]); // Call fetchUserVote whenever the note changes

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
  });
  // values.target_id = note.id;
  // values.is_comment = false;

  useEffect(() => {
    setValues({
      ...values,
      target_id: note.id,
    });
  }, [note]);

  const handleDownVote = () => {
    values.vote_type = -1;
    //console.log(values.vote_type + "L")
    // setValues({ ...values, vote_type: '-1' });
    // setValues(prevValues => ({ ...prevValues, vote_type: -1 }));
    console.log(values);
    if (
      values.vote_type !== "" &&
      values.target_id !== "" 
    ) {
      setIsVotingDisabled(true); // Disable the downvote button
      axios
        .post("http://localhost:8081/notevote", values)
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
      values.target_id !== "" 
    ) {
      setIsVotingDisabled(true); // Disable the upvote button
      axios
        .post("http://localhost:8081/notevote", values)
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


  let mrProfessor  = "Not Provided!"
  if(note.prof_name !== ""){
    mrProfessor = note.prof_name
  }
  let sem = "Not Provided!"
  if(note.semester !== ""){
    sem = note.semester
  }

  // var rating = "2M";
  // var isVotingDisabled = false;
  // var isDownvoted = false;
  // var isUpvoted = true;

  // Checking, if pdf is a Buffer and convert it to a string
  const pdf_url = note?.pdf;
  let pdfUrlString = "";

  if (pdf_url && pdf_url.type === "Buffer") {
    pdfUrlString = new TextDecoder().decode(new Uint8Array(pdf_url.data));
  } else {
    pdfUrlString = pdf_url;
  }

  const [pop_isOpen, setpop_IsOpen] = useState(false);

  const openModal = () => setpop_IsOpen(true);
  const closeModal = () => setpop_IsOpen(false);

  // Define the toolbar plugin and disable specific buttons
  const toolbarPluginInstance = toolbarPlugin({
    openFileButton: {
      hidden: true, // Hide the open file button
    },
    moreActionsPopover: {
      disableOpenWithButton: true, // Disable the more actions button
    },
  });

  useEffect(() => {
    get_userName(note.author_id)
  }, []);
  const get_userName = async (id) => {
    try {
      const res = await axios.post("http://localhost:8081/username", { id });
      setUsernames(res.data);
      console.log(res.data);
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  return (
    <div>
      {note && (
        <main
          className={classNames("note-content", { "-noteactive": !isOpen })}
        >
          <div className="titles">
          <hr />
            <div className="userFlex">
              <div><img src={user} className="noteuserimg"/></div>
              <div className="theusernote">{username}</div>
              <div className="created_time">
               {safeFormatDistance(note?.created_at)}
              </div>
            </div>
            <div className="maintitle">
              <div class="voting-container">
                <div class="voting-buttons">
                  <button
                    onClick={handleUpVote}
                    id="upvote-button"
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
                <div Name="voting-buttons">
                  <span class="vote-score">{rating}</span>
                </div>
                <div class="voting-buttons">
                  <button
                    onClick={handleDownVote}
                    id="downvote-button"
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
              <h1 className={classNames("course", { "-courseactive": !isOpen })}>{note.course_name}</h1>
              <div className="nmark">
              {isMarked === 0 ? (<button id="nmarked" onClick={handelMarked}  > <FontAwesomeIcon icon={faBookmark}></FontAwesomeIcon>  Mark  </button>):(
                <button id="unnmarked" onClick={handelunMarked}> Unmark  </button>
              )}
              </div>
            </div>
          </div>
          <hr />
          <Link to={`/pdfChat/${note.id}`} state={{ note }}>
          <div className="divViewPdf">
            <button className="view-pdf" onClick={openModal}>
            <svg width="24" height="24" viewBox="0 0 24 27" fill="none" xmlns="http://www.w3.org/2000/svg"> = $0
<path d="M22.25 4.5C22.25 6.01878 21.0188 7.25 19.5 7.25C17.9812 7.25 16.75 6.01878 16.75 4.5C16.75 2.98122 17.9812
1.75 19.5 1.750C21.0188 1.75 22.25 2.98122 22.25 4.52" fill="currentColor"></path>
<path d="M12.7079 4.19048C12.6312 3.51289 12.0583 3.0007 11.3764 3C10.6944 2.9993 10.1205 3.51032 10.0424 4.18776C9.55454 8.41731 7.16731 10.8045 2.93776 11.2924C2.26032 11.3785 1.7493 11.9444 1.75 12.6264C1.7507 13.3083 2.26289 13.8812 2.94048 13.9579C7.11004 14.432 9.6628 16.7945 10.0388 21.027C10.1003 21.72 10.6811 22.2508 11.3765 22.25C12.072 22.2492 12.6515 21.7171 12.7115 21.0242C13.0727 16.8513 15.6013 14.3227 19.7742 13.9615C20.4671 13.9015 20.9992 13.322 21 12.6265C21.0008 11.9311 20.47 11.3503 19.7772 11.2888C15.5445 10.9128 13.1802 8.36004 12.7079 4.19048Z" fill="currentColor">
</path>

</svg> View PDF
            </button>
          </div>
          </Link>
          <div className="moreInfo">
            <div className="mrprof">■ Professor: {mrProfessor}</div>
            <div className="sem">■ Recommended for Semester: {sem}</div>
            <hr />
            <div className={classNames("noteDescripition", { "-Descriptionactive": !isOpen })} style={{ whiteSpace: 'pre-wrap' }} >
              {note.course_description}
            </div>
          </div>
          <div className="Last"></div>
          <Modal
            isOpen={pop_isOpen}
            onRequestClose={closeModal}
            contentLabel="PDF Modal"
            className="pdf-modal"
            overlayClassName="pdf-overlay"
          >
            <button onClick={closeModal} className="close-button">
              X
            </button>
            <div className="thePdf">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfUrlString}
                  plugins={[defaultLayoutPluginInstance, toolbarPluginInstance]}
                />
              </Worker>
            </div>
          </Modal>
        </main>
      )}
    </div>
  );
};

export default Note;

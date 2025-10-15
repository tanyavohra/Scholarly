import React, { useEffect, useState } from "react";
import classNames from "classnames";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./youComponents/youPage.css";
import { Container } from "reactstrap";
import userImg from '../user.png';
import { isElementOfType } from "react-dom/test-utils";
import "./youComponents/youPage.css";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { safeFormatDistance } from "../utils/date";


const LikedNotes = ({isOpen}) => {
  const [usernames, setUsernames] = useState({});
  const get_userName = async (id) => {
    try {
      const res = await axios.post("http://localhost:8081/username", { id });
      setUsernames((prevUsernames) => ({
        ...prevUsernames,
        [id]: res.data,
      }));
      console.log(res.data);
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };
    const [user, setUser] = useState({
        name: "",
        email: "",
      });
      const [likedQuestions, setLikedQuestions] = useState([]);
      useEffect(() => {
        axios
          .get("http://localhost:8081/userInfo")
          .then((res) => {
            setUser(res.data);
          })
          .catch((error) => console.error("Error fetching questions:", error));
        console.log("N");
      }, []);
      const decodePdfUrl = (pdf_url) => {
        let pdfUrlString = '';
        if (pdf_url && pdf_url.type === 'Buffer') {
          pdfUrlString = new TextDecoder().decode(new Uint8Array(pdf_url.data));
        } else {
          pdfUrlString = pdf_url;
        }
        return pdfUrlString;
      };
      const checkRating =(rating) =>{
        if(rating === null){
          return 0;
        }
    
        return rating;
      }
      
      useEffect(() => {
        const fetchLikedQuestions = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/api/notes/liked/${user[0].id}`);
                setLikedQuestions(response.data);
                response.data.forEach((note) => {
                    get_userName(note.author_id);
                  });
            } catch (err) {
              console.log("Hi")
                console.error('Error fetching liked questions:', err);
      
            } 
        };
      
        fetchLikedQuestions();
      }, [user]);

    return (
        <div className="main_liked">

          <div
            className="likedQuestions"
            style={{
              fontFamily: "Poppins, sans-serif",
              color: "#6d7fcc",
              fontSize: "34px",
            }}
          >
            Liked Notes
          </div>
          
          <ol className="notelistliked">
        {likedQuestions.map((note) => (
          <li className="note" key={note.id}>
            <Link to={`/note/${note.id}`} state={{ note }}>
              <div className="note-card">
                <div className="cardincard">
                <div className="pdfCover"></div>
                  <div className="pdf-preview">
                    {note.pdf ? (
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                          <Viewer fileUrl={decodePdfUrl(note.pdf)} style={{ width: '100%', height: '100%' }} defaultScale={0.421}>
                            <div>Loading PDF...</div>
                          </Viewer>
                        </Worker>
                        // <iframe
                        //   src={`${decodePdfUrl(note.pdf)}#page=0`}
                        //   width="200"
                        //   height="300"
                        //   title="PDF Preview"
                        // />
                        // <iframe
                        //   id="pdf-iframe"
                        //   src={decodePdfUrl(note.pdf)}
                        //   width="200"
                        //   height="300"
                        //   title="PDF Preview"
                        //   onLoad={() => renderFirstPage(decodePdfUrl(note.pdf))}
                        // />
                      ) : (
                        <div>Loading...</div>
                      )}
                  </div>
                  <div className="hideScroll"></div>

                </div>
                  <div className="hideScrollX"></div>
                <div className="noteuserContainer">
                  <div className="noteuser">
                    <div className="noteuserImgContainer">
                      <img src={userImg} className="nuser-image" />
                    </div>
                  </div>
                  <div className="noteInfo">
                    <h5 className="noteHead">{note.course_name}</h5>
                    <h6 className="writer">
                    {usernames[note.author_id] || "Loading..."}
                    </h6>
                    <div className="likesntime">
                      <div className="noteLikes">{checkRating(note.rating)} Votes</div>
                      <div className="dot">•</div>
                      <div className="notetime">
                        {safeFormatDistance(note?.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
        </div>
      );
}

export default LikedNotes;
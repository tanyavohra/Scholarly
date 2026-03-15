import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { Link } from "react-router-dom";
import axios from "axios";
import "./notes.css";
import user from "../user.png";
import { safeFormatDistance } from "../utils/date";
import { Worker, Viewer } from "@react-pdf-viewer/core";
// import "@react-pdf-viewer/core/lib/styles/index.css";
// import {
//   Worker,
//   Viewer,
//   SpecialZoomLevel
// } from "@react-pdf-viewer/core";
// import "@react-pdf-viewer/core/lib/styles/index.css";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
// import { PDFDocument } from "pdf-lib";
// console.log("pdfjs:", pdfjs);

  // const Notes = ({ isOpen }) => {
  //   const [notes, setNotes] = useState([]);
  //   const [usernames, setUsernames] = useState({});
  //   useEffect(() => {
  //     axios
  //       .get("http://localhost:8081/allnotes")
  //       .then((response) => {
  //         setNotes(response.data);
  //         response.data.forEach(async (note) => {
  //           await get_userName(note.author_id);
  //         });
  //       })
  //       .catch((error) => console.error("Error fetching questions:", error));
  //     console.log("aN");
  //   }, []);
  //   const navigate = useNavigate();
  //   async function get_userName(id){
  //     console.log("HIEROOR");
  //     try{
  //       const res = axios.post("http://localhost:8081/username", { id });
  //       setUsernames(async (prevUsernames) => ({
  //         ...prevUsernames,
  //         [id]: (await res).data,
  //       }));
  //       console.log((await res).data)
  //       console.log(usernames[id]);
  //     }catch(error){
  //         console.log("Hidjkdfi2")
  //         console.log(error);
  //   }
  //     console.log(usernames[id]);
  //   };
  //   return (
  //     <main className={classNames("notes-content", { "-notesactive": !isOpen })}>
  //       <div className={classNames("create", { "-createactive": !isOpen })}>
  //         <div
  //           className={classNames("createContainer", {
  //             "-createContaineractive": !isOpen,
  //           })}
  //         >
  //           <h1 id="creatHeading">Create a new Topic for notes...</h1>
  //           <button id="addButton">
  //             <a href="/addnote">Create</a>
  //           </button>
  //         </div>
  //       </div>
  //       <ol className={classNames("notelist", { "-notelistactive": !isOpen })}>
  //         {notes.map((note) => (
  //           <li className="note" key={note.id}>
  //             <Link to={`/note/${note.id}`} state={{ note }}>
  //               <div className="note-card">
  //                 <div className="cardincard">
  //                   <div className="course">
  //                     {/* <h7>[sem-I]</h7>
  //                 <h4>NN101</h4> */}
  //                   </div>
  //                   {/* <div className="prof">
  //                 <h4>Prof. Andrej Karphaty</h4>
  //               </div> */}
  //                 </div>
  //                 <div className="noteuserContainer">
  //                   <div className="noteuser">
  //                     <div>
  //                       <img src={user} className="nuser-image" />
  //                     </div>
  //                   </div>
  //                   <div className="noteInfo">
  //                     <h5 className="noteHead">{note.course_name}</h5>
  //                     <h6 className="writer">
  //                       {usernames[note.author_id] || "Loading..."}
  //                     </h6>
  //                     <div className="likesntime">
  //                       <div className="noteLikes">{note.votes} Votes</div>
  //                       <div className="dot">•</div>
  //                       <div className="notetime">
  //                         {formatDistanceToNow(new Date(note.created_at), {
  //                           addSuffix: true,
  //                         })}
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </div>
  //               </div>
  //             </Link>
  //           </li>
  //         ))}
  //         {/* <li className="note">
  //          <div className="note-card">
  //            <div className="cardincard">
  //              <div className="course">
  //                <h4>Introduction to Neural Networks</h4>
  //                <h7>[sem-I]</h7>
  //                <h4>NN101</h4>
  //              </div>
  //              <div className="prof">
  //                <h4>Prof. Andrej Karphaty</h4>
  //              </div>
  //            </div>
  //            <div className="noteuserContainer">
  //                <div className="noteuser">
  //                  <div>
  //                    <img src={user} className="nuser-image" />
  //                  </div>
  //                </div>
  //                <div className="notetime">3 min ago</div>
  //              </div>
  //          </div>
  //        </li> */}
  //       </ol>
  //     </main>
  //   );
  // };
  // export default Notes;


  /* <li className="note" key={ note.id}>
         
          <div className="note-card">
            <div className="cardincard">
              <div className="course">
                <h4>Introduction to Neural Networks</h4>
                <h7>[sem-I]</h7>
                <h4>NN101</h4>
              </div>
              <div className="prof">
                <h4>Prof. Andrej Karphaty</h4>
              </div>
            </div>
            <div className="noteuserContainer">
                <div className="noteuser">
                  <div>
                    <img src={user} className="user-image" />
                  </div>
                  <div className="notename">@soham_the_legend</div>
                </div>
                <div className="notetime">3 min ago</div>
              </div>
          </div>
      
        </li>
 */

// const Notes = ({ isOpen }) => {
//   const [notes, setNotes] = useState([]);
//   const [usernames, setUsernames] = useState({});

//   useEffect(() => {
//     axios
//       .get("http://localhost:8081/allnotes")
//       .then((response) => {
//         setNotes(response.data);
//         response.data.forEach((note) => {
//           get_userName(note.author_id);
//         });
//       })
//       .catch((error) => console.error("Error fetching notes:", error));
//   }, []);

//   const navigate = useNavigate();

//   const get_userName = async (id) => {
//     try {
//       const res = await axios.post("http://localhost:8081/username", { id });
//       setUsernames((prevUsernames) => ({
//         ...prevUsernames,
//         [id]: res.data,
//       }));
//       console.log(res.data);
//     } catch (error) {
//       console.error("Error fetching username:", error);
//     }
//   };

//   const fetchPdfPreview = async (filename) => {
//     try {
//       const previewUrl = `http://localhost:8081/pdf-preview/${filename}`;
//       const response = await axios.get(previewUrl, { responseType: 'blob' });
//       return URL.createObjectURL(response.data);
//     } catch (error) {
//       console.error("Error fetching PDF preview:", error);
//       return null;
//     }
//   };

//   // useEffect(() => {
//   //   console.log("Updated usernames:", usernames);
//   // }, [usernames]);
//   const [thumb, setThumb] = useState(null)
//   // useEffect(() =>{
//   //   const getThumbnail = async() =>{
//   //     const CoreControls = window.CoreControls;
//   //     CoreControls.setWorkerPath('/webviewer/lib/core');
//   //     const doc = await CoreControls.createDocumen('', {extension: 'pdf'});
//   //     doc.loadCanvasAsync({
//   //       pageNumber: 1,
//   //       drawComplete: (thumbnail) =>{
//   //         setThumb(thumbnail);
//   //       }
//   //     });
//   //   }
//   //   getThumbnail();
//   // }, []);
//   useEffect(() => {
//     const getThumbnail = async () => {
//       try {
//         const instance = await WebViewer({
//           path: '/lib', // Path to the WebViewer 'lib' folder on your server
//           initialDoc: '/path/to/sample.pdf', // Path to a sample PDF
//         }, document.getElementById('viewer'));

//         const doc = instance.Core.documentViewer.getDocument();
//         const pageNumber = 1;
//         const canvas = await doc.loadCanvasAsync({ pageNumber });
//         setThumb(canvas);
//       } catch (error) {
//         console.error("Error creating thumbnail:", error);
//       }
//     };
//     getThumbnail();
//   }, []);

//   return (
//     <main className={classNames("notes-content", { "-notesactive": !isOpen })}>
//       <div className={classNames("create", { "-createactive": !isOpen })}>
//         <div
//           className={classNames("createContainer", {
//             "-createContaineractive": !isOpen,
//           })}
//         >
//           <h1 className={classNames("creatHeading", { "-activeCreatHeading": !isOpen })}>Upload the new notes...</h1>
//           <button id="addButton">
//             <a href="/addnote">Upload</a>
//           </button>
//         </div>
//       </div>

//       <ol className={classNames("notelist", { "-notelistactive": !isOpen })}>
//         {notes.map((note) => (
//           <li className="note" key={note.id}>
//             <Link to={`/note/${note.id}`} state={{ note }}>
//               <div className="note-card">
//                 <div className="cardincard">
//                 <div className="pdf-preview">
//                 {true && <img src={thumb.toDataURL()} width='200px' height='300px' alt="PDF preview" />}
//                 </div>
//                 </div>
//                 <div className="noteuserContainer">
//                   <div className="noteuser">
//                     <div>
//                       <img src={user} className="nuser-image" />
//                     </div>
//                   </div>
//                   <div className="noteInfo">
//                     <h5 className="noteHead">{note.course_name}</h5>
//                     <h6 className="writer">
//                       {usernames[note.author_id] || "Loading..."}
//                     </h6>
//                     <div className="likesntime">
//                       <div className="noteLikes">{note.votes} Votes</div>
//                       <div className="dot">•</div>
//                       <div className="notetime">
//                         {formatDistanceToNow(new Date(note.created_at), {
//                           addSuffix: true,
//                         })}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//           </li>
//         ))}
//       </ol>
//     </main>
//   );
// };

// export default Notes;

const Notes = ({ isOpen }) => {
  const [notes, setNotes] = useState([]);
  const [usernames, setUsernames] = useState({});
  

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
    axios
      .get("http://localhost:8081/allnotes")
      .then((response) => {
        setNotes(response.data);
        response.data.forEach((note) => {
          get_userName(note.author_id);
        });
      })
      .catch((error) => console.error("Error fetching notes:", error));
  }, []);

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

  


  return (
    <main className={classNames("notes-content", { "-notesactive": !isOpen })}>
      <div className={classNames("create", { "-createactive": !isOpen })}>
        <div
          className={classNames("createContainer", {
            "-createContaineractive": !isOpen,
          })}
        >
          <h1
            className={classNames("creatHeading", {
              "-activeCreatHeading": !isOpen,
            })}
          >
            Upload the new notes...
          </h1>
          <Link id="addButton" to="/addnote">
            Upload
          </Link>
        </div>
      </div>

      <ol className={classNames("notelist", { "-notelistactive": !isOpen })}>
        {notes.slice().reverse().map((note) => (
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
                      <img src={user} className="nuser-image" alt="User avatar" />
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
    </main>
  );
};

export default Notes;

// const Notes = ({ isOpen }) => {
//   const [notes, setNotes] = useState([]);
//   const [usernames, setUsernames] = useState({});
//   const [thumbnailUrl, setThumbnailUrl] = useState(""); // State to store thumbnails
//   const pdfUrl = "https://pdfobject.com/pdf/sample.pdf"; // Sample PDF URL
//   // useEffect(() => {
//   //   const pdfUrl = "https://pdfobject.com/pdf/sample.pdf"; // Sample PDF URL
//   //   axios
//   //     .get(
//   //       `http://localhost:8080/pdf-thumbnail?url=${encodeURIComponent(pdfUrl)}`
//   //     )
//   //     .then((response) => {
//   //       setThumbnailUrl(response.data);
//   //     })
//   //     .catch((error) => {
//   //       console.error("Error fetching PDF thumbnail:", error);
//   //     });
//   // }, []);
//   useEffect(() => {
//     axios
//       .get("http://localhost:8081/allnotes")
//       .then((response) => {
//         setNotes(response.data);
//         response.data.forEach((note) => {
//           getUserName(note.author_id);
//         });
//       })
//       .catch((error) => console.error("Error fetching notes:", error));
//   }, []);

//   const getUserName = async (id) => {
//     try {
//       const res = await axios.post("http://localhost:8081/username", { id });
//       setUsernames((prevUsernames) => ({
//         ...prevUsernames,
//         [id]: res.data,
//       }));
//     } catch (error) {
//       console.error("Error fetching username:", error);
//     }
//   };

//   // const fetchPdfThumbnail = async (url) => {
//   //   try {
//   //     console.log("Fetching PDF:", url);
//   //     console.log("pdfjs:", pdfjs); // Check if pdfjs is defined
//   //     const response = await fetch(url);
//   //     console.log("Response:", response);
//   //     const arrayBuffer = await response.arrayBuffer();
//   //     console.log("ArrayBuffer:", arrayBuffer);
//   //     const pdf = await pdfjs.getDocument(arrayBuffer).promise;
//   //     console.log("PDF Document:", pdf);
//   //     const page = await pdf.getPage(1);
//   //     console.log("Page 1:", page);
//   //     const viewport = page.getViewport({ scale: 1.0 });
//   //     const canvas = document.createElement("canvas");
//   //     const context = canvas.getContext("2d");
//   //     canvas.height = viewport.height;
//   //     canvas.width = viewport.width;
//   //     const renderContext = {
//   //       canvasContext: context,
//   //       viewport: viewport,
//   //     };
//   //     await page.render(renderContext).promise;
//   //     const dataUrl = canvas.toDataURL("image/jpeg"); // Convert to data URL (JPEG format)

//   //     // Update thumbnails state
//   //     setThumbnails((prevThumbnails) => ({
//   //       ...prevThumbnails,
//   //       [url]: dataUrl,
//   //     }));
//   //   } catch (error) {
//   //     console.error("Error fetching or rendering PDF:", error);
//   //   }
//   // };

//   // // Fetch PDF thumbnails on component mount
//   // useEffect(() => {
//   //   fetchPdfThumbnail(pdfUrl); // Fetch thumbnail for the sample PDF
//   // }, []);
//   return (
//     <main className={classNames("notes-content", { "-notesactive": !isOpen })}>
//       <div className={classNames("create", { "-createactive": !isOpen })}>
//         <div
//           className={classNames("createContainer", {
//             "-createContaineractive": !isOpen,
//           })}
//         >
//           <h1
//             className={classNames("creatHeading", {
//               "-activeCreatHeading": !isOpen,
//             })}
//           >
//             Upload the new notes...
//           </h1>
//           <button id="addButton">
//             <a href="/addnote">Upload</a>
//           </button>
//         </div>
//       </div>

//       <ol className={classNames("notelist", { "-notelistactive": !isOpen })}>
//         {notes.map((note) => (
//           <li className="note" key={note.id}>
//             <Link to={`/note/${note.id}`} state={{ note }}>
//               <div className="note-card">
//                 <div className="cardincard">
//                   <div className="pdf-preview">
//                     {/* <div>
//                       {thumbnailUrl ? (
//                         <img src={thumbnailUrl} alt="PDF Thumbnail" />
//                       ) : (
//                         <div>Loading...</div>
//                       )}
//                     </div> */}
//                     <Worker workerUrl="/path/to/pdf.worker.min.js">
//         <Viewer fileUrl={pdfUrl}>
//           <div>Loading PDF...</div>
//         </Viewer>
//       </Worker>
//                   </div>
//                 </div>
//                 <div className="noteuserContainer">
//                   <div className="noteuser">
//                     <div>
//                       <img src={user} className="nuser-image" alt="User" />
//                     </div>
//                   </div>
//                   <div className="noteInfo">
//                     <h5 className="noteHead">{note.course_name}</h5>
//                     <h6 className="writer">
//                       {usernames[note.author_id] || "Loading..."}
//                     </h6>
//                     <div className="likesntime">
//                       <div className="noteLikes">{note.votes} Votes</div>
//                       <div className="dot">•</div>
//                       <div className="notetime">
//                         {formatDistanceToNow(new Date(note.created_at), {
//                           addSuffix: true,
//                         })}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//           </li>
//         ))}
//       </ol>
//     </main>
//   );
// };

// export default Notes;

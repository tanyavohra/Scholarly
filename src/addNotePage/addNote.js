// import React, { useState } from "react";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage } from "../Firebase";
// import { v4 } from "uuid";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import "./addNote.css";

// function Ask() {
//   const [values, setValues] = useState({
//     course_name: "",
//     semester: "",
//     prof_name: "",
//     course_description: "",
//     pdf_url: "",
//     file_name: "",
//     file_size: ""
//   });

//   const navigate = useNavigate();

//   const handleInput = (event) => {
//     setValues((prev) => ({
//       ...prev,
//       [event.target.name]: event.target.value,
//     }));
//   };

//   const [pdfUpload, setPdfUpload] = useState(null);
//   const pdfsListRef = ref(storage, "notes/");
//   let pdfRef = "";

//   const handlePost = async (event) => {
//     event.preventDefault();
//     console.log("pdf-------------------", pdfUpload)
//     if (values.course_description !== "" && values.course_name !== "" && pdfUpload !== null) {
//       pdfRef = ref(storage, `notes/${pdfUpload.name + v4()}`);
//       try {
//         const snapshot = await uploadBytes(pdfRef, pdfUpload);
//         const pdfUrl = await getDownloadURL(snapshot.ref);
//         const updatedValues = {
//           ...values,
//           pdf_url: pdfUrl,
//           file_name: pdfUpload.name,
//           file_size: pdfUpload.size,
//         };
//         const response = await axios.post("http://localhost:8081/noteupload", updatedValues);
//         console.log(response);
//         navigate("/Home");
//       } catch (err) {
//         console.log(err);
//       }
//     }
//   };

//   return (
//     <main className="main-content">
//       <h3 id="heading">Let's start ... </h3>

//       <form>
//         <div className="title">
//           <div className="title-box">
//             <h5 id="title" className="title-content">
//               Course Name*
//             </h5>
//             <p className="title-content">This will be the title of your notes</p>
//             <div className="bottom">
//               <input
//                 type="text"
//                 name="course_name"
//                 className="title-content"
//                 id="search-input"
//                 onChange={handleInput}
//                 placeholder="ex: Introduction to Neural Networks"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="title">
//           <div className="question-box">
//             <h5 id="title" className="title-content">
//               Description*
//             </h5>
//             <p className="title-content">
//               Please describe the note content in short
//             </p>
//             <div className="bottom">
//               <textarea
//                 name="course_description"
//                 onChange={handleInput}
//                 className="title-content"
//                 id="question-input"
//                 rows={2}
//                 cols={70}
//                 placeholder="ex: These notes cover the basic principles and techniques of neural networks..."
//               />
//             </div>
//           </div>
//         </div>

//         <div className="title">
//           <div className="optional-box">
//             <h5 id="title" className="title-content">
//               Optional Information
//             </h5>
//             <p className="title-content">
//               Please provide the recommended semester for the notes
//             </p>
//             <div className="bottom">
//               <input
//                 type="text"
//                 name="semester"
//                 className="title-content"
//                 id="search-input"
//                 onChange={handleInput}
//                 placeholder="ex: 3"
//               />
//             </div>
//             <div style={{ height: '30px' }} />
//             <p className="title-content">
//               Please provide the name of the professor related to the notes (if any)
//             </p>
//             <div className="bottom">
//               <input
//                 type="text"
//                 name="prof_name"
//                 className="title-content"
//                 id="search-input"
//                 onChange={handleInput}
//                 placeholder="ex: Dr. Smith"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="title">
//           <div className="pic-box">
//             <h5 id="title" className="title-content">
//               Upload Notes*
//             </h5>
//             <p className="title-content">
//               Upload the PDF of the notes
//             </p>
//             <div className="bottom">
//               <div className="title-content">
//                 <label htmlFor="pdfInput">Select the file:</label>
//                 <br />
//                 <input
//                   type="file"
//                   accept="application/pdf"
//                   onChange={(event) => {
//                     setPdfUpload(event.target.files[0]);
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         <button
//           type="submit"
//           id="done"
//           onClick={handlePost}
//           className="btn btn-outline-primary"
//         >
//           Post Notes
//         </button>
//       </form>
//     </main>
//   );
// }

// export default Ask;


import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../Firebase";
import { v4 } from "uuid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./addNote.css";

function Ask() {
  const [values, setValues] = useState({
    course_name: "",
    semester: "",
    prof_name: "",
    course_description: "",
    pdf_url: "",
    file_name: "",
    file_size: ""
  });

  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const [pdfUpload, setPdfUpload] = useState(null);

  const handlePost = async (event) => {
    event.preventDefault();
    console.log("pdf-------------------", pdfUpload)
    if (values.course_description !== "" && values.course_name !== "" && pdfUpload !== null) {
      const pdfRef = ref(storage, `notes/${pdfUpload.name + v4()}`);
   try {
  const snapshot = await uploadBytes(pdfRef, pdfUpload);
  const pdfUrl = await getDownloadURL(snapshot.ref);
  const updatedValues = {
    ...values,
    pdf_url: pdfUrl,
    file_name: pdfUpload.name,
    file_size: pdfUpload.size,
  };

  console.log(updatedValues);

  const response = await axios.post(
    "http://localhost:8081/noteupload",
    updatedValues,
    { withCredentials: true } 
  );

  console.log(response.data);

  
  navigate("/notes");
} catch (err) {
  console.log(err);
}

    } else {
      console.log("Please fill all required fields and upload a PDF");
    }
  };

  return (
    <main className="main-content">
      <h3 id="heading">Let's start ... </h3>

      <form onSubmit={handlePost}>
        <div className="title">
          <div className="title-box">
            <h5 id="title" className="title-content">
              Course Name*
            </h5>
            <p className="title-content">This will be the title of your notes</p>
            <div className="bottom">
              <input
                type="text"
                name="course_name"
                className="title-content"
                id="search-input"
                onChange={handleInput}
                placeholder="ex: Introduction to Neural Networks"
                required
              />
            </div>
          </div>
        </div>

        <div className="title">
          <div className="question-box">
            <h5 id="title" className="title-content">
              Description*
            </h5>
            <p className="title-content">
              Please describe the note content in short
            </p>
            <div className="bottom">
              <textarea
                name="course_description"
                onChange={handleInput}
                className="title-content"
                id="question-input"
                rows={2}
                cols={70}
                placeholder="ex: These notes cover the basic principles and techniques of neural networks..."
                required
              />
            </div>
          </div>
        </div>

        <div className="title">
          <div className="optional-box">
            <h5 id="title" className="title-content">
              Optional Information
            </h5>
            <p className="title-content">
              Please provide the recommended semester for the notes
            </p>
            <div className="bottom">
              <input
                type="text"
                name="semester"
                className="title-content"
                id="search-input"
                onChange={handleInput}
                placeholder="ex: 3"
              />
            </div>
            <div style={{ height: '30px' }} />
            <p className="title-content">
              Please provide the name of the professor related to the notes (if any)
            </p>
            <div className="bottom">
              <input
                type="text"
                name="prof_name"
                className="title-content"
                id="search-input"
                onChange={handleInput}
                placeholder="ex: Dr. Smith"
              />
            </div>
          </div>
        </div>

        <div className="title">
          <div className="pic-box">
            <h5 id="title" className="title-content">
              Upload Notes*
            </h5>
            <p className="title-content">
              Upload the PDF of the notes
            </p>
            <div className="bottom">
              <div className="title-content">
                <label htmlFor="pdfInput">Select the file:</label>
                <br />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    setPdfUpload(event.target.files[0]);
                  }}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          id="done"
          className="btn btn-outline-primary"
        >
          Post Notes
        </button>
      </form>
    </main>
  );
}

export default Ask;


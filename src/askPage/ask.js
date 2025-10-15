import React, { useState, useEffect } from "react";
// import "bootstrap/dist/css/bootstrap.min.css";
//import SideBar from "./youComponents/sidebar/Side";
import Content from "./components/content/Content";
import "./components/askPage.css";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  list,
} from "firebase/storage";
import { storage } from "../Firebase";
import { v4 } from "uuid";

import { Switch, Route, Routes, useNavigate } from "react-router-dom";
import "../components/page.css";
import axios from "axios";

function Ask() {
  const [values, setValues] = useState({
    title: "",
    question: "",
    url: "",
    tags: [],
  });

  const [tags, setTags] = useState([]); 
  const [tag, setTag] =  useState("");

  const handleKeyDown = (e) => {
    const code = e.keyCode || e.which;
    const newTag = tag.trim();
    if((code !== 13 && code !== 188) || tag.length===0){
      return ;
    }
    if(!tags.includes(tag)){
      setTags([...tags, tag]);
      setValues((prev) => ({
        ...prev,
        [tags]: [...prev.tags,tag],
      }));
    }
    setTimeout(() => { 
      setTag(""); 
    }, 0);
    
  }
  const handleAddTag = (newTag) => {
    if (newTag.trim() === "") return; // Avoid adding empty tags
    setValues(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]  // Add the new tag to the tags array
    }));
    setTag("");  // Clear the tag input
  };


  const deleteTag = (index) => {
    const dupTags = [...tags];
    dupTags.splice(index, 1); // 1 thing remmoved at index
    setTags(dupTags);
  }
  const handleRemoveTag = (index) => {
    // Create a new array without the tag at the specified index
    const newTags = values.tags.filter((_, i) => i !== index);
    
    // Update the `tags` field in the `values` object
    setValues(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const navigate = useNavigate();

  

  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: [event.target.value],
    }));
  };

  const [imageUpload, setImageUpload] = useState(null);
  // const [imageUrls, setImageUrls] = useState([]);
  const imagesListRef = ref(storage, "queimages/");
  var imageRef="";
  const submitImage = (event) => {
    event.preventDefault();
    if (imageUpload == null) return;
    imageRef = ref(storage, `queimages/${imageUpload.name + v4()}`);
    uploadBytes(imageRef, imageUpload).then(async (snapshot) => {
      const imageUrl = await getDownloadURL(snapshot.ref);
      // setImageUrls((prevImageUrls) => [...prevImageUrls, imageUrl]);
      setValues((prev) => {
        const updatedDictionary = { ...prev };
        updatedDictionary.url = imageUrl;

        return updatedDictionary;
      });
      alert("Image Uploaded");
    });
  };

  console.log(values);
  const handlePost = (event) => {
    values.tags = tags
    if (values.question !== "" && values.title !== "") {
      axios
        .post("http://localhost:8081/question", values)
        .then((res) => {
          console.log(res);
          
        })
        .catch((err) => console.log(err));
    }
    navigate("/questions");
  };


  //  
  // useEffect(() => {
  //   listAll(imagesListRef).then((response) => {
  //     response.items.forEach((item) => {
  //       getDownloadURL(item).then((url) => {
  //         setImageUrls((prev) => [...prev, url]);
  //       });
  //     });
  //   });
  // }, []);

  return (
    <main className="main-content">
      <h3 id="heading">Let's start ... </h3>

      <form>
        <div className="title">
          <div class="title-box">
            <h5 id="title" className="title-content">
              Title
            </h5>
            <p className="title-content">boil down your problem in one line</p>
            <div className="bottom">
              <input
                type="text"
                name="title"
                className="title-content"
                id="search-input"
                onChange={handleInput}
                placeholder="ex: What is a Object in Javascript?"
              />
              
            </div>
          </div>
          {/* <div class="side-box-title">
            <h6 className="side-box-title-content">
              write your title as much attractive as possible
            </h6>
          </div> */}
        </div>

        <div className="title">
          <div class="question-box">
            <h5 id="title" className="title-content">
              Share the details of your problem
            </h5>
            <p className="title-content">
              Describe the problem in detail. Minimum 20 chars
            </p>
            <div className="bottom">
              <textarea
                name="question"
                onChange={handleInput}
                className="title-content"
                id="question-input"
                rows={2}
                cols={70}
                defaultValue={""}
              />
              
            </div>
          </div>
          {/* <div class="side-box-title">
            <h6 className="side-box-title-content">
              Describe what you tried, what you expected to happen, and what
              actually resulted.
            </h6>
          </div> */}
        </div>
        <div className="title">
        <div className="tag-box">

        <div className="tag-input-box">
          <label id="enterlable" for="tag-input">Enter tags</label>
          <p id="press">Press enter to add new tag. You can also seperate the tags by comma.</p>
          <div className="tags-container">
            {tags.map((tag, index) => (
              <div className="tag">
                <span className="name">{tag}</span>
                <span className="icon" onClick={() => deleteTag(index)}>&times;</span>
                {/* <span className="icon" onClick={() => handleRemoveTag(index)}>&times;</span> */}
              </div>
            ))}
            <input
              type="text"
              id="tag-input"
              placeholder="Type tag here"
              value={tag}
              name="tags"
              maxLength={50}
              // onChange={(e)=>setTag(e.target.value)}
              // // onChange={handleInput}
              onChange={(e) => {
                // handleIn/put(e); // Assuming handleInput is defined and expects the event
                setTag(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              // onKeyDown={(e) => {
              //   if (e.key === 'Enter' || e.key === 'Comma') {
              //     handleAddTag(tag);
              //   }
              // }}
              />
          </div>
        </div>
        </div>
        {/* <div class="side-box-title">
            <h6 className="side-box-title-content">
              write your title as much attractive as possible
            </h6>
          </div> */}
        </div>
        <div className="title">
          <div class="pic-box">
            <h5 id="title" className="title-content">
              Any Picture?
            </h5>
            <p className="title-content">
              You can upload the picture related to your problem.
            </p>
            <div className="bottom">
              <div>
                <div className="title-content">
                  <label htmlFor="imageInput">Browse or Drag the image: </label>
                  <br />
                  <input
                    type="file"
                    id="input_file"
                    onChange={(event) => {
                      setImageUpload(event.target.files[0]);
                      // setImageToDelete(event.target.value)
                    }}
                  />
                  <button onClick={submitImage} id="upload_file">Upload Image</button>
                  {/* Button to trigger the deletion */}
                  {/* <button onClick={handleDeleteImage}>remove Image</button> */}
                </div>
              </div>
            </div>
          </div>
          {/* <div class="side-box-title">
            <h6 className="side-box-title-content">It is optional...</h6>
          </div> */}
        </div>

        <button
          type={"submit"}
          id="done"
          onClick={handlePost}
          class="btn btn-outline-primary"
        >
          Post Question
        </button>
      </form>
    </main>
  );
}
export default Ask;

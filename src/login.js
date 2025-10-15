import { useState } from "react";
import React from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import LogValidation from "./LogValidation";
import Validation from "./signupValidation";
import { faSmokingBan } from "@fortawesome/free-solid-svg-icons";
import Scholarly from "./brainlink.png";
import Scholarly2 from "./brainlink.png";
import Scholarly3 from "./brainlink3.png";
import link1 from "./link.png";

function Login() {
  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: [event.target.value],
    }));
  };
  //console.log(values);
  axios.defaults.withCredentials = true;
  const handleSubmit = (event) => {
    event.preventDefault();
    setErrors(LogValidation(values));
    if (errors.email === "" && errors.password === "") {
      axios
        .post("http://localhost:8081/login", values)
        .then((res) => {
          if (res.data.Status === "Success") {
            navigate("/Home");
            window.location.reload(true);
          } else {
            console.log(res);
            alert(res.data.Message);
          }
          console.log(values);
        })
        .catch((err) => console.log(err));
    }else{
      // alert(errors.password)
    }
  };

  const [signvalues, setSignValues] = useState({
    name: "",
    email: "",
    password: "",
    confpass: "",
  });

  const [signerrors, setsignErrors] = useState({});
  const handleSignInput = (event) => {
    setSignValues((prev) => ({
      ...prev,
      [event.target.name]: [event.target.value],
    }));
  };
  console.log(signvalues);

  const handleSignSubmit = (event) => {
    event.preventDefault();
    setsignErrors(Validation(signvalues));
    // console.log(signerrors)
    // console.log(signerrors.email)
    // console.log(signerrors.password)
    console.log(signvalues.password);
    console.log(signvalues.confpass);
    if (signvalues.password[0] !== signvalues.confpass[0]) {
      alert("Reconfirm the password!!!");
    } else {
      if (
        signerrors.name === "" &&
        signerrors.email === "" &&
        signerrors.password === ""
      ) {
        console.log("CLICK");
        axios
          .post("http://localhost:8081/signup", signvalues)
          .then((res) => {
            if (res.data.Status === "Success") {
              console.log(res);
              window.location.reload(true);
            }
             else {
              console.log(res);
              alert(res.data.Message);
            }
          })
          .catch((err) => {
            console.log("409")
            alert("Username already exists")
            console.log(err)});
      }
    }
  };

  const [isChecked, setIsChecked] = useState(false)
  const handleCheckboxChange = (event) => {
    setIsChecked(event.target.checked);
  };

  const getLabelText = () => {
    return isChecked ? 'back to Login' : 'Sign up';
  };

  return (
    <>
      <div className="body_login">
        <div className="video-background">
          <video autoPlay muted loop className="bg-video">
            <source src="/Neon Green Teal Geometric Photo Tech and Gaming Facebook Cover.mp4" type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
        </div>
        <img className="Scholarly-img" src={link1} alt="Scholarly" />
        <div class="main-login" src="./login.avif">
          <input
            className="login-inputs"
            type="checkbox"
            id="chk"
            checked={isChecked}
            aria-hidden="true"
            onChange={handleCheckboxChange}
          />
          <div class="signup">
            <form action="" onSubmit={handleSubmit}>
              <label className="login-label" aria-hidden="true">
                Login
              </label>
              <input
                className="login-inputs"
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleInput}
                required
              />{" "}
              {errors.email && <span className="danger">{errors.email}</span>}
              <input
                className="login-inputs"
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleInput}
                required
              />
              {errors.password && (
                <span id="email-errors" className="text-danger">
                  {errors.password}
                </span>
              )}
              <button className="button-login" type="submit">
                Login
              </button>
            </form>
          </div>
          <div class="login">
            <form action="" onSubmit={handleSignSubmit}>
              <label className="login-label" for="chk" aria-hidden="true">
                {isChecked ? (
                  <>
                  
                  <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      width="40" // You can customize the width
      height="40" // You can customize the height
      id="back_icon"
    >
      <path
        fill="#573b8a" // You can customize the fill color
        d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8 .4 34.3z"
      />
    </svg> <p id="backtolog">Back to Login</p>
                  </>
                ):(
                  <>Sign up</>
                )}
              </label>
              <input
                className="login-inputs"
                type="text"
                name="name"
                placeholder="User name"
                required
                onChange={handleSignInput}
              />
              {errors.name && <span className="danger">{errors.name}</span>}
              <input
                className="login-inputs"
                type="email"
                name="email"
                placeholder="Email"
                required
                onChange={handleSignInput}
              />
              {errors.email && <span className="danger">{errors.email}</span>}
              <input
                className="login-inputs"
                type="password"
                name="password"
                placeholder="Password"
                required
                onChange={handleSignInput}
              />
              {errors.password && (
                <span className="danger">{errors.password}</span>
              )}
              <input
                className="login-inputs"
                type="password"
                name="confpass"
                placeholder="Confirm Password"
                required
                onChange={handleSignInput}
              />
              <button type="submit" className="button-login">
                Sign up
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
export default Login;

// <div className="login-box">
//   <div id="inner-box" className="bg-white p-3 rounded w-25">
//     <h2>Login</h2>
//     <form action="" onSubmit={handleSubmit}>
//       <div className="inputs">
//         <label htmlFor="email">
//           <strong>Email</strong>
//         </label>
//         <input
//           type="email"
//           placeholder="Enter Email"
//           className="form-control rounded-0"
//           onChange={handleInput}
//           name="email"
//         />
//         {errors.email && (
//           <span className="text-danger">{errors.email}</span>
//         )}
//       </div>
//       <div className="inputs">
//         <label htmlFor="password">
//           <strong>Password</strong>
//         </label>
//         <input
//           type="password"
//           placeholder="Enter Password"
//           className="form-control rounded-0"
//           onChange={handleInput}
//           name="password"
//         />
//         {errors.password && (
//           <span className="text-danger">{errors.password}</span>
//         )}
//       </div>
//       <div className="login-btn">
//         <button
//           type="submit"
//           id="login-btn"
//           className="btn btn-success w-100 rounded-0"
//         >
//           Log
//         </button>
//         <p>You are agree to our terms and policies</p>
//         <Link
//           to="/signup"
//           className="btn btn-default border w-100 bg-light rounded-0 text-decoration-none"
//         >
//           Create Account
//         </Link>
//       </div>
//     </form>
//   </div>
// </div>

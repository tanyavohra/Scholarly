import React from "react";
import { Link } from "react-router-dom";

function Contact() {
  return (
    <div
      style={{
        padding: "2rem",
        marginLeft: "240px",  
        marginTop: "80px"   
      }}
    >
      <h2>Contact</h2>

      <p>
        If you have feedback, bug reports, or feature requests, reach out.
      </p>

      <ul>
        <li>
          Email:{" "}
          <a href="mailto:vohratanya5@gmail.com">
            vohratanya5@gmail.com
          </a>
        </li>
      </ul>

      <p>
        <Link to="/home">Back to Home</Link>
      </p>
    </div>
  );
}

export default Contact;

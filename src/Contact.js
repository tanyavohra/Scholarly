import React from "react";
import { Link } from "react-router-dom";

function Contact() {
  return (
    <div style={{ padding: "1rem" }}>
      <h2>Contact</h2>
      <p>
        If you have feedback, bug reports, or feature requests, reach out to the
        team.
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href="mailto:support@scholarly.local">support@scholarly.local</a>
        </li>
      </ul>
      <p>
        <Link to="/Home">Back to Home</Link>
      </p>
    </div>
  );
}

export default Contact;

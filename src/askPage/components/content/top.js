
import { faImage } from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";
import {
  Navbar,
  Button,
  NavbarToggler,
  Collapse,
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import "../../../components/page.css";
import React, { useEffect, useState } from "react";
import axios from "axios";

const Topbar = ({ toggleSidebar }) => {
  
  const [topbarIsOpen, setTopbarOpen] = useState(true);
  const toggleTopbar = () => setTopbarOpen(!topbarIsOpen);

  const [auth, setAuth] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  //.....
  axios.defaults.withCredentials = true;
  //.......

  useEffect(() => {
    axios.get("http://localhost:8081/auth").then((res) => {
      // console.log(res.data.Status)
      if (res.data.Status === "Success") {
        setAuth(true);
        setName(res.data.name);
      } else {
        //console.log("S");
        setAuth(false);
        setMessage(res.data.Message);
      }
    });
  }, []);

  const navigate = useNavigate();


  return (
    <Navbar
      color="light"
      light
      className="navbar"
      expand="md"
    >
      <Button color="info" onClick={toggleSidebar}>
        <FontAwesomeIcon icon={faAlignLeft} />
      </Button>
      <NavbarToggler onClick={toggleTopbar} />
      <Collapse isOpen={topbarIsOpen} navbar>
        <Nav className="ml-auto" navbar>
          <div class="grid-container">
            <NavItem>
              <div className="brand">Scholarly</div>
            </NavItem>
            <NavItem>
              <div class="search-container">
                <input type="text" id="search-input" placeholder="Search..." />
                <button type="button" id="search-button">
                  Search
                </button>
              </div>
            </NavItem>
            <NavItem>
              <button className="ask-button"><a href="/ask">
              Ask 
                      </a></button>
            </NavItem>
            <>
              {auth ? (
            <NavLink tag={Link} to={"/you"}>
              <button className="login-button">You</button>
            </NavLink>        
              ):(
                <NavLink tag={Link} to={"/"}>
              <button className="login-button"><a href="/" className="btn btn-primary">
                        Login djkfk!
                      </a></button>
            </NavLink>   
              )}
            </>
          </div>
        </Nav>
      </Collapse>
    </Navbar>
  );
};

export default Topbar;

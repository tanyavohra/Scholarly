import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBriefcase,
  faPaperPlane,
  faQuestion,
  faImage,
  faStickyNote,
  faFileAlt,
  faCopy,
  faBookmark,
  
} from "@fortawesome/free-solid-svg-icons";
import { NavItem, NavLink, Nav } from "reactstrap";
import classNames from "classnames";
import { Link } from "react-router-dom";
import "../page.css";

import SubMenu from "./SubMenu";

const SideBar = ({ isOpen, toggle }) => (
  <div className={classNames("sidebar", { "is-open": isOpen })}>
    <div className="sidebar-header">
      <span color="info" onClick={toggle} style={{ color: "#fff" }}>
        &times;
      </span>
      <h3>Scholarly</h3>
    </div>
    <div className="side-menu">
      <Nav vertical className="list-unstyled pb-3">
        {/* <p>Dummy Heading</p>
        <SubMenu title="Home" icon={faHome} items={submenus[0]} /> */}
        <NavItem id="sidenav">
          <NavLink tag={Link} to={"/Home"}>
          <div className="div_navitem">
          <FontAwesomeIcon icon={faHome} className="mr-2" />
          <> </>Home
          </div>
          </NavLink>
        </NavItem>
        <NavItem id="sidenav">
          <NavLink tag={Link} to={"/questions"}>
          <div className="div_navitem">
            <FontAwesomeIcon icon={faQuestion} className="mr-2" />
            <> </>Questions
          </div>
          </NavLink>
        </NavItem>
        {/* <NavItem id="sidenav">
          //  <NavLink tag={Link} to={"/disDussions"}>
          //   <FontAwesomeIcon icon={faBriefcase} className="mr-2" />
          //   Discussions
          // </NavLink> *
        </NavItem> */}
        <SubMenu title=" Saved" icon={faBookmark} items={submenus[1]} />
        <NavItem id="sidenav" >
          <NavLink tag={Link} to={"/notes"}>
          <div className="div_navitem">
          <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
          <> </>Notes
          </div>
          </NavLink>
        </NavItem>
        {/* <NavItem id="sidenav">
          <NavLink tag={Link} to={"/Notes"}>
            <FontAwesomeIcon icon={faQuestion} className="mr-2" />
            
          </NavLink>
        </NavItem> */}
        {/* <NavItem id="sidenav">
          <NavLink tag={Link} to={"/videos"}>
            <FontAwesomeIcon icon={faCopy} className="mr-2" />
            Videos
          </NavLink>
        </NavItem> */}
        {/* <NavItem id="sidenav">
          <NavLink tag={Link} to={"/users"}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
            Users
          </NavLink>
        </NavItem> */}
        <NavItem id="sidenav">
          <NavLink tag={Link} to={"/contact"}>
          <div className="div_navitem">
          <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
          <> </>Contact
          </div>
          </NavLink>
        </NavItem>
      </Nav>

    </div>
  </div>
);

const submenus = [
  [
    {
      title: "Home 1",
      target: "Home-1",
    },
    {
      title: "Home 2",
      target: "Home-2",
    },
    {
      itle: "Home 3",
      target: "Home-3",
    },
  ],
  [
    {
      title: "Saved Questions",
      target: "markedque",
    },
    {
      title: "Saved Notes",
      target: "markednotes",
    },
  ],
];

export default SideBar;

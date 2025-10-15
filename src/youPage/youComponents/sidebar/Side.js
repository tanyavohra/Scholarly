import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBriefcase,
  faPaperPlane,
  faQuestion,
  faImage,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { NavItem, NavLink, Nav } from "reactstrap";
import classNames from "classnames";
import { Link } from "react-router-dom";
import "../../../components/page.css";

import SubMenu from "./SubMenu";

const SideBar = ({ isOpen, toggle }) => (
  <div className={classNames("sidebar", { "is-open": isOpen })}>
    <div className="sidebar-header">
      <span color="info" onClick={toggle} style={{ color: "#fff" }}>
        &times;
      </span>
      <h3>The Sidebar</h3>
    </div>
    <div className="side-menu">
      <Nav vertical className="list-unstyled pb-3">
        <p>Dummy Heading</p>
        {/* <SubMenu title="Home" icon={faHome} items={submenus[0]} /> */}
        <NavItem>
          <NavLink tag={Link} to={"/Home"}>
            <FontAwesomeIcon icon={faHome} className="mr-2" />
            Home
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink tag={Link} to={"/questions"}>
            <FontAwesomeIcon icon={faQuestion} className="mr-2" />
            Questions
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink tag={Link} to={"/disDussions"}>
            <FontAwesomeIcon icon={faBriefcase} className="mr-2" />
            Discussions
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink tag={Link} to={"/marked"}>
            <FontAwesomeIcon icon={faImage} className="mr-2" />
            Marked
          </NavLink>
        </NavItem>
        <SubMenu title="Semester Savior" icon={faCopy} items={submenus[1]} />
        {/* <NavItem>
          <NavLink tag={Link} to={"/Notes"}>
            <FontAwesomeIcon icon={faQuestion} className="mr-2" />
            
          </NavLink>
        </NavItem> */}
        <NavItem>
          <NavLink tag={Link} to={"/videos"}>
            <FontAwesomeIcon icon={faCopy} className="mr-2" />
            Videos
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink tag={Link} to={"/users"}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
            Users
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink tag={Link} to={"/contact"}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
            Contact
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
      title: "Notes",
      target: "Page-1",
    },
    {
      title: "Papers",
      target: "Page-2",
    },
  ],
];

export default SideBar;

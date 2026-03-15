import React from "react";
import classNames from "classnames";
import { Container } from "reactstrap";
import "../page.css";
import Topbar from "./top.js";

function Content({ sidebarIsOpen, toggleSidebar }){
  return (
    <Container
      fluid
      className={classNames("content", { "is-open": sidebarIsOpen })}
    >
      <Topbar toggleSidebar={toggleSidebar} />
    </Container>
  );
}
export default Content;

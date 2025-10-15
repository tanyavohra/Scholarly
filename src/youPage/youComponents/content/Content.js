// import React from "react";
// import classNames from "classnames";
// import { Container } from "reactstrap";
// import { Switch, Route, Routes } from "react-router-dom";
// import "../../../components/page.css";
// import "../youPage.css";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// function Content({ sidebarIsOpen, toggleSidebar }) {
//   //.....
//   axios.defaults.withCredentials = true;
//   //.......

//   const navigate = useNavigate();
//   const handleLogout = () => {
//     axios
//       .get("http://localhost:8081/logout")
//       .then((res) => {
//         if (res.data.Status === "Success") {
//           navigate("/Home");
//         } else {
//           alert("error");
//         }
//       })
//       .catch((err) => console.log(err));
//   };
//   return (
//     <Container
//       fluid
//       id="back"
//       className={classNames("content", { "is-open": sidebarIsOpen })}
//     >
//       <Routes></Routes>
//       <div className="container d-flex justify-content-center">
//         <div className="card p-3 py-4">
//           <div className="text-center">
//             <div className="container">
//               <div className="main-body">
//                 {/* Breadcrumb */}
//                 {/* /Breadcrumb */}
//                 <div className="row gutters-sm">
//                   <div className="col-md-4 mb-33">
//                     <div className="cardy">
//                       <div className="cardy-body">
//                         <div className="d-flexy flex-column align-items-center text-center">
//                           <img
//                             src="https://bootdey.com/img/Content/avatar/avatar7.png"
//                             alt="You"
//                             className="rounded-circle"
//                             width={150}
//                           />
//                           <div className="mt-3">
//                             <h4>John Doe</h4>
//                             <p className="text-secondary mb-1">
//                               Full Stack Developer
//                             </p>
//                             <p className="text-muted font-size-sm">
//                               Bay Area, San Francisco, CA
//                             </p>
//                             <button className="btn btn-primary">Follow</button>
//                             <button className="btn btn-outline-primary">
//                               Message
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="col-md-8">
//                     <div className="cardy mb-3">
//                       <div className="cardy-body">
//                         <div className="row">
//                           <div className="col-sm-3">
//                             <h6 className="mb-0">Full Name</h6>
//                           </div>
//                           <div className="col-sm-9 text-secondary">
//                             Kenneth Valdez
//                           </div>
//                         </div>
//                         <hr />
//                         <div className="row">
//                           <div className="col-sm-3">
//                             <h6 className="mb-0">Email</h6>
//                           </div>
//                           <div className="col-sm-9 text-secondary">
//                             fip@jukmuh.al
//                           </div>
//                         </div>
//                         <hr />
//                         <div className="row">
//                           <div className="col-sm-3">
//                             <h6 className="mb-0">Phone</h6>
//                           </div>
//                           <div className="col-sm-9 text-secondary">
//                             (239) 816-9029
//                           </div>
//                         </div>
//                         <hr />
//                         <div className="row">
//                           <div className="col-sm-3">
//                             <h6 className="mb-0">Mobile</h6>
//                           </div>
//                           <div className="col-sm-9 text-secondary">
//                             (320) 380-4539
//                           </div>
//                         </div>
//                         <hr />
//                         {/* <div className="row">
//                           <div className="col-sm-3">
//                             <h6 className="mb-0">Address</h6>
//                           </div>
//                           <div className="col-sm-9 text-secondary">
//                             Bay Area, San Francisco, CA
//                           </div>
//                         </div> */}
//                         <hr />
//                         <div className="row">
//                           <div className="col-sm-12">
//                             <a
//                               className="btn btn-info "
//                               target="__blank"
//                               href="https://www.bootdey.com/snippets/view/profile-edit-data-and-skills"
//                             >
//                               Edit
//                             </a>
//                             <button
//                               id="logout"
//                               className="btn btn-danger"
//                               onClick={handleLogout}
//                             >
//                               Logout
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="row gutters-sm">
//                     <div className="col-sm-6 mb-01">
//                       <div className="cardy h-100">
//                         <div className="second-cardy-body">
//                           <h6 className="d-flex align-items-center mb-head">
//                             <i className="material-icons text-info mr-2">
//                               assignment
//                             </i>
//                             Project Status
//                           </h6>
//                           <small>Web Design</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "80%" }}
//                               aria-valuenow={80}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>Website Markup</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "72%" }}
//                               aria-valuenow={72}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>One Page</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "89%" }}
//                               aria-valuenow={89}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>Mobile Template</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "55%" }}
//                               aria-valuenow={55}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
                          
//                         </div>
//                       </div>
//                     </div>
//                     <div className="col-sm-6 mb-2">
//                       <div className="cardy h-100">
//                         <div className="third-cardy-body">
//                           <h6 className="d-flex align-items-center mb-head">
//                             <i className="material-icons text-info mr-2">
//                               assignment
//                             </i>
//                             Project Status
//                           </h6>
//                           <small>Web Design</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "80%" }}
//                               aria-valuenow={80}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>Website Markup</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "72%" }}
//                               aria-valuenow={72}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>One Page</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "89%" }}
//                               aria-valuenow={89}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
//                           <small>Mobile Template</small>
//                           <div
//                             className="progress pb-3"
//                             style={{ height: "5px" }}
//                           >
//                             <div
//                               className="progress-bar bg-primary"
//                               role="progressbar"
//                               style={{ width: "55%" }}
//                               aria-valuenow={55}
//                               aria-valuemin={0}
//                               aria-valuemax={100}
//                             />
//                           </div>
                          
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </Container>
//   );
// }

// export default Content;

import React, { useState } from "react";
import axios from "axios";
import "./pdfchat.css";
import { Link, useLocation } from "react-router-dom";
import Modal from "react-modal";
import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { toolbarPlugin } from "@react-pdf-viewer/toolbar";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
Modal.setAppElement("#root");

function PdfChat() {
  const location = useLocation();
  const note = location.state?.note;
  const [isProcessed, setIsProcessed] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  // console.log(note);
  

  const defaultLayoutPluginInstance = defaultLayoutPlugin(); // PDF layout
  const toolbarPluginInstance = toolbarPlugin({
    openFileButton: {
      hidden: true, // Hide the open file button
    },
    moreActionsPopover: {
      disableOpenWithButton: true, // Disable the more actions button
    },
  });

  if (!note) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2>Chat with Notes</h2>
        <p>Select a note first, then open Chat with Notes from that note.</p>
        <p>
          <Link to="/notes">Go to Notes</Link>
        </p>
      </div>
    );
  }

  const pdf_url = note?.pdf;
  let pdfUrlString = "";

  if (pdf_url && pdf_url.type === "Buffer") {
    pdfUrlString = new TextDecoder().decode(new Uint8Array(pdf_url.data));
  } else {
    pdfUrlString = pdf_url;
  }

  const pdfFileUrl = pdfUrlString;
  // useEffect(() => {
  //   const processPdf = async () => {
  //     if (!pdfFileUrl) {
  //       alert("No PDF file URL provided.");
  //       return;
  //     }

  //     setLoading(true);
  //     try {
  //       // Fetch the PDF file from the URL
  //       const pdfResponse = await axios.get(pdfFileUrl, {
  //         responseType: "blob",
  //       });
  //       const formData = new FormData();
  //       formData.append("pdfFiles", pdfResponse.data, "file.pdf"); // Append the file to formData

  //       // Send the PDF file to your server
  //       await axios.post("http://localhost:8081/api/process-pdf", formData, {
  //         headers: {
  //           "Content-Type": "multipart/form-data",
  //         },
  //       });
  //       alert("PDF processed successfully.");
  //     } catch (error) {
  //       console.error("Error processing PDF:", error);
  //       // alert("Failed to process PDF.");
  //       window.location.reload(true);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   processPdf();
  // }, [pdfFileUrl]); // Run this effect when pdfFileUrl changes

  // useEffect(() => {
  //   const processPdf = async () => {
  //     if (!pdfFileUrl) {
  //       alert("No PDF file URL provided.");
  //       return;
  //     }

  //     setLoading(true);
  //     try {
  //       // Fetch the PDF file from the URL
  //       const pdfResponse = await axios.get(pdfFileUrl, {
  //         responseType: "blob",
  //       });
  //       const formData = new FormData();
  //       formData.append("pdfFiles", pdfResponse.data, "file.pdf"); // Append the file to formData

  //       // Send the PDF file to your server
  //       await axios.post("http://localhost:8081/api/process-pdf", formData, {
  //         headers: {
  //           "Content-Type": "multipart/form-data",
  //         },
  //       });
  //       alert("PDF processed successfully.");
  //     } catch (error) {
  //       console.error("Error processing PDF:", error);
  //       console.error("Error processing PDF:", error);


  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   // Set a timeout to delay the processPdf execution by 5000ms (5 seconds)
  //   const timeoutId = setTimeout(() => {
  //     processPdf();
  //   }, 5000);

  //   // Clean up the timeout if the component unmounts before the timeout completes
  //   return () => clearTimeout(timeoutId);
  // }, [pdfFileUrl]); // Run this effect when pdfFileUrl changes

 

  const handleProcessPdf = async () => {
    if (!pdfFileUrl) {
      alert("No PDF file URL provided.");
      return;
    }

    setLoading(true);
    console.log("ok");
    try {
      // Fetchind that PDF file from the URL
      const pdfResponse = await axios.get(pdfFileUrl, { responseType: "blob" });
      const formData = new FormData();
      formData.append("pdfFiles", pdfResponse.data, "file.pdf"); // Append the file to formData

      // Send the PDF file to  server
      await axios.post("http://localhost:8081/processpdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("PDF processed successfully.");
      setIsProcessed(true);
    } catch (error) {
      // console.log(pdfFileUrl)

      console.error("Error processing PDF:", error);
      // alert('Failed to process PDF.');
      window.location.reload(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }

    setResponse("Loading...");

    try {
      const response = await axios.post(
        "http://localhost:8081/ask_question",
        { question }
      );
      setResponse(response.data.response);
    } catch (error) {
      console.error("Error asking question:", error);
      alert("Failed to get a response.");
      setResponse("");
    }
  };

  return (
    <>
      <div className="chatpdfcontainer">
        <Modal
          isOpen={true}
          contentLabel="PDF Modal"
          className="pdf-modal"
          overlayClassName="pdf-overlay"
        >
          <div className="thePdf">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfUrlString}
                plugins={[defaultLayoutPluginInstance, toolbarPluginInstance]}
              />
            </Worker>
          </div>
        </Modal>
        <div className="chat">
          <h2 className="chat_head">Chat with PDF</h2>
          <hr />
          <button
            id="processpdf"
            onClick={handleProcessPdf}
            disabled={loading || isProcessed}
          >
            {loading
              ? "Processing..."
              : isProcessed
              ? "Processed"
              : "Process PDF"}
          </button>
          <textarea
            value={question}
            className="pdfque"
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your question"
            rows={3} // Set initial number of rows
            style={{ resize: "none" }} // Prevent resizing
          />

          <button id="askpdf" onClick={handleAskQuestion}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 26 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {" "}
              = $0
              <path
                d="M22.25 4.5C22.25 6.01878 21.0188 7.25 19.5 7.25C17.9812 7.25 16.75 6.01878 16.75 4.5C16.75 2.98122 17.9812
1.75 19.5 1.750C21.0188 1.75 22.25 2.98122 22.25 4.52"
                fill="currentColor"
              ></path>
              <path
                d="M12.7079 4.19048C12.6312 3.51289 12.0583 3.0007 11.3764 3C10.6944 2.9993 10.1205 3.51032 10.0424 4.18776C9.55454 8.41731 7.16731 10.8045 2.93776 11.2924C2.26032 11.3785 1.7493 11.9444 1.75 12.6264C1.7507 13.3083 2.26289 13.8812 2.94048 13.9579C7.11004 14.432 9.6628 16.7945 10.0388 21.027C10.1003 21.72 10.6811 22.2508 11.3765 22.25C12.072 22.2492 12.6515 21.7171 12.7115 21.0242C13.0727 16.8513 15.6013 14.3227 19.7742 13.9615C20.4671 13.9015 20.9992 13.322 21 12.6265C21.0008 11.9311 20.47 11.3503 19.7772 11.2888C15.5445 10.9128 13.1802 8.36004 12.7079 4.19048Z"
                fill="currentColor"
              ></path>
            </svg>{" "}
            Ask Question
          </button>
          <div className="aiAns">{response && <p>Ans: {response}</p>}</div>
        </div>
      </div>
    </>
  );
}

export default PdfChat;

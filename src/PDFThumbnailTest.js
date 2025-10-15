import React from 'react';
import { Worker } from '@react-pdf-viewer/core';
import { thumbnailPlugin } from '@react-pdf-viewer/thumbnail';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/thumbnail/lib/styles/index.css';

const PdfThumbnailTest = () => {
  const pdfUrl = "https://pdfobject.com/pdf/sample.pdf";
  const thumbnailPluginInstance = thumbnailPlugin();
  const { Thumbnail } = thumbnailPluginInstance;

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
      <div className="thumbnail-container">
        <Thumbnail
          fileUrl={pdfUrl}
          pageIndex={0}
          width={300}
        />
      </div>
    </Worker>
  );
};

export default PdfThumbnailTest;

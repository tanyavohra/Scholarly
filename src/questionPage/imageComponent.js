import React from 'react';

const ImageComponent = ({ imageUrl }) => {
  const imageStyle = {
    width: 'auto', // or any desired width
    height: 'auto', // maintain aspect ratio
  };

  return (
    <img src={imageUrl} alt="Attachment" style={imageStyle} />
  );
};

export default ImageComponent;

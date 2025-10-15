import React from 'react';

function ImageComponent({ imageUrl }) {
  return (
    <div>
      <img src={imageUrl} alt="" />
    </div>
  );
}

export default ImageComponent;

import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-t-blue-500 border-gray-200"></div>
    </div>
  );
};

export default LoadingSpinner;

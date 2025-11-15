"use client"; // 👈 This is the crucial line!

import Lottie from "lottie-react";
import catAnimationData from "@/assets/Loading_Cat _x2.json";

const LoadingSpinner = () => {
  const style = {
    height: 300,
    width: 300,
  };

  return (
    <div className="flex justify-center items-center h-screen">
    <Lottie
      animationData={catAnimationData}
      style={style}
      loop={true}
      autoplay={true}
      />
      </div>
  );
};
export default LoadingSpinner;

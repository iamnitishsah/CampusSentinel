"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const TimeDisplay: React.FC = () => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");

      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg shadow-md">
      <Clock />
      <span className="font-semibold text-lg">{time}</span>
    </div>
  );
};

export default TimeDisplay;

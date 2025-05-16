// src/pages/subjects/useTimer.js
import { useState, useEffect, useRef } from "react";

const useTimer = (isActive, initialTime, onTimeUp) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (onTimeUp) onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timerRef.current);
      };
    }
  }, [isActive, timeLeft, onTimeUp]);

  return { timeLeft, setTimeLeft };
};

export default useTimer;
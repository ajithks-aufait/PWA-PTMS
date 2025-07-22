// src/hooks/useCurrentTime.ts
import { useState, useRef } from "react";

export function useCurrentTime(): Date {
  const [time, setTime] = useState<Date>(new Date());
  const timerStartedRef = useRef<boolean>(false);

  if (!timerStartedRef.current) {
    timerStartedRef.current = true;

    setInterval(() => {
      setTime(new Date());
    }, 1000);
  }

  return time;
}

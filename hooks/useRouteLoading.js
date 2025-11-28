import { useEffect, useRef, useState } from "react";
import Router from "next/router";

const normalizePath = (url = "") => {
  if (!url) return "/";
  const [path] = url.split("?");
  return path || "/";
};

export const useRouteLoading = ({ delay = 150, minVisible = 300 } = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [targetRoute, setTargetRoute] = useState(null);
  const delayTimerRef = useRef(null);
  const minTimerRef = useRef(null);
  const startTimestampRef = useRef(0);

  const clearTimers = () => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (minTimerRef.current) {
      clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleStart = (url) => {
      clearTimers();
      setTargetRoute(normalizePath(url));
      delayTimerRef.current = setTimeout(() => {
        startTimestampRef.current = Date.now();
        setIsLoading(true);
      }, delay);
    };

    const handleStop = () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
        startTimestampRef.current = 0;
        setTargetRoute(null);
        return;
      }

      if (!isLoading) return;

      const elapsed = Date.now() - startTimestampRef.current;
      const remaining = Math.max(minVisible - elapsed, 0);

      const finalize = () => {
        setIsLoading(false);
        setTargetRoute(null);
        startTimestampRef.current = 0;
      };

      if (remaining > 0) {
        minTimerRef.current = setTimeout(() => {
          finalize();
          minTimerRef.current = null;
        }, remaining);
      } else {
        finalize();
      }
    };

    Router.events.on("routeChangeStart", handleStart);
    Router.events.on("routeChangeComplete", handleStop);
    Router.events.on("routeChangeError", handleStop);

    return () => {
      Router.events.off("routeChangeStart", handleStart);
      Router.events.off("routeChangeComplete", handleStop);
      Router.events.off("routeChangeError", handleStop);
      clearTimers();
    };
  }, [delay, minVisible, isLoading]);

  return { isLoading, targetRoute };
};




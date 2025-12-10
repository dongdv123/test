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
  const safetyTimeoutRef = useRef(null);
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
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleStart = (url) => {
      clearTimers();
      const normalizedPath = normalizePath(url);
      
      // Skip skeleton for search page (client-side filtering, no real navigation needed)
      if (normalizedPath === "/search") {
        return;
      }
      
      setTargetRoute(normalizedPath);
      delayTimerRef.current = setTimeout(() => {
        startTimestampRef.current = Date.now();
        setIsLoading(true);
        
        // Safety timeout: force stop after 5 seconds to prevent stuck loading
        safetyTimeoutRef.current = setTimeout(() => {
          console.warn("Route loading timeout, forcing stop");
          setIsLoading(false);
          setTargetRoute(null);
          startTimestampRef.current = 0;
          safetyTimeoutRef.current = null;
        }, 5000);
      }, delay);
    };

    const handleStop = () => {
      clearTimers(); // Always clear all timers first
      
      if (delayTimerRef.current) {
        // Route changed before delay timer fired, cancel loading
        delayTimerRef.current = null;
        startTimestampRef.current = 0;
        setTargetRoute(null);
        setIsLoading(false);
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




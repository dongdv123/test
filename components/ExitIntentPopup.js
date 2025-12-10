import { useState, useEffect } from "react";
import Link from "next/link";

const EXIT_INTENT_STORAGE_KEY = "exit-intent-shown";
const EXIT_INTENT_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MIN_TIME_ON_PAGE = 3 * 1000; // 3 seconds - minimum time user must be on page before popup can show (reduced for testing)

export default function ExitIntentPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pageLoadTime] = useState(() => Date.now()); // Track when component mounted

  useEffect(() => {
    // Check if popup was shown recently
    if (typeof window === "undefined") return;

    const lastShown = localStorage.getItem(EXIT_INTENT_STORAGE_KEY);
    if (lastShown) {
      const timeSinceLastShown = Date.now() - Number(lastShown);
      if (timeSinceLastShown < EXIT_INTENT_COOLDOWN) {
        return; // Don't show if shown within cooldown period
      }
    }

    const canShowPopup = () => {
      if (showPopup) return false;
      const timeOnPage = Date.now() - pageLoadTime;
      return timeOnPage >= MIN_TIME_ON_PAGE;
    };

    const triggerPopup = () => {
      if (canShowPopup()) {
        setShowPopup(true);
        localStorage.setItem(EXIT_INTENT_STORAGE_KEY, String(Date.now()));
      }
    };

    // Desktop: Detect exit intent (mouse leaving viewport from top)
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && canShowPopup()) {
        triggerPopup();
      }
    };

    // Desktop: Detect when mouse is near top edge
    const handleMouseMove = (e) => {
      if (e.clientY <= 5 && canShowPopup()) {
        setTimeout(() => {
          if (e.clientY <= 0 && canShowPopup()) {
            triggerPopup();
          }
        }, 100);
      }
    };

    // Mobile & Desktop: Detect scroll-based exit intent
    let lastScrollY = window.scrollY;
    let hasScrolledDown = false;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Track if user has scrolled down
      if (currentScrollY > 100) {
        hasScrolledDown = true;
      }

      // Detect scroll up (exit intent) after scrolling down
      if (hasScrolledDown && currentScrollY < lastScrollY && currentScrollY < 50) {
        if (canShowPopup()) {
          triggerPopup();
        }
      }

      lastScrollY = currentScrollY;
    };

    // Mobile: Detect touch swipe up (exit intent)
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchStartX = 0;
    
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
      touchStartTime = Date.now();
      
      // Detect when user tries to go back (swipe from left edge)
      if (touchStartX < 10 && canShowPopup()) {
        // User is swiping from left edge (back gesture)
        setTimeout(() => {
          if (canShowPopup()) {
            triggerPopup();
          }
        }, 150);
      }
    };

    const handleTouchMove = (e) => {
      if (!canShowPopup()) return;
      
      const touch = e.touches[0];
      const touchEndY = touch.clientY;
      const touchEndTime = Date.now();
      const deltaY = touchStartY - touchEndY;
      const deltaTime = touchEndTime - touchStartTime;
      
      // Detect fast upward swipe from top of screen
      if (touchStartY < 50 && deltaY > 30 && deltaTime < 300) {
        triggerPopup();
      }
    };

    // Detect visibility change (user switching tabs/apps) - only on mobile
    const handleVisibilityChange = () => {
      // Only trigger on mobile devices and if user was on page for a while
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && document.hidden && canShowPopup()) {
        // Small delay to avoid false positives
        setTimeout(() => {
          if (document.hidden && canShowPopup()) {
            triggerPopup();
          }
        }, 500);
      }
    };

    // Add event listeners
    // Desktop events
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousemove", handleMouseMove);
    
    // Mobile & Desktop events
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showPopup, pageLoadTime]);

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call newsletter subscription API
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
        // Auto close after 2 seconds
        setTimeout(() => {
          setShowPopup(false);
        }, 2000);
      } else {
        throw new Error("Subscription failed");
      }
    } catch (error) {
      console.error("Failed to subscribe:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showPopup) return null;

  return (
    <>
      <div className="exit-intent-overlay" onClick={handleClose} />
      <div className="exit-intent-popup">
        <button className="exit-intent-close" onClick={handleClose} aria-label="Close">
          ✕
        </button>
        
        {submitted ? (
          <div className="exit-intent-success">
            <div className="exit-intent-success-icon">✓</div>
            <h3>Thank you!</h3>
            <p>Check your email for your discount code.</p>
          </div>
        ) : (
          <>
            <div className="exit-intent-content">
              <div className="exit-intent-icon">🎁</div>
              <h2>Wait! Don't Miss Out</h2>
              <p className="exit-intent-offer">
                Get <strong>15% OFF</strong> your first order
              </p>
              <p className="exit-intent-description">
                Subscribe to our newsletter and receive an exclusive discount code
              </p>
              
              <form onSubmit={handleSubmit} className="exit-intent-form">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="exit-intent-email-input"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="btn btn-primary exit-intent-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Subscribing..." : "Get My Discount"}
                </button>
              </form>
              
              <p className="exit-intent-footer">
                By subscribing, you agree to our{" "}
                <Link href="/privacy">Privacy Policy</Link>
              </p>
            </div>
            
            <div className="exit-intent-alternative">
              <p>No thanks, I'll pay full price</p>
              <button onClick={handleClose} className="exit-intent-skip">
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}


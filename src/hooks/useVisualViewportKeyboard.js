import { useEffect, useState } from "react";

export function useVisualViewportKeyboard() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    let animationFrameId = null;
    let timeoutId = null;

    const update = () => {
      const visualViewport = window.visualViewport;

      if (!visualViewport) {
        root.style.setProperty("--keyboard-inset", "0px");
        setKeyboardInset(0);
        return;
      }

      const lostViewportHeight = Math.max(
        0,
        window.innerHeight - visualViewport.height,
      );
      const viewportOffsetTop = Math.max(0, visualViewport.offsetTop || 0);
      const windowScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const inset = Math.max(
        lostViewportHeight,
        viewportOffsetTop,
        windowScrollY,
      );

      root.style.setProperty("--keyboard-inset", `${inset}px`);

      setKeyboardInset(inset);
    };

    const delayedUpdate = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        update();
      });

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        update();
      }, 300);
    };

    update();

    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", delayedUpdate);
    document.addEventListener("focusin", delayedUpdate);
    document.addEventListener("focusout", delayedUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", delayedUpdate);
      document.removeEventListener("focusin", delayedUpdate);
      document.removeEventListener("focusout", delayedUpdate);
    };
  }, []);

  return { keyboardInset };
}

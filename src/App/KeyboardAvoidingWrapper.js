import { useEffect } from "react";
import { UAParser } from "ua-parser-js";

const IOS_26_SCROLL_RESET_DELAYS_MS = [0, 50, 150, 300, 500];

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

const scrollAllRootsToTop = () => {
  const scrollingElement =
    document.scrollingElement || document.documentElement || document.body;

  window.scrollTo(0, 0);

  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
  }

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
  }

  if (document.body) {
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  }
};

// Source - https://stackoverflow.com/a/79806399
// Posted by Даниил Пронин
// Retrieved 2026-06-14, License - CC BY-SA 4.0
export const useIos26ViewportBlurReset = () => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const parser = new UAParser(window.navigator.userAgent);
    const browserMajor = String(parser.getBrowser().major || "").trim();
    const osName = String(parser.getOS().name || "").trim().toLowerCase();
    const browserName = String(parser.getBrowser().name || "").trim().toLowerCase();
    const isAppleMobile = osName === "ios" || osName === "mac os";
    const isWebKitFamily =
      browserName.includes("safari") ||
      browserName.includes("mobile safari") ||
      browserName.includes("chrome");

    if (browserMajor !== "26" || !isAppleMobile || !isWebKitFamily) {
      return undefined;
    }

    let timeoutIds = [];
    let blurResetPending = false;

    const resetViewportScroll = () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds = IOS_26_SCROLL_RESET_DELAYS_MS.map((delayMs) =>
        window.setTimeout(() => {
          scrollAllRootsToTop();
        }, delayMs),
      );
    };

    const handleFocusOut = (event) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      blurResetPending = true;
      resetViewportScroll();
    };

    const handleVisualViewportResize = () => {
      if (!blurResetPending) {
        return;
      }

      resetViewportScroll();

      window.setTimeout(() => {
        blurResetPending = false;
      }, IOS_26_SCROLL_RESET_DELAYS_MS[IOS_26_SCROLL_RESET_DELAYS_MS.length - 1]);
    };

    document.addEventListener("focusout", handleFocusOut, true);
    window.visualViewport?.addEventListener("resize", handleVisualViewportResize);
    window.visualViewport?.addEventListener("scroll", handleVisualViewportResize);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds = [];

      document.removeEventListener("focusout", handleFocusOut, true);
      window.visualViewport?.removeEventListener("resize", handleVisualViewportResize);
      window.visualViewport?.removeEventListener("scroll", handleVisualViewportResize);
    };
  }, []);
};

const KeyboardAvoidingWrapper = () => {
  useIos26ViewportBlurReset();
  return null;
};

export default KeyboardAvoidingWrapper;

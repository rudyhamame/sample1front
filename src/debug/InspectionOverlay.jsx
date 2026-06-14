import React from "react";

const VIEWPORT_WIDTH_VAR = "--app-visual-viewport-width";
const VIEWPORT_HEIGHT_VAR = "--app-visual-viewport-height";

const InspectionOverlay = ({
  rootId,
  debugClassName,
  viewportBadgeId,
  hoveredBadgeId,
  copiedBadgeId,
}) => {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [copiedBadgeText, setCopiedBadgeText] = React.useState("copied");
  const [viewportDraft, setViewportDraft] = React.useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    visualWidth: Math.round(window.visualViewport?.width || window.innerWidth),
    visualHeight: Math.round(window.visualViewport?.height || window.innerHeight),
  }));
  const previousViewportStyleRef = React.useRef(null);
  const copiedBadgeTimeoutRef = React.useRef(null);
  const viewportBadgeText = `${viewportDraft.width} x ${viewportDraft.height} | vv ${viewportDraft.visualWidth} x ${viewportDraft.visualHeight}`;

  const syncViewportDraft = React.useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const rootElement = document.documentElement;
    const resolvedWidth = Number.parseInt(
      rootElement.style.getPropertyValue(VIEWPORT_WIDTH_VAR),
      10,
    );
    const resolvedHeight = Number.parseInt(
      rootElement.style.getPropertyValue(VIEWPORT_HEIGHT_VAR),
      10,
    );

    setViewportDraft({
      width: Number.isFinite(resolvedWidth) && resolvedWidth > 0 ? resolvedWidth : window.innerWidth,
      height: Number.isFinite(resolvedHeight) && resolvedHeight > 0 ? resolvedHeight : window.innerHeight,
      visualWidth: Math.round(window.visualViewport?.width || window.innerWidth),
      visualHeight: Math.round(window.visualViewport?.height || window.innerHeight),
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
        setIsEnabled((currentValue) => !currentValue);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    syncViewportDraft();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [syncViewportDraft]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleViewportChange = () => {
      syncViewportDraft();
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [isEnabled, syncViewportDraft]);

  React.useEffect(() => {
    const rootElement = document.getElementById(rootId);
    const viewportRoot = document.documentElement;

    if (!rootElement || !viewportRoot) {
      return undefined;
    }

    if (!previousViewportStyleRef.current) {
      previousViewportStyleRef.current = {
        width: viewportRoot.style.getPropertyValue(VIEWPORT_WIDTH_VAR),
        height: viewportRoot.style.getPropertyValue(VIEWPORT_HEIGHT_VAR),
      };
    }

    rootElement.classList.toggle(debugClassName, isEnabled);

    if (!isEnabled && previousViewportStyleRef.current) {
      viewportRoot.style.setProperty(
        VIEWPORT_WIDTH_VAR,
        previousViewportStyleRef.current.width,
      );
      viewportRoot.style.setProperty(
        VIEWPORT_HEIGHT_VAR,
        previousViewportStyleRef.current.height,
      );
      previousViewportStyleRef.current = null;
    }

    return () => {
      rootElement.classList.remove(debugClassName);
    };
  }, [debugClassName, isEnabled, rootId]);

  const copyViewportBadge = React.useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const textToCopy = viewportBadgeText;
    let didCopy = false;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        didCopy = true;
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = textToCopy;
      tempTextArea.setAttribute("readonly", "true");
      tempTextArea.style.position = "fixed";
      tempTextArea.style.opacity = "0";
      tempTextArea.style.left = "-9999px";
      tempTextArea.style.top = "0";
      document.body.appendChild(tempTextArea);
      tempTextArea.select();

      didCopy = document.execCommand("copy");
      document.body.removeChild(tempTextArea);
    }

    if (didCopy) {
      setCopiedBadgeText(`copied ${textToCopy}`);

      if (copiedBadgeTimeoutRef.current) {
        window.clearTimeout(copiedBadgeTimeoutRef.current);
      }

      copiedBadgeTimeoutRef.current = window.setTimeout(() => {
        setCopiedBadgeText("copied");
      }, 1500);
    }
  }, [viewportBadgeText]);

  React.useEffect(() => {
    return () => {
      if (copiedBadgeTimeoutRef.current) {
        window.clearTimeout(copiedBadgeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <React.Fragment>
      <div
        id={viewportBadgeId}
        role="button"
        tabIndex={0}
        onClick={copyViewportBadge}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            copyViewportBadge();
          }
        }}
        aria-label={`Copy viewport size ${viewportBadgeText}`}
        title="Click to copy viewport size"
      >
        <span>{viewportDraft.width} x {viewportDraft.height}</span>
        <span>vv {viewportDraft.visualWidth} x {viewportDraft.visualHeight}</span>
      </div>
      {isEnabled && (
        <>
          <div id={hoveredBadgeId}>inspect</div>
          <div id={copiedBadgeId}>{copiedBadgeText}</div>
        </>
      )}
    </React.Fragment>
  );
};

export default InspectionOverlay;

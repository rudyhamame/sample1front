import React from "react";

const InspectionOverlay = ({
  rootId,
  debugClassName,
  viewportBadgeId,
  hoveredBadgeId,
  copiedBadgeId,
}) => {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [viewportSize, setViewportSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

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

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
    const rootElement = document.getElementById(rootId);

    if (!rootElement) {
      return undefined;
    }

    rootElement.classList.toggle(debugClassName, isEnabled);

    return () => {
      rootElement.classList.remove(debugClassName);
    };
  }, [debugClassName, isEnabled, rootId]);

  if (!isEnabled) {
    return null;
  }

  return (
    <React.Fragment>
      <div id={viewportBadgeId}>
        {viewportSize.width} x {viewportSize.height}
      </div>
      <div id={hoveredBadgeId}>inspect</div>
      <div id={copiedBadgeId}>copied</div>
    </React.Fragment>
  );
};

export default InspectionOverlay;

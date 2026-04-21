/**
 * PageComplexityBadge - Visual indicator for page complexity
 * Shows complexity score and difficulty level
 */

import React from "react";
import "./PageComplexityBadge.css";

const PageComplexityBadge = ({ score, difficulty, color }) => {
  if (score === undefined || score === null) {
    return null;
  }

  return (
    <div className="page-complexity-badge" style={{ backgroundColor: color }}>
      <div className="complexity-score">{score}</div>
      <div className="complexity-label">{difficulty}</div>
    </div>
  );
};

export default PageComplexityBadge;

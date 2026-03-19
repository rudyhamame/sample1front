import React from "react";

const Logo = () => {
  return (
    <section id="Logo_section" className="fc">
      <h2 id="Logo_text">MED </h2>
      <h5
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: "15pt",
          color: "var(--green)",
          position: "relative",
          bottom: "20px",
          textAlign: "center",
        }}
      >
        Study Planner
      </h5>
    </section>
  );
};

export default Logo;

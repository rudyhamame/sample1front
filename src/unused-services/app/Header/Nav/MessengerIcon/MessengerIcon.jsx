import React from "react";
import { Link } from "react-router-dom";

const MessengerIcon = () => {
  return (
    <section id="MessengerIcon_article">
      <Link to="/chat">
        <i class="fas fa-comments"></i>
      </Link>
    </section>
  );
};

export default MessengerIcon;

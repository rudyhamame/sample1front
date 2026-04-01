import React from "react";


const Refresh = () => {
  const refresh = () => {
    window.location.reload();
  };
  return (
    <section id="Refresh_article">
      <i
        class="fas fa-sync-alt"
        id="InputPost_refresh_icon"
        title="Refresh"
        onClick={refresh}
      ></i>
    </section>
  );
};

export default Refresh;

import React from "react";


const Refresh = () => {
  const refresh = () => {
    window.location.reload();
  };
  return (
    <div>
      <i
        class="fas fa-sync-alt"
        id="InputPost_refresh_icon"
        title="Refresh"
        onClick={refresh}
      ></i>
    </div>
  );
};

export default Refresh;

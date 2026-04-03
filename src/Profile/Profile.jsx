import React from "react";
import { Link, useParams } from "react-router-dom";

const Profile = ({ viewerState, logOut }) => {
  const { username } = useParams();
  const profileUsername = String(username || viewerState?.username || "").trim();
  const firstName = String(viewerState?.firstname || "").trim();
  const lastName = String(viewerState?.lastname || "").trim();
  const displayName =
    `${firstName} ${lastName}`.trim() || profileUsername || "Profile";

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        minHeight: "100%",
        padding: "24px",
        background:
          "linear-gradient(180deg, rgba(247,251,252,0.98), rgba(235,244,246,0.96))",
      }}
    >
      <p style={{ margin: 0, color: "var(--black2)" }}>Doctor profile</p>
      <h1 style={{ margin: 0 }}>{displayName}</h1>
      <p style={{ margin: 0, color: "var(--black2)" }}>
        @{profileUsername || "unknown"}
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link
          to="/"
          style={{
            textDecoration: "none",
            color: "var(--white)",
            backgroundColor: "var(--blue4)",
            padding: "10px 18px",
            borderRadius: "999px",
          }}
        >
          Back home
        </Link>
        <button
          type="button"
          onClick={logOut}
          style={{
            border: "none",
            color: "var(--white)",
            backgroundColor: "var(--black2)",
            padding: "10px 18px",
            borderRadius: "999px",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </article>
  );
};

export default Profile;

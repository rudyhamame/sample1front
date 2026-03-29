import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../App/Header/Nav/Nav";
import { apiUrl } from "../config/api";

const formatPostDate = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const Profile = ({ viewerState, logOut }) => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    fetch(apiUrl(`/api/user/profile/${encodeURIComponent(username)}`))
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load doctor profile.");
        }

        return data;
      })
      .then((data) => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [username]);

  return (
    <article
      id="Profile_article"
      className="fc"
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--white)",
      }}
    >
      <Nav path={`/profile/${username}`} state={viewerState} logOut={logOut} />
      <main
        className="fc"
        style={{
          width: "100%",
          maxWidth: "980px",
          margin: "0 auto",
          padding: "32px 20px 56px",
          gap: "24px",
        }}
      >
        <section
          className="fc"
          style={{
            gap: "8px",
            padding: "24px",
            borderRadius: "24px",
            backgroundColor: "var(--white2)",
          }}
        >
          {profile?.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt={`${profile.firstname} ${profile.lastname}`}
              style={{
                width: "104px",
                height: "104px",
                borderRadius: "24px",
                objectFit: "cover",
                border: "1px solid rgba(0, 0, 0, 0.08)",
              }}
            />
          ) : null}
          <p style={{ margin: 0, color: "var(--black2)" }}>Doctor profile</p>
          <h1 style={{ margin: 0 }}>
            {profile ? `Dr. ${profile.firstname} ${profile.lastname}` : "Profile"}
          </h1>
          <p style={{ margin: 0, color: "var(--black2)" }}>
            {profile ? `@${profile.username}` : `@${username}`}
          </p>
          <Link
            to="/phenomedsocial"
            style={{
              width: "fit-content",
              textDecoration: "none",
              color: "var(--white)",
              backgroundColor: "var(--blue4)",
              padding: "10px 18px",
              borderRadius: "999px",
            }}
          >
            Back to Phenomed Social
          </Link>
        </section>

        {isLoading && <p>Loading doctor posts...</p>}
        {!isLoading && error && <p style={{ color: "var(--red)" }}>{error}</p>}

        {!isLoading && !error && (
          <section className="fc" style={{ gap: "16px" }}>
            <h2 style={{ margin: 0 }}>Posts</h2>
            {profile?.posts?.length ? (
              profile.posts
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((post) => (
                  <article
                    key={post._id}
                    className="fc"
                    style={{
                      gap: "10px",
                      padding: "20px",
                      borderRadius: "20px",
                      backgroundColor: "var(--white2)",
                      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
                    }}
                  >
                    <div
                      className="fr"
                      style={{
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>{post.subject || "Uncategorized"}</strong>
                      <span style={{ color: "var(--black2)" }}>
                        {formatPostDate(post.date)}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "var(--black2)" }}>
                      {post.category}
                    </p>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{post.note}</p>
                    {(post.reference || post.page_num) && (
                      <p style={{ margin: 0, color: "var(--black2)" }}>
                        {post.reference ? `Reference: ${post.reference}` : ""}
                        {post.reference && post.page_num ? " • " : ""}
                        {post.page_num ? `Page: ${post.page_num}` : ""}
                      </p>
                    )}
                    <p style={{ margin: 0, color: "var(--black2)" }}>
                      {Array.isArray(post.comments)
                        ? `${post.comments.length} comment(s)`
                        : "0 comment(s)"}
                    </p>
                  </article>
                ))
            ) : (
              <p>No posts published yet.</p>
            )}
          </section>
        )}
      </main>
    </article>
  );
};

export default Profile;

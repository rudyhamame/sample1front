import React from "react";

const MountPosts = (props) => {
  return (
    <article id="MountPosts_article" className="fc">
      <ul id="MountPosts_content_container" className="fc posts_ul">
        {/* {props.state.posts.length === 0 && props.profilePosts.length === 0 && (
          <p style={{ margin: "auto", color: "var(--white)" }}>
            You have no posts to show
          </p>
        )} */}
      </ul>
    </article>
  );
};

export default MountPosts;

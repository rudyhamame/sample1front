import React from "react";

const MountPosts = (props) => {
  const hasPosts = Array.isArray(props.state?.posts) && props.state.posts.length > 0;

  return (
    <article id="MountPosts_article" className="fc">
      <ul id="MountPosts_content_container" className="fc posts_ul">
        {!hasPosts && (
          <li id="MountPosts_empty_state">
            No posts to display yet.
          </li>
        )}
      </ul>
    </article>
  );
};

export default MountPosts;

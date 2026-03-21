import React from "react";
import MountPosts from "./MountPosts/MountPosts";
import Footer from "../footer/Footer";

const Posts = (props) => {
  return (
    <article id="Posts_article" className="fc">
      <section id="Posts_content_container" className="fc">
        <MountPosts
          app_posts_sorted={props.app_posts_sorted}
          state={props.state}
          profilePosts={props.profilePosts}
        />
      </section>
      {props.path === "/" && <Footer />}
    </article>
  );
};

export default Posts;

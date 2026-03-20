import React from "react";
import { Link } from "react-router-dom";
import Nav from "../App/Header/Nav/Nav";
import Main from "./moi/main/Main";
import { phenomedSocialEnglishContent } from "./content";
import "./phenomedsocial.css";

const PhenomedSocial = (props) => {
  const content = phenomedSocialEnglishContent;
  const openPostsView = () => {
    const postsArticle = document.getElementById("Posts_article");

    if (postsArticle) {
      postsArticle.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openFriendsView = () => {
    const friendsArticle = document.getElementById("Friends_article");
    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("FriendChat_article");
    const friendsListIcon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );
    const addFriendIcon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );

    if (friendsArticle) {
      friendsArticle.style.display = "flex";
    }
    if (friendsListArticle) {
      friendsListArticle.style.display = "flex";
    }
    if (addFriendArticle) {
      addFriendArticle.style.display = "none";
    }
    if (friendChatArticle) {
      friendChatArticle.style.display = "none";
    }
    if (friendsListIcon) {
      friendsListIcon.style.color = "var(--white)";
    }
    if (addFriendIcon) {
      addFriendIcon.style.color = "var(--special_black)";
    }

    if (friendsArticle) {
      window.requestAnimationFrame(() => {
        friendsArticle.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <article id="PhenomedSocial_article" className="fc">
      <section className="PhenomedSocial_intro fc">
        <div className="PhenomedSocial_topbar fr">
          <p className="PhenomedSocial_eyebrow">{content.eyebrow}</p>
          <Link className="PhenomedSocial_languageSwitch" to={content.switchTo}>
            {content.switchLabel}
          </Link>
        </div>
        <div className="PhenomedSocial_headingRow fr">
          <div className="fc PhenomedSocial_headingCopy">
            <h1>{content.title}</h1>
            <p className="PhenomedSocial_doctorName">
              {content.doctorPrefix} {props.state?.firstname}{" "}
              {props.state?.lastname}
            </p>
            <p>{content.description}</p>
          </div>
          <div className="PhenomedSocial_headerAside fc">
            <Nav
              path={content.path}
              state={props.state}
              logOut={props.logOut}
              acceptFriend={props.acceptFriend}
              makeNotificationsRead={props.makeNotificationsRead}
              extraActions={[
                {
                  id: "phenomed-posts",
                  label: content.metrics.posts,
                  iconClass: "far fa-newspaper",
                  onClick: openPostsView,
                },
                {
                  id: "phenomed-friends",
                  label: content.metrics.friends,
                  iconClass: "fas fa-users",
                  onClick: openFriendsView,
                },
              ]}
            />
            <div className="PhenomedSocial_metrics fr">
              <div className="PhenomedSocial_metricCard fc">
                <span>{content.metrics.posts}</span>
                <strong>{props.state?.posts?.length || 0}</strong>
              </div>
              <div className="PhenomedSocial_metricCard fc">
                <span>{content.metrics.terms}</span>
                <strong>{props.state?.terminology?.length || 0}</strong>
              </div>
              <div className="PhenomedSocial_metricCard fc">
                <span>{content.metrics.friends}</span>
                <strong>{props.state?.friends?.length || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="PhenomedSocial_workspace">
        <Main
          state={props.state}
          friendConnectionColor={props.friendConnectionColor}
          selectFriendChat={props.selectFriendChat}
          closeActiveChat={props.closeActiveChat}
          postingTerminology={props.postingTerminology}
          searchPosts={props.searchPosts}
          prepare_searchPosts={props.prepare_searchPosts}
          acceptFriend={props.acceptFriend}
          sendToThemMessage={props.sendToThemMessage}
          updateMyTypingPresence={props.updateMyTypingPresence}
          content={content}
          type={props.type}
          counter={props.counter}
          updateBeforeLeave={props.updateBeforeLeave}
        />
      </section>
    </article>
  );
};

export default PhenomedSocial;


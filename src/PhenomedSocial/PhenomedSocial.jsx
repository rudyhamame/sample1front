import React from "react";
import { Link } from "react-router-dom";
import Main from "./moi/main/Main";
import PhenomedSocial_Nav from "./PhenomedSocial_Nav";
import { phenomedSocialEnglishContent } from "./content";
import InspectionOverlay from "../debug/InspectionOverlay";
import "./phenomedsocial.css";
import "./phenomedsocial.max-width-500.css";
import "./phenomedsocial.min-width-1000.css";

const PhenomedSocial = (props) => {
  const [activePanel, setActivePanel] = React.useState("home");
  const [showNotificationsPage, setShowNotificationsPage] = React.useState(false);
  const content = phenomedSocialEnglishContent;
  const unreadNotifications = (props.state?.notifications || []).filter(
    (notification) => notification.status !== "read"
  );

  const openPostsView = () => {
    const isWideScreen = window.innerWidth >= 1000;
    const postsArticle = document.getElementById("Posts_article");
    const friendsArticle = document.getElementById("Friends_article");
    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("FriendChat_article");

    if (postsArticle) {
      postsArticle.style.display = "flex";
    }
    if (friendsArticle && !isWideScreen) {
      friendsArticle.style.display = "none";
    } else if (friendsArticle && isWideScreen) {
      friendsArticle.style.display = "flex";
    }
    if (friendsListArticle && isWideScreen) {
      friendsListArticle.style.display = "flex";
    }
    if (addFriendArticle && isWideScreen) {
      addFriendArticle.style.display = "flex";
    }
    if (friendChatArticle && isWideScreen) {
      friendChatArticle.style.display = "none";
    }

    if (postsArticle) {
      window.requestAnimationFrame(() => {
        postsArticle.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    setActivePanel("home");
  };

  const openFriendsView = () => {
    const isWideScreen = window.innerWidth >= 1000;
    const postsArticle = document.getElementById("Posts_article");
    const friendsArticle = document.getElementById("Friends_article");
    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("FriendChat_article");
    if (postsArticle && !isWideScreen) {
      postsArticle.style.display = "none";
    } else if (postsArticle && isWideScreen) {
      postsArticle.style.display = "flex";
    }
    if (friendsArticle) {
      friendsArticle.style.display = "flex";
    }
    if (friendsListArticle) {
      friendsListArticle.style.display = "flex";
    }
    if (addFriendArticle) {
      addFriendArticle.style.display = "flex";
    }
    if (friendChatArticle) {
      friendChatArticle.style.display = "none";
    }

    if (friendsArticle) {
      window.requestAnimationFrame(() => {
        friendsArticle.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    setActivePanel("friends");
  };

  React.useEffect(() => {
    openPostsView();
  }, []);

  const togglePrimaryPanel = () => {
    if (activePanel === "home") {
      openFriendsView();
      return;
    }

    openPostsView();
  };

  return (
    <article
      id="PhenomedSocial_article"
      className={`fc PhenomedSocial_panel-${activePanel}`}
    >
      <InspectionOverlay
        rootId="PhenomedSocial_article"
        debugClassName="PhenomedSocial_debugBordersOn"
        viewportBadgeId="PhenomedSocial_viewportBadge"
        hoveredBadgeId="PhenomedSocial_hoveredIdBadge"
        copiedBadgeId="PhenomedSocial_copiedIdBadge"
      />
      <section className="PhenomedSocial_intro fc">
        <div className="PhenomedSocial_topbar fr">
          <p className="PhenomedSocial_eyebrow">
            {showNotificationsPage ? "Notifications desk" : content.eyebrow}
          </p>
          <Link className="PhenomedSocial_languageSwitch" to={content.switchTo}>
            {content.switchLabel}
          </Link>
        </div>
        <div className="PhenomedSocial_headingRow fr">
          {showNotificationsPage ? (
            <section id="PhenomedSocial_notificationsPage" className="fc">
              <div className="PhenomedSocial_notificationsHeader fr">
                <div className="fc PhenomedSocial_notificationsCopy">
                  <h1>Notifications</h1>
                  <p>
                    Review requests and activity updates without leaving the
                    clinical workspace.
                  </p>
                </div>
              </div>
              <ul id="PhenomedSocial_notificationsList" className="fc">
                {unreadNotifications.length === 0 ? (
                  <li id="PhenomedSocial_notificationsEmpty">
                    No new notifications.
                  </li>
                ) : (
                  unreadNotifications.map((notification) => (
                    <li
                      key={notification._id || notification.id}
                      id={notification.id}
                      className="PhenomedSocial_notificationCard fr"
                    >
                      <div className="fc PhenomedSocial_notificationBody">
                        <p>{notification.message}</p>
                      </div>
                      <div className="fr PhenomedSocial_notificationActions">
                        <button
                          type="button"
                          className="PhenomedSocial_notificationButton PhenomedSocial_notificationButton--dismiss"
                          onClick={() =>
                            props.makeNotificationsRead &&
                            props.makeNotificationsRead(
                              `decline_icon${notification.id}`
                            )
                          }
                        >
                          Dismiss
                        </button>
                        {notification.type === "friend_request" ? (
                          <button
                            type="button"
                            className="PhenomedSocial_notificationButton PhenomedSocial_notificationButton--accept"
                            onClick={() =>
                              props.acceptFriend &&
                              props.acceptFriend(`accept_icon${notification.id}`)
                            }
                          >
                            Accept
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : (
            <div className="fc PhenomedSocial_headingCopy">
              <h1>{content.title}</h1>
              <p className="PhenomedSocial_doctorName">
                {content.doctorPrefix} {props.state?.firstname}{" "}
                {props.state?.lastname}
              </p>
              <p>{content.description}</p>
            </div>
          )}
          <div className="PhenomedSocial_headerAside fc">
            <PhenomedSocial_Nav
              path={content.path}
              state={props.state}
              logOut={props.logOut}
              acceptFriend={props.acceptFriend}
              makeNotificationsRead={props.makeNotificationsRead}
              notificationsOpen={showNotificationsPage}
              onNotificationsOpenChange={setShowNotificationsPage}
              extraActions={[
                {
                  id: "phenomed-panel-toggle",
                  label:
                    activePanel === "home" ? content.metrics.friends : "Home",
                  iconClass:
                    activePanel === "home"
                      ? "fas fa-users"
                      : "far fa-newspaper",
                  onClick: togglePrimaryPanel,
                },
              ]}
            />
            <div className="PhenomedSocial_metrics fr">
              <div className="PhenomedSocial_notificationsCount fc">
                <span>Unread</span>
                <strong>{unreadNotifications.length}</strong>
              </div>
              <div className="PhenomedSocial_notificationsCount fc">
                <span>{content.metrics.posts}</span>
                <strong>{props.state?.posts?.length || 0}</strong>
              </div>
              <div className="PhenomedSocial_notificationsCount fc">
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
          removeFriend={props.removeFriend}
          selectFriendChat={props.selectFriendChat}
          closeActiveChat={props.closeActiveChat}
          postingTerminology={props.postingTerminology}
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


import React from "react";
import FriendSearchPanel from "../../../moa/friends/FriendSearchPanel";

const FriendsList = (props) => {
  const searchContent = props.content?.search;
  const friendsContent = props.content?.friends;
  const openFriendChat = (friend) => {
    if (props.selectFriendChat && friend?._id) {
      props.selectFriendChat(friend._id);
    }

    const phenomedIntro = document.querySelector(".PhenomedSocial_intro");
    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("FriendChat_article");
    const chatGoBackIcon = document.getElementById("Chat_goback_icon");

    if (friendsListArticle) {
      friendsListArticle.style.display = "none";
    }
    if (addFriendArticle) {
      addFriendArticle.style.display = "none";
    }
    if (friendChatArticle) {
      friendChatArticle.style.display = "flex";
    }
    if (phenomedIntro) {
      phenomedIntro.style.display = "none";
    }
    if (chatGoBackIcon) {
      chatGoBackIcon.style.display = "inline-flex";
    }
  };

  return (
    <FriendSearchPanel
      articleId="FriendsList_article"
      containerId="FriendsList_content_container"
      resultsSectionId="FriendsList_results"
      resultsListId="FriendsList_friends_list"
      searchInputId="FriendsList_search_input"
      buttonLabel={searchContent?.button}
      placeholder="Search for doctors"
      onSearch={props.searchFriends}
    >
      {props.searchStatus === "loading" && (
        <li id="FriendsList_loading_state">Searching...</li>
      )}
      {props.searchStatus === "error" && (
        <li id="FriendsList_error_state">
          {props.searchError || "Search failed."}
        </li>
      )}
      {props.entries?.length === 0 && (
        <li id="FriendsList_empty_state">
          {friendsContent?.empty || "You have no friends to show"}
        </li>
      )}
      {props.entries?.map((entry) => {
        if (entry.kind === "search") {
          const user = entry.user;
          const firstName = String(user?.info?.firstname || "").trim();
          const lastName = String(user?.info?.lastname || "").trim();
          const displayName = `${firstName} ${lastName}`.trim() || "Doctor";

          return (
            <li
              key={entry.id}
              className="fr"
              style={{ cursor: "default" }}
            >
              <span>{displayName}</span>
              <div className="FriendsList_actions fr">
                <i
                  className="fas fa-user-plus"
                  title="Add friend"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (props.addFriend && user?.info?.username) {
                      props.addFriend(user.info.username);
                    }
                  }}
                ></i>
              </div>
            </li>
          );
        }

        const friend = entry.friend;
        const firstName = String(friend?.info?.firstname || "").trim();
        const lastName = String(friend?.info?.lastname || "").trim();
        const displayName = `${firstName} ${lastName}`.trim() || "Friend";

        return (
          <li
            key={entry.id}
            className="fr"
            style={{ cursor: "default" }}
          >
            <span>{displayName}</span>
            <div className="FriendsList_actions fr">
              <i
                className="far fa-comments"
                title="Open chat"
                onClick={(event) => {
                  event.stopPropagation();
                  openFriendChat(friend);
                }}
              ></i>
              <i
                className="fas fa-user-minus"
                title="Unfriend"
                onClick={(event) => {
                  event.stopPropagation();
                  if (props.removeFriend && friend?._id) {
                    props.removeFriend(friend._id);
                  }
                }}
              ></i>
              {friend.status && (
                <i
                  className="fas fa-circle"
                  title={friend.status.isConnected ? "Online" : "Offline"}
                  style={{
                    color: props.friendConnectionColor
                      ? props.friendConnectionColor(friend.status.isConnected)
                      : friend.status.isConnected
                        ? "#32cd32"
                        : "rgba(240, 242, 245, 0.42)",
                  }}
                ></i>
              )}
            </div>
          </li>
        );
      })}
    </FriendSearchPanel>
  );
};

export default FriendsList;

import React from "react";
import FriendSearchPanel from "../../../moa/friends/FriendSearchPanel";

const FriendsList = (props) => {
  const searchContent = props.content?.search;
  const friendsContent = props.content?.friends;
  const openFriendChat = (friend) => {
    if (props.selectFriendChat && friend?._id) {
      props.selectFriendChat(friend._id);
    }

    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("FriendChat_article");
    const friendsListIcon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );
    const addFriendIcon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );
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
    if (chatGoBackIcon) {
      chatGoBackIcon.style.display = "inline-flex";
    }
    if (friendsListIcon) {
      friendsListIcon.style.color = "var(--special_black)";
    }
    if (addFriendIcon) {
      addFriendIcon.style.color = "var(--special_black)";
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
      placeholder={
        searchContent?.currentFriendsPlaceholder || "Search current friends"
      }
      onSearch={props.searchFriends}
    >
      {props.friends_count === 0 && (
        <h1
          style={{
            fontSize: "12pt",
            fontWeight: "300",
            whiteSpace: "nowrap",
          }}
        >
          {friendsContent?.empty || "You have no friends to show"}
        </h1>
      )}
      {props.friends.map((friend) => (
        <li
          key={friend._id || friend.info?.username}
          className="fr"
          style={{ cursor: "default" }}
        >
          <span>
            {friend.info
              ? `${friend.info.firstname} ${friend.info.lastname}`
              : "Friend"}
          </span>
          <div className="FriendsList_actions fr">
            <i
              className="far fa-comments"
              title="Open chat"
              onClick={(event) => {
                event.stopPropagation();
                openFriendChat(friend);
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
      ))}
    </FriendSearchPanel>
  );
};

export default FriendsList;

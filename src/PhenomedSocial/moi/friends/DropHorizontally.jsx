import React from "react";

const DropHorizontally = () => {
  function showFriendsList() {
    const FriendsList_article = document.getElementById("FriendsList_article");
    const AddFriend_article = document.getElementById("AddFriend_article");
    const FriendChat_article = document.getElementById("FriendChat_article");
    const DropHorizontally_addFriend_icon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );
    const DropHorizontally_friendsList_icon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );

    if (FriendsList_article) {
      FriendsList_article.style.display = "flex";
    }
    if (AddFriend_article) {
      AddFriend_article.style.display = "none";
    }
    if (FriendChat_article) {
      FriendChat_article.style.display = "none";
    }
    DropHorizontally_addFriend_icon.style.color = "var(--special_black)";
    DropHorizontally_friendsList_icon.style.color = "var(--white)";
  }

  function showAddFriend() {
    const FriendsList_article = document.getElementById("FriendsList_article");
    const AddFriend_article = document.getElementById("AddFriend_article");
    const FriendChat_article = document.getElementById("FriendChat_article");
    const DropHorizontally_friendsList_icon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );
    const DropHorizontally_addFriend_icon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );

    if (FriendsList_article) {
      FriendsList_article.style.display = "none";
    }
    if (AddFriend_article) {
      AddFriend_article.style.display = "flex";
    }
    if (FriendChat_article) {
      FriendChat_article.style.display = "none";
    }
    DropHorizontally_friendsList_icon.style.color = "var(--special_black)";
    DropHorizontally_addFriend_icon.style.color = "var(--white)";
    const chatGoBackIcon = document.getElementById("Chat_goback_icon");
    if (chatGoBackIcon) {
      chatGoBackIcon.style.display = "none";
    }
  }

  return (
    <section
      id="DropHorizontally_article"
      style={{
        gap: "50px",
        justifyContent: "center",
        backgroundColor: "#01796f",
        padding: "10px",
        fontSize: "16pt",
        color: "var(--white)",
      }}
      className="fr"
    >
      <i
        className="fas fa-user-friends"
        id="DropHorizontally_friendsList_icon"
        onClick={showFriendsList}
      ></i>
      <i
        className="fas fa-user-plus"
        id="DropHorizontally_addFriend_icon"
        onClick={showAddFriend}
        style={{ color: "var(--special_black)" }}
      ></i>
    </section>
  );
};

export default DropHorizontally;

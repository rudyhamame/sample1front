import React from "react";

const DropHorizontally = () => {
  function showAddFriend() {
    let FriendsList_article = document.getElementById("FriendsList_article");
    let AddFriend_article = document.getElementById("AddFriend_article");
    let DropHorizontally_friendsList_icon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );
    let DropHorizontally_addFriend_icon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );
    let Chat_article = document.getElementById("Chat_article");
    FriendsList_article.style.height = "0";
    AddFriend_article.style.height = "100%";
    DropHorizontally_friendsList_icon.style.color = "var(--special_black)";
    DropHorizontally_addFriend_icon.style.color = "var(--white)";
    Chat_article.style.height = "0";
    document.getElementById("Chat_goback_icon").style.display = "none";
  }
  function unshowAddFriend() {
    let FriendsList_article = document.getElementById("FriendsList_article");
    let AddFriend_article = document.getElementById("AddFriend_article");
    let DropHorizontally_addFriend_icon = document.getElementById(
      "DropHorizontally_addFriend_icon"
    );
    let DropHorizontally_friendsList_icon = document.getElementById(
      "DropHorizontally_friendsList_icon"
    );
    FriendsList_article.style.height = "100%";
    AddFriend_article.style.height = "0";
    DropHorizontally_addFriend_icon.style.color = "var(--special_black)";
    DropHorizontally_friendsList_icon.style.color = "var(--white)";
  }
  return (
    <section
      id="DropHorizontally_article"
      style={{
        order: "1",
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
        class="fas fa-user-friends"
        id="DropHorizontally_friendsList_icon"
        onClick={unshowAddFriend}
      ></i>
      <i
        class="fas fa-user-plus"
        id="DropHorizontally_addFriend_icon"
        onClick={showAddFriend}
        style={{ color: "var(--special_black)" }}
      ></i>
    </section>
  );
};

export default DropHorizontally;

import React from "react";
import Posts from "./Posts/Posts";
import Friends from "./Friends/Friends";
import Terminology from "./Terminology/Terminology";

const Main = (props) => {
  return (
    <main id="Main_article" className="fr">
      <Terminology
        state={props.state}
        postingTerminology={props.postingTerminology}
      />
      <Posts
        state={props.state}
        postingPost={props.postingPost}
        RetrievingMyPosts={props.RetrievingMyPosts}
        searchPosts={props.searchPosts}
        prepare_searchPosts={props.prepare_searchPosts}
        logOut={props.logOut}
        acceptFriend={props.acceptFriend}
        type={props.type}
        counter={props.counter}
        updateBeforeLeave={props.updateBeforeLeave}
      />
      {parseInt(
        window.getComputedStyle(document.querySelector("#root")).width
      ) > 1200 && (
        <Friends
          state={props.state}
          searchUsers={props.searchUsers}
          addFriend={props.addFriend}
          RetrievingMySendingMessages={props.RetrievingMySendingMessages}
          sendToMeMessage={props.sendToMeMessage}
          sendToThemMessage={props.sendToThemMessage}
          dbUpdate_user_connected={props.dbUpdate_user_connected}
        />
      )}
    </main>
  );
};

export default Main;

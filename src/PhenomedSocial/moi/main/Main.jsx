import React from "react";
import Posts from "../posts/Posts";
import Friends from "../friends/Friends";

const Main = (props) => {
  return (
    <main id="Main_article" className="fr">
      {/*
      <Terminology
        state={props.state}
        postingTerminology={props.postingTerminology}
        content={props.content}
      />
      */}
      <Posts
        state={props.state}
        content={props.content}
        logOut={props.logOut}
        acceptFriend={props.acceptFriend}
        type={props.type}
        counter={props.counter}
        updateBeforeLeave={props.updateBeforeLeave}
      />
      <Friends
        state={props.state}
        content={props.content}
        friendConnectionColor={props.friendConnectionColor}
        removeFriend={props.removeFriend}
        selectFriendChat={props.selectFriendChat}
        closeActiveChat={props.closeActiveChat}
        searchUsers={props.searchUsers}
        addFriend={props.addFriend}
        RetrievingMySendingMessages={props.RetrievingMySendingMessages}
        sendToMeMessage={props.sendToMeMessage}
        sendToThemMessage={props.sendToThemMessage}
        updateMyTypingPresence={props.updateMyTypingPresence}
        getRealtimeSocket={props.getRealtimeSocket}
        dbUpdate_user_connected={props.dbUpdate_user_connected}
        serverReply={props.serverReply}
      />
    </main>
  );
};

export default Main;

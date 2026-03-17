import React from "react";

const FriendsList = (props) => {
  return (
    <section id="FriendsList_article" className="fc">
      <section id="FriendsList_content_container" className="fc">
        <ul className="fc" id="FriendsList_friends_list">
          {props.friends_count === 0 && (
            <h1
              style={{
                fontSize: "12pt",
                fontWeight: "300",
                whiteSpace: "nowrap",
              }}
            >
              You have no friends to show
            </h1>
          )}
        </ul>
      </section>
    </section>
  );
};

export default FriendsList;

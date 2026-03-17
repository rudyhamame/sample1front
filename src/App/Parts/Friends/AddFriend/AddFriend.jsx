import React from "react";
import SearchUsers from "../../../Header/SearchUsers/SearchUsers";

const AddFirend = (props) => {
  return (
    <section id="AddFriend_article" className="fc">
      <section id="AddFriend_content_container" className="fc">
        <SearchUsers
          type="users_search"
          component="AddFriend"
          searchUsers={props.searchUsers}
          addFriend={props.addFriend}
          state={props.state}
        />
      </section>
      <section id="AddFriend_addFriend" className="fc">
        <ul id="AddFriend_addFriend_results" className="fc"></ul>
      </section>
    </section>
  );
};

export default AddFirend;

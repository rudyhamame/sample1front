import React from "react";
import FriendSearchPanel from "../FriendSearchPanel";

const AddFirend = (props) => {
  const searchContent = props.content?.search;

  return (
    <FriendSearchPanel
      articleId="AddFriend_article"
      containerId="AddFriend_content_container"
      resultsSectionId="AddFriend_addFriend"
      resultsListId="AddFriend_addFriend_results"
      searchInputId="AddFriend_search_input"
      buttonLabel={searchContent?.button}
      placeholder={
        searchContent?.addFriendsPlaceholder || "Search new doctors"
      }
      onSearch={props.searchUsers}
    />
  );
};

export default AddFirend;

import React from "react";
import SearchUsers from "./SearchUsers/SearchUsers";

const FriendSearchPanel = ({
  articleId,
  containerId,
  resultsSectionId,
  resultsListId,
  searchInputId,
  buttonLabel,
  placeholder,
  onSearch,
  children,
}) => {
  return (
    <section id={articleId} className="fc">
      <section id={containerId} className="fc">
        <SearchUsers
          searchUsers={onSearch}
          inputId={searchInputId}
          resultsListId={resultsListId}
          buttonLabel={buttonLabel}
          placeholder={placeholder}
        />
        <section id={resultsSectionId} className="fc">
          <ul id={resultsListId} className="fc">
            {children}
          </ul>
        </section>
      </section>
    </section>
  );
};

export default FriendSearchPanel;

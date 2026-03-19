import React from "react";

const SearchUsers = (props) => {
  ///////////////////////////SEATCH FOR USERS TO BE FRIENDS///////////////

  function send_by_enter() {
    const searchInput = document.getElementById(
      props.inputId || "SearchUsers_input"
    );
    const resultsList = document.getElementById(
      props.resultsListId || "AddFriend_addFriend_results"
    );

    if (resultsList) {
      resultsList.innerHTML = "";
    }

    if (props.searchUsers) {
      props.searchUsers(searchInput ? searchInput.value : "");
    }
  }

  return (
    <section id="Search_section" className="fr">
      <button
        id="Search_button"
        onClick={() => {
          send_by_enter();
        }}
      >
        {props.buttonLabel || "Search"}
      </button>
      <input
        id={props.inputId || "SearchUsers_input"}
        type="text"
        placeholder={props.placeholder || "Enter a keyword"}
        onKeyPress={(event) => {
          if (event.which === 13) {
            send_by_enter(event);
          }
        }}
      />
    </section>
  );
};

export default SearchUsers;

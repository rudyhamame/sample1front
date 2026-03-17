import React from "react";

const SearchUsers = (props) => {
  let SearchUsers_input = document.getElementById("SearchUsers_input");
  let AddFriend_addFriend_results = document.getElementById(
    "AddFriend_addFriend_results"
  );
  ///////////////////////////SEATCH FOR USERS TO BE FRIENDS///////////////

  function send_by_enter() {
    AddFriend_addFriend_results.innerHTML = "";
    props.searchUsers(SearchUsers_input.value);
  }

  return (
    <section id="Search_section" className="fr">
      <button
        id="Search_button"
        onClick={() => {
          send_by_enter();
        }}
      >
        Search
      </button>
      <input
        id="SearchUsers_input"
        type="text"
        placeholder="Enter a keyword"
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

import React from "react";
import FriendChat from "./FriendChat/FriendChat";
import FriendsList from "./FriendsList/FriendsList";
import { apiUrl } from "../../../config/api";

class Friends extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: "",
      searchResults: [],
      searchStatus: "idle",
      searchError: "",
    };
    this.searchRequestId = 0;
  }

  getNormalizedFriends = () =>
    (this.props.state?.friends || []).filter(
      (friend) => friend && typeof friend === "object" && friend.info
    );
  //......SEARCH FOR USERS.......
  ////////////////////////SEARCH USER/////////////////////////
  searchUsers = (target) => {
    const normalizedTarget = String(target || "").trim().toLowerCase();
    const requestId = ++this.searchRequestId;
    this.setState({
      searchTerm: normalizedTarget,
      searchError: "",
    });

    if (!normalizedTarget) {
      this.setState({
        searchResults: [],
        searchStatus: "idle",
      });
      return;
    }

    this.setState({
      searchStatus: "loading",
    });

    let url = apiUrl("/api/user/searchUsers/") + encodeURIComponent(normalizedTarget);
    let options = {
      method: "GET",
      mode: "cors",
    };
    let req = new Request(url, options);
    fetch(req)
      .then((results) => {
        if (!results.ok) {
          throw new Error(`Search failed with status ${results.status}`);
        }
        return results.json();
      })
      .then((users) => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.setState({
          searchResults: Array.isArray(users?.array)
            ? users.array.filter((user) => user?._id !== this.props.state?.my_id)
            : [],
          searchStatus: "success",
        });
      })
      .catch((error) => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        console.error("Failed to search users", error);
        this.setState({
          searchResults: [],
          searchStatus: "error",
          searchError: "Unable to load search results right now.",
        });
      });
  };
  //.....END OF SEARCH FOR USERS......

  //.....ADD A USER..........
  addFriend = (friend_username) => {
    let url = apiUrl("/api/user/addFriend/") + friend_username;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state?.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: this.props.state?.my_id,
        message:
          this.props.state?.firstname +
          " " +
          this.props.state?.lastname +
          " wants to add you as a friend",
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((response) => {
      if (response.status === 201) {
        response.json().then((result) => {
          this.props.serverReply?.(result.message || "Friend request sent.");
        });
        document.getElementById(friend_username)?.children[1]?.remove(); //So the icon will disappear
      } else {
        this.props.serverReply?.("Request failed");
      }
    });
  };
  //.....END OF ADD A USER.......

  render() {
    const friends = this.getNormalizedFriends();
    const searchTerm = this.state.searchTerm;
    const filteredFriends = searchTerm
      ? friends.filter((friend) => {
          const firstname = friend.info?.firstname || "";
          const lastname = friend.info?.lastname || "";
          const username = friend.info?.username || "";
          const fullName = `${firstname} ${lastname}`.trim();

          return (
            firstname.toLowerCase().includes(searchTerm) ||
            lastname.toLowerCase().includes(searchTerm) ||
            username.toLowerCase().includes(searchTerm) ||
            fullName.toLowerCase().includes(searchTerm)
          );
        })
      : friends;
    const friendIds = new Set(friends.map((friend) => friend._id));
    const mergedEntries = searchTerm
      ? [
          ...filteredFriends.map((friend) => ({
            kind: "friend",
            id: friend._id || friend.info?.username,
            friend,
          })),
          ...this.state.searchResults
            .filter((user) => !friendIds.has(user?._id))
            .map((user) => ({
              kind: "search",
              id: user._id || user.info?.username,
              user,
            })),
        ]
      : filteredFriends.map((friend) => ({
          kind: "friend",
          id: friend._id || friend.info?.username,
          friend,
        }));

    return (
      <section id="Friends_article" className="fc">
        <section id="Friends_content_container" className="fc">
          <FriendsList
            entries={mergedEntries}
            friends_count={friends.length}
            searchFriends={this.searchUsers}
            addFriend={this.addFriend}
            content={this.props.content}
            searchStatus={this.state.searchStatus}
            searchError={this.state.searchError}
            friendConnectionColor={this.props.friendConnectionColor}
            removeFriend={this.props.removeFriend}
            selectFriendChat={this.props.selectFriendChat}
          />
          <FriendChat
            state={this.props.state}
            content={this.props.content}
            sendToThemMessage={this.props.sendToThemMessage}
            updateMyTypingPresence={this.props.updateMyTypingPresence}
            closeActiveChat={this.props.closeActiveChat}
          />
        </section>
      </section>
    );
  }
}

export default Friends;

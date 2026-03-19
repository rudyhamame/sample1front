import React from "react";
import Addfriend from "../../moa/friends/AddFriend/AddFriend";
import DropHorizontally from "./DropHorizontally";
import FriendChat from "./FriendChat/FriendChat";
import FriendsList from "./FriendsList/FriendsList";
import { apiUrl } from "../../../config/api";

class Friends extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: "",
    };
  }

  getNormalizedFriends = () =>
    (this.props.state?.friends || []).filter(
      (friend) => friend && typeof friend === "object" && friend.info
    );
  //......SEARCH FOR USERS.......
  ////////////////////////SEARCH USER/////////////////////////
  searchUsers = (target) => {
    let url = apiUrl("/api/user/searchUsers/") + target;
    let options = {
      method: "GET",
      mode: "cors",
    };
    let req = new Request(url, options);
    fetch(req)
      .then((results) => {
        return results.json();
      })
      .then((users) => {
        const friends = this.getNormalizedFriends();
        for (
          var i = 0;
          i < users.array.length &&
          users.array[i]._id !== this.props.state?.my_id;
          i++
        ) {
          const existingFriend = friends.some(
            (friend) => friend._id === users.array[i]._id
          );

          if (friends.length > 0) {
            if (!existingFriend) {
              let p = document.createElement("p");
              let li = document.createElement("li");
              let ul = document.getElementById("AddFriend_addFriend_results");
              let icon = document.createElement("i");
              p.textContent =
                users.array[i].info.firstname +
                " " +
                users.array[i].info.lastname;
              li.appendChild(p);
              li.setAttribute("id", users.array[i].info.username);
              li.setAttribute("class", "fr");

              icon.setAttribute("class", " fas fa-user-plus");
              icon.addEventListener("click", () => {
                this.addFriend(li.id);
              });
              li.appendChild(icon);
              ul.appendChild(li);
            } else {
              let p = document.createElement("p");
              let p2 = document.createElement("p");
              let li = document.createElement("li");
              let ul = document.getElementById("AddFriend_addFriend_results");
              p.textContent =
                users.array[i].info.firstname +
                " " +
                users.array[i].info.lastname;
              p2.textContent = "already friends";
              p2.style.fontSize = "10pt";
              li.appendChild(p);
              li.appendChild(p2);
              li.setAttribute("id", users.array[i].info.username);
              li.setAttribute("class", "fr");
              ul.appendChild(li);
            }
          } else {
            let p = document.createElement("p");
            let li = document.createElement("li");
            let ul = document.getElementById("AddFriend_addFriend_results");
            let icon = document.createElement("i");
            p.textContent =
              users.array[i].info.firstname +
              " " +
              users.array[i].info.lastname;
            li.appendChild(p);
            li.setAttribute("id", users.array[i].info.username);
            li.setAttribute("class", "fr");

            icon.setAttribute("class", " fas fa-user-plus");
            icon.addEventListener("click", () => {
              this.addFriend(li.id);
            });
            li.appendChild(icon);
            ul.appendChild(li);
          }
        }
      });
  };
  //.....END OF SEARCH FOR USERS......

  searchExistingFriends = (target) => {
    const normalizedTarget = String(target || "").trim().toLowerCase();
    this.setState({
      searchTerm: normalizedTarget,
    });
  };

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
          document.getElementById("server_answer").style.width = "fit-content";
          document.getElementById("server_answer_message").textContent =
            result.message;
          setTimeout(() => {
            document.getElementById("server_answer").style.width = "0";
            document.getElementById("server_answer_message").textContent = "";
          }, 5000);
        });
        document.getElementById(friend_username).children[1].remove(); //So the icon will disappear
      } else {
        document.getElementById("server_answer").style.width = "fit-content";
        document.getElementById("server_answer_message").textContent =
          "Request failed";
        setTimeout(() => {
          document.getElementById("server_answer").style.width = "0";
          document.getElementById("server_answer_message").textContent = "";
        }, 5000);
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

    return (
      <section id="Friends_article" className="fc">
        <section id="Friends_content_container" className="fc">
          <Addfriend
            searchUsers={this.searchUsers}
            addFriend={this.addFriend}
            state={this.props.state}
            content={this.props.content}
          />
          <FriendsList
            friends={filteredFriends}
            friends_count={filteredFriends.length}
            searchFriends={this.searchExistingFriends}
            content={this.props.content}
            friendConnectionColor={this.props.friendConnectionColor}
            selectFriendChat={this.props.selectFriendChat}
          />
          <FriendChat
            state={this.props.state}
            content={this.props.content}
            sendToThemMessage={this.props.sendToThemMessage}
            updateMyTypingPresence={this.props.updateMyTypingPresence}
            closeActiveChat={this.props.closeActiveChat}
          />
          <DropHorizontally />
        </section>
      </section>
    );
  }
}

export default Friends;

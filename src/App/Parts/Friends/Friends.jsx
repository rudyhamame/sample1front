import React from "react";
import Addfriend from "./AddFriend/AddFriend"
import DropHorizontally from "./DropHorizontally";
import FriendsList from "./FriendsList/FriendsList";

class Friends extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      friends_count: this.props.state.friends.length
    }}
  //......SEARCH FOR USERS.......
  ////////////////////////SEARCH USER/////////////////////////
  searchUsers = (target) => {
    let url = "https://backendstep.onrender.com/api/user/searchUsers/" + target;
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
        for (
          var i = 0;
          i < users.array.length && users.array[i]._id !== this.state.my_id;
          i++
        ) {
          if (this.state.friends.length > 0) {
            if (users.array[i]._id !== this.state.friends[i]._id) {
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
  
  //.....ADD A USER..........
   addFriend = (friend_username) => {
    let url =
      "https://backendstep.onrender.com/api/user/addFriend/" + friend_username;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: this.state.my_id,
        message:
          this.state.firstname +
          " " +
          this.state.lastname +
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
  return (
      <section id="Friends_content_container" className="fc">
        <Addfriend
          // searchUsers={this.searchUsers}
          // addFriend={this.addFriend}
        />
        <FriendsList friends_count={this.state.friends_count}  />
        <DropHorizontally />
      </section>

      
    
  );
        }
};

export default Friends;

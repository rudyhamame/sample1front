import React from "react";
import Friends from "../../Parts/Friends/Friends";

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  //.........VARIABLES.........
  textarea = document.getElementById("Chat_textarea_input");
  //...........................................Preperation..................................................
  preparingChat = () => {
    let url =
      "https://backendstep.onrender.com/api/chat/prepareChat/" +
      this.state.my_id;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req);
  };
  //.....BUILD CHAT FOR A SPECIFIC FRIEND
  RetrievingMySendingMessages = (friend_id) => {
    var messages = [];
    let ul = document.getElementById("Chat_messages");
    ul.innerHTML = "";
    for (var i = 0; i < this.state.chat.length; i++) {
      if (
        messages[i] !== this.state.chat[i].date &&
        friend_id === this.state.chat[i]._id
      ) {
        document
          .getElementById("Chat_messages")
          .scrollBy(0, document.getElementById("Chat_messages").scrollHeight);

        if (this.state.chat[i].from === "me") {
          let p = document.createElement("p");
          let li = document.createElement("li");
          let div = document.createElement("div");
          p.textContent = this.state.chat[i].message;
          li.setAttribute("class", "sentMessagesLI");
          li.appendChild(p);
          div.setAttribute("class", "sentMessagesDIV fc");
          div.appendChild(li);
          ul.appendChild(div);
        }
        if (this.state.chat[i].from === "them") {
          let p = document.createElement("p");
          let li = document.createElement("li");
          let div = document.createElement("div");
          p.textContent = this.state.chat[i].message;
          li.setAttribute("class", "receivedMessagesLI");
          li.appendChild(p);
          div.setAttribute("class", "receivedMessagesDIV fc");
          div.appendChild(li);
          ul.appendChild(div);
        }
      }
      messages[i] = this.state.chat[i].date;
    }
  };
  //..........END OF BUILD CHAT FOR A SPECIFIC FRIEND
  //..........SEND A MESSAGE TO A SPECIFIC FRIEND
  sendToThemMessage = (message) => {
    this.textarea.style.height = "70px";
    if (message && message.trim() !== "") {
      let url =
        "https://backendstep.onrender.com/api/chat/sendMessage/" +
        this.state.friendID_selected +
        "/" +
        this.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: document.getElementById("Chat_textarea_input").value,
        }),
      };
      let req = new Request(url, options);
      fetch(req).then((result) => {
        if (result.status === 201) {
          document.getElementById("Chat_textarea_input").value = "";
        }
      });
    } else {
      this.serverReply("You can't send an empty message");
    }
  };
  //........END OF SEND A MESSAGE TO A SPECIFIC FRIEND......
  auto_grow = (event) => {
    this.textarea.style.height = this.textarea.scrollHeight + "px";
    if (event.which === 8) {
      this.textarea.style.height = this.textarea.scrollHeight + "px";
    }
  };

  send_by_enter = (event) => {
    if (event.which === 13) {
      this.sendToThemMessage(this.textarea.value);
    }
  };

  openNotesAside = () => {
    let Friends_content_container = document.getElementById(
      "Friends_content_container"
    );
    let searchPosts = document.getElementById("SearchPosts_article");
    let Friends_article = document.getElementById("Friends_article");
    let Friends_control_door = document.getElementById("Friends_control_door");
    let app_page = document.querySelector("#app_page");
    let app_page_css = window.getComputedStyle(app_page);
    let Header_article = document.getElementById("Header_article");
    if (Friends_control_door.title === "unclicked") {
      this.dbUpdate_user_connected(true);
      if (parseInt(app_page_css.width) >= 1500) {
        Friends_content_container.style.width = "400px";
      }

      if (parseInt(app_page_css.width) < 1200) {
        searchPosts.style.display = "none";
        Friends_article.style.height = "100vh";
        Friends_content_container.style.height = "100%";
        Header_article.style.display = "none";
      }
      Friends_control_door.title = "clicked";
    } else {
      // this.dbUpdate_user_connected(false);
      if (parseInt(app_page_css.width) < 1200) {
        Header_article.style.display = "flex";
        searchPosts.style.display = "flex";
        Friends_article.style.height = "initial";
        Friends_content_container.style.height = "0";
      } else {
        Friends_content_container.style.width = "0";
      }
      Friends_control_door.title = "unclicked";
    }
  };
  render() {
    return (
      <aside id="Chat_article" className="fc">
        <section id="Chat_title_container" className="fr">
          <i
            class="fas fa-chevron-circle-left"
            id="Chat_goback_icon"
            onClick={() => {
              document.getElementById("Chat_goback_icon").style.display =
                "none";
              document.getElementById("Chat_article").style.height = "0";
              document.getElementById("FriendsList_article").style.height =
                "100%";
              document.getElementById(
                "DropHorizontally_article"
              ).style.display = "flex";
            }}
          ></i>
          <h1 id="Chat_title_text">
            {/* {props.state.friend_target === true && "Typing..."} */}
          </h1>
        </section>
        <ul id="Chat_messages"></ul>
        <section id="Chat_form" className="fr">
          <textarea
            id="Chat_textarea_input"
            onKeyDown={(event) => {
              this.auto_grow(event);
              this.send_by_enter(event);
            }}
          ></textarea>
          <button id="Chat_submit_button">
            <i
              class="fc far fa-paper-plane"
              onClick={() => {
                this.sendToThemMessage(this.textarea.value);
              }}
            ></i>
          </button>
        </section>
      </aside>
    );
  }
}

export default Chat;

//...........import..................
import React from "react";

//........import CSS...........
import "./App.css";
import "./Main/main.css";
import "./Header/Nav/Notifications/notifications.css";
import "./Header/Nav/nav.css";
import "./Main/Greeting/greeting.css";
import { Route } from "react-router-dom";
import Greeting from "./Main/Greeting/Greeting";
import Study from "./SubApps/StudyPlannner/components/Study/Study";
import SchoolPlanner from "./SubApps/StudyPlannner/components/SchoolPlanner/SchoolPlanner";
import { apiUrl } from "../config/api";
import PhenomedSocial from "../PhenomedSocial/PhenomedSocial";
import PhenomedSocialArabic from "../PhenomedSocial/PhenomedSocialArabic";
import Profile from "../Profile/Profile";
import { connectRealtime } from "../realtime/socket";
//...........component..................
class App extends React.Component {
  //..........states...........
  constructor(props) {
    super(props);
    this.state = {
      my_id: JSON.parse(sessionStorage.getItem("state")).my_id,
      username: JSON.parse(sessionStorage.getItem("state")).username,
      firstname: JSON.parse(sessionStorage.getItem("state")).firstname,
      lastname: JSON.parse(sessionStorage.getItem("state")).lastname,
      dob: JSON.parse(sessionStorage.getItem("state")).dob,
      token: JSON.parse(sessionStorage.getItem("state")).token,
      isConnected: true,
      isOnline: false,
      friends: JSON.parse(sessionStorage.getItem("state")).friends,
      chat: [],
      terminology: [],
      posts: JSON.parse(sessionStorage.getItem("state")).posts,
      lectures: JSON.parse(sessionStorage.getItem("state")).lectures,
      app_is_loading: false,
      friend_target: null,
      server_answer: null,
      friendID_selected: null,
      activeChatFriendId: null,
      activeChatFriendName: "",
      isChatting: false,
      friendChatPresence: {},
      friendTypingPresence: {},
      searching_on: false,
      friendsPosts_retrieved: false,
      retrievingFriendsPosts_DONE: false,
      retrievingTerminology_DONE: false,
      retrievingStudySessions_DONE: false,
      notifications: [],
      timer: {
        hours: 0,
        mins: 0,
        secs: 0,
      },
      study_session: null,
      login_record: JSON.parse(sessionStorage.getItem("state")).login_record || [],
      profile: false,
      friendAddedSuccessfully: null,
      posts_updated: false,
      posts_deleted: false,
      image: null,
    };
  }
  realtimeSocket = null;
  ////////////////////////////////////////Variables//////////////
  // posts = [];
  // lectures = [];
  memory = {
    courses: [],
  };
  /////////////////////////////////////////////////////Lifecycle//////////////////////////
  componentDidMount() {
    this.setState({
      my_id: JSON.parse(sessionStorage.getItem("state")).my_id,
      username: JSON.parse(sessionStorage.getItem("state")).username,
      firstname: JSON.parse(sessionStorage.getItem("state")).firstname,
      lastname: JSON.parse(sessionStorage.getItem("state")).lastname,
      dob: JSON.parse(sessionStorage.getItem("state")).dob,
      token: JSON.parse(sessionStorage.getItem("state")).token,
    });
    this.updateUserInfo();
    this.connectRealtime();
  }

  componentDidUpdate(prevProps, prevState) {
    this.buildNotifications();

    if (
      this.state.friendID_selected &&
      (prevState.chat !== this.state.chat ||
        prevState.friendID_selected !== this.state.friendID_selected)
    ) {
      this.RetrievingMySendingMessages(this.state.friendID_selected);
    }
  }
  componentWillUnmount() {
    if (this.realtimeSocket) {
      this.realtimeSocket.disconnect();
      this.realtimeSocket = null;
    }
    // if (this.props.path === "/study") {
    //   let input = window.confirm(
    //     "Do you want this study session to be counted?"
    //   );
    //   if (input) this.updateBeforeLeave();
    // }
    // if (this.props.path === "/") {
    //   this.availableToChat(false);
    // }
  }

  //......MAKE YOURSELF AVAILABLE TO CHAT......
  connectRealtime = () => {
    if (this.realtimeSocket || !this.state.my_id) {
      return;
    }

    this.realtimeSocket = connectRealtime({
      userId: this.state.my_id,
      onUserRefresh: () => {
        this.updateUserInfo();
      },
      onChatPresence: ({ userId, isChatting }) => {
        if (!userId || userId === this.state.my_id) {
          return;
        }

        this.setState((prevState) => ({
          friendChatPresence: {
            ...prevState.friendChatPresence,
            [userId]: Boolean(isChatting),
          },
        }));
      },
      onTypingPresence: ({ userId, isTyping }) => {
        if (!userId || userId === this.state.my_id) {
          return;
        }

        this.setState((prevState) => ({
          friendTypingPresence: {
            ...prevState.friendTypingPresence,
            [userId]: Boolean(isTyping),
          },
        }));
      },
      onConnected: () => {
        if (this.state.isChatting && this.state.activeChatFriendId) {
          this.updateMyChatPresence(this.state.activeChatFriendId, true);
        }
      },
    });
  };

  updateMyChatPresence = (friendId, isChatting) => {
    if (!this.realtimeSocket || !this.state.my_id || !friendId) {
      return;
    }

    this.realtimeSocket.emit("user:chat-status", {
      userId: this.state.my_id,
      friendId,
      isChatting,
    });
  };

  updateMyTypingPresence = (friendId, isTyping) => {
    if (!this.realtimeSocket || !this.state.my_id || !friendId) {
      return;
    }

    this.realtimeSocket.emit("user:typing-status", {
      userId: this.state.my_id,
      friendId,
      isTyping,
    });
  };

  availableToChat = (isConnected) => {
    let url = apiUrl("/api/user/isOnline/") + this.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isConnected: isConnected,
      }),
    };

    let req = new Request(url, options);
    return fetch(req)
      .then((response) => {
        if (response.status === 201) {
          return response.json();
        }

        throw new Error("Unable to update connection status.");
      })
      .catch((err) => {
        console.log("error:", err.message);
        throw err;
      });
  };

  //......END OF MAKE YOURSELF AVAILABLE TO CHAT......

  //............................................Retrieving Area..........................................................................
  posts_alreadyBuilt = [];
  posts_comments = [];
  BuildingPosts = () => {
    console.log(this.state.posts_alreadyBuilt);
    let ul = document.getElementById("MountPosts_content_container");
    // if (this.state.posts.length > 0) {
    //   this.state.posts.sort((a, b) => {
    //     return new Date(b.date) - new Date(a.date);
    //   });
    // }
    for (var i = 0; i < this.state.posts.length; i++) {
      console.log(this.state.posts);
      if (
        this.state.posts[i]._id !== this.state.posts_alreadyBuilt[i] ||
        (this.state.posts[i]._id === this.state.posts_alreadyBuilt[i] &&
          this.state.posts[i].comments.length !==
            this.state.posts_comments[i]) ||
        this.state.posts_deleted
      ) {
        if (
          this.state.posts[i]._id === this.state.posts_alreadyBuilt[i] &&
          this.state.posts[i].comments.length !== this.state.posts_comments[i]
        ) {
          let commentlist_ul = document.getElementById(
            "commentlist_ul" + this.state.posts[i]._id
          );
          if (this.state.posts[i].comments.length === 1) {
            let commentlist_ul = document.createElement("ul");
            commentlist_ul.setAttribute(
              "id",
              "commentlist_ul" + this.state.posts[i]._id
            );
            commentlist_ul.setAttribute("class", "fc commentlist_ul");
            let comments_div = document.getElementById(
              "commentDiv" + this.state.posts[i]._id
            );
            let li = document.createElement("li");
            li.setAttribute("class", "comment_li");
            li.textContent =
              this.state.posts[i].comments[
                this.state.posts[i].comments.length - 1
              ];
            commentlist_ul.prepend(li);
            comments_div.appendChild(commentlist_ul);
            this.state.posts_comments[i] = this.state.posts[i].comments.length;
          } else {
            let li = document.createElement("li");
            li.setAttribute("class", "comment_li");
            li.textContent =
              this.state.posts[i].comments[
                this.state.posts[i].comments.length - 1
              ];
            commentlist_ul.prepend(li);
            this.state.posts_comments[i] = this.state.posts[i].comments.length;
          }
        } else {
          this.setState({
            app_is_loading: true,
          });
          let date_p = document.createElement("p");
          let category_p = document.createElement("p");
          let subject_p = document.createElement("p");
          let reference_p = document.createElement("p");
          let page_p = document.createElement("p");
          let li = document.createElement("li");
          let details_div = document.createElement("div");
          let note_options_div = document.createElement("div");
          //.............................comments.......................

          //............date.................................
          let date = this.state.posts[i].date;
          let date_timezone = new Date(date);
          let date_string = date_timezone.toDateString();
          let time_string = date_timezone.toLocaleTimeString();
          //.............................................
          //...............................note..................................
          let note_p = document.createElement("p");
          note_p.textContent = this.state.posts[i].note;
          note_p.setAttribute("class", "note_p");
          note_options_div.setAttribute("class", "fr note_options_div");
          note_options_div.setAttribute("id", "note_options_div" + i);
          note_options_div.appendChild(note_p);
          //.......................Options....................................
          let options_div = document.createElement("div");
          //............................Poster name.......................
          let postername_p = document.createElement("p");
          postername_p.setAttribute("class", "postername_p");
          details_div.appendChild(postername_p);
          //..................................

          if (this.state.posts[i].id === this.state.my_id) {
            postername_p.textContent = "Mine";
            let p_delete = document.createElement("p");
            let p_edit = document.createElement("p");
            p_delete.style.cursor = "pointer";
            p_edit.style.cursor = "pointer";
            p_delete.textContent = "Delete";
            p_edit.textContent = "Edit";
            options_div.appendChild(p_delete);
            options_div.appendChild(p_edit);
            p_delete.addEventListener("click", () => {
              this.deletePost(options_div.id);
            });

            p_edit.addEventListener("click", () =>
              this.editPost(options_div.id)
            );
            note_options_div.appendChild(options_div);
            options_div.setAttribute(
              "class",
              "fc MountPosts_postOptionsContainer"
            );
            options_div.setAttribute("id", this.state.posts[i]._id);
          } else {
            postername_p.textContent =
              this.state.posts[i].firstname +
              " " +
              this.state.posts[i].lastname;
          }
          //........................................................................

          //.....................................................................
          li.className = "fc";

          date_p.innerHTML =
            "<i class='far fa-clock'></i>" +
            "  " +
            date_string +
            ", " +
            time_string;
          category_p.textContent = "System: " + this.state.posts[i].category;
          subject_p.textContent = "Discipline: " + this.state.posts[i].subject;
          reference_p.textContent =
            "Reference: " + this.state.posts[i].reference;
          page_p.textContent = "Page #: " + this.state.posts[i].page_num;
          date_p.className = "MountPosts_date";
          details_div.appendChild(date_p);
          details_div.appendChild(category_p);
          details_div.appendChild(subject_p);
          details_div.setAttribute("class", "fr details_div");
          //...................comments...............
          let comments_div = document.createElement("div");
          let comment_input = document.createElement("input");
          let commentlist_ul = document.createElement("ul");
          comments_div.appendChild(comment_input);
          comments_div.setAttribute("class", "fc comments_div");
          comments_div.setAttribute(
            "id",
            "commentDiv" + this.state.posts[i]._id
          );
          comment_input.setAttribute(
            "id",
            "comment_input" + this.state.posts[i]._id
          );
          comment_input.setAttribute("class", "comment_input");
          commentlist_ul.setAttribute(
            "id",
            "commentlist_ul" + this.state.posts[i]._id
          );
          comment_input.setAttribute("placeholder", "Enter a comment");
          comment_input.addEventListener("keypress", (event) => {
            this.postComment(event, comments_div.id, comment_input.id);
          });
          this.state.posts[i].comments.forEach((comment) => {
            let comment_li = document.createElement("li");
            comment_li.textContent = comment;
            comment_li.setAttribute("class", "comment_li");
            commentlist_ul.setAttribute("class", "fc commentlist_ul");
            commentlist_ul.prepend(comment_li);
            comments_div.appendChild(commentlist_ul);
          });
          //.....................................................

          if (
            !(
              this.state.posts[i].reference === "" &&
              this.state.posts[i].page_num !== null
            )
          ) {
            if (this.state.posts[i].reference !== "")
              details_div.appendChild(reference_p);
            if (this.state.posts[i].page_num !== null)
              details_div.appendChild(page_p);
          }
          li.setAttribute("id", "li" + this.state.posts[i]._id);
          li.appendChild(details_div);
          li.appendChild(note_options_div);
          li.appendChild(comments_div);
          ul.appendChild(li);
          this.state.posts_alreadyBuilt[i] = this.state.posts[i]._id;
          this.state.posts_comments[i] = this.state.posts[i].comments.length;
          this.setState({
            app_is_loading: false,
            //   posts_updated: true,
          });
        }
      }

      // if (this.state.posts.length < this.state.posts_alreadyBuilt.length) {
      //   this.state.posts_alreadyBuilt = [];
      //   ul.innerHTML = "";
      // }
    }
  };
  //////////////////////////// Profile///////////////////////////////////////////////
  profilePosts = [];
  BuildingPostsProfile = () => {
    let ul = document.getElementById("MountPosts_content_container");
    for (var i = 0; i < this.state.posts.length; i++) {
      if (this.state.posts[i].id === this.state.my_id) {
        if (this.state.posts.length >= this.profilePosts.length) {
          if (this.state.posts[i]._id !== this.profilePosts[i]) {
            if (
              this.state.posts[i]._id === this.profilePosts[i] &&
              this.state.posts[i].comments.length !==
                this.state.posts_comments[i]
            ) {
              let commentlist_ul = document.getElementById(
                "commentlist_ul" + this.state.posts[i]._id
              );
              if (this.state.posts[i].comments.length === 1) {
                let commentlist_ul = document.createElement("ul");
                commentlist_ul.setAttribute(
                  "id",
                  "commentlist_ul" + this.state.posts[i]._id
                );
                commentlist_ul.setAttribute("class", "fc commentlist_ul");
                let comments_div = document.getElementById(
                  "commentDiv" + this.state.posts[i]._id
                );
                let li = document.createElement("li");
                li.setAttribute("class", "comment_li");
                li.textContent =
                  this.state.posts[i].comments[
                    this.state.posts[i].comments.length - 1
                  ];
                commentlist_ul.prepend(li);
                comments_div.appendChild(commentlist_ul);
                this.state.posts_comments[i] =
                  this.state.posts[i].comments.length;
              } else {
                let li = document.createElement("li");
                li.setAttribute("class", "comment_li");
                li.textContent =
                  this.state.posts[i].comments[
                    this.state.posts[i].comments.length - 1
                  ];
                commentlist_ul.prepend(li);
                this.state.posts_comments[i] =
                  this.state.posts[i].comments.length;
              }
            } else {
              this.setState({
                app_is_loading: true,
              });
              let date_p = document.createElement("p");
              let category_p = document.createElement("p");
              let subject_p = document.createElement("p");
              let reference_p = document.createElement("p");
              let page_p = document.createElement("p");
              let li = document.createElement("li");
              let details_div = document.createElement("div");
              let note_options_div = document.createElement("div");
              //.............................comments.......................

              //............date.................................
              let date = this.state.posts[i].date;
              let date_timezone = new Date(date);
              let date_string = date_timezone.toDateString();
              let time_string = date_timezone.toLocaleTimeString();
              //.............................................
              //...............................note..................................
              let note_p = document.createElement("p");
              note_p.textContent = this.state.posts[i].note;
              note_p.setAttribute("class", "note_p");
              note_options_div.setAttribute("class", "fr note_options_div");
              note_options_div.setAttribute("id", "note_options_div" + i);
              note_options_div.appendChild(note_p);
              //.......................Options....................................
              let options_div = document.createElement("div");
              options_div.setAttribute("class", "options_div");
              //............................Poster name.......................
              let postername_p = document.createElement("p");
              postername_p.setAttribute("class", "postername_p");
              details_div.appendChild(postername_p);
              //..................................

              postername_p.textContent = "Mine";
              let p_delete = document.createElement("p");
              let p_edit = document.createElement("p");
              p_delete.style.cursor = "pointer";
              p_edit.style.cursor = "pointer";
              p_delete.textContent = "Delete";
              p_edit.textContent = "Edit";
              options_div.appendChild(p_delete);
              options_div.appendChild(p_edit);
              p_delete.addEventListener("click", () =>
                this.deletePost(options_div.id)
              );
              p_edit.addEventListener("click", () =>
                this.editPost(options_div.id)
              );
              note_options_div.appendChild(options_div);
              options_div.setAttribute(
                "class",
                "fc MountPosts_postOptionsContainer"
              );
              options_div.setAttribute("id", this.state.posts[i]._id);

              //........................................................................

              //.....................................................................
              li.className = "fc";

              date_p.innerHTML =
                "<i class='far fa-clock'></i>" +
                "  " +
                date_string +
                ", " +
                time_string;
              category_p.textContent =
                "Category: " + this.state.posts[i].category;
              subject_p.textContent = "Subject: " + this.state.posts[i].subject;
              reference_p.textContent =
                "Reference: " + this.state.posts[i].reference;
              page_p.textContent = "Page #: " + this.state.posts[i].page_num;
              date_p.className = "MountPosts_date";
              details_div.appendChild(date_p);
              details_div.appendChild(category_p);
              details_div.appendChild(subject_p);
              details_div.setAttribute("class", "fr details_div");
              //...................comments...............
              let comments_div = document.createElement("div");
              let comment_input = document.createElement("input");
              let commentlist_ul = document.createElement("ul");
              comments_div.appendChild(comment_input);
              comments_div.setAttribute("class", "fc comments_div");
              comments_div.setAttribute(
                "id",
                "commentDiv" + this.state.posts[i]._id
              );
              comment_input.setAttribute(
                "id",
                "comment_input" + this.state.posts[i]._id
              );
              comment_input.setAttribute("class", "comment_input");
              commentlist_ul.setAttribute(
                "id",
                "commentlist_ul" + this.state.posts[i]._id
              );
              comment_input.setAttribute("placeholder", "Enter a comment");
              comment_input.addEventListener("keypress", (event) => {
                this.postComment(event, comments_div.id, comment_input.id);
              });
              this.state.posts[i].comments.forEach((comment) => {
                let comment_li = document.createElement("li");
                comment_li.textContent = comment;
                comment_li.setAttribute("class", "comment_li");
                commentlist_ul.setAttribute("class", "fc commentlist_ul");
                commentlist_ul.prepend(comment_li);
                comments_div.appendChild(commentlist_ul);
              });
              //.....................................................

              if (
                !(
                  this.state.posts[i].reference === "" &&
                  this.state.posts[i].page_num !== null
                )
              ) {
                if (this.state.posts[i].reference !== "")
                  details_div.appendChild(reference_p);
                if (this.state.posts[i].page_num !== null)
                  details_div.appendChild(page_p);
              }
              li.setAttribute("id", "li" + this.state.posts[i]._id);
              li.appendChild(details_div);
              li.appendChild(note_options_div);
              li.appendChild(comments_div);
              ul.prepend(li);
              this.profilePosts[i] = this.state.posts[i]._id;
              // this.state.posts_comments[i] = this.state.posts[i].comments.length;
              this.setState({
                app_is_loading: false,
              });
            }
          }
        }
        // if (this.state.posts.length < this.state.posts_alreadyBuilt.length) {
        //   this.state.posts_alreadyBuilt = [];
        //   ul.innerHTML = "";
        // }
      }
    }
    if (this.profilePosts.length === 0) {
    }
  };
  ////////////////////////// RetrievingMyStudySessions////////////////////////////////
  RetrievingMyStudySessions = () => {
    let secs_sessionInworking = 0;
    let mins_sessionInworking = 0;
    let hours_sessionInworking = 0;
    let total_hours = 0;
    let total_mins = 0;
    let total_secs = 0;
    let secs_totalInworking = 0;
    let mins_totalInworking = 0;

    // document.getElementById("Posts_studySessions_area").innerHTML = "";
    // && ul to fix unknown problem
    if (this.state.study_session) {
      for (var i = 0; i < this.state.study_session.length; i++) {
        let ul = document.getElementById("Greeting_studySessions_area");
        let p1 = document.createElement("p");
        let p2 = document.createElement("p");
        let li = document.createElement("li");
        let div = document.createElement("div");

        //............date.................................
        let date = this.state.study_session[i].date;
        let date_timezone = new Date(date);
        let date_string = date_timezone.toDateString();

        //.............................................
        secs_sessionInworking = this.state.study_session[i].length.secs;
        mins_sessionInworking = this.state.study_session[i].length.mins;
        hours_sessionInworking = this.state.study_session[i].length.hours;
        if (
          secs_sessionInworking < 10 ||
          mins_sessionInworking < 10 ||
          hours_sessionInworking < 10
        ) {
          if (secs_sessionInworking < 10)
            secs_sessionInworking = "0" + secs_sessionInworking;
          if (mins_sessionInworking < 10)
            mins_sessionInworking = "0" + mins_sessionInworking;
          if (hours_sessionInworking < 10)
            hours_sessionInworking = "0" + hours_sessionInworking;
        }
        li.className = "fc";
        p1.textContent = "On " + date_string;
        p2.textContent =
          "Duration: " +
          hours_sessionInworking +
          ":" +
          mins_sessionInworking +
          ":" +
          secs_sessionInworking;
        div.appendChild(p1);
        div.appendChild(p2);

        li.appendChild(div);
        ul.prepend(li);
        total_hours = total_hours + this.state.study_session[i].length.hours;
        total_mins = total_mins + this.state.study_session[i].length.mins;
        total_secs = total_secs + this.state.study_session[i].length.secs;
        secs_totalInworking = total_secs;
        mins_totalInworking = total_mins;
      }
      for (i = 0; secs_totalInworking >= 60; i++) {
        secs_totalInworking--;
        if (secs_totalInworking % 60 === 0) {
          total_mins++;
          total_secs = total_secs - 60;
        }
      }
      for (i = 0; mins_totalInworking >= 60; i++) {
        mins_totalInworking--;
        if (mins_totalInworking % 60 === 0) {
          total_hours++;
          total_mins = total_mins - 60;
        }
      }
      if (total_secs < 10 || total_mins < 10 || total_hours < 10) {
        if (total_secs < 10) total_secs = "0" + total_secs;
        if (total_mins < 10) total_mins = "0" + total_mins;
        if (total_hours < 10) total_hours = "0" + total_hours;
      }
      let li = document.getElementById("Greeting_totalDuration_li");
      let p = document.createElement("p");
      p.style.fontWeight = "600";
      p.style.padding = "10px";

      p.textContent =
        "Total duration: " + total_hours + ":" + total_mins + ":" + total_secs;
      li.appendChild(p);

      this.setState({
        retrievingStudySessions_DONE: true,
      });
    }
  };

  ///////////////////////////Retrieving terminology//////////////////////////
  RetrievingTerminology = () => {
    if (this.state.terminology) {
      this.state.terminology.forEach((term) => {
        let ul = document.getElementById("Terminology_content_container");
        let p1 = document.createElement("p");
        let p2 = document.createElement("p");
        let p3 = document.createElement("p");
        let p4 = document.createElement("p");
        let p5 = document.createElement("p");
        let p6 = document.createElement("p");
        let li = document.createElement("li");
        p1.textContent = term.term;
        p1.style.fontSize = "16pt";
        p1.style.textAlign = "center";
        p1.style.backgroundColor = "var(--white)";
        p1.style.color = "var(--black)";
        p2.textContent = term.meaning;
        p2.style.fontSize = "14pt";
        p3.textContent = term.category;
        p3.style.fontSize = "10pt";
        p3.style.textAlign = "right";
        p4.textContent = term.subject;
        p4.style.fontSize = "10pt";
        p4.style.textAlign = "right";
        p5.textContent = "Delete";
        p5.style.backgroundColor = "var(--red)";
        p5.style.width = "fit-content";
        p5.style.padding = "0 5px";
        p5.style.cursor = "pointer";
        p5.addEventListener("click", () => {
          this.deleteTerminology(term._id);
        });
        p6.textContent = "Edit";
        p6.style.backgroundColor = "var(--red)";
        p6.style.width = "fit-content";
        p6.style.padding = "0 5px";
        p6.style.marginTop = "5px";

        p6.style.cursor = "pointer";
        p6.addEventListener("click", () => {
          this.editTerminology(term._id);
        });
        li.appendChild(p1);
        li.appendChild(p2);
        li.appendChild(p3);
        li.appendChild(p4);
        li.appendChild(p5);
        li.appendChild(p6);
        li.setAttribute("id", "li_term" + term._id);
        ul.prepend(li);
      });
      this.setState({
        retrievingTerminology_DONE: true,
      });
    }
  };
  ////////////////////////////Delete terminology////////////////////////////
  deleteTerminology = (term_id) => {
    let url =
      apiUrl("/api/user/deleteTerminology/") +
      term_id +
      "/" +
      this.state.my_id;
    let options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((response) => {
      if (response.status === 201) {
        document.getElementById("li_term" + term_id).remove();
        this.serverReply("term deleted");
      } else {
        this.serverReply("delete failed");
      }
    });
  };
  ////////////////////////////Edit terminology////////////////////////////
  termIsEditing = false;
  termIdSelected;
  editEvenCounter = -1;
  editTerminology = (term_id) => {
    this.editEvenCounter++;
    if (this.editEvenCounter % 2 === 0) {
      this.termIdSelected = term_id;
      this.termIsEditing = true;
      document.getElementById("Terminology_term").value =
        document.getElementById("li_term" + term_id).children[0].textContent;
      document.getElementById("Terminology_meaning").value =
        document.getElementById("li_term" + term_id).children[1].textContent;
      document.getElementById("Terminology_category").value =
        document.getElementById("li_term" + term_id).children[2].textContent;
      document.getElementById("Terminology_subject").value =
        document.getElementById("li_term" + term_id).children[3].textContent;
      //.........................
      document.getElementById("Terminology_inputs_container").style.display =
        "flex";
      document.getElementById("Terminology_control_icon_close").style.display =
        "inline";
      document.getElementById("Terminology_control_icon_open").style.display =
        "none";
      document.getElementById("li_term" + term_id).children[5].textContent =
        "Cancel?";
      document.getElementById(
        "li_term" + term_id
      ).children[5].style.backgroundColor = "var(--black)";
      document.getElementById("Terminology_post_button").textContent = "Edit";
      //.......
    } else {
      this.termIsEditing = false;
      document.getElementById("Terminology_inputs_container").style.display =
        "none";
      document.getElementById("Terminology_control_icon_close").style.display =
        "none";
      document.getElementById("Terminology_control_icon_open").style.display =
        "inline";
      //...........
      document.getElementById(
        "li_term" + term_id
      ).children[5].style.backgroundColor = "var(--red)";
      document.getElementById("li_term" + term_id).children[5].textContent =
        "Edit";
      document.getElementById("Terminology_post_button").textContent = "Post";
      //.......
      document.getElementById("Terminology_term").value = "";
      document.getElementById("Terminology_meaning").value = "";
      document.getElementById("Terminology_category").value = "";
      document.getElementById("Terminology_subject").value = "";
    }
  };

  //................................................................................................
  ////////////////////////////Posting a terminology////////////////////////
  postingTerminology = (term, meaning, category, subject) => {
    if (this.termIsEditing === false) {
      this.setState({
        app_is_loading: true,
      });
      let url =
        apiUrl("/api/user/newTerminology/") + this.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: term,
          meaning: meaning,
          category: category,
          subject: subject,
          date: new Date(),
        }),
      };
      let req = new Request(url, options);
      fetch(req)
        .then((result) => {
          if (result.status === 201) {
            document.getElementById("Terminology_term").value = "";
            document.getElementById("Terminology_meaning").value = "";
            document.getElementById("Terminology_category").value = "";
            document.getElementById("Terminology_subject").value = "";
            this.serverReply("Posted successfully!");
          } else {
            this.serverReply(
              "Posting failed. Please make sure you select a category and/or a subject for your note"
            );
            this.setState({
              app_is_loading: false,
            });
          }
          return result.json();
        })
        .then((result) => {
          if (result) {
            let ul = document.getElementById("Terminology_content_container");
            let p1 = document.createElement("p");
            let p2 = document.createElement("p");
            let p3 = document.createElement("p");
            let p4 = document.createElement("p");
            let p5 = document.createElement("p");
            let p6 = document.createElement("p");
            let li = document.createElement("li");

            // //.............................................
            // let date = result.date;
            // let date_timezone = new Date(date);
            // let date_string = date_timezone.toDateString();
            // let time_string = date_timezone.toLocaleTimeString();
            // p2.textContent =
            //   "Posted on: " + date_string + ", " + "at: " + time_string;
            // //.............................................
            p1.textContent = result.term;
            p1.style.fontSize = "16pt";
            p1.style.textAlign = "center";
            p1.style.backgroundColor = "var(--white)";
            p1.style.color = "var(--black)";
            p2.textContent = result.meaning;
            p2.style.fontSize = "14pt";
            p3.textContent = result.category;
            p3.style.fontSize = "10pt";
            p3.style.textAlign = "right";
            p4.textContent = result.subject;
            p4.style.fontSize = "10pt";
            p4.style.textAlign = "right";
            p5.textContent = "Delete";
            p5.style.backgroundColor = "var(--red)";
            p5.style.width = "fit-content";
            p5.style.padding = "0 5px";
            p5.style.cursor = "pointer";
            p5.addEventListener("click", () => {
              this.deleteTerminology(result._id);
            });
            p6.textContent = "Edit";
            p6.style.backgroundColor = "var(--red)";
            p6.style.width = "fit-content";
            p6.style.padding = "0 5px";
            p6.style.marginTop = "5px";
            p6.style.cursor = "pointer";
            p6.addEventListener("click", () => {
              this.editTerminology(result._id);
            });
            li.setAttribute("id", "li_term" + result._id);
            li.appendChild(p1);
            li.appendChild(p2);
            li.appendChild(p3);
            li.appendChild(p4);
            li.appendChild(p5);
            li.appendChild(p6);
            li.setAttribute("id", "li_term" + result._id);

            ul.prepend(li);
            //...................................
            this.setState({
              app_is_loading: false,
              retrievingTerminology_DONE: true,
            });
          }
        });
    } else {
      let url =
        apiUrl("/api/user/editTerminology/") +
        this.termIdSelected +
        "/" +
        this.state.my_id;
      let options = {
        method: "PUT",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: document.getElementById("Terminology_term").value,
          meaning: document.getElementById("Terminology_meaning").value,
          category: document.getElementById("Terminology_category").value,
          subject: document.getElementById("Terminology_subject").value,
          date: new Date(),
        }),
      };
      let req = new Request(url, options);
      fetch(req)
        .then((response) => {
          if (response.status === 201) {
            this.enableEditPost = false;
            document.getElementById("Terminology_post_button").textContent =
              "Post";

            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[0].textContent =
              document.getElementById("Terminology_term").value;
            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[1].textContent = document.getElementById(
              "Terminology_meaning"
            ).value;
            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[2].textContent = document.getElementById(
              "Terminology_category"
            ).value;
            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[3].textContent = document.getElementById(
              "Terminology_subject"
            ).value;
            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[5].textContent = "Edit";
            document.getElementById(
              "li_term" + this.termIdSelected
            ).children[5].style.backgroundColor = "var(--red)";
            this.serverReply("term modified");
          } else {
            this.serverReply(
              "modifying failed. Please make sure you select a category and/or a subject for your note"
            );
          }
        })
        .then(() => {
          document.getElementById("Terminology_term").value = "";
          document.getElementById("Terminology_meaning").value = "";
          document.getElementById("Terminology_category").value = "";
          document.getElementById("Terminology_subject").value = "";
          this.termIsEditing = false;
        });
    }
  };

  ////////////////////////////////Edit Post///////////////////////////////////////////
  enableEditPost = false;
  targetIDEditPost;
  editPostControlCounter = -1;
  editPost = (post_id) => {
    this.editPostControlCounter++;
    if (this.editPostControlCounter % 2 === 0) {
      this.targetIDEditPost = post_id;
      this.state.posts.forEach((post) => {
        if (post._id === post_id) {
          document.getElementById("InputPost_textarea").value = post.note;
          document.getElementById("InputPost_category").value = post.category;
          document.getElementById("InputPost_subject").value = post.subject;
          document.getElementById("InputPost_resourse").value = post.reference;
          document.getElementById("InputPost_page").value = post.page_num;
          this.enableEditPost = true;
          document.getElementById("InputPost_post_button").innerHTML = "Edit";
          document.getElementById(post_id).children[1].textContent = "Cancel?";
          document.getElementById(post_id).children[1].style.backgroundColor =
            "var(--black)";
        }
      });
    } else {
      document.getElementById("InputPost_textarea").value = "";
      document.getElementById("InputPost_category").value = "";
      document.getElementById("InputPost_subject").value = "";
      document.getElementById("InputPost_resourse").value = "";
      document.getElementById("InputPost_page").value = "";
      this.enableEditPost = false;
      document.getElementById("InputPost_post_button").innerHTML = "Post";
      document.getElementById(post_id).children[1].style.backgroundColor =
        "var(--red)";
      document.getElementById(post_id).children[1].textContent = "Edit";
    }
  };
  ////////////////////////Post Comment/////////////////////////////
  postComment = (event, post_id, input_id) => {
    if (event.which === 13) {
      let url =
        apiUrl("/api/posts/commentPost/") +
        post_id.slice(10, post_id.length) +
        "/" +
        document.getElementById(input_id).value;
      let options = {
        method: "PUT",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      fetch(req).then((response) => {
        if (response.status === 201) {
          document.getElementById(input_id).value = "";
          this.serverReply("post modified");
        } else {
          this.serverReply("modify failed");
        }
      });
    }
  };
  //////////////////////////SEND MESSAGE TO FRIEND'S Chat////////////////////////////////
  RetrievingMySendingMessages = (friend_id) => {
    const ul = document.getElementById("Chat_messages");

    if (!ul || !friend_id) {
      return;
    }

    ul.innerHTML = "";

    const seenDates = [];
    const chatHistory = Array.isArray(this.state.chat) ? this.state.chat : [];
    const matchingMessages = chatHistory.filter((message, index) => {
      if (seenDates[index] === message.date || friend_id !== message._id) {
        return false;
      }

      seenDates[index] = message.date;
      return true;
    });

    if (matchingMessages.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.setAttribute("id", "FriendChat_empty_state");
      emptyState.textContent = "No messages yet for this conversation.";
      ul.appendChild(emptyState);
      return;
    }

    matchingMessages.forEach((message) => {
      const p = document.createElement("p");
      const li = document.createElement("li");
      const div = document.createElement("div");

      p.textContent = message.message;
      if (message.from === "me") {
        li.setAttribute("class", "sentMessagesLI");
        div.setAttribute("class", "sentMessagesDIV fc");
      } else {
        li.setAttribute("class", "receivedMessagesLI");
        div.setAttribute("class", "receivedMessagesDIV fc");
      }

      li.appendChild(p);
      div.appendChild(li);
      ul.appendChild(div);
    });

    ul.scrollTop = ul.scrollHeight;
  };

  sendToThemMessage = (message) => {
    let textarea = document.getElementById("Chat_textarea_input");
    if (textarea) {
      textarea.style.height = "42px";
    }
    if (!this.state.friendID_selected) {
      this.serverReply("Select a doctor from your friends list first");
      return;
    }
    if (message && message.trim() !== "") {
      let url =
        apiUrl("/api/chat/sendMessage/") +
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
          if (textarea) {
            textarea.value = "";
            textarea.style.height = "42px";
            textarea.focus();
          }
          this.updateMyTypingPresence(this.state.friendID_selected, false);
        } else {
          this.serverReply("Unable to send message");
        }
      });
    } else {
      this.serverReply("You can't send an empty message");
    }
  };

  ////////////////////////ACCEPT FRIEND/////////////////////////////////////////////

  hideNotificationRow = (notificationId) => {
    const row = document.getElementById(String(notificationId));

    if (row?.parentElement) {
      row.parentElement.style.display = "none";
    }
  };

  markNotificationReadLocally = (notificationId) => {
    this.setState((prevState) => ({
      notifications: (prevState.notifications || []).map((notification) =>
        String(notification?.id) === String(notificationId)
          ? { ...notification, status: "read" }
          : notification
      ),
    }));
  };

  acceptFriend = (friend) => {
    let friend_trim = friend.slice(11, friend.length);
    const notificationRow = document.getElementById(friend_trim);

    if (notificationRow) {
      notificationRow.style.backgroundColor = "var(--black)";
    }

    this.serverReply("Adding ...");
    let url =
      apiUrl("/api/user/acceptFriend/") +
      this.state.my_id +
      "/" +
      friend_trim;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((response) => {
      if (response.status === 201) {
        this.markNotificationReadLocally(friend_trim);
        this.serverReply("You're now friends!");

        let url =
          apiUrl("/api/user/editUserInfo/") +
          this.state.my_id +
          "/" +
          friend_trim;
        let options = {
          method: "PUT",
          mode: "cors",
          headers: {
            Authorization: "Bearer " + this.state.token,
            "Content-Type": "application/json",
          },
        };
        let req = new Request(url, options);
        fetch(req).then((response) => {
          if (response.ok) {
            this.markNotificationReadLocally(friend_trim);
            this.hideNotificationRow(friend_trim);
          }
        });
      }
      if (response.status === 409) {
        this.markNotificationReadLocally(friend_trim);
        this.serverReply("You're already friends!");
        this.hideNotificationRow(friend_trim);
      }
    });
  };
  ////////////////////////Decline Request/////////////////////////////////////////////

  makeNotificationsRead = (friend) => {
    let friend_trim = friend.slice(12, friend.length);
    let url =
      apiUrl("/api/user/editUserInfo/") +
      this.state.my_id +
      "/" +
      friend_trim;

    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((response) => {
      const notificationRow = document.getElementById(friend_trim);

      if (notificationRow) {
        notificationRow.style.backgroundColor = "var(--black)";
      }

      if (response.status === 200) {
        this.markNotificationReadLocally(friend_trim);
        this.hideNotificationRow(friend_trim);
        this.serverReply("Done!");
      }
    });
  };

  //////////////////////////////BUILD FRIENDS LIST////////////////
  app_friends = [];

  buildFriendsList = () => {
    //...START FETCHING FRIENDS
    let url = apiUrl("/api/user/update/") + this.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
      },
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        }
      })
      .then((jsonData) => {
        //...END FETCHING FRIENDS
        let ul = document.getElementById("FriendsList_friends_list");

        for (var i = 0; i < jsonData.friends.length; i++) {
          this.setState({
            friends: jsonData.friends,
          });
          //For every friend
          if (this.app_friends[i] !== jsonData.friends[i]._id) {
            //If a friend is new to the app add it to the friends list with respect to the online status and to the app memory
            let p = document.createElement("p");
            let li = document.createElement("li");
            let icon = document.createElement("i");

            p.textContent =
              jsonData.friends[i].info.firstname +
              " " +
              jsonData.friends[i].info.lastname;
            p.setAttribute("id", [i]);
            li.appendChild(p);
            li.setAttribute("id", jsonData.friends[i]._id);
            li.addEventListener("click", () => {
              this.get_current_friend_chat_id(li.id);

              document.getElementById(
                "DropHorizontally_article"
              ).style.display = "none";
            });
            li.setAttribute("class", "fr");
            li.setAttribute("title", jsonData.friends[i].info.firstname);
            icon.setAttribute("id", "online_icon" + jsonData.friends[i]._id);
            icon.setAttribute("class", "fas fa-circle");
            li.appendChild(icon);
            ul.appendChild(li);
            if (jsonData.friends[i].status.isConnected) {
              icon.style.color = "#32cd32";
            } else {
              icon.style.color = "var(--black)";
            }
            this.app_friends[i] = jsonData.friends[i]._id;
          }
          // if (this.app_friends[i] === jsonData.friends[i]._id) {
          //   // if we already have this friend in the memory app just check their online status and change it
          //   if (jsonData.friends[i].status.isConnected) {
          //     document.getElementById(
          //       "online_icon" + jsonData.friends[i]._id
          //     ).style.color = "#32cd32";
          //   } else {
          //     document.getElementById(
          //       "online_icon" + jsonData.friends[i]._id
          //     ).style.color = "var(--black)";
          //   }
          // }
        }
      });
  };

  ////////////////////////////Select friend id to chat //////////////////////////////////////////////////
  get_current_friend_chat_id = (friendID) => {
    let activeChatFriendName = "";
    this.state.friends.forEach((friend) => {
      if (friend._id === friendID) {
        activeChatFriendName =
          friend.info?.firstname && friend.info?.lastname
            ? `${friend.info.firstname} ${friend.info.lastname}`
            : friend.info?.firstname || "Chat";
      }
    });

    this.setState({
      friendID_selected: friendID,
      activeChatFriendId: friendID,
      activeChatFriendName,
      isChatting: true,
    });

    this.updateMyChatPresence(friendID, true);
    this.updateMyTypingPresence(friendID, false);
    this.RetrievingMySendingMessages(friendID);
  };

  closeActiveChat = () => {
    if (this.state.activeChatFriendId) {
      this.updateMyChatPresence(this.state.activeChatFriendId, false);
      this.updateMyTypingPresence(this.state.activeChatFriendId, false);
    }

    this.setState({
      friendID_selected: null,
      activeChatFriendId: null,
      activeChatFriendName: "",
      isChatting: false,
    });
  };

  removeFriend = (friendId) => {
    if (!friendId) {
      return;
    }

    const url =
      apiUrl("/api/user/removeFriend/") + this.state.my_id + "/" + friendId;
    const options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };

    fetch(new Request(url, options)).then((response) => {
      if (response.ok) {
        this.setState((currentState) => ({
          friends: (currentState.friends || []).filter(
            (friend) => friend?._id !== friendId
          ),
          activeChatFriendId:
            currentState.activeChatFriendId === friendId
              ? null
              : currentState.activeChatFriendId,
          activeChatFriendName:
            currentState.activeChatFriendId === friendId
              ? ""
              : currentState.activeChatFriendName,
          isChatting:
            currentState.activeChatFriendId === friendId
              ? false
              : currentState.isChatting,
        }));
        this.serverReply("Friend removed.");
        return;
      }

      this.serverReply("Unable to remove friend.");
    });
  };

  ///DeleteFriendPost
  deleteFriendPost = (post_id) => {
    document.getElementById("li" + post_id).remove();
  };
  ////////////////////////////Update State//////////DONE/////////////////////
  updateUserInfo = () => {
    let url = apiUrl("/api/user/update/") + this.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        }
      })
      .then((jsonData) => {
        this.setState({
          friends: jsonData.friends,
          posts: jsonData.posts,
          chat: jsonData.chat,
          notifications: jsonData.notifications,
          terminology: jsonData.terminology,
          study_session: jsonData.study_session,
          login_record: jsonData.login_record || [],
          isOnline: jsonData.isOnline,
        });
        for (var i = 0; i < jsonData.SchoolPlanner.courses.length; i++) {
          this.memory.courses.push(jsonData.SchoolPlanner.courses[i]);
          console.log(this.memory.courses[i]);
        }
      })
      .catch((err) => {
        if (err.message === "Cannot read property 'credentials' of null")
          console.log("Error", err.message);
      });
  };

  ////////////////////////////////////BUILD NOTIFICATIONS////////////////////////
  notificaitons_array = [];

  buildNotifications = () => {
    let bell = document.getElementById("i_bell_open");
    if (!bell) {
      return;
    }

    let hasUnreadNotifications = false;
    for (var i = 0; i < this.state.notifications.length; i++) {
      if (this.state.notifications[i].status !== "read") {
        hasUnreadNotifications = true;
      }
      this.notificaitons_array[i] = this.state.notifications[i]._id;
    }

    bell.style.color = hasUnreadNotifications ? "yellow" : "";
  };
  ///////////////////////////////////////Counter////////////////////////////////////////////////
  counter = () => {
    let secs;
    let mins;
    let hours;
    document.getElementById("Posts_content_container").style.height = "100%";
    // document.getElementById("Footer_article").style.display = "none";
    // document.getElementById("SearchPosts_article").style.display = "flex";
    // document.getElementById("Header_timer_h1").style.display = "inline";
    if (JSON.parse(sessionStorage.getItem("Header_timer_h1"))) {
      secs = JSON.parse(sessionStorage.getItem("Header_timer_h1")).secs;
      mins = JSON.parse(sessionStorage.getItem("Header_timer_h1")).mins;
      hours = JSON.parse(sessionStorage.getItem("Header_timer_h1")).hours;
    } else {
      secs = 0;
      mins = 0;
      hours = 0;
    }
    setInterval(() => {
      secs++;
      if (secs % 60 === 0 && secs !== 0) {
        mins++;
        secs = 0;
      }
      if (mins % 60 === 0 && mins !== 0) {
        hours++;
        mins = 0;
      }

      this.setState({
        timer: {
          hours: hours,
          mins: mins,
          secs: secs,
        },
      });
    }, 1000);
  };

  ////////////////////////////////////////////////////UPDATE isConnect on databae////////////////////////////////

  updateBeforeLeave = () => {
    let url =
      apiUrl("/api/user/updateBeforeLeave/") + this.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        study_session: {
          date: new Date(),
          length: this.state.timer,
        },
      }),
    };

    let req = new Request(url, options);
    fetch(req)
      .then((response) => {
        if (response.status === 201 && this.state.isConnected === false) {
          if (this.props.onLogout) {
            this.props.onLogout();
          }
          return response.json();
        } else {
          throw new Error("bad Http");
        }
      })
      .catch((err) => {
        console.log("error:", err.message);
      });
  };

  //........Server answer..........
  serverReply = (answer) => {
    document.getElementById("server_answer_message").textContent = answer;

    document.getElementById("server_answer").style.width = "fit-content";
    setTimeout(() => {
      document.getElementById("server_answer").style.width = "0";
      document.getElementById("server_answer_message").textContent = "";
    }, 8000);
  };

  //.....loader function..........
  loader = () => {
    return (
      <div
        style={{
          fontSize: "20pt",
          display: "flex",
          position: "fixed",
          top: "0",
          bottom: "0",

          justifyContent: "center",
          alignContent: "center",
          flexDirection: "column",
          zIndex: "100",
        }}
      >
        <img src="/img/loader.gif" alt="" width="70px" />
      </div>
    );
  };

  /////////////////////////Log out//////////////////////
  logOut = () => {
    const finishLogout = () => {
      if (this.realtimeSocket) {
        this.realtimeSocket.disconnect();
        this.realtimeSocket = null;
      }

      if (this.props.onLogout) {
        this.props.onLogout();
      }
    };

    this.setState(
      {
        isConnected: false,
      },
      () => {
        if (this.props.path === "/study") {
          let input = window.confirm(
            "Do you want this study session to be counted?"
          );
          if (input) {
            this.updateBeforeLeave();
          }
        }

        this.availableToChat(false)
          .catch(() => null)
          .finally(finishLogout);
      }
    );
  };

  friendConnectionColor = (isConnected) => {
    if (isConnected) {
      return "#32cd32";
    }

    return "rgba(240, 242, 245, 0.42)";
  };

  ///////////////////////Searching in posts////////////////////
  prepare_searchPosts = (entry1, entry2, entry3) => {
    let keyword;
    let subject;
    let category;
    if (!entry1) {
      keyword = "$";
    } else {
      keyword = entry1;
    }
    if (!entry2) {
      subject = "$";
    } else {
      subject = entry2;
    }
    if (!entry3) {
      category = "$";
    } else {
      category = entry3;
    }
    this.searchPosts(keyword, subject, category);
  };
  searchPosts = (keyword, subject, category) => {
    let ul = document.getElementById("MountPosts_content_container");
    let ul_term = document.getElementById("Terminology_content_container");
    let array = [];
    let array_term = [];
    ul.innerHTML = "";
    ul_term.innerHTML = "";
    //..................................
    this.state.posts.forEach((post) => {
      if (keyword !== "$" && subject === "$" && category === "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note).toLowerCase().includes(keyword.toLowerCase())
        ) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject !== "$" && category === "$") {
        if (post.subject === subject) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject === "$" && category !== "$") {
        if (post.category === category) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject !== "$" && category === "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && post.subject === subject)
        ) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject === "$" && category !== "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && post.category === category)
        ) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject !== "$" && category !== "$") {
        if (post.subject === subject && post.category === category) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject !== "$" && category !== "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(
              keyword.toLowerCase() &&
                post.subject === subject &&
                post.category === category
            )
        ) {
          array.push(post);
        }
      }
    });
    //..............................................
    this.state.terminology.forEach((term) => {
      if (keyword !== "$" && subject === "$" && category === "$") {
        if (
          String(term.term).toLowerCase() === keyword.toLowerCase() ||
          String(term.term).toLowerCase().includes(keyword.toLowerCase())
        ) {
          array_term.push(term);
        }
      }
      if (keyword === "$" && subject !== "$" && category === "$") {
        if (term.subject === subject) {
          array_term.push(term);
        }
      }
      if (keyword === "$" && subject === "$" && category !== "$") {
        if (term.category === category) {
          array_term.push(term);
        }
      }
      if (keyword !== "$" && subject !== "$" && category === "$") {
        if (
          String(term.note).toLowerCase() === keyword.toLowerCase() ||
          String(term.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && term.subject === subject)
        ) {
          array_term.push(term);
        }
      }
      if (keyword !== "$" && subject === "$" && category !== "$") {
        if (
          String(term.note).toLowerCase() === keyword.toLowerCase() ||
          String(term.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && term.category === category)
        ) {
          array_term.push(term);
        }
      }
      if (keyword === "$" && subject !== "$" && category !== "$") {
        if (term.subject === subject && term.category === category) {
          array_term.push(term);
        }
      }
      if (keyword !== "$" && subject !== "$" && category !== "$") {
        if (
          String(term.note).toLowerCase() === keyword.toLowerCase() ||
          String(term.note)
            .toLowerCase()
            .includes(
              keyword.toLowerCase() &&
                term.subject === subject &&
                term.category === category
            )
        ) {
          array_term.push(term);
        }
      }
    });
    //.......................................
    this.searchTerminology(array_term);
    //.............................................
    let array_associate = [];
    for (var i = 0; i < array.length; i++) {
      if (array_associate[i] !== array[i]._id) {
        let date_p = document.createElement("p");
        let category_p = document.createElement("p");
        let subject_p = document.createElement("p");
        let reference_p = document.createElement("p");
        let page_p = document.createElement("p");
        let li = document.createElement("li");
        let details_div = document.createElement("div");
        let note_options_div = document.createElement("div");
        //.............................comments.......................

        //............date.................................
        let date = array[i].date;
        let date_timezone = new Date(date);
        let date_string = date_timezone.toDateString();
        let time_string = date_timezone.toLocaleTimeString();
        //.............................................
        //...............................note..................................
        let note_p = document.createElement("p");
        note_p.textContent = array[i].note;
        note_p.setAttribute("class", "note_p");
        note_options_div.setAttribute("class", "fr note_options_div");
        note_options_div.setAttribute("id", "note_options_div" + i);
        note_options_div.appendChild(note_p);
        //.......................Options....................................
        let options_div = document.createElement("div");
        options_div.setAttribute("class", "options_div");
        //............................Poster name.......................
        let postername_p = document.createElement("p");
        postername_p.setAttribute("class", "postername_p");
        details_div.appendChild(postername_p);
        //..................................
        if (array[i].id === this.state.my_id) {
          postername_p.textContent = "Mine";
          let p_delete = document.createElement("p");
          let p_edit = document.createElement("p");
          p_delete.style.cursor = "pointer";
          p_edit.style.cursor = "pointer";
          p_delete.textContent = "Delete";
          p_edit.textContent = "Edit";
          options_div.appendChild(p_delete);
          options_div.appendChild(p_edit);
          p_delete.addEventListener("click", () => {
            this.setState({ posts_deleted: true });
            this.deletePost(options_div.id);
          });
          p_edit.addEventListener("click", () => this.editPost(options_div.id));
          note_options_div.appendChild(options_div);
          options_div.setAttribute(
            "class",
            "fc MountPosts_postOptionsContainer"
          );
          options_div.setAttribute("id", array[i]._id);
        } else {
          postername_p.textContent =
            array[i].firstname + " " + array[i].lastname;
        }
        //........................................................................

        //.....................................................................
        li.className = "fc";

        date_p.innerHTML =
          "<i class='far fa-clock'></i>" +
          "  " +
          date_string +
          ", " +
          time_string;
        category_p.textContent = "Category: " + array[i].category;
        subject_p.textContent = "Subject: " + array[i].subject;
        reference_p.textContent = "Reference: " + array[i].reference;
        page_p.textContent = "Page #: " + array[i].page_num;
        date_p.className = "MountPosts_date";
        details_div.appendChild(date_p);
        details_div.appendChild(category_p);
        details_div.appendChild(subject_p);
        details_div.setAttribute("class", "fr details_div");
        //...................comments...............
        let comments_div = document.createElement("div");
        let comment_input = document.createElement("input");
        let commentlist_ul = document.createElement("ul");
        comments_div.appendChild(comment_input);
        comments_div.setAttribute("class", "fc comments_div");
        comments_div.setAttribute("id", "commentDiv" + array[i]._id);
        comment_input.setAttribute("id", "comment_input" + array[i]._id);
        comment_input.setAttribute("class", "comment_input");
        commentlist_ul.setAttribute("id", "commentlist_ul" + array[i]._id);
        comment_input.setAttribute("placeholder", "Enter a comment");
        comment_input.addEventListener("keypress", (event) => {
          this.postComment(event, comments_div.id, comment_input.id);
        });
        array[i].comments.forEach((comment) => {
          let comment_li = document.createElement("li");
          comment_li.textContent = comment;
          comment_li.setAttribute("class", "comment_li");
          commentlist_ul.setAttribute("class", "fc commentlist_ul");
          commentlist_ul.prepend(comment_li);
          comments_div.appendChild(commentlist_ul);
        });
        //.....................................................

        if (!(array[i].reference === "" && array[i].page_num !== null)) {
          if (array[i].reference !== "") details_div.appendChild(reference_p);
          if (array[i].page_num !== null) details_div.appendChild(page_p);
        }
        li.setAttribute("id", "li" + array[i]._id);
        li.appendChild(details_div);
        li.appendChild(note_options_div);
        li.appendChild(comments_div);
        ul.appendChild(li);
        this.setState({
          app_is_loading: false,
        });
      }
      array_associate[i] = array[i]._id;
    }
  };
  searchTerminology = (array) => {
    if (array) {
      array.forEach((term) => {
        let ul = document.getElementById("Terminology_content_container");
        let p1 = document.createElement("p");
        let p2 = document.createElement("p");
        let p3 = document.createElement("p");
        let p4 = document.createElement("p");
        let p5 = document.createElement("p");
        let p6 = document.createElement("p");
        let li = document.createElement("li");
        p1.textContent = term.term;
        p1.style.fontSize = "16pt";
        p1.style.textAlign = "center";
        p1.style.backgroundColor = "var(--white)";
        p1.style.color = "var(--black)";
        p2.textContent = term.meaning;
        p2.style.fontSize = "14pt";
        p3.textContent = term.category;
        p3.style.fontSize = "10pt";
        p3.style.textAlign = "right";
        p4.textContent = term.subject;
        p4.style.fontSize = "10pt";
        p4.style.textAlign = "right";
        p5.textContent = "Delete";
        p5.style.backgroundColor = "var(--red)";
        p5.style.width = "fit-content";
        p5.style.padding = "0 5px";
        p5.style.cursor = "pointer";
        p5.addEventListener("click", () => {
          this.deleteTerminology(term._id);
        });
        p6.textContent = "Edit";
        p6.style.backgroundColor = "var(--red)";
        p6.style.width = "fit-content";
        p6.style.padding = "0 5px";
        p6.style.marginTop = "5px";

        p6.style.cursor = "pointer";
        p6.addEventListener("click", () => {
          this.editTerminology(term._id);
        });
        li.appendChild(p1);
        li.appendChild(p2);
        li.appendChild(p3);
        li.appendChild(p4);
        li.appendChild(p5);
        li.appendChild(p6);
        li.setAttribute("id", "li_term" + term._id);
        ul.prepend(li);
      });
      this.setState({
        retrievingTerminology_DONE: true,
      });
    }
  };
  show_profile = (boolean) => {
    this.setState({
      profile: boolean,
    });
  };
  //.....Reander Login HTML..........
  render() {
    return (
      <React.Fragment>
        <Route exact path="/">
          <article id="app_page" className="fc">
            <main id="Main_article" className="fr">
              <Greeting state={this.state} logOut={this.logOut} />
            </main>
          </article>
        </Route>
        <Route path="/study">
          <article id="app_page" className="fc">
            <main id="Main_article" className="fr">
              <Study
                state={this.state}
                logOut={this.logOut}
                acceptFriend={this.acceptFriend}
                type={this.type}
                show_profile={this.show_profile}
                serverReply={this.serverReply}
              />{" "}
            </main>
          </article>
        </Route>
        <Route path="/studyplanner">
          <SchoolPlanner
            state={this.state}
            logOut={this.logOut}
            acceptFriend={this.acceptFriend}
            type={this.type}
            show_profile={this.show_profile}
            memory={this.memory}
            serverReply={this.serverReply}
          />
        </Route>
        <Route exact path="/phenomedsocial/ar">
          <article id="app_page" className="fc">
            <main id="Main_article" className="fr">
              <PhenomedSocialArabic
                state={this.state}
                logOut={this.logOut}
                friendConnectionColor={this.friendConnectionColor}
                removeFriend={this.removeFriend}
                selectFriendChat={this.get_current_friend_chat_id}
                closeActiveChat={this.closeActiveChat}
                postingTerminology={this.postingTerminology}
                searchPosts={this.searchPosts}
                prepare_searchPosts={this.prepare_searchPosts}
                acceptFriend={this.acceptFriend}
                makeNotificationsRead={this.makeNotificationsRead}
                sendToThemMessage={this.sendToThemMessage}
                updateMyTypingPresence={this.updateMyTypingPresence}
                type={this.type}
                counter={this.counter}
                updateBeforeLeave={this.updateBeforeLeave}
              />
            </main>
          </article>
        </Route>
        <Route exact path="/phenomedsocial">
          <article id="app_page" className="fc">
            <main id="Main_article" className="fr">
              <PhenomedSocial
                state={this.state}
                logOut={this.logOut}
                friendConnectionColor={this.friendConnectionColor}
                removeFriend={this.removeFriend}
                selectFriendChat={this.get_current_friend_chat_id}
                closeActiveChat={this.closeActiveChat}
                postingTerminology={this.postingTerminology}
                searchPosts={this.searchPosts}
                prepare_searchPosts={this.prepare_searchPosts}
                acceptFriend={this.acceptFriend}
                makeNotificationsRead={this.makeNotificationsRead}
                sendToThemMessage={this.sendToThemMessage}
                updateMyTypingPresence={this.updateMyTypingPresence}
                type={this.type}
                counter={this.counter}
                updateBeforeLeave={this.updateBeforeLeave}
              />
            </main>
          </article>
        </Route>
        <Route path="/profile/:username">
          <Profile viewerState={this.state} logOut={this.logOut} />
        </Route>
        <div
          id="server_answer"
          onClick={() => {
            document.getElementById("server_answer").style.width = "0";
          }}
        >
          <p id="server_answer_message"></p>
        </div>
        {this.state.app_is_loading && (
          <div
            style={{
              fontSize: "20pt",
              display: "flex",
              position: "fixed",
              top: "0",
              bottom: "0",
              right: "0",
              left: "0",
              justifyContent: "center",
              alignContent: "center",
              flexDirection: "column",
              zIndex: "100",
            }}
          >
            <img
              src="/img/loader.gif"
              alt=""
              width="70px"
              style={{
                margin: "auto",
              }}
            />
          </div>
        )}
      </React.Fragment>
    );
  }
}
export default App;

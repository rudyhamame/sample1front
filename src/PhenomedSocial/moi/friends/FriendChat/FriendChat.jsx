import React from "react";

const FriendChat = ({
  state,
  content,
  sendToThemMessage,
  updateMyTypingPresence,
  closeActiveChat,
}) => {
  const chatContent = content?.chat;
  const isChatting = Boolean(state?.isChatting);
  const hasActiveChat = Boolean(state?.activeChatFriendName);
  const friendIsChatting = state?.activeChatFriendId
    ? Boolean(state?.friendChatPresence?.[state.activeChatFriendId])
    : false;
  const friendIsTyping = state?.activeChatFriendId
    ? Boolean(state?.friendTypingPresence?.[state.activeChatFriendId])
    : false;

  const handleSend = () => {
    const textarea = document.getElementById("Chat_textarea_input");
    const message = textarea ? textarea.value : "";

    if (sendToThemMessage) {
      sendToThemMessage(message);
    }
  };

  const handleTypingChange = (event) => {
    if (!state?.activeChatFriendId || !updateMyTypingPresence) {
      return;
    }

    updateMyTypingPresence(
      state.activeChatFriendId,
      Boolean(event.target.value.trim())
    );
  };

  return (
    <section id="FriendChat_article" className="fc">
      <div id="FriendChat_content_container" className="fc">
        <section id="Chat_article" className="fc">
          <section id="Chat_title_container" className="fr">
            <i
              className="fas fa-chevron-circle-left"
              id="Chat_goback_icon"
              onClick={() => {
                const friendsListArticle = document.getElementById(
                  "FriendsList_article"
                );
                const friendChatArticle =
                  document.getElementById("FriendChat_article");
                const dropHorizontallyFriendsListIcon = document.getElementById(
                  "DropHorizontally_friendsList_icon"
                );

                if (friendsListArticle) {
                  friendsListArticle.style.display = "flex";
                }
                if (friendChatArticle) {
                  friendChatArticle.style.display = "none";
                }
                if (dropHorizontallyFriendsListIcon) {
                  dropHorizontallyFriendsListIcon.style.color = "var(--white)";
                }
                if (closeActiveChat) {
                  closeActiveChat();
                }
              }}
            ></i>
            <div id="Chat_title_copy" className="fc">
              <h1 id="Chat_title_text">
                {state?.activeChatFriendName || chatContent?.title || "Chat"}
              </h1>
              {hasActiveChat && (
                <p id="Chat_title_status">
                  {friendIsTyping
                    ? chatContent?.typingLabel || "typing..."
                    : friendIsChatting
                    ? chatContent?.onlineLabel || "online"
                    : chatContent?.offlineLabel || "offline"}
                </p>
              )}
            </div>
          </section>
          {isChatting ? (
            <React.Fragment>
              <ul id="Chat_messages">
                <li id="FriendChat_empty_state">
                  {chatContent?.empty ||
                    "Open a conversation to view messages here."}
                </li>
              </ul>
              <section id="Chat_form" className="fr">
                <textarea
                  id="Chat_textarea_input"
                  placeholder={chatContent?.inputPlaceholder || "Write a message"}
                  onChange={handleTypingChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                ></textarea>
                <button
                  id="Chat_submit_button"
                  type="button"
                  onClick={handleSend}
                >
                  <i className="fc far fa-paper-plane"></i>
                </button>
              </section>
            </React.Fragment>
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default FriendChat;

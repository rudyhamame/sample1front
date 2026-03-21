import React from "react";

const CHAT_EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🤔",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "🎉",
  "💙",
  "💯",
  "😎",
  "😅",
  "😭",
  "🤝",
];

const resetChatTextareaHeight = (textarea) => {
  if (!textarea) {
    return;
  }

  textarea.style.height = "42px";
};

const resizeChatTextarea = (textarea) => {
  if (!textarea) {
    return;
  }

  resetChatTextareaHeight(textarea);
  textarea.style.height = `${Math.max(textarea.scrollHeight, 42)}px`;
};

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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const emojiPickerRef = React.useRef(null);

  React.useEffect(() => {
    if (!isEmojiPickerOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEmojiPickerOpen]);

  const handleSend = () => {
    const textarea = document.getElementById("Chat_textarea_input");
    const message = textarea ? textarea.value : "";

    if (sendToThemMessage) {
      sendToThemMessage(message);
    }

    setIsEmojiPickerOpen(false);
  };

  const handleTypingChange = (event) => {
    resizeChatTextarea(event.target);

    if (!state?.activeChatFriendId || !updateMyTypingPresence) {
      return;
    }

    updateMyTypingPresence(
      state.activeChatFriendId,
      Boolean(event.target.value.trim())
    );
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = document.getElementById("Chat_textarea_input");

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? textarea.value.length;
    const nextValue =
      textarea.value.slice(0, selectionStart) +
      emoji +
      textarea.value.slice(selectionEnd);

    textarea.value = nextValue;
    const nextCursorPosition = selectionStart + emoji.length;
    textarea.selectionStart = nextCursorPosition;
    textarea.selectionEnd = nextCursorPosition;
    resizeChatTextarea(textarea);
    textarea.focus();

    if (state?.activeChatFriendId && updateMyTypingPresence) {
      updateMyTypingPresence(state.activeChatFriendId, Boolean(nextValue.trim()));
    }
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
                const phenomedIntro =
                  document.querySelector(".PhenomedSocial_intro");
                const friendsListArticle = document.getElementById(
                  "FriendsList_article"
                );
                const addFriendArticle = document.getElementById(
                  "AddFriend_article"
                );
                const friendChatArticle =
                  document.getElementById("FriendChat_article");

                if (friendsListArticle) {
                  friendsListArticle.style.display = "flex";
                }
                if (addFriendArticle) {
                  addFriendArticle.style.display = "flex";
                }
                if (friendChatArticle) {
                  friendChatArticle.style.display = "none";
                }
                if (phenomedIntro) {
                  phenomedIntro.style.display = "flex";
                }
                if (closeActiveChat) {
                  closeActiveChat();
                }
              }}
            ></i>
            <div id="Chat_title_copy" className="fc">
              <p id="Chat_app_title">Noga Chat</p>
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
                <div id="Chat_emoji_picker_wrap" ref={emojiPickerRef}>
                  <button
                    id="Chat_emoji_button"
                    type="button"
                    aria-label="Open emoji picker"
                    title="Emoji"
                    onClick={() => {
                      setIsEmojiPickerOpen((currentValue) => !currentValue);
                    }}
                  >
                    <span role="img" aria-hidden="true">
                      🙂
                    </span>
                  </button>
                  {isEmojiPickerOpen ? (
                    <div id="Chat_emoji_picker" className="fc">
                      {CHAT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="Chat_emoji_option"
                          onClick={() => {
                            handleEmojiSelect(emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <textarea
                  id="Chat_textarea_input"
                  placeholder={chatContent?.inputPlaceholder || "Write a message"}
                  rows="1"
                  onChange={handleTypingChange}
                  onInput={(event) => {
                    resizeChatTextarea(event.target);
                  }}
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

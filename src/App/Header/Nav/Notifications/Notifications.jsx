import React, { useEffect, useState } from "react";

const Notifications = (props) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState("");
  const [dismissingLabel, setDismissingLabel] = useState(".");
  const isControlled = typeof props.isOpen === "boolean";
  const isOpen = isControlled ? props.isOpen : internalIsOpen;
  const unreadNotifications = (props.state?.notifications || []).filter(
    (notification) => notification.status !== "read"
  );

  const updateOpenState = (nextIsOpen) => {
    if (!isControlled) {
      setInternalIsOpen(nextIsOpen);
    }
    if (props.onOpenChange) {
      props.onOpenChange(nextIsOpen);
    }
  };

  useEffect(() => {
    function closeOnOutsideClick(event) {
      const article = document.getElementById("Notifications_article");

      if (article && !article.contains(event.target)) {
        updateOpenState(false);
      }
    }

    if (props.disableOutsideClose) {
      return undefined;
    }

    document.addEventListener("click", closeOnOutsideClick);

    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, [props.disableOutsideClose]);

  function openNotifications(event) {
    event.stopPropagation();
    updateOpenState(true);
  }

  function closeNotifications(event) {
    event.stopPropagation();
    updateOpenState(false);
  }

  useEffect(() => {
    if (!dismissingId) {
      return undefined;
    }

    const labels = [".", "..", "..."];
    let index = 0;

    const intervalId = window.setInterval(() => {
      index = (index + 1) % labels.length;
      setDismissingLabel(labels[index]);
    }, 280);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [dismissingId]);

  const handleDismiss = (notificationId) => {
    if (!notificationId || dismissingId) {
      return;
    }

    setDismissingId(String(notificationId));
    setDismissingLabel(".");

    Promise.resolve(
      props.makeNotificationsRead && props.makeNotificationsRead(notificationId)
    ).finally(() => {
      setDismissingId("");
      setDismissingLabel(".");
    });
  };

  return (
    <section id="Notifications_article">
      <div id="Notification_icons_container">
        <i
          id="i_bell_open"
          onClick={openNotifications}
          className="fas fa-bell"
          title="Notifications"
          style={{ display: isOpen ? "none" : "inline-flex" }}
        ></i>
        <i
          id="i_bell_close"
          onClick={closeNotifications}
          style={{ display: isOpen ? "inline-flex" : "none" }}
          className="fas fa-bell"
          title="Notifications"
        ></i>
      </div>

      {!props.hidePanel && (
        <section id="Notifications_content_container">
          <ul
            id="Notifications_dropMenu_container"
            className="fc"
            style={{ display: isOpen ? "flex" : "none" }}
          >
            {unreadNotifications.length === 0 ? (
              <li id="Notifications_empty_state">No new notifications</li>
            ) : (
              unreadNotifications.map((notification) => (
                <div
                  key={notification._id || notification.id}
                  className="Notifications_row fr"
                >
                  <li id={notification._id || notification.id}>
                    <p>{notification.message}</p>
                  </li>
                  {String(dismissingId) ===
                  String(notification._id || notification.id) ? (
                    <span
                      className="Notifications_dismissLoading"
                      aria-label="Dismissing notification"
                      title="Dismissing notification"
                    >
                      {dismissingLabel}
                    </span>
                  ) : (
                    <i
                      id={`decline_icon${notification._id || notification.id}`}
                      onClick={() =>
                        handleDismiss(notification._id || notification.id)
                      }
                      className="fas fa-times"
                      title="Dismiss"
                    ></i>
                  )}
                  {notification.type === "friend_request" ? (
                    <i
                      id={`accept_icon${notification.id}`}
                      onClick={() =>
                        props.acceptFriend &&
                        props.acceptFriend(`accept_icon${notification.id}`)
                      }
                      className="fas fa-user-check"
                      title="Accept"
                    ></i>
                  ) : null}
                </div>
              ))
            )}
          </ul>
        </section>
      )}
    </section>
  );
};

export default Notifications;

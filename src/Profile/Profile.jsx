import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import "../Home/home.css";
import "./Profile.css";
import { apiUrl } from "../config/api";

const PROFILE_THEME_STORAGE_KEY = "phenomed.profileRouteTheme";

const formatProfileValue = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
};

const isVideoGalleryItem = (item) => {
  const resourceType = String(
    item?.resourceType || item?.resource_type || item?.type || "",
  )
    .trim()
    .toLowerCase();
  const mimeType = String(item?.mimeType || item?.format || "")
    .trim()
    .toLowerCase();

  return resourceType === "video" || mimeType.startsWith("video/");
};

const Profile = ({ viewerState, logOut }) => {
  const { username } = useParams();
  const location = useLocation();
  const requestedUsername = String(username || "").trim();
  const viewerUsername = String(viewerState?.username || "").trim();
  const viewerFirstName = String(viewerState?.firstname || "").trim();
  const viewerLastName = String(viewerState?.lastname || "").trim();
  const viewerProfilePicture = String(viewerState?.profilePicture || "").trim();
  const isOwnProfile =
    requestedUsername &&
    viewerUsername &&
    requestedUsername.toLowerCase() === viewerUsername.toLowerCase();
  const [profileData, setProfileData] = React.useState(() => ({
    username: isOwnProfile ? viewerUsername : requestedUsername,
    firstname: isOwnProfile ? viewerFirstName : "",
    lastname: isOwnProfile ? viewerLastName : "",
    profilePicture: isOwnProfile ? viewerProfilePicture : "",
  }));
  const [isLoading, setIsLoading] = React.useState(!isOwnProfile);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeProfileSection, setActiveProfileSection] = React.useState("about");
  const [galleryTab, setGalleryTab] = React.useState("images");
  const routeTheme = React.useMemo(() => {
    const stateTheme =
      location?.state?.profileTheme &&
      typeof location.state.profileTheme === "object"
        ? location.state.profileTheme
        : null;
    const storedTheme =
      typeof window !== "undefined"
        ? (() => {
            try {
              return JSON.parse(
                window.sessionStorage.getItem(PROFILE_THEME_STORAGE_KEY) || "null",
              );
            } catch (error) {
              return null;
            }
          })()
        : null;
    const resolvedTheme = stateTheme || storedTheme || {};
    const isDark =
      typeof resolvedTheme?.isDark === "boolean"
        ? resolvedTheme.isDark
        : typeof document !== "undefined"
          ? document.body.classList.contains("dark")
          : false;

    return {
      variant:
        String(resolvedTheme?.variant || "home").trim().toLowerCase() === "noga"
          ? "noga"
          : "home",
      isDark,
      backPath:
        String(resolvedTheme?.backPath || "").trim() ||
        (String(resolvedTheme?.variant || "").trim().toLowerCase() === "noga"
          ? "/phenomed/home/noga"
          : "/phenomed/home"),
    };
  }, [location]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      PROFILE_THEME_STORAGE_KEY,
      JSON.stringify(routeTheme),
    );
  }, [routeTheme]);

  React.useEffect(() => {
    if (!requestedUsername) {
      setProfileData({
        username: "",
        firstname: "",
        lastname: "",
        profilePicture: "",
      });
      setIsLoading(false);
      setErrorMessage("Profile not found.");
      return undefined;
    }

    if (isOwnProfile) {
      setProfileData({
        username: viewerUsername,
        firstname: viewerFirstName,
        lastname: viewerLastName,
        profilePicture: viewerProfilePicture,
      });
      setIsLoading(false);
      setErrorMessage("");
      return undefined;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage("");

    fetch(apiUrl(`/api/user/profile/${encodeURIComponent(requestedUsername)}`), {
      method: "GET",
      signal: abortController.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            String(payload?.message || "Unable to load doctor profile."),
          );
        }

        setProfileData({
          username: String(payload?.username || requestedUsername).trim(),
          firstname: String(payload?.firstname || "").trim(),
          lastname: String(payload?.lastname || "").trim(),
          profilePicture: String(payload?.profilePicture || "").trim(),
        });
        setErrorMessage("");
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setProfileData({
          username: requestedUsername,
          firstname: "",
          lastname: "",
          profilePicture: "",
        });
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load doctor profile.",
        );
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [
    isOwnProfile,
    requestedUsername,
    viewerFirstName,
    viewerLastName,
    viewerProfilePicture,
    viewerUsername,
  ]);

  const profileUsername = String(profileData?.username || "").trim();
  const firstName = String(profileData?.firstname || "").trim();
  const lastName = String(profileData?.lastname || "").trim();
  const displayName =
    `${firstName} ${lastName}`.trim() || profileUsername || "Profile";
  const bio = isOwnProfile
    ? formatProfileValue(viewerState?.bio)
    : errorMessage
      ? errorMessage
      : isLoading
        ? "Loading profile..."
        : "No public bio available.";
  const profileState = isOwnProfile
    ? viewerState || {}
    : {
        username: profileUsername,
        firstname: firstName,
        lastname: lastName,
        profilePicture: profileData?.profilePicture || "",
      };
  const compactUsername = formatProfileValue(
    profileUsername ? `@${profileUsername}` : "",
  );
  const imageGallery = Array.isArray(viewerState?.imageGallery)
    ? viewerState.imageGallery
    : [];
  const visibleGalleryItems = React.useMemo(
    () =>
      imageGallery.filter((item) =>
        galleryTab === "images"
          ? !isVideoGalleryItem(item) &&
            String(item?.resourceType || item?.resource_type || "")
              .trim()
              .toLowerCase() !== "pattern"
          : galleryTab === "patterns"
            ? String(item?.resourceType || item?.resource_type || "")
                .trim()
                .toLowerCase() === "pattern"
            : isVideoGalleryItem(item),
      ),
    [galleryTab, imageGallery],
  );

  const profileColumns = [
    {
      title: "Identity",
      rows: [
        { label: "First name", value: formatProfileValue(profileState.firstname) },
        { label: "Last name", value: formatProfileValue(profileState.lastname) },
        { label: "Username", value: compactUsername },
      ],
    },
    {
      title: "Contact",
      rows: [
        {
          label: "Email",
          value: isOwnProfile
            ? formatProfileValue(profileState.email)
            : "Private",
        },
        {
          label: "Phone",
          value: isOwnProfile
            ? formatProfileValue(profileState.phone)
            : "Private",
        },
      ],
    },
    {
      title: "Background",
      rows: [
        {
          label: "Country",
          value: isOwnProfile
            ? formatProfileValue(profileState?.hometown?.Country)
            : "Private",
        },
        {
          label: "City",
          value: isOwnProfile
            ? formatProfileValue(profileState?.hometown?.City)
            : "Private",
        },
        {
          label: "Faculty",
          value: isOwnProfile
            ? formatProfileValue(profileState.faculty)
            : "Private",
        },
      ],
    },
  ];

  const renderProfileSectionContent = () => {
    if (activeProfileSection === "events") {
      return (
        <div className="Home_friendsEventsEmpty">
          There is no events to show.
        </div>
      );
    }

    if (activeProfileSection === "gallery") {
      if (!isOwnProfile) {
        return (
          <div className="Home_friendsEventsEmpty">
            Public gallery is not available on this page yet.
          </div>
        );
      }

      return (
        <div className="Profile_gallerySection">
          <div className="Home_galleryTabs">
            <button
              type="button"
              className={`Home_galleryTabButton${
                galleryTab === "images" ? " isActive" : ""
              }`}
              onClick={() => setGalleryTab("images")}
              aria-pressed={galleryTab === "images"}
            >
              <i className="fi fi-rr-copy-image" aria-hidden="true"></i>
              <span>Images</span>
            </button>
            <button
              type="button"
              className={`Home_galleryTabButton${
                galleryTab === "patterns" ? " isActive" : ""
              }`}
              onClick={() => setGalleryTab("patterns")}
              aria-pressed={galleryTab === "patterns"}
            >
              <i className="fas fa-shapes" aria-hidden="true"></i>
              <span>Patterns</span>
            </button>
            <button
              type="button"
              className={`Home_galleryTabButton${
                galleryTab === "videos" ? " isActive" : ""
              }`}
              onClick={() => setGalleryTab("videos")}
              aria-pressed={galleryTab === "videos"}
            >
              <i className="fi fi-rr-film" aria-hidden="true"></i>
              <span>Videos</span>
            </button>
          </div>
          {visibleGalleryItems.length ? (
            <div className="Home_galleryGrid">
              {visibleGalleryItems.map((item, index) => {
                const isVideoItem = isVideoGalleryItem(item);
                const mediaUrl = String(item?.url || "").trim();
                const itemKey =
                  String(item?.publicId || "").trim() ||
                  `${galleryTab}-${index}`;

                return (
                  <article key={itemKey} className="Home_galleryItem">
                    <div className="Home_galleryThumbWrap">
                      {isVideoItem ? (
                        <video
                          src={mediaUrl}
                          className="Home_galleryThumb"
                          muted
                          playsInline
                          preload="metadata"
                          controls
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt="Gallery upload"
                          className="Home_galleryThumb"
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="Home_galleryEmptyState">
              {galleryTab === "patterns"
                ? "No patterns uploaded yet."
                : galleryTab === "videos"
                  ? "No videos uploaded yet."
                  : "No images uploaded yet."}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="Home_aboutPanel">
        {errorMessage && !isOwnProfile ? (
          <div className="Home_friendsEventsEmpty">{errorMessage}</div>
        ) : null}
        {profileColumns.map((column) => (
          <section
            key={`about-${column.title}`}
            className="Home_profileInfoColumn"
          >
            <h4 className="Home_profileInfoColumnTitle">{column.title}</h4>
            {column.rows.map((row) => (
              <p key={`${column.title}-${row.label}`}>
                <strong>{row.label}</strong>
                <span>{row.value}</span>
              </p>
            ))}
          </section>
        ))}
      </div>
    );
  };

  return (
    <article
      id="Home_studysessions_article"
      className={[
        "Profile_pageShell",
        routeTheme.variant === "noga"
          ? "Profile_pageShell--noga"
          : "Profile_pageShell--home",
        routeTheme.isDark ? "Profile_pageShell--dark" : "",
        "Home_themeGreen",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="Profile_pageFrame">
        <div className="Home_settingsBackRow fr">
          <Link to={routeTheme.backPath} className="Home_settingsBackButton">
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            <span>Back Home</span>
          </Link>
          <button
            type="button"
            className="Home_settingsBackButton"
            onClick={logOut}
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
            <span>Log Out</span>
          </button>
        </div>

        <div id="Home_preStart_introWrap" className="Profile_pageIntroWrap">
          <div className="Home_main_leftColumn_wrapper">
            <div id="Home_bioWrapper" className="Home_bioWrapper">
              <div id="Home_preStart_profileWrapper">
                {profileData?.profilePicture ? (
                  <img
                    id="Home_preStart_profilePic"
                    src={profileData.profilePicture}
                    alt={displayName}
                  />
                ) : (
                  <i className="fas fa-user" aria-hidden="true"></i>
                )}
              </div>
              <div id="Home_preStart_personalBio" className="fc">
                <div
                  id="Home_preStart_personalInfoGrid"
                  className="Home_preStart_personalInfoGrid--compact"
                >
                  <div className="Home_compactBioCard">
                    <div className="Home_compactBioIdentity fc">
                      <h3 className="Home_compactBioName">{displayName}</h3>
                      <p className="Home_compactBioUsername">{compactUsername}</p>
                    </div>
                    <div className="Home_compactBioSummary">
                      <div className="Home_compactBioHeadingRow">
                        <p className="Home_compactBioEyebrow">Bio</p>
                      </div>
                      <p className="Home_compactBioText Home_compactBioText--ltr">
                        {bio}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="Home_friendsEventsWrapper Profile_pageAboutWrapper">
              <div className="Home_friendsEvents">
                <div className="Home_friendsEventsHeader">
                  <h3>
                    {activeProfileSection === "about"
                      ? "About Profile"
                      : activeProfileSection === "events"
                        ? "Friend Events"
                        : "Gallery"}
                  </h3>
                  <div className="Profile_sectionTabs">
                    <button
                      type="button"
                      className={`Home_aboutButton Home_aboutToggle${
                        activeProfileSection === "about" ? " isActive" : ""
                      }`}
                      onClick={() => setActiveProfileSection("about")}
                      aria-pressed={activeProfileSection === "about"}
                    >
                      About Profile
                    </button>
                    <button
                      type="button"
                      className={`Home_aboutButton Home_aboutToggle${
                        activeProfileSection === "events" ? " isActive" : ""
                      }`}
                      onClick={() => setActiveProfileSection("events")}
                      aria-pressed={activeProfileSection === "events"}
                    >
                      Friend Events
                    </button>
                    <button
                      type="button"
                      className={`Home_aboutButton Home_aboutToggle${
                        activeProfileSection === "gallery" ? " isActive" : ""
                      }`}
                      onClick={() => setActiveProfileSection("gallery")}
                      aria-pressed={activeProfileSection === "gallery"}
                    >
                      Gallery
                    </button>
                  </div>
                </div>
                {renderProfileSectionContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default Profile;

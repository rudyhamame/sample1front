import React from "react";

const Dim = () => {
  const syncIcons = (isDark) => {
    const dimIcon = document.getElementById("Nav_dim_i_dim");
    const undimIcon = document.getElementById("Nav_dim_i_undim");

    if (dimIcon) {
      dimIcon.style.display = isDark ? "none" : "inline";
    }
    if (undimIcon) {
      undimIcon.style.display = isDark ? "inline" : "none";
    }
  };

  const togglePhenomedSocialTheme = (isDark) => {
    const article = document.getElementById("PhenomedSocial_article");

    if (!article) {
      return false;
    }

    article.classList.toggle("PhenomedSocial_themeDark", isDark);
    return true;
  };

  const toggleHomeTheme = (isDark) => {
    const article = document.getElementById("Home_studysessions_article");

    if (!article) {
      return false;
    }

    article.classList.toggle("Home_themeDark", isDark);
    return true;
  };

  const dim = () => {
    syncIcons(true);
    // Global dark mode for all components
    document.body.classList.add("dark");
    // Still support legacy per-article dark classes
    if (togglePhenomedSocialTheme(true)) {
      return;
    }
    if (toggleHomeTheme(true)) {
      return;
    }
    const mountPostsContainer = document.getElementById(
      "MountPosts_content_container",
    );
    const inputTextareaContainer = document.getElementById(
      "InputPost_textarea_container",
    );
    const inputInputsContainer = document.getElementById(
      "InputPost_inputs_container",
    );
    if (mountPostsContainer) {
      mountPostsContainer.style.backgroundColor = "var(--gray)";
    }
    if (inputTextareaContainer) {
      inputTextareaContainer.style.backgroundColor = "var(--gray)";
    }
    if (inputInputsContainer) {
      inputInputsContainer.style.backgroundColor = "var(--gray)";
    }
  };
  const undim = () => {
    syncIcons(false);
    // Remove global dark mode
    document.body.classList.remove("dark");
    // Still support legacy per-article dark classes
    if (togglePhenomedSocialTheme(false)) {
      return;
    }
    if (toggleHomeTheme(false)) {
      return;
    }
    const mountPostsContainer = document.getElementById(
      "MountPosts_content_container",
    );
    const inputTextareaContainer = document.getElementById(
      "InputPost_textarea_container",
    );
    const inputInputsContainer = document.getElementById(
      "InputPost_inputs_container",
    );
    if (mountPostsContainer) {
      mountPostsContainer.style.backgroundColor = "var(--black)";
    }
    if (inputTextareaContainer) {
      inputTextareaContainer.style.backgroundColor = "var(--black)";
    }
    if (inputInputsContainer) {
      inputInputsContainer.style.backgroundColor = "var(--black)";
    }
  };
  const [isDark, setIsDark] = React.useState(
    document.body.classList.contains("dark"),
  );

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="Dim_article">
      <i
        id="Nav_dim_i_dim"
        className="fas fa-adjust"
        title={isDark ? "Light mode" : "Dim"}
        onClick={isDark ? undim : dim}
        style={{}}
      ></i>
    </section>
  );
};

export default Dim;

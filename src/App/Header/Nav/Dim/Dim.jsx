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

  const toggleGreetingTheme = (isDark) => {
    const article = document.getElementById("Greeting_studysessions_article");

    if (!article) {
      return false;
    }

    article.classList.toggle("Greeting_themeDark", isDark);
    return true;
  };

  const dim = () => {
    syncIcons(true);

    if (togglePhenomedSocialTheme(true)) {
      return;
    }

    if (toggleGreetingTheme(true)) {
      return;
    }

    const mountPostsContainer = document.getElementById(
      "MountPosts_content_container"
    );
    const inputTextareaContainer = document.getElementById(
      "InputPost_textarea_container"
    );
    const inputInputsContainer = document.getElementById(
      "InputPost_inputs_container"
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

    if (togglePhenomedSocialTheme(false)) {
      return;
    }

    if (toggleGreetingTheme(false)) {
      return;
    }

    const mountPostsContainer = document.getElementById(
      "MountPosts_content_container"
    );
    const inputTextareaContainer = document.getElementById(
      "InputPost_textarea_container"
    );
    const inputInputsContainer = document.getElementById(
      "InputPost_inputs_container"
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
  return (
    <section id="Dim_article">
      <i id="Nav_dim_i_dim" class="fas fa-adjust" title="Dim" onClick={dim}></i>
      <i
        id="Nav_dim_i_undim"
        class="fas fa-adjust"
        title="Dim"
        onClick={undim}
        style={{
          display: "none",
        }}
      ></i>
    </section>
  );
};

export default Dim;

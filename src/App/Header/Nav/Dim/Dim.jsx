import React from "react";

const Dim = () => {
  const dim = () => {
    let i_dim_menu_dim = document.getElementById("Nav_dim_i_dim");
    let i_dim_menu_undim = document.getElementById("Nav_dim_i_undim");
    i_dim_menu_dim.style.display = "none";
    i_dim_menu_undim.style.display = "inline";
    document.getElementById(
      "MountPosts_content_container"
    ).style.backgroundColor = "var(--gray)";
    document.getElementById(
      "InputPost_textarea_container"
    ).style.backgroundColor = "var(--gray)";
    document.getElementById(
      "InputPost_inputs_container"
    ).style.backgroundColor = "var(--gray)";
  };
  const undim = () => {
    let i_dim_menu_dim = document.getElementById("Nav_dim_i_dim");
    let i_dim_menu_undim = document.getElementById("Nav_dim_i_undim");
    i_dim_menu_dim.style.display = "inline";
    i_dim_menu_undim.style.display = "none";
    document.getElementById(
      "MountPosts_content_container"
    ).style.backgroundColor = "var(--black)";
    document.getElementById(
      "InputPost_textarea_container"
    ).style.backgroundColor = "var(--black)";
    document.getElementById(
      "InputPost_inputs_container"
    ).style.backgroundColor = "var(--black)";
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

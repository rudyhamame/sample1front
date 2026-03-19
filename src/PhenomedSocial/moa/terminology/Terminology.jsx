import React from "react";

const Terminology = (props) => {
  const content = props.content?.terminology;
  const categories = props.content?.categories || [];
  const subjects = props.content?.subjects || [];

  const openInputForm = () => {
    document.getElementById("Terminology_inputs_container").style.display =
      "flex";
    document.getElementById("Terminology_control_icon_close").style.display =
      "inline";
    document.getElementById("Terminology_control_icon_open").style.display =
      "none";
  };
  const closeInputForm = () => {
    document.getElementById("Terminology_inputs_container").style.display =
      "none";
    document.getElementById("Terminology_control_icon_close").style.display =
      "none";
    document.getElementById("Terminology_control_icon_open").style.display =
      "inline";
  };
  const openNotesAside = () => {
    let Terminology_container = document.getElementById(
      "Terminology_container"
    );
    let Terminology_control_door = document.getElementById(
      "Terminology_control_door"
    );
    let app_page = document.querySelector("#app_page");
    let app_page_css = window.getComputedStyle(app_page);
    let Header_article = document.getElementById("Header_article");
    let searchPosts = document.getElementById("SearchPosts_article");
    let Friends_article = document.getElementById("Friends_article");
    let Terminology_article = document.getElementById("Terminology_article");

    if (Terminology_control_door.title === "unclicked") {
      if (parseInt(app_page_css.width) >= 1500) {
        Terminology_container.style.width = "400px";
      }

      if (parseInt(app_page_css.width) <= 1200) {
        Header_article.style.display = "none";
        Terminology_article.style.height = "100vh";
        Friends_article.style.display = "none";
        searchPosts.style.display = "none";
        Terminology_container.style.height = "100vh";
      }
      Terminology_control_door.title = "clicked";
    } else {
      if (parseInt(app_page_css.width) < 1200) {
        Header_article.style.display = "flex";
        Terminology_article.style.height = "initial";
        Terminology_container.style.height = "0";
        Friends_article.style.display = "flex";
        searchPosts.style.display = "flex";
      } else {
        Terminology_container.style.width = "0";
      }
      Terminology_control_door.title = "unclicked";
    }
  };
  return (
    <article id="Terminology_article" className="fr">
      <section id="Terminology_container" className="fc">
        <h1 id="Terminology_title">{content?.title || "Terminology"}</h1>
        <ul id="Terminology_content_container" className="fc"></ul>
        <i
          className="fas fa-plus"
          id="Terminology_control_icon_open"
          onClick={openInputForm}
        ></i>
        <i
          className="fas fa-minus"
          id="Terminology_control_icon_close"
          onClick={closeInputForm}
        ></i>
        <section id="Terminology_inputs_container" className="fc">
          <input
            type="text"
            name="term"
            id="Terminology_term"
            placeholder={content?.termPlaceholder || "Enter a medical term"}
          />
          <textarea
            type="text"
            name="term"
            id="Terminology_meaning"
            placeholder={content?.meaningPlaceholder || "What does it mean .."}
          />
          <select id="Terminology_category" title="dsf">
            <option value="" disabled selected hidden>
              {content?.categoryPlaceholder || "System"}
            </option>
            {categories.map((category, index) => (
              <option key={`${category}-${index}`} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select id="Terminology_subject" name="subject">
            <option value="" disabled selected hidden>
              {content?.subjectPlaceholder || "Discipline"}
            </option>
            {subjects.map((subject, index) => (
              <option key={`${subject}-${index}`} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <button
            id="Terminology_post_button"
            value="unclicked"
            onClick={() => {
              props.postingTerminology(
                document.getElementById("Terminology_term").value,
                document.getElementById("Terminology_meaning").value,
                document.getElementById("Terminology_category").value,
                document.getElementById("Terminology_subject").value
              );
            }}
          >
            {content?.postButton || "Post"}
          </button>
        </section>
      </section>
      <section
        onClick={openNotesAside}
        className="fr"
        id="Terminology_control_door"
        title="unclicked"
      >
        <i className="fas fa-sticky-note"></i>
      </section>
    </article>
  );
};

export default Terminology;

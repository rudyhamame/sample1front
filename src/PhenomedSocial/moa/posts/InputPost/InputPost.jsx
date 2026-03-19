import React from "react";

const InputForm = (props) => {
  const content = props.content?.inputPost;
  const categories = props.content?.categories || [];
  const subjects = props.content?.subjects || [];
  ////////////////////////////////AUTO RESIZE TEXTAREA///////////////////////////////////
  function auto_grow(event) {
    let textarea = document.getElementById("InputPost_textarea");
    textarea.style.height = textarea.scrollHeight + "px";

    if (event.which === 8) {
      textarea.style.height = textarea.scrollHeight - 20 + "px";
    }
  }
  function minimizeHeight() {
    let textarea = document.getElementById("InputPost_textarea");

    if (textarea.value === "") {
      textarea.style.height = 0 + "px";
    }
  }
  return (
    <article id="InputPost_article" className="fc">
      <section className="fr" id="InputPost_textarea_container">
        <textarea
          id="InputPost_textarea"
          placeholder={content?.notePlaceholder || "Want to post a note?"}
          onKeyDown={(event) => auto_grow(event)}
          onChange={(event) => minimizeHeight(event)}
        ></textarea>
        <section id="InputPost_inputs_container" className="fr">
          <select id="InputPost_category" title="dsf">
            <option value="" disabled selected hidden>
              {content?.categoryPlaceholder || "System"}
            </option>
            {categories.map((category, index) => (
              <option key={`${category}-${index}`} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select id="InputPost_subject" name="subject">
            <option value="" disabled selected hidden>
              {content?.subjectPlaceholder || "Discipline"}
            </option>
            {subjects.map((subject, index) => (
              <option key={`${subject}-${index}`} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="textbook"
            id="InputPost_resourse"
            placeholder={content?.resourcePlaceholder || "Resource"}
          />

          <input
            type="text"
            name="page"
            id="InputPost_page"
            placeholder={content?.pagePlaceholder || "Page Number"}
          />
          <button
            id="InputPost_post_button"
            value="unclicked"
            onClick={props.postingPost}
          >
            {content?.postButton || "Post"}
          </button>
        </section>
      </section>
    </article>
  );
};

export default InputForm;

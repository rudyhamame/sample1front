import React from "react";

const InputForm = (props) => {
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
          placeholder="Want to post a note?"
          onKeyDown={(event) => auto_grow(event)}
          onChange={(event) => minimizeHeight(event)}
        ></textarea>
        <section id="InputPost_inputs_container" className="fr">
          <select id="InputPost_category" title="dsf">
            <option value="" disabled selected hidden>
              System
            </option>
            <option value="General Principles">General Principles</option>
            <option value="Behavioral health system">
              Behavioral health system
            </option>
            <option value="Nervous system">Nervous system</option>
            <option value="Respiratory system">Respiratory system</option>
            <option value="Renal system">Renal system</option>
            <option value="Reproductive system">Reproductive system</option>
            <option value="Female reproductive system">
              Female reproductive system
            </option>
            <option value="Male reproductive system">
              Male reproductive system
            </option>
            <option value="Endocrine system">Endocrine system</option>
            <option value="Blood system">Blood system</option>
            <option value="Immune system">Immune system</option>
            <option value="Multisystem processes and disorders">
              Multisystem processes and disorders
            </option>
            <option value="Musculoskeletal tissue">
              Musculoskeletal tissue
            </option>
            <option value="Skin and subcutaneous tissue">
              Skin and subcutaneous tissue
            </option>
            <option value="Cardiovascular system">Cardiovascular system</option>
            <option value="Gastrointestinal system">
              Gastrointestinal system
            </option>
            <option value="Biostatistics and population health">
              Biostatistics and population health
            </option>
            <option value="Social sciences: communication skills and ethics">
              Social sciences: communication skills and ethics
            </option>
          </select>

          <select id="InputPost_subject" name="subject">
            <option value="" disabled selected hidden>
              Discipline
            </option>
            <option value="Pathology">Pathology</option>
            <option value="Physiology">Physiology</option>
            <option value="Pharmacology">Pharmacology</option>
            <option value="Biochemistry: Molecular">
              Biochemistry: Molecular
            </option>
            <option value="Biochemistry: Cellular">
              Biochemistry: Cellular
            </option>
            <option value="Biochemistry: Lab Tech">
              Biochemistry: Lab Tech
            </option>
            <option value="Biochemistry: Genetics">
              Biochemistry: Genetics
            </option>
            <option value="Biochemistry: Nutrition ">
              Biochemistry: Nutrition
            </option>
            <option value="Biochemistry: Metabolism ">
              Biochemistry: Metabolism
            </option>
            <option value="Microbiology">Microbiology</option>
            <option value="Immunology">Immunology</option>
            <option value="Gross Anatomy">Gross Anatomy</option>
            <option value="Embryology">Embryology</option>
            <option value="Histology">Histology</option>
            <option value="Cell Biology">Cell Biology</option>
            <option value="Behavioral Sciences">Behavioral Sciences</option>
            <option value="Genetics">Genetics</option>
          </select>

          <input
            type="text"
            name="textbook"
            id="InputPost_resourse"
            placeholder="Resourse"
          />

          <input
            type="text"
            name="page"
            id="InputPost_page"
            placeholder="Page Number"
          />
          <button
            id="InputPost_post_button"
            value="unclicked"
            onClick={props.postingPost}
          >
            post
          </button>
        </section>
      </section>
    </article>
  );
};

export default InputForm;

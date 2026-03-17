import React from "react";

const Terminology = (props) => {
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
        <h1 id="Terminology_title">Terminology</h1>
        <ul id="Terminology_content_container" className="fc"></ul>
        <i
          class="fas fa-plus"
          id="Terminology_control_icon_open"
          onClick={openInputForm}
        ></i>
        <i
          class="fas fa-minus"
          id="Terminology_control_icon_close"
          onClick={closeInputForm}
        ></i>
        <section id="Terminology_inputs_container" className="fc">
          <input
            type="text"
            name="term"
            id="Terminology_term"
            placeholder="Enter a medical term"
          />
          <textarea
            type="text"
            name="term"
            id="Terminology_meaning"
            placeholder="What does it mean .."
          />
          <select id="Terminology_category" title="dsf">
            <option value="" disabled selected hidden>
              System
            </option>
            <option value="General Principles">Schedule</option>
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

          <select id="Terminology_subject" name="subject">
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
            post
          </button>
        </section>
      </section>
      <section
        onClick={openNotesAside}
        className="fr"
        id="Terminology_control_door"
        title="unclicked"
      >
        <i class="fas fa-sticky-note"></i>
      </section>
    </article>
  );
};

export default Terminology;

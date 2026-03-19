import React from "react";

const SearchPosts = (props) => {
  let SearchPosts_keyword = document.getElementById("SearchPosts_keyword");
  let SearchPosts_subject = document.getElementById("SearchPosts_subject");
  let SearchPosts_category = document.getElementById("SearchPosts_category");

  ///////////////////////////SEATCH FOR USERS TO BE FRIENDS///////////////

  const openSearch = () => {
    document.getElementById("SearchPosts_content_container").style.display =
      "flex";
    document.getElementById("SearchPosts_control_open_icon").style.display =
      "none";
    document.getElementById("SearchPosts_control_close_icon").style.display =
      "inline";
    if (
      parseInt(
        window.getComputedStyle(document.querySelector("#root")).width
      ) <= 1200
    ) {
      document.getElementById("Friends_article").style.display = "flex";
      document.getElementById("Terminology_article").style.display = "flex";
    }
  };
  const closeSearch = () => {
    document.getElementById("SearchPosts_content_container").style.display =
      "none";
    document.getElementById("SearchPosts_control_open_icon").style.display =
      "inline";
    document.getElementById("SearchPosts_control_close_icon").style.display =
      "none";
    if (
      parseInt(
        window.getComputedStyle(document.querySelector("#root")).width
      ) <= 1200
    ) {
      document.getElementById("Friends_article").style.display = "none";
      document.getElementById("Terminology_article").style.display = "none";
    }
  };

  return (
    <article className="fc" id="SearchPosts_article">
      <section id="SearchPosts_control_icon_container">
        <i
          id="SearchPosts_control_open_icon"
          onClick={openSearch}
          class="fas fa-sort-up"
        ></i>
        <i
          id="SearchPosts_control_close_icon"
          onClick={closeSearch}
          class="fas fa-sort-down"
        ></i>
      </section>
      <h1
        style={{
          color: "rgba(255, 255, 255, 0.801)",
          textAlign: "center",
          position: "absolute",
          left: "0",
          fontFamily: "'Raleway', sans-serif",
          fontWeight: "300",
          paddingLeft: "40px",
        }}
        id="Header_timer_h1"
      >
        {props.state.timer.hours && props.state.timer.hours < 10
          ? "0" + props.state.timer.hours
          : props.state.timer.hours >= 10
          ? props.state.timer.hours
          : "00"}
        :
        {props.state.timer.mins && props.state.timer.mins < 10
          ? "0" + props.state.timer.mins
          : props.state.timer.mins >= 10
          ? props.state.timer.mins
          : "00"}
        :
        {props.state.timer.secs && props.state.timer.secs < 10
          ? "0" + props.state.timer.secs
          : props.state.timer.secs >= 10
          ? props.state.timer.secs
          : "00"}
      </h1>{" "}
      <section id="SearchPosts_content_container" className="fr">
        <section id="SearchPosts_category_container" className="fr">
          <select id="SearchPosts_category">
            <option value="" disabled selected hidden>
              Search by system
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
        </section>
        <section id="SearchPosts_subject_container" className="fr">
          <select id="SearchPosts_subject" name="subject">
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
        </section>
        <section id="SearchPosts_keyword_container" className="fr">
          <input
            id="SearchPosts_keyword"
            type="text"
            placeholder="Search by keyword"
          />
        </section>
        <section id="SearchPosts_Buttons_container" className="fr">
          <button
            id="SearchPosts_searchButton"
            onClick={() => {
              props.prepare_searchPosts(
                SearchPosts_keyword.value,
                SearchPosts_subject.value,
                SearchPosts_category.value
              );
            }}
          >
            Search
          </button>
          <button
            id="SearchPosts_clearButton"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reset
          </button>
        </section>
      </section>
    </article>
  );
};

export default SearchPosts;

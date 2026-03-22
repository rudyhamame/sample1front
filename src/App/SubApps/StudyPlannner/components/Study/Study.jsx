import React from "react";
import "./study.css";

const buildPreviewInsights = (sourceText) => {
  const normalized = String(sourceText || "").trim();
  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  const paragraphs = normalized
    ? normalized.split(/\n\s*\n/).filter((paragraph) => paragraph.trim())
    : [];
  const sentences = normalized
    ? normalized
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    : [];

  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length || (normalized ? 1 : 0),
    sentenceCount: sentences.length,
    firstSentence: sentences[0] || "No source text yet.",
  };
};

const Study = (props) => {
  const [sourceText, setSourceText] = React.useState("");
  const [guidingQuestion, setGuidingQuestion] = React.useState(
    "What is this text trying to show, and how can PhenoMed Student make it intelligible?"
  );
  const [studentLens, setStudentLens] = React.useState(
    "Object, meaning, relation, and clinical significance"
  );

  const insights = React.useMemo(
    () => buildPreviewInsights(sourceText),
    [sourceText]
  );

  const handleBeginAnalysis = () => {
    if (!sourceText.trim()) {
      props.serverReply?.(
        "Paste the PDF or text content first, then we can start making it intelligible through the PhenoMed Student lens."
      );
      return;
    }

    props.serverReply?.(
      "PhenoMed Student is ready. Next we can turn this source into structured intelligibility: object, relations, key claims, and clinical meaning."
    );
  };

  return (
    <article id="phenomed_student_page" className="fc">
      <section id="phenomed_student_hero" className="fc">
        <p className="phenomed_student_eyebrow">New Study Direction</p>
        <h1>PhenoMed Student</h1>
        <p className="phenomed_student_summary">
          This page is for grasping what is in a PDF or text and making it
          intelligible to the PhenoMed Student intellect.
        </p>
      </section>

      <section id="phenomed_student_grid" className="fr">
        <section id="phenomed_student_workspace" className="fc">
          <div className="phenomed_student_card fc">
            <div className="phenomed_student_cardHeader fr">
              <div>
                <p className="phenomed_student_cardEyebrow">Source Intake</p>
                <h2>Text to Be Understood</h2>
              </div>
              <button type="button" onClick={handleBeginAnalysis}>
                Begin intelligibility work
              </button>
            </div>

            <label className="phenomed_student_label" htmlFor="phenomed_source">
              Paste the PDF text or reading passage
            </label>
            <textarea
              id="phenomed_source"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Paste the text here. Later we can add direct PDF upload and parsing."
            />

            <div className="phenomed_student_metrics fr">
              <div className="phenomed_student_metric">
                <span>Words</span>
                <strong>{insights.wordCount}</strong>
              </div>
              <div className="phenomed_student_metric">
                <span>Paragraphs</span>
                <strong>{insights.paragraphCount}</strong>
              </div>
              <div className="phenomed_student_metric">
                <span>Sentences</span>
                <strong>{insights.sentenceCount}</strong>
              </div>
            </div>
          </div>

          <div className="phenomed_student_card fc">
            <p className="phenomed_student_cardEyebrow">Interpretive Lens</p>
            <h2>How PhenoMed Student Approaches a Text</h2>

            <label
              className="phenomed_student_label"
              htmlFor="phenomed_guiding_question"
            >
              Guiding question
            </label>
            <input
              id="phenomed_guiding_question"
              value={guidingQuestion}
              onChange={(event) => setGuidingQuestion(event.target.value)}
            />

            <label className="phenomed_student_label" htmlFor="phenomed_lens">
              Intelligibility lens
            </label>
            <input
              id="phenomed_lens"
              value={studentLens}
              onChange={(event) => setStudentLens(event.target.value)}
            />

            <div className="phenomed_student_steps fc">
              <div className="phenomed_student_step">
                <span>1</span>
                <div>
                  <h3>Grasp the object</h3>
                  <p>
                    Identify what the text is about, what it is trying to
                    reveal, and what kind of object is being studied.
                  </p>
                </div>
              </div>
              <div className="phenomed_student_step">
                <span>2</span>
                <div>
                  <h3>Trace relations</h3>
                  <p>
                    Follow how the text connects concepts, properties,
                    processes, and distinctions into a coherent field.
                  </p>
                </div>
              </div>
              <div className="phenomed_student_step">
                <span>3</span>
                <div>
                  <h3>Make meaning explicit</h3>
                  <p>
                    Convert the passage into clear intelligible statements the
                    student can study, reuse, and explain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside id="phenomed_student_inspector" className="fc">
          <div className="phenomed_student_card fc">
            <p className="phenomed_student_cardEyebrow">Current Preview</p>
            <h2>What We Can Already See</h2>
            <ul className="phenomed_student_list">
              <li>
                The first sentence suggests this text begins with:
                <strong> {insights.firstSentence}</strong>
              </li>
              <li>
                The current guiding question is:
                <strong> {guidingQuestion}</strong>
              </li>
              <li>
                The active student lens is:
                <strong> {studentLens}</strong>
              </li>
            </ul>
          </div>

          <div className="phenomed_student_card fc">
            <p className="phenomed_student_cardEyebrow">Target Output</p>
            <h2>What This Page Will Produce</h2>
            <ul className="phenomed_student_list">
              <li>A clearer statement of what the text is really about.</li>
              <li>A map of the important concepts and their relations.</li>
              <li>An intelligible explanation for the student mind.</li>
              <li>A bridge from text to clinical or conceptual meaning.</li>
            </ul>
          </div>

          <div className="phenomed_student_card fc phenomed_student_note">
            <p className="phenomed_student_cardEyebrow">Next Build Step</p>
            <h2>Coming After This</h2>
            <p>
              After the page direction is right, we can add PDF upload,
              extraction, structured concept output, and PhenoMed-specific
              interpretation tools.
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
};

export default Study;

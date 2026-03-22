import React from "react";
import "./phenomed-ecg.css";

const leadPattern =
  /\b(?:lead|leads?)\s*(i|ii|iii|avl|avr|avf|v1|v2|v3|v4|v5|v6)(?:\s*,\s*(i|ii|iii|avl|avr|avf|v1|v2|v3|v4|v5|v6))*\b/gi;

const metricPatterns = [
  { label: "Heart rate", unit: "bpm", regex: /\b(?:heart rate|rate|hr)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*bpm\b/i },
  { label: "PR interval", unit: "ms", regex: /\bpr(?:\s+interval)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*ms\b/i },
  { label: "QRS duration", unit: "ms", regex: /\bqrs(?:\s+duration)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*ms\b/i },
  { label: "QT interval", unit: "ms", regex: /\bqt(?:\s+interval)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*ms\b/i },
  { label: "QTc", unit: "ms", regex: /\bqtc\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*ms\b/i },
  { label: "Axis", unit: "deg", regex: /\baxis\s*[:=-]?\s*(-?\d+(?:\.\d+)?)\s*(?:deg|degrees?)\b/i },
];

const morphologyKeywords = [
  "regular rhythm",
  "irregular rhythm",
  "p wave visible",
  "p waves visible",
  "p wave absent",
  "p waves absent",
  "narrow qrs",
  "wide qrs",
  "t-wave inversion",
  "t wave inversion",
  "st elevation",
  "st depression",
  "poor r-wave progression",
  "poor r wave progression",
  "baseline wander",
  "artifact present",
  "artifact",
];

const normalizeLeadToken = (token) => String(token || "").toUpperCase();

const extractLeadMentions = (rawText) => {
  const matches = [];
  let match;

  while ((match = leadPattern.exec(rawText)) !== null) {
    matches.push(match[0].replace(/\s+/g, " ").trim());
  }

  return [...new Set(matches)];
};

const buildPhenomena = (rawText) => {
  const normalizedText = String(rawText || "").trim();
  const findings = [];

  metricPatterns.forEach((metric) => {
    const match = normalizedText.match(metric.regex);

    if (match?.[1]) {
      findings.push(`${metric.label}: ${match[1]} ${metric.unit}`);
    }
  });

  morphologyKeywords.forEach((keyword) => {
    if (normalizedText.toLowerCase().includes(keyword)) {
      findings.push(keyword.replace(/\b\w/g, (char) => char.toUpperCase()));
    }
  });

  extractLeadMentions(normalizedText).forEach((leadText) => {
    findings.push(`Lead mention observed: ${leadText}`);
  });

  const numericMatches =
    normalizedText.match(/\b\d+(?:\.\d+)?\s*(?:mm|mv|ms|bpm|hz)\b/gi) || [];

  numericMatches.slice(0, 6).forEach((value) => {
    findings.push(`Measured value found: ${value}`);
  });

  return [...new Set(findings)];
};

const countLeads = (rawText) => {
  const leadTokens = new Set();
  const matches = String(rawText || "").match(/\b(iii|ii|i|avr|avl|avf|v1|v2|v3|v4|v5|v6)\b/gi) || [];

  matches.forEach((token) => {
    leadTokens.add(normalizeLeadToken(token));
  });

  return leadTokens.size;
};

const PhenomedECG = (props) => {
  const [sourceInput, setSourceInput] = React.useState("");
  const [acquisitionNote, setAcquisitionNote] = React.useState(
    "12-lead ECG tracing described phenomenally only."
  );

  const phenomena = React.useMemo(() => buildPhenomena(sourceInput), [sourceInput]);
  const leadCount = React.useMemo(() => countLeads(sourceInput), [sourceInput]);
  const measurementCount = phenomena.length;

  const handleExtract = () => {
    if (!sourceInput.trim()) {
      props.serverReply?.(
        "Add ECG measurements or waveform observations first, then PhenoMed ECG can extract the observable phenomena."
      );
      return;
    }

    props.serverReply?.(
      "PhenoMed ECG extracted observable ECG phenomena only. No diagnosis or interpretation has been added."
    );
  };

  return (
    <article id="phenomed_ecg_page" className="fc">
      <section id="phenomed_ecg_hero" className="fc">
        <p className="phenomed_ecg_eyebrow">Phenomenal Extraction</p>
        <h1>PhenoMed ECG</h1>
        <p className="phenomed_ecg_summary">
          Read an ECG through observable phenomena only: rhythm features,
          intervals, amplitudes, axis, lead-wise changes, and graph numbers,
          without jumping to diagnosis.
        </p>
      </section>

      <section id="phenomed_ecg_grid" className="fr">
        <section id="phenomed_ecg_workspace" className="fc">
          <div className="phenomed_ecg_card fc">
            <div className="phenomed_ecg_cardHeader fr">
              <div>
                <p className="phenomed_ecg_cardEyebrow">ECG Intake</p>
                <h2>Observed Trace Content</h2>
              </div>
              <button type="button" onClick={handleExtract}>
                Extract phenomena
              </button>
            </div>

            <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_source">
              Paste ECG numbers, lead notes, or waveform observations
            </label>
            <textarea
              id="phenomed_ecg_source"
              value={sourceInput}
              onChange={(event) => setSourceInput(event.target.value)}
              placeholder="Example: HR 88 bpm, PR 160 ms, QRS 96 ms, QTc 420 ms, regular rhythm, ST elevation in V2,V3, T-wave inversion in III, aVF."
            />

            <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_note">
              Acquisition note
            </label>
            <input
              id="phenomed_ecg_note"
              value={acquisitionNote}
              onChange={(event) => setAcquisitionNote(event.target.value)}
            />

            <div className="phenomed_ecg_metrics fr">
              <div className="phenomed_ecg_metric">
                <span>Phenomena</span>
                <strong>{measurementCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Lead mentions</span>
                <strong>{leadCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Mode</span>
                <strong>Non-diagnostic</strong>
              </div>
            </div>
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Phenomenal Rules</p>
            <h2>What This Sub-app Should Say</h2>

            <div className="phenomed_ecg_rules fc">
              <div className="phenomed_ecg_rule">
                <span>1</span>
                <div>
                  <h3>Stay at the level of appearance</h3>
                  <p>
                    Report what is seen or measured in the tracing: rate,
                    interval, segment, amplitude, regularity, polarity, and
                    lead distribution.
                  </p>
                </div>
              </div>
              <div className="phenomed_ecg_rule">
                <span>2</span>
                <div>
                  <h3>Do not jump to meaning</h3>
                  <p>
                    Avoid diagnosis labels. The output should remain a
                    structured list of ECG phenomena only.
                  </p>
                </div>
              </div>
              <div className="phenomed_ecg_rule">
                <span>3</span>
                <div>
                  <h3>Preserve measurement language</h3>
                  <p>
                    Keep numerical findings explicit so the tracing can later be
                    interpreted by a separate reasoning layer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside id="phenomed_ecg_inspector" className="fc">
          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Current Extraction</p>
            <h2>Observable ECG Phenomena</h2>
            {phenomena.length === 0 ? (
              <p className="phenomed_ecg_empty">
                No ECG phenomena extracted yet. Add trace observations first.
              </p>
            ) : (
              <ul className="phenomed_ecg_list">
                {phenomena.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Output Frame</p>
            <h2>Phenomenal Report Shape</h2>
            <ul className="phenomed_ecg_list">
              <li>{acquisitionNote}</li>
              <li>Intervals and rates remain numerical.</li>
              <li>Lead-wise observations remain descriptive.</li>
              <li>No disease name or diagnostic verdict is produced.</li>
            </ul>
          </div>

          <div className="phenomed_ecg_card phenomed_ecg_note fc">
            <p className="phenomed_ecg_cardEyebrow">Next Build Step</p>
            <h2>What We Can Add Next</h2>
            <p>
              Image upload, grid calibration, waveform point detection, lead
              segmentation, and an ECG phenomena sheet built from the graph
              itself.
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
};

export default PhenomedECG;

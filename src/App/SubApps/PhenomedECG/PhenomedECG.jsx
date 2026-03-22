import React from "react";
import { apiUrl } from "../../../config/api";
import "./phenomed-ecg.css";

const DEFAULT_ACQUISITION_NOTE =
  "12-lead ECG tracing described phenomenally only.";
const SUPPORTED_FILE_LABEL =
  "Accepted formats: JPG, PNG, WEBP, HEIC, HEIF, or PDF.";

const createEmptyAnalysis = (acquisitionNote = DEFAULT_ACQUISITION_NOTE) => ({
  sourceType: "text",
  summary: "",
  acquisitionNote,
  qualityAssessment: {
    readability: "unreadable",
    gridVisible: null,
    calibrationVisible: null,
    limitations: [],
  },
  measurements: [],
  waveformPoints: [],
  leadFindings: [],
  rhythmFeatures: [],
  trends: {
    increases: [],
    decreases: [],
    stableOrNeutral: [],
  },
  extractedText: [],
  nonDiagnosticNotice:
    "Observable ECG findings only. No disease name or diagnostic verdict is produced.",
});

const formatBooleanFlag = (value) => {
  if (value === true) {
    return "Visible";
  }

  if (value === false) {
    return "Not visible";
  }

  return "Unclear";
};

const formatMeasurement = (measurement, index) => {
  const label = measurement?.label || `Measurement ${index + 1}`;
  const value =
    measurement?.value === null || measurement?.value === undefined
      ? "Unclear"
      : measurement.value;
  const unit = measurement?.unit ? ` ${measurement.unit}` : "";
  const lead = measurement?.lead ? ` | ${measurement.lead}` : "";
  const qualifier = measurement?.qualifier ? ` | ${measurement.qualifier}` : "";

  return `${label}: ${value}${unit}${lead}${qualifier}`;
};

const formatWaveformPoint = (entry, index) => {
  const structure = entry?.structure || `Point ${index + 1}`;
  const observedState = entry?.observedState || "Observed";
  const leads =
    Array.isArray(entry?.leads) && entry.leads.length > 0
      ? ` | ${entry.leads.join(", ")}`
      : "";

  return `${structure}: ${observedState}${leads}`;
};

const formatLeadFinding = (entry, index) => {
  const lead = entry?.lead || `Lead ${index + 1}`;
  const phenomenon = entry?.phenomenon || "Observed change";
  const direction = entry?.direction ? ` | ${entry.direction}` : "";
  const magnitude = entry?.magnitude ? ` | ${entry.magnitude}` : "";

  return `${lead}: ${phenomenon}${direction}${magnitude}`;
};

const formatRhythmFeature = (entry, index) => {
  const feature = entry?.feature || `Rhythm feature ${index + 1}`;
  const observedState = entry?.observedState || "Observed";
  return `${feature}: ${observedState}`;
};

const PhenomedECG = (props) => {
  const [sourceInput, setSourceInput] = React.useState("");
  const [acquisitionNote, setAcquisitionNote] = React.useState(
    DEFAULT_ACQUISITION_NOTE,
  );
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState("");
  const [analysisSourceType, setAnalysisSourceType] = React.useState("text");
  const [analysis, setAnalysis] = React.useState(
    createEmptyAnalysis(DEFAULT_ACQUISITION_NOTE),
  );

  const measurementCount = analysis.measurements.length;
  const leadCount = new Set(
    analysis.leadFindings
      .map((entry) => String(entry?.lead || "").trim())
      .filter(Boolean),
  ).size;
  const waveformPointCount = analysis.waveformPoints.length;
  const trendCount =
    analysis.trends.increases.length +
    analysis.trends.decreases.length +
    analysis.trends.stableOrNeutral.length;

  const fileLabel = selectedFile
    ? `${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
    : "No ECG file selected yet.";

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
  };

  const handleExtract = async () => {
    if (!selectedFile && !sourceInput.trim()) {
      props.serverReply?.(
        "Add an ECG photo or PDF, or write waveform observations first.",
      );
      setAnalysisError(
        "PhenoMed ECG needs either an uploaded ECG source or typed ECG observations.",
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    props.serverReply?.("Analyzing ECG phenomena...");

    try {
      const formData = new FormData();
      formData.append("acquisitionNote", acquisitionNote);
      formData.append("observedText", sourceInput);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetch(apiUrl("/api/ecg/analyze"), {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to analyze the ECG source right now.",
        );
      }

      const nextAnalysis = payload?.analysis || createEmptyAnalysis(acquisitionNote);

      setAnalysis(nextAnalysis);
      setAnalysisSourceType(payload?.sourceType || nextAnalysis?.sourceType || "text");
      props.serverReply?.(
        "ECG analysis ready. Observable findings were extracted without diagnosis.",
      );
    } catch (error) {
      const message =
        error?.message || "Unable to analyze the ECG source right now.";

      setAnalysisError(message);
      props.serverReply?.("ECG analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <article id="phenomed_ecg_page" className="fc">
      <section id="phenomed_ecg_hero" className="fc">
        <p className="phenomed_ecg_eyebrow">Phenomenal Extraction</p>
        <h1>PhenoMed ECG</h1>
        <p className="phenomed_ecg_summary">
          Read an ECG from photo, PDF, or typed observations and extract only
          what appears in the tracing: graph behavior, points, intervals,
          amplitudes, lead-wise increase/decrease, and source limitations.
        </p>
      </section>

      <section id="phenomed_ecg_grid" className="fr">
        <section id="phenomed_ecg_workspace" className="fc">
          <div className="phenomed_ecg_card fc">
            <div className="phenomed_ecg_cardHeader fr">
              <div>
                <p className="phenomed_ecg_cardEyebrow">ECG Intake</p>
                <h2>Upload Or Describe The Trace</h2>
              </div>
              <button type="button" onClick={handleExtract} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Extract phenomena"}
              </button>
            </div>

            <div className="phenomed_ecg_uploadBlock fc">
              <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_file">
                ECG photo or PDF
              </label>
              <label className="phenomed_ecg_uploadField" htmlFor="phenomed_ecg_file">
                <span className="phenomed_ecg_uploadTitle">
                  Choose ECG source
                </span>
                <span className="phenomed_ecg_uploadName">{fileLabel}</span>
                <span className="phenomed_ecg_uploadHint">
                  {SUPPORTED_FILE_LABEL}
                </span>
              </label>
              <input
                id="phenomed_ecg_file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>

            <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_source">
              Optional ECG notes, numbers, or visible observations
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

            {analysisError ? (
              <p className="phenomed_ecg_error">{analysisError}</p>
            ) : null}

            <div className="phenomed_ecg_metrics fr">
              <div className="phenomed_ecg_metric">
                <span>Measurements</span>
                <strong>{measurementCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Lead findings</span>
                <strong>{leadCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Waveform points</span>
                <strong>{waveformPointCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Trend notes</span>
                <strong>{trendCount}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Source type</span>
                <strong>{analysisSourceType}</strong>
              </div>
              <div className="phenomed_ecg_metric">
                <span>Mode</span>
                <strong>Non-diagnostic</strong>
              </div>
            </div>
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Observable Summary</p>
            <h2>Phenomenal ECG Output</h2>
            {analysis.summary ? (
              <p className="phenomed_ecg_body">{analysis.summary}</p>
            ) : (
              <p className="phenomed_ecg_empty">
                Run an ECG analysis to get a source-grounded phenomenal summary.
              </p>
            )}

            <div className="phenomed_ecg_qualityGrid">
              <div className="phenomed_ecg_qualityItem">
                <span>Readability</span>
                <strong>{analysis.qualityAssessment.readability}</strong>
              </div>
              <div className="phenomed_ecg_qualityItem">
                <span>Grid</span>
                <strong>
                  {formatBooleanFlag(analysis.qualityAssessment.gridVisible)}
                </strong>
              </div>
              <div className="phenomed_ecg_qualityItem">
                <span>Calibration</span>
                <strong>
                  {formatBooleanFlag(
                    analysis.qualityAssessment.calibrationVisible,
                  )}
                </strong>
              </div>
            </div>

            <ul className="phenomed_ecg_list">
              <li>{analysis.acquisitionNote || acquisitionNote}</li>
              <li>
                {analysis.nonDiagnosticNotice ||
                  "Observable ECG findings only."}
              </li>
            </ul>
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
                    Avoid diagnosis labels. The output remains a structured list
                    of ECG phenomena only.
                  </p>
                </div>
              </div>
              <div className="phenomed_ecg_rule">
                <span>3</span>
                <div>
                  <h3>Preserve uncertainty</h3>
                  <p>
                    If the source is faint, cropped, tilted, or noisy, keep the
                    limitation explicit instead of guessing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside id="phenomed_ecg_inspector" className="fc">
          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Measurements</p>
            <h2>Intervals, Rates, And Values</h2>
            {analysis.measurements.length === 0 ? (
              <p className="phenomed_ecg_empty">
                No numerical measurements extracted yet.
              </p>
            ) : (
              <ul className="phenomed_ecg_list">
                {analysis.measurements.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    <strong>{formatMeasurement(item, index)}</strong>
                    {item.evidence ? (
                      <span className="phenomed_ecg_listEvidence">
                        {item.evidence}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Waveform Points</p>
            <h2>P, QRS, ST, And T Features</h2>
            {analysis.waveformPoints.length === 0 ? (
              <p className="phenomed_ecg_empty">
                No waveform point observations extracted yet.
              </p>
            ) : (
              <ul className="phenomed_ecg_list">
                {analysis.waveformPoints.map((item, index) => (
                  <li key={`${item.structure}-${index}`}>
                    <strong>{formatWaveformPoint(item, index)}</strong>
                    {item.evidence ? (
                      <span className="phenomed_ecg_listEvidence">
                        {item.evidence}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Lead Changes</p>
            <h2>Increase, Decrease, Inversion, Spread</h2>
            {analysis.leadFindings.length === 0 ? (
              <p className="phenomed_ecg_empty">
                No lead-specific changes extracted yet.
              </p>
            ) : (
              <ul className="phenomed_ecg_list">
                {analysis.leadFindings.map((item, index) => (
                  <li key={`${item.lead}-${index}`}>
                    <strong>{formatLeadFinding(item, index)}</strong>
                    {item.evidence ? (
                      <span className="phenomed_ecg_listEvidence">
                        {item.evidence}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Rhythm And Trends</p>
            <h2>Regularity, Direction, Stability</h2>

            {analysis.rhythmFeatures.length === 0 ? (
              <p className="phenomed_ecg_empty">
                No rhythm features extracted yet.
              </p>
            ) : (
              <ul className="phenomed_ecg_list">
                {analysis.rhythmFeatures.map((item, index) => (
                  <li key={`${item.feature}-${index}`}>
                    <strong>{formatRhythmFeature(item, index)}</strong>
                    {item.evidence ? (
                      <span className="phenomed_ecg_listEvidence">
                        {item.evidence}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="phenomed_ecg_trendColumns">
              <div className="phenomed_ecg_trendColumn">
                <p className="phenomed_ecg_trendTitle">Increases</p>
                <ul className="phenomed_ecg_list">
                  {analysis.trends.increases.length === 0 ? (
                    <li>None extracted</li>
                  ) : (
                    analysis.trends.increases.map((item, index) => (
                      <li key={`increase-${index}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
              <div className="phenomed_ecg_trendColumn">
                <p className="phenomed_ecg_trendTitle">Decreases</p>
                <ul className="phenomed_ecg_list">
                  {analysis.trends.decreases.length === 0 ? (
                    <li>None extracted</li>
                  ) : (
                    analysis.trends.decreases.map((item, index) => (
                      <li key={`decrease-${index}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
              <div className="phenomed_ecg_trendColumn">
                <p className="phenomed_ecg_trendTitle">Stable / Neutral</p>
                <ul className="phenomed_ecg_list">
                  {analysis.trends.stableOrNeutral.length === 0 ? (
                    <li>None extracted</li>
                  ) : (
                    analysis.trends.stableOrNeutral.map((item, index) => (
                      <li key={`stable-${index}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="phenomed_ecg_card phenomed_ecg_note fc">
            <p className="phenomed_ecg_cardEyebrow">Source Limits</p>
            <h2>Readability And Extracted Text</h2>
            <ul className="phenomed_ecg_list">
              {analysis.qualityAssessment.limitations.length === 0 ? (
                <li>No explicit source limitations reported.</li>
              ) : (
                analysis.qualityAssessment.limitations.map((item, index) => (
                  <li key={`limitation-${index}`}>{item}</li>
                ))
              )}
            </ul>

            <div className="phenomed_ecg_divider"></div>

            <p className="phenomed_ecg_cardEyebrow">Detected Text</p>
            <ul className="phenomed_ecg_list">
              {analysis.extractedText.length === 0 ? (
                <li>No extracted text returned from the source.</li>
              ) : (
                analysis.extractedText.map((item, index) => (
                  <li key={`text-${index}`}>{item}</li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </section>
    </article>
  );
};

export default PhenomedECG;

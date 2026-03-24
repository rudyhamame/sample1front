import React from "react";
import { apiUrl } from "../../../config/api";
import "./phenomed-ecg.css";

const DEFAULT_ACQUISITION_NOTE =
  "12-lead ECG tracing described phenomenally only.";
const SUPPORTED_FILE_LABEL =
  "Accepted file: JSON digital traces under digitalTraces, leadTraces, traces, or leads.";
const ECG_JOB_STORAGE_KEY = "phenomed_ecg_active_job";
const ECG_LEAD_OPTIONS = ["", "I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

const normalizeJobMessage = (value, fallback) => {
  const nextMessage = String(value || "").trim();

  if (!nextMessage) {
    return fallback;
  }

  if (
    nextMessage.startsWith("{") ||
    nextMessage.startsWith("[") ||
    nextMessage.includes('"analysis"') ||
    nextMessage.includes('"acquisitionNote"')
  ) {
    return fallback;
  }

  return nextMessage;
};

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
  traceSamples: [],
  leadTraces: {},
  leadFindings: [],
  rhythmFeatures: [],
  trends: {
    increases: [],
    decreases: [],
    stableOrNeutral: [],
  },
  extractedText: [],
  displayLead: "",
  writtenDisplayLeadLabel: "",
  writtenLeadLabelByRecoveredLead: {},
  displayLeadRowIndex: null,
  detectedLeads: [],
  detectedLeadLabels: [],
  detectedLeadLabelPoints: [],
  ocrDetectedLeadLabelPoints: [],
  rowAssignedLeadLabels: [],
  nonDiagnosticNotice:
    "Observable ECG findings only. No disease name or diagnostic verdict is produced.",
});

const normalizeAnalysisPayload = (analysisLike, acquisitionNote = DEFAULT_ACQUISITION_NOTE) => {
  const fallback = createEmptyAnalysis(acquisitionNote);
  const next = analysisLike && typeof analysisLike === "object" ? analysisLike : {};

  return {
    ...fallback,
    ...next,
    qualityAssessment: {
      ...fallback.qualityAssessment,
      ...(next.qualityAssessment && typeof next.qualityAssessment === "object"
        ? next.qualityAssessment
        : {}),
      limitations: Array.isArray(next?.qualityAssessment?.limitations)
        ? next.qualityAssessment.limitations
        : fallback.qualityAssessment.limitations,
    },
    measurements: Array.isArray(next.measurements) ? next.measurements : fallback.measurements,
    waveformPoints: Array.isArray(next.waveformPoints) ? next.waveformPoints : fallback.waveformPoints,
    traceSamples: Array.isArray(next.traceSamples) ? next.traceSamples : fallback.traceSamples,
    leadTraces:
      next.leadTraces && typeof next.leadTraces === "object" && !Array.isArray(next.leadTraces)
        ? next.leadTraces
        : fallback.leadTraces,
    leadFindings: Array.isArray(next.leadFindings) ? next.leadFindings : fallback.leadFindings,
    rhythmFeatures: Array.isArray(next.rhythmFeatures) ? next.rhythmFeatures : fallback.rhythmFeatures,
    trends: {
      ...fallback.trends,
      ...(next.trends && typeof next.trends === "object" ? next.trends : {}),
      increases: Array.isArray(next?.trends?.increases) ? next.trends.increases : fallback.trends.increases,
      decreases: Array.isArray(next?.trends?.decreases) ? next.trends.decreases : fallback.trends.decreases,
      stableOrNeutral: Array.isArray(next?.trends?.stableOrNeutral)
        ? next.trends.stableOrNeutral
        : fallback.trends.stableOrNeutral,
    },
    extractedText: Array.isArray(next.extractedText) ? next.extractedText : fallback.extractedText,
    displayLeadRowIndex:
      next.displayLeadRowIndex === null || next.displayLeadRowIndex === undefined
        ? fallback.displayLeadRowIndex
        : Number(next.displayLeadRowIndex),
    writtenDisplayLeadLabel:
      typeof next.writtenDisplayLeadLabel === "string"
        ? next.writtenDisplayLeadLabel
        : fallback.writtenDisplayLeadLabel,
    writtenLeadLabelByRecoveredLead:
      next.writtenLeadLabelByRecoveredLead &&
      typeof next.writtenLeadLabelByRecoveredLead === "object" &&
      !Array.isArray(next.writtenLeadLabelByRecoveredLead)
        ? next.writtenLeadLabelByRecoveredLead
        : fallback.writtenLeadLabelByRecoveredLead,
    detectedLeads: Array.isArray(next.detectedLeads) ? next.detectedLeads : fallback.detectedLeads,
    detectedLeadLabels: Array.isArray(next.detectedLeadLabels)
      ? next.detectedLeadLabels
      : fallback.detectedLeadLabels,
    detectedLeadLabelPoints: Array.isArray(next.detectedLeadLabelPoints)
      ? next.detectedLeadLabelPoints
      : fallback.detectedLeadLabelPoints,
    ocrDetectedLeadLabelPoints: Array.isArray(next.ocrDetectedLeadLabelPoints)
      ? next.ocrDetectedLeadLabelPoints
      : fallback.ocrDetectedLeadLabelPoints,
    rowAssignedLeadLabels: Array.isArray(next.rowAssignedLeadLabels)
      ? next.rowAssignedLeadLabels
      : fallback.rowAssignedLeadLabels,
  };
};

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

const clampTraceValue = (value) => Math.max(0, Math.min(1, value));

const formatRelativeSeconds = (timestampMs, nowMs = Date.now()) => {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "just now";
  }

  const diffSeconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (diffSeconds < 5) {
    return "just now";
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  return `${Math.floor(diffMinutes / 60)}h ago`;
};

const formatElapsedDuration = (timestampMs, nowMs = Date.now()) => {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "0s";
  }

  const diffSeconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const getLiveJobStage = (status, progress) => {
  if (status === "completed") {
    return ["Completed", "Phenomenal output is ready to inspect."];
  }

  if (status === "failed") {
    return ["Failed", "The extraction stopped before completion."];
  }

  if (status === "queued" || status === "submitting") {
    return ["Queued", "Waiting for the ECG worker to begin processing."];
  }

  if (progress < 0.35) {
    return ["Preparing source", "Checking the file and setting up extraction."];
  }

  if (progress < 0.75) {
    return ["Digitizing waveform", "Sampling the trace and reconstructing the graph."];
  }

  return ["Structuring findings", "Packaging lead findings and measurement summaries."];
};

const logEcgDebug = (label, payload) => {
  console.log(`[PhenomedECG] ${label}`, payload);
};

const buildTracePath = (
  traceSamples,
  width,
  height,
  padding,
  verticalScale = 1,
) => {
  if (!Array.isArray(traceSamples) || traceSamples.length < 2) {
    return "";
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return traceSamples
    .map((value, index) => {
      const x =
        padding +
        (index / Math.max(traceSamples.length - 1, 1)) * innerWidth;
      const centeredValue =
        0.5 + (Number(value || 0) - 0.5) * Number(verticalScale || 1);
      const y =
        padding + (1 - clampTraceValue(centeredValue)) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const getLeadTraceEntries = (leadTraces) =>
  Object.entries(leadTraces && typeof leadTraces === "object" ? leadTraces : {}).filter(
    ([, samples]) => Array.isArray(samples) && samples.length > 1,
  );

const PhenomedECG = (props) => {
  const [sourceInput, setSourceInput] = React.useState("");
  const [acquisitionNote, setAcquisitionNote] = React.useState(
    DEFAULT_ACQUISITION_NOTE,
  );
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState("");
  const [analysisJobId, setAnalysisJobId] = React.useState("");
  const [analysisJobStatus, setAnalysisJobStatus] = React.useState("idle");
  const [analysisJobProgress, setAnalysisJobProgress] = React.useState(0);
  const [displayJobProgress, setDisplayJobProgress] = React.useState(0);
  const [analysisJobMessage, setAnalysisJobMessage] = React.useState("");
  const [analysisJobStartedAt, setAnalysisJobStartedAt] = React.useState(0);
  const [analysisJobLastSeenAt, setAnalysisJobLastSeenAt] = React.useState(0);
  const [analysisSourceType, setAnalysisSourceType] = React.useState("text");
  const [analysisMethod, setAnalysisMethod] = React.useState("pending");
  const [analysisPreview, setAnalysisPreview] = React.useState({
    imageUrl: "",
    rotationApplied: "0",
  });
  const [analysis, setAnalysis] = React.useState(
    createEmptyAnalysis(DEFAULT_ACQUISITION_NOTE),
  );
  const [traceScaleX, setTraceScaleX] = React.useState(1.6);
  const [traceScaleY, setTraceScaleY] = React.useState(1.3);
  const [selectedLead, setSelectedLead] = React.useState("");
  const [manualLeadLabels, setManualLeadLabels] = React.useState({});
  const [isRulesOpen, setIsRulesOpen] = React.useState(false);
  const [isTraceDragging, setIsTraceDragging] = React.useState(false);
  const [isCancellingJob, setIsCancellingJob] = React.useState(false);
  const [liveNowMs, setLiveNowMs] = React.useState(Date.now());
  const pollTimeoutRef = React.useRef(null);
  const progressAnimationRef = React.useRef(null);
  const traceFrameRef = React.useRef(null);
  const traceDragRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const persistActiveJob = React.useCallback((nextJob) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!nextJob?.jobId) {
      window.localStorage.removeItem(ECG_JOB_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      ECG_JOB_STORAGE_KEY,
      JSON.stringify({
        jobId: String(nextJob.jobId || ""),
        status: String(nextJob.status || "queued"),
        progress: Number(nextJob.progress || 0),
        message: String(nextJob.message || ""),
        sourceType: String(nextJob.sourceType || "image"),
        savedAt: Number(nextJob.savedAt || Date.now()),
      }),
    );
  }, []);

  const clearPersistedJob = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(ECG_JOB_STORAGE_KEY);
  }, []);

  React.useEffect(() => () => {
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (progressAnimationRef.current) {
      window.clearInterval(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!["submitting", "queued", "running"].includes(analysisJobStatus)) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setLiveNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [analysisJobStatus]);

  React.useEffect(() => {
    if (progressAnimationRef.current) {
      window.clearInterval(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }

    if (analysisJobStatus === "idle") {
      setDisplayJobProgress(0);
      return undefined;
    }

    if (analysisJobStatus === "failed") {
      return undefined;
    }

    if (analysisJobStatus === "completed") {
      setDisplayJobProgress(1);
      return undefined;
    }

    progressAnimationRef.current = window.setInterval(() => {
      setDisplayJobProgress((currentValue) => {
        const safeActualProgress = Math.max(
          0,
          Math.min(0.94, Number(analysisJobProgress || 0)),
        );
        const timeDrivenTarget =
          analysisJobStatus === "queued"
            ? Math.min(0.42, currentValue + 0.016)
            : Math.min(0.9, currentValue + 0.01);
        const baselineTarget = analysisJobStatus === "queued" ? 0.18 : 0.3;
        const pacedTarget = Math.max(
          safeActualProgress,
          baselineTarget,
          timeDrivenTarget,
        );
        const maxVisibleProgress = analysisJobStatus === "queued" ? 0.42 : 0.94;
        const nextTarget = Math.min(maxVisibleProgress, pacedTarget);

        if (currentValue >= nextTarget) {
          return currentValue;
        }

        const remaining = nextTarget - currentValue;
        const step = remaining > 0.2 ? 0.026 : remaining > 0.08 ? 0.014 : 0.007;
        return Math.min(nextTarget, Number((currentValue + step).toFixed(4)));
      });
    }, 180);

    return () => {
      if (progressAnimationRef.current) {
        window.clearInterval(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
    };
  }, [analysisJobProgress, analysisJobStatus]);

  React.useEffect(() => {
    if (typeof window === "undefined" || analysisJobId) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ECG_JOB_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const savedJob = JSON.parse(raw);
      const savedJobId = String(savedJob?.jobId || "").trim();
      const savedStatus = String(savedJob?.status || "queued");

      if (!savedJobId || ["completed", "failed", "idle"].includes(savedStatus)) {
        clearPersistedJob();
        return;
      }

      setAnalysisJobId(savedJobId);
      setAnalysisJobStatus(savedStatus);
      setAnalysisJobProgress(Number(savedJob?.progress || 0));
      setDisplayJobProgress(Number(savedJob?.progress || 0));
      setAnalysisJobStartedAt(Number(savedJob?.savedAt || Date.now()));
      setAnalysisJobLastSeenAt(Date.now());
      setAnalysisJobMessage(
        normalizeJobMessage(
          savedJob?.message,
          "Resuming ECG analysis after refresh...",
        ),
      );
      setAnalysisSourceType(String(savedJob?.sourceType || "image"));
      setIsAnalyzing(true);
      props.serverReply?.("Resuming ECG analysis after refresh...");
    } catch {
      clearPersistedJob();
    }
  }, [analysisJobId, clearPersistedJob, props.serverReply]);

  React.useEffect(() => {
    if (analysisJobId && ["queued", "running", "submitting"].includes(analysisJobStatus)) {
      persistActiveJob({
        jobId: analysisJobId,
        status: analysisJobStatus,
        progress: analysisJobProgress,
        message: normalizeJobMessage(
          analysisJobMessage,
          "ECG analysis status is updating.",
        ),
        savedAt: analysisJobStartedAt || Date.now(),
        sourceType: analysisSourceType,
      });
      return;
    }

    if (["completed", "failed", "idle"].includes(analysisJobStatus)) {
      clearPersistedJob();
    }
  }, [
    analysisJobId,
    analysisJobMessage,
    analysisJobProgress,
    analysisJobStatus,
    analysisSourceType,
    clearPersistedJob,
    persistActiveJob,
  ]);

  const applyAnalysisPayload = React.useCallback((payload) => {
    logEcgDebug("applyAnalysisPayload", payload);
    const nextAnalysis = normalizeAnalysisPayload(payload?.analysis, acquisitionNote);
    const previewMimeType =
      payload?.analysis?.previewImageMimeType || "image/png";
    const previewBase64 = payload?.analysis?.previewImageBase64 || "";
    const leadNames = Array.isArray(nextAnalysis?.detectedLeads) && nextAnalysis.detectedLeads.length > 0
      ? nextAnalysis.detectedLeads
      : Object.keys(nextAnalysis?.leadTraces || {});

    setAnalysis(nextAnalysis);
    setAnalysisSourceType(payload?.sourceType || nextAnalysis?.sourceType || "text");
    setAnalysisMethod(payload?.method || "unknown");
    setAnalysisPreview({
      imageUrl: previewBase64
        ? `data:${previewMimeType};base64,${previewBase64}`
        : "",
      rotationApplied: payload?.analysis?.rotationApplied || "0",
    });
    setSelectedLead(nextAnalysis?.displayLead || leadNames[0] || "");
  }, [acquisitionNote]);

  React.useEffect(() => {
    if (!analysisJobId || !["queued", "running"].includes(analysisJobStatus)) {
      return undefined;
    }

    let cancelled = false;

    const pollJob = async () => {
      try {
        const response = await fetch(apiUrl(`/api/ecg/jobs/${analysisJobId}`), {
          method: "GET",
        });
        const payload = await response.json().catch(() => ({}));
        logEcgDebug("job poll payload", payload);

        if (!response.ok) {
          throw new Error(
            payload?.message || payload?.error || "Unable to load ECG job status.",
          );
        }

        if (cancelled) {
          return;
        }

        const nextStatus = String(payload?.status || "running");
        setAnalysisJobStatus(nextStatus);
        setAnalysisJobProgress(Number(payload?.progress || 0));
        setAnalysisJobLastSeenAt(Date.now());
        setAnalysisJobMessage(
          normalizeJobMessage(
            payload?.message,
            "ECG analysis status is updating.",
          ),
        );

        if (payload?.analysis) {
          applyAnalysisPayload(payload);
        }

        if (nextStatus === "completed") {
          applyAnalysisPayload(payload);
          setIsAnalyzing(false);
          clearPersistedJob();
          props.serverReply?.("ECG analysis ready.");
          return;
        }

        if (nextStatus === "failed") {
          const message = payload?.error || payload?.message || "ECG analysis failed.";
          setAnalysisError(message);
          setAnalysisMethod("failed");
          setAnalysisPreview({
            imageUrl: "",
            rotationApplied: "0",
          });
          setIsAnalyzing(false);
          clearPersistedJob();
          props.serverReply?.(`ECG analysis failed: ${message}`);
          return;
        }

        pollTimeoutRef.current = window.setTimeout(pollJob, 5000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error?.message || "Unable to load ECG analysis progress right now.";
        setAnalysisError(message);
        setAnalysisJobStatus("failed");
        setIsAnalyzing(false);
        clearPersistedJob();
        props.serverReply?.(`ECG analysis failed: ${message}`);
      }
    };

    pollTimeoutRef.current = window.setTimeout(pollJob, 2500);

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [
    analysisJobId,
    analysisJobStatus,
    applyAnalysisPayload,
    clearPersistedJob,
    props.serverReply,
  ]);

  const measurementCount = analysis.measurements.length;
  const leadTraceEntries = getLeadTraceEntries(analysis.leadTraces);
  const leadTraceNames = leadTraceEntries.map(([leadName]) => leadName);
  const availableLeadNames =
    leadTraceNames.length > 0
      ? leadTraceNames
      : Array.isArray(analysis.detectedLeads) && analysis.detectedLeads.length > 0
        ? analysis.detectedLeads
        : Object.keys(analysis.leadTraces || {});
  React.useEffect(() => {
    if (!selectedLead && availableLeadNames.length > 0) {
      setSelectedLead(availableLeadNames[0]);
      return;
    }

    if (
      selectedLead &&
      availableLeadNames.length > 0 &&
      !availableLeadNames.includes(selectedLead)
    ) {
      setSelectedLead(availableLeadNames[0]);
    }
  }, [availableLeadNames, selectedLead]);
  const leadCount = availableLeadNames.length;
  const waveformPointCount = analysis.waveformPoints.length;
  const fallbackLeadName = leadTraceNames[0] || "";
  const resolvedLeadName =
    selectedLead && Array.isArray(analysis?.leadTraces?.[selectedLead]) && analysis.leadTraces[selectedLead].length > 1
      ? selectedLead
      : fallbackLeadName;
  const manualResolvedLeadLabel =
    resolvedLeadName && typeof manualLeadLabels?.[resolvedLeadName] === "string"
      ? manualLeadLabels[resolvedLeadName]
      : "";
  const resolvedWrittenLeadLabel =
    resolvedLeadName && analysis?.writtenLeadLabelByRecoveredLead
      ? analysis.writtenLeadLabelByRecoveredLead[resolvedLeadName] || ""
      : "";
  const resolvedLeadDisplayLabel = manualResolvedLeadLabel || resolvedWrittenLeadLabel || resolvedLeadName;
  const displayedTraceSamples = resolvedLeadName
    ? analysis.leadTraces[resolvedLeadName]
    : analysis.traceSamples;
  const traceSampleCount = Array.isArray(displayedTraceSamples)
    ? displayedTraceSamples.length
    : 0;
  const fallbackTraceSampleCount = Array.isArray(analysis.traceSamples)
    ? analysis.traceSamples.length
    : 0;
  const traceDebugText = `traceSamples: ${fallbackTraceSampleCount} | leadTraces: ${
    leadTraceNames.length > 0 ? leadTraceNames.join(", ") : "none"
  }`;
  const trendCount =
    analysis.trends.increases.length +
    analysis.trends.decreases.length +
    analysis.trends.stableOrNeutral.length;
  const [liveStageLabel, liveStageDetail] = getLiveJobStage(
    analysisJobStatus,
    displayJobProgress,
  );
  const isJobActive =
    isAnalyzing || ["submitting", "queued", "running"].includes(analysisJobStatus);
  const visibleJobPercent = Math.max(1, Math.round(displayJobProgress * 100));
  const liveElapsedText = formatElapsedDuration(analysisJobStartedAt, liveNowMs);
  const liveUpdatedText = formatRelativeSeconds(analysisJobLastSeenAt, liveNowMs);

  const fileLabel = selectedFile
    ? `${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
    : "No digital ECG JSON file selected yet.";
  const isJsonUpload =
    selectedFile?.type === "application/json" ||
    selectedFile?.type === "text/json" ||
    /\.json$/i.test(selectedFile?.name || "");
  const traceSvgWidth = 1120;
  const traceSvgHeight = 260;
  const traceSvgPadding = 18;
  const traceRenderedWidth = Math.round(traceSvgWidth * traceScaleX);
  const leadOverviewWidth = 260;
  const leadOverviewHeight = 92;
  const leadOverviewPadding = 10;
  const tracePath = buildTracePath(
    displayedTraceSamples,
    traceSvgWidth,
    traceSvgHeight,
    traceSvgPadding,
    traceScaleY,
  );
  const canDragTrace = traceScaleX > 1.2 || traceScaleY > 1.05;
  const hasTraceSamples = Array.isArray(displayedTraceSamples) && displayedTraceSamples.length > 1;
  const noTraceReason =
    analysisJobStatus === "queued" || analysisJobStatus === "running" || analysisJobStatus === "submitting"
      ? "The graph will appear as soon as the digitized trace samples arrive."
      : analysisSourceType === "text"
        ? "Text-only ECG descriptions do not include drawable waveform samples."
        : "This result did not include usable leadTraces or traceSamples to draw.";

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (nextFile && !(/\.json$/i.test(nextFile.name || "") || nextFile.type === "application/json" || nextFile.type === "text/json")) {
      setSelectedFile(null);
      setAnalysisError("Only JSON files with device digital ECG traces are supported.");
      event.target.value = "";
      return;
    }
    setSelectedFile(nextFile);
    setAnalysisError("");
  };

  const handleTraceDragStart = (event) => {
    if (event.button !== 0 || !traceFrameRef.current || !canDragTrace) {
      return;
    }

    traceDragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: traceFrameRef.current.scrollLeft,
      scrollTop: traceFrameRef.current.scrollTop,
    };
    setIsTraceDragging(true);
  };

  const handleTraceDragMove = (event) => {
    if (!traceDragRef.current.active || !traceFrameRef.current) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - traceDragRef.current.startX;
    const deltaY = event.clientY - traceDragRef.current.startY;
    traceFrameRef.current.scrollLeft = traceDragRef.current.scrollLeft - deltaX;
    traceFrameRef.current.scrollTop = traceDragRef.current.scrollTop - deltaY;
  };

  const handleTraceDragEnd = () => {
    traceDragRef.current.active = false;
    setIsTraceDragging(false);
  };

  React.useEffect(() => {
    if (!canDragTrace) {
      traceDragRef.current.active = false;
      setIsTraceDragging(false);
    }
  }, [canDragTrace]);

  React.useEffect(() => {
    if (leadTraceNames.length === 0) {
      setManualLeadLabels({});
      return;
    }

    setManualLeadLabels((currentValue) => {
      const nextValue = Object.fromEntries(
        Object.entries(currentValue).filter(([leadKey]) => leadTraceNames.includes(leadKey)),
      );
      const sameLength = Object.keys(nextValue).length === Object.keys(currentValue).length;
      return sameLength ? currentValue : nextValue;
    });
  }, [leadTraceNames]);

  const handleExtract = async () => {
    if (!selectedFile) {
      props.serverReply?.(
        "Upload a digital ECG JSON file first.",
      );
      setAnalysisError(
        "PhenoMed ECG needs a JSON file that contains device digital traces.",
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysisJobId("");
    setAnalysisJobStatus("submitting");
    setAnalysisJobProgress(0);
    setDisplayJobProgress(0);
    setAnalysisJobMessage("Submitting ECG analysis job...");
    setAnalysisJobStartedAt(Date.now());
    setAnalysisJobLastSeenAt(Date.now());
    clearPersistedJob();
    props.serverReply?.("Submitting ECG analysis job...");

    try {
      if (!isJsonUpload) {
        throw new Error("Only JSON files with device digital ECG traces are supported.");
      }
      const requestSourceType = "device";
      const fileText = await selectedFile.text();
      let parsedFilePayload = {};
      try {
        parsedFilePayload = JSON.parse(fileText);
      } catch (error) {
        throw new Error("The selected ECG file is not valid JSON.");
      }

      const requestBody = {
        ...(parsedFilePayload && typeof parsedFilePayload === "object" ? parsedFilePayload : {}),
        acquisitionNote:
          acquisitionNote ||
          String(parsedFilePayload?.acquisitionNote || "").trim(),
        observedText:
          sourceInput.trim() ||
          String(parsedFilePayload?.observedText || "").trim(),
      };

      const response = await fetch(apiUrl("/api/ecg/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => ({}));
      logEcgDebug("extract response payload", payload);

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to analyze the ECG source right now.",
        );
      }

      if (response.status === 202 && payload?.jobId) {
        setAnalysisJobId(payload.jobId);
        setAnalysisJobStatus(String(payload?.status || "queued"));
        setAnalysisJobProgress(Number(payload?.progress || 0));
        setDisplayJobProgress(Number(payload?.progress || 0));
        setAnalysisJobMessage(
          String(payload?.message || "ECG analysis job queued."),
        );
        persistActiveJob({
          jobId: payload.jobId,
          status: String(payload?.status || "queued"),
          progress: Number(payload?.progress || 0),
          message: String(payload?.message || "ECG analysis job queued."),
          savedAt: Date.now(),
          sourceType: requestSourceType,
        });
        props.serverReply?.("ECG analysis job queued. I’ll update the graph when it finishes.");
        return;
      }

      applyAnalysisPayload(payload);
      setAnalysisJobStatus("completed");
      setAnalysisJobProgress(1);
      setDisplayJobProgress(1);
      setAnalysisJobMessage("ECG analysis completed.");
      clearPersistedJob();
      props.serverReply?.("ECG analysis ready.");
    } catch (error) {
      const message =
        error?.message || "Unable to analyze the ECG source right now.";

      setAnalysisError(message);
      setAnalysisJobStatus("failed");
      setAnalysisJobMessage(message);
      setAnalysisMethod("failed");
      setAnalysisPreview({
        imageUrl: "",
        rotationApplied: "0",
      });
      clearPersistedJob();
      props.serverReply?.(`ECG analysis failed: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancelAnalysis = async () => {
    if (!analysisJobId || !["submitting", "queued", "running"].includes(analysisJobStatus)) {
      return;
    }

    setIsCancellingJob(true);
    try {
      const response = await fetch(apiUrl(`/api/ecg/jobs/${analysisJobId}/cancel`), {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to cancel the ECG analysis right now.");
      }

      setAnalysisJobStatus(String(payload?.status || "cancelled"));
      setAnalysisJobProgress(Number(payload?.progress || 1));
      setDisplayJobProgress(1);
      setAnalysisJobMessage(String(payload?.message || "ECG analysis cancelled."));
      setAnalysisJobLastSeenAt(Date.now());
      setIsAnalyzing(false);
      clearPersistedJob();
      props.serverReply?.("ECG analysis cancelled.");
    } catch (error) {
      const message = error?.message || "Unable to cancel the ECG analysis right now.";
      setAnalysisError(message);
      props.serverReply?.(`ECG cancellation failed: ${message}`);
    } finally {
      setIsCancellingJob(false);
    }
  };

  return (
    <article id="phenomed_ecg_page" className="fc">
      <section id="phenomed_ecg_hero" className="fc">
        <p className="phenomed_ecg_eyebrow">Phenomenal Extraction</p>
        <h1>PhenoMed ECG</h1>
        <p className="phenomed_ecg_summary">
          Load digital ECG traces from a device JSON file and extract only
          what appears in the waveform: graph behavior, points, amplitudes,
          lead-wise increase/decrease, and source limitations.
        </p>
      </section>

      <section id="phenomed_ecg_graphRow" className="fc">
        <div className="phenomed_ecg_card phenomed_ecg_card--fullwidth fc">
          <p className="phenomed_ecg_cardEyebrow">Digitized Graph</p>
          <h2>Waveform Drawn From The Loaded Digital Trace</h2>
          {tracePath ? (
            <div className="phenomed_ecg_traceBlock fc">
              <div className="phenomed_ecg_previewMeta fr">
                <span>Digitized graph</span>
                <strong>
                  {resolvedLeadDisplayLabel ? `${resolvedLeadDisplayLabel} | ` : ""}
                  {traceSampleCount} plotted samples
                </strong>
              </div>
              {manualResolvedLeadLabel ? (
                <p className="phenomed_ecg_traceHint">
                  Manual lead label set to {manualResolvedLeadLabel}
                  {resolvedLeadName ? ` | trace key: ${resolvedLeadName}` : ""}
                </p>
              ) : resolvedWrittenLeadLabel ? (
                <p className="phenomed_ecg_traceHint">
                  Suggested written label: {resolvedWrittenLeadLabel}
                  {resolvedLeadName && resolvedWrittenLeadLabel !== resolvedLeadName
                    ? ` | trace key: ${resolvedLeadName}`
                    : ""}
                </p>
              ) : null}
              <p className="phenomed_ecg_traceDebug">{traceDebugText}</p>
              {availableLeadNames.length > 0 ? (
                <div className="phenomed_ecg_leadPicker fc">
                  <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_lead_select">
                    Lead to display
                  </label>
                  <select
                    id="phenomed_ecg_lead_select"
                    value={selectedLead}
                    onChange={(event) => setSelectedLead(event.target.value)}
                  >
                    {availableLeadNames.map((leadName) => (
                      <option key={leadName} value={leadName}>
                        {manualLeadLabels?.[leadName] || leadName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {resolvedLeadName ? (
                <div className="phenomed_ecg_leadPicker fc">
                  <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_manual_lead_select">
                    Set lead label manually
                  </label>
                  <select
                    id="phenomed_ecg_manual_lead_select"
                    value={manualLeadLabels?.[resolvedLeadName] || ""}
                    onChange={(event) =>
                      setManualLeadLabels((currentValue) => ({
                        ...currentValue,
                        [resolvedLeadName]: event.target.value,
                      }))
                    }
                  >
                    {ECG_LEAD_OPTIONS.map((leadOption) => (
                      <option key={leadOption || "auto"} value={leadOption}>
                        {leadOption || "Use detected / trace key"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="phenomed_ecg_traceControls">
                <label className="phenomed_ecg_traceControl" htmlFor="phenomed_ecg_trace_scale_x">
                  <span>Horizontal zoom</span>
                  <strong>{traceScaleX.toFixed(1)}x</strong>
                </label>
                <input
                  id="phenomed_ecg_trace_scale_x"
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={traceScaleX}
                  onChange={(event) =>
                    setTraceScaleX(Number(event.target.value) || 1)
                  }
                />
                <label className="phenomed_ecg_traceControl" htmlFor="phenomed_ecg_trace_scale_y">
                  <span>Vertical gain</span>
                  <strong>{traceScaleY.toFixed(1)}x</strong>
                </label>
                <input
                  id="phenomed_ecg_trace_scale_y"
                  type="range"
                  min="0.6"
                  max="3"
                  step="0.1"
                  value={traceScaleY}
                  onChange={(event) =>
                    setTraceScaleY(Number(event.target.value) || 1)
                  }
                />
              </div>
              <div
                ref={traceFrameRef}
                className={`phenomed_ecg_traceFrame${
                  canDragTrace ? " phenomed_ecg_traceFrame--draggable" : ""
                }${
                  isTraceDragging ? " phenomed_ecg_traceFrame--dragging" : ""
                }`}
                onMouseDown={handleTraceDragStart}
                onMouseMove={handleTraceDragMove}
                onMouseUp={handleTraceDragEnd}
                onMouseLeave={handleTraceDragEnd}
              >
                <svg
                  viewBox={`0 0 ${traceSvgWidth} ${traceSvgHeight}`}
                  className="phenomed_ecg_traceSvg"
                  style={{ width: `${traceRenderedWidth}px` }}
                  role="img"
                  aria-label={`Digitized ECG waveform graph${selectedLead ? ` for lead ${selectedLead}` : ""}`}
                >
                  <defs>
                    <pattern
                      id="phenomed_ecg_trace_grid_small"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 20 0 L 0 0 0 20"
                        className="phenomed_ecg_traceGrid phenomed_ecg_traceGrid--small"
                        fill="none"
                        stroke="rgba(204, 105, 118, 0.12)"
                        strokeWidth="1"
                      />
                    </pattern>
                    <pattern
                      id="phenomed_ecg_trace_grid_large"
                      width="100"
                      height="100"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="100" height="100" fill="url(#phenomed_ecg_trace_grid_small)" />
                      <path
                        d="M 100 0 L 0 0 0 100"
                        className="phenomed_ecg_traceGrid phenomed_ecg_traceGrid--large"
                        fill="none"
                        stroke="rgba(190, 73, 87, 0.2)"
                        strokeWidth="1.35"
                      />
                    </pattern>
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width={traceSvgWidth}
                    height={traceSvgHeight}
                    className="phenomed_ecg_traceBackground"
                    fill="#fff8f8"
                  />
                  <rect
                    x={traceSvgPadding}
                    y={traceSvgPadding}
                    width={traceSvgWidth - traceSvgPadding * 2}
                    height={traceSvgHeight - traceSvgPadding * 2}
                    fill="url(#phenomed_ecg_trace_grid_large)"
                  />
                  <path
                    d={tracePath}
                    className="phenomed_ecg_traceLine"
                    fill="none"
                    stroke="#b1223f"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {canDragTrace ? (
                <p className="phenomed_ecg_traceHint">
                  Drag the graph with the mouse to pan while zoomed in.
                </p>
              ) : null}
              {leadTraceEntries.length > 1 ? (
                <div className="phenomed_ecg_leadOverviewGrid">
                  {leadTraceEntries.map(([leadName, samples]) => {
                    const leadPath = buildTracePath(
                      samples,
                      leadOverviewWidth,
                      leadOverviewHeight,
                      leadOverviewPadding,
                      1,
                    );
                    const isActiveLead = leadName === resolvedLeadName;

                    return (
                      <button
                        key={leadName}
                        type="button"
                        className={`phenomed_ecg_leadOverviewCard${
                          isActiveLead ? " phenomed_ecg_leadOverviewCard--active" : ""
                        }`}
                        onClick={() => setSelectedLead(leadName)}
                      >
                        <span className="phenomed_ecg_leadOverviewLabel">
                          {leadName}
                        </span>
                        <svg
                          viewBox={`0 0 ${leadOverviewWidth} ${leadOverviewHeight}`}
                          className="phenomed_ecg_leadOverviewSvg"
                          role="img"
                          aria-label={`Lead ${leadName} waveform overview`}
                        >
                          <rect
                            x="0"
                            y="0"
                            width={leadOverviewWidth}
                            height={leadOverviewHeight}
                            fill="#fff8f8"
                          />
                          <path
                            d={leadPath}
                            fill="none"
                            stroke={isActiveLead ? "#8f1735" : "#b1223f"}
                            strokeWidth={isActiveLead ? "2.5" : "2"}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="phenomed_ecg_leadOverviewMeta">
                          {samples.length} samples
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="phenomed_ecg_empty">
              {noTraceReason}
            </p>
          )}
        </div>
      </section>

      <section id="phenomed_ecg_grid" className="fr">
        <section id="phenomed_ecg_workspace" className="fc">
          <div className="phenomed_ecg_card fc">
            <div className="phenomed_ecg_cardHeader fr">
              <div>
                <p className="phenomed_ecg_cardEyebrow">ECG Intake</p>
                <h2>Load Digital ECG Traces</h2>
              </div>
              <div className="phenomed_ecg_actionRow">
                <button type="button" onClick={handleExtract} disabled={isJobActive}>
                  {isJobActive ? "Analyzing..." : "Extract phenomena"}
                </button>
                {["submitting", "queued", "running"].includes(analysisJobStatus) ? (
                  <button
                    type="button"
                    className="phenomed_ecg_buttonSecondary"
                    onClick={handleCancelAnalysis}
                    disabled={isCancellingJob}
                  >
                    {isCancellingJob ? "Cancelling..." : "Cancel"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="phenomed_ecg_uploadBlock fc">
              <label className="phenomed_ecg_label" htmlFor="phenomed_ecg_file">
                ECG digital trace JSON file
              </label>
              <label className="phenomed_ecg_uploadField" htmlFor="phenomed_ecg_file">
                <span className="phenomed_ecg_uploadTitle">
                  Choose digital trace JSON
                </span>
                <span className="phenomed_ecg_uploadName">{fileLabel}</span>
                <span className="phenomed_ecg_uploadHint">
                  {SUPPORTED_FILE_LABEL}
                </span>
              </label>
              <input
                id="phenomed_ecg_file"
                type="file"
                accept=".json,application/json,text/json"
                onChange={handleFileChange}
              />
            </div>

            {analysisError ? (
              <p className="phenomed_ecg_error">{analysisError}</p>
            ) : null}
            {analysisJobStatus !== "idle" ? (
              <div className="phenomed_ecg_jobStatus fc">
                <div className="phenomed_ecg_jobLiveHeader fr">
                  <div className="fc phenomed_ecg_jobLiveHeaderCopy">
                    <span className="phenomed_ecg_jobLiveEyebrow">Live extraction</span>
                    <strong>{liveStageLabel}</strong>
                  </div>
                  <div className="phenomed_ecg_jobLiveBadge">{visibleJobPercent}%</div>
                </div>
                <div className="phenomed_ecg_jobProgress">
                  <span
                    className="phenomed_ecg_jobProgressFill"
                    style={{ width: `${Math.max(6, visibleJobPercent)}%` }}
                  ></span>
                </div>
                <div className="phenomed_ecg_jobLiveGrid">
                  <div className="phenomed_ecg_jobLiveMetric">
                    <span>Status</span>
                    <strong>{analysisJobStatus}</strong>
                  </div>
                  <div className="phenomed_ecg_jobLiveMetric">
                    <span>Elapsed</span>
                    <strong>{liveElapsedText}</strong>
                  </div>
                  <div className="phenomed_ecg_jobLiveMetric">
                    <span>Updated</span>
                    <strong>{liveUpdatedText}</strong>
                  </div>
                  <div className="phenomed_ecg_jobLiveMetric">
                    <span>Source</span>
                    <strong>{analysisSourceType}</strong>
                  </div>
                  <div className="phenomed_ecg_jobLiveMetric">
                    <span>Lead traces</span>
                    <strong>{leadTraceEntries.length}</strong>
                  </div>
                </div>
                <p className="phenomed_ecg_jobLiveDetail">{liveStageDetail}</p>
                <p className="phenomed_ecg_helper">
                  {analysisJobMessage || "ECG analysis status is updating."}
                </p>
                {analysisJobId ? (
                  <p className="phenomed_ecg_helper">Job ID: {analysisJobId}</p>
                ) : null}
              </div>
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
                <span>Graph samples</span>
                <strong>{traceSampleCount}</strong>
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
              <div className="phenomed_ecg_metric">
                <span>Method</span>
                <strong>{analysisMethod}</strong>
              </div>
            </div>
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Source Preview</p>
            <h2>Loaded ECG Source Before Analysis</h2>
            {selectedFile ? (
              <div className="phenomed_ecg_previewBlock fc">
                <div className="phenomed_ecg_previewMeta fr">
                  <span>Source view</span>
                  <strong>
                    {selectedFile ? "Uploaded JSON file" : "No source loaded"}
                  </strong>
                </div>
                <div className="phenomed_ecg_previewFrame phenomed_ecg_previewFrame--source">
                  <div className="phenomed_ecg_empty">
                    JSON digital trace file loaded: <strong>{selectedFile?.name || "none"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="phenomed_ecg_empty">
                Upload a JSON file with device digital ECG traces to continue analysis.
              </p>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <p className="phenomed_ecg_cardEyebrow">Processed Preview</p>
            <h2>Processed Trace Preview</h2>
            {analysisPreview.imageUrl ? (
              <div className="phenomed_ecg_previewBlock fc">
                <div className="phenomed_ecg_previewMeta fr">
                  <span>Rotation applied</span>
                  <strong>{analysisPreview.rotationApplied}</strong>
                </div>
                <div className="phenomed_ecg_previewFrame">
                  <img
                    src={analysisPreview.imageUrl}
                    alt="Processed ECG preview"
                    className="phenomed_ecg_previewImage"
                  />
                </div>
              </div>
            ) : (
              <p className="phenomed_ecg_empty">
                Run ECG analysis to preview the processed result.
              </p>
            )}
          </div>

          <div className="phenomed_ecg_card fc">
            <button
              type="button"
              className="phenomed_ecg_sectionToggle"
              onClick={() => setIsRulesOpen((currentValue) => !currentValue)}
              aria-expanded={isRulesOpen}
              aria-controls="phenomed_ecg_rules_panel"
            >
              <span className="phenomed_ecg_sectionToggleText">
                <span className="phenomed_ecg_cardEyebrow">Phenomenal Rules</span>
                <h2>What This Sub-app Should Say</h2>
              </span>
              <span
                className={`phenomed_ecg_sectionToggleArrow${
                  isRulesOpen ? " phenomed_ecg_sectionToggleArrow--open" : ""
                }`}
                aria-hidden="true"
              >
                &gt;
              </span>
            </button>

            {isRulesOpen ? (
              <div id="phenomed_ecg_rules_panel" className="phenomed_ecg_rules fc">
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
            ) : null}
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

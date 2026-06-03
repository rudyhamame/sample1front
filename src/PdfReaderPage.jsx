import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import PdfReaderModal from "./App/components/pdf-reader/PdfReaderModal";
import { apiUrl } from "./config/api";
import { normalizePlannerSelectSettings } from "./NogaPlan/lib/plannerRuntime";

const splitPlannerTextList = (value) =>
  Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : String(value || "")
        .split(/[,\n|]/)
        .map((entry) => entry.trim())
        .filter(Boolean);

const uniqueStrings = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );

const loadImageFromBlob = (blob) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image."));
    };
    image.src = objectUrl;
  });

const toAsciiBytes = (value) => new TextEncoder().encode(String(value || ""));

const createPdfFromJpegBytes = ({ jpegBytes, width, height }) => {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  const pageWidth = Math.max(1, Math.round(safeWidth * 0.75));
  const pageHeight = Math.max(1, Math.round(safeHeight * 0.75));
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;

  const chunks = [];
  let totalLength = 0;
  const offsets = [0];

  const pushBytes = (bytes) => {
    chunks.push(bytes);
    totalLength += bytes.length;
  };

  const pushAscii = (text) => pushBytes(toAsciiBytes(text));

  pushAscii("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  offsets[1] = totalLength;
  pushAscii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = totalLength;
  pushAscii("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets[3] = totalLength;
  pushAscii(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  offsets[4] = totalLength;
  pushAscii(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${safeWidth} /Height ${safeHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  pushBytes(jpegBytes);
  pushAscii("\nendstream\nendobj\n");

  offsets[5] = totalLength;
  pushAscii(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
  );

  const xrefStart = totalLength;
  pushAscii("xref\n0 6\n");
  pushAscii("0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) {
    pushAscii(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushAscii("trailer\n<< /Size 6 /Root 1 0 R >>\n");
  pushAscii(`startxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
};

const convertImageBlobToPdfBlob = async (imageBlob) => {
  const imageElement = await loadImageFromBlob(imageBlob);
  const width = Number(imageElement.naturalWidth || imageElement.width || 1);
  const height = Number(imageElement.naturalHeight || imageElement.height || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create image conversion context.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64Payload = String(jpegDataUrl.split(",")[1] || "").trim();
  const binaryString = atob(base64Payload);
  const jpegBytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index += 1) {
    jpegBytes[index] = binaryString.charCodeAt(index) & 0xff;
  }
  return createPdfFromJpegBytes({
    jpegBytes,
    width: canvas.width,
    height: canvas.height,
  });
};

const PdfReaderPage = ({
  state,
}) => {
  const history = useHistory();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [remoteTitle, setRemoteTitle] = useState("");
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [remoteMediaKind, setRemoteMediaKind] = useState("pdf");
  const [remoteMeta, setRemoteMeta] = useState({
    source: "",
    owner: "",
    sizeBytes: 0,
  });
  const plannerCourses = Array.isArray(state?.courses)
    ? state.courses
    : Array.isArray(state?.memory?.courses)
      ? state.memory.courses
      : Array.isArray(state?.memory?.studyPlanner?.studyOrganizer?.courses)
        ? state.memory.studyPlanner.studyOrganizer.courses
        : [];
  const plannerLectures = Array.isArray(state?.lectures)
    ? state.lectures
    : Array.isArray(state?.memory?.lectures)
      ? state.memory.lectures
      : [];
  const plannerSettings = normalizePlannerSelectSettings(
    state?.studyOrganizer?.settings ||
      state?.studyPlanner?.studyOrganizer?.settings ||
      state?.memory?.studyPlanner?.studyOrganizer?.settings ||
      {},
  );
  const [studyConceptForm, setStudyConceptForm] = useState({
    courseId: "",
    courseName: "",
    componentClass: "",
    lectureId: "",
    lectureTitle: "",
    lectureInstructor: "",
    lectureEditor: "",
    lectureDifficulty: "",
    lectureMastery: "",
    lecturePriority: "",
    lectureStudyTimePerPage: "",
  });
  const fileInputRef = useRef(null);
  const title = remoteTitle || selectedFile?.name || "Local PDF Reader";

  const courseOptions = React.useMemo(() => {
    const uniqueByName = new Map();
    plannerCourses.forEach((course) => {
      const courseId = String(course?._id || "").trim();
      const courseName = String(course?.course_name || "").trim();

      if (!courseId || !courseName || uniqueByName.has(courseName)) {
        return;
      }

      uniqueByName.set(courseName, {
        id: courseId,
        label: courseName,
      });
    });
    return Array.from(uniqueByName.values());
  }, [plannerCourses]);

  const selectedCourse = React.useMemo(
    () =>
      courseOptions.find(
        (entry) => String(entry.id || "").trim() === studyConceptForm.courseId,
      ) || null,
    [courseOptions, studyConceptForm.courseId],
  );

  const componentOptions = React.useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    return (plannerCourses || [])
      .filter(
        (course) =>
          String(course?._id || "").trim() === String(selectedCourse.id || "").trim(),
      )
      .flatMap((course) =>
        Array.isArray(course?.course_components) ? course.course_components : [],
      )
      .map((component, index) => ({
        id:
          String(component?._id || "").trim() ||
          `${String(selectedCourse.id || "").trim()}:${index}`,
        label: String(component?.course_class || "").trim(),
      }))
      .filter((entry) => entry.label)
      .reduce((accumulator, entry) => {
        if (!accumulator.some((item) => item.label === entry.label)) {
          accumulator.push(entry);
        }
        return accumulator;
      }, []);
  }, [plannerCourses, selectedCourse]);

  const lectureOptions = React.useMemo(() => {
    const selectedCourseName = String(studyConceptForm.courseName || "").trim();
    const selectedComponentClass = String(
      studyConceptForm.componentClass || "",
    ).trim();

    return plannerLectures
      .filter((lecture) => {
        const lectureCourse = String(
          lecture?.lecture_course || lecture?.course_name || "",
        ).trim();
        const lectureComponent = String(
          lecture?.lecture_component || lecture?.component_class || "",
        ).trim();

        if (selectedCourseName && lectureCourse !== selectedCourseName) {
          return false;
        }

        if (selectedComponentClass && lectureComponent !== selectedComponentClass) {
          return false;
        }

        return true;
      })
      .map((lecture, index) => ({
        id: String(lecture?._id || "").trim() || `lecture-${index}`,
        label: String(
          lecture?.lecture_name || lecture?.title || lecture?.name || "",
        ).trim(),
        lecture,
      }))
      .filter((entry) => entry.label);
  }, [
    plannerLectures,
    studyConceptForm.componentClass,
    studyConceptForm.courseName,
  ]);

  const selectedLecture = React.useMemo(
    () =>
      lectureOptions.find(
        (entry) => String(entry.id || "").trim() === studyConceptForm.lectureId,
      )?.lecture || null,
    [lectureOptions, studyConceptForm.lectureId],
  );

  const lectureInstructorOptions = React.useMemo(
    () =>
      uniqueStrings([
        ...(Array.isArray(plannerSettings?.lectureInstructorOptions)
          ? plannerSettings.lectureInstructorOptions
          : []),
        ...plannerCourses.flatMap((course) =>
          splitPlannerTextList(course?.course_instructor),
        ),
        ...plannerLectures.flatMap((lecture) =>
          splitPlannerTextList(
            lecture?.lecture_instructors || lecture?.lecture_instructor,
          ),
        ),
      ]),
    [plannerCourses, plannerLectures, plannerSettings],
  );

  const lectureEditorOptions = React.useMemo(
    () =>
      uniqueStrings([
        ...(Array.isArray(plannerSettings?.lectureWriterOptions)
          ? plannerSettings.lectureWriterOptions
          : []),
        ...plannerCourses.flatMap((course) =>
          splitPlannerTextList(course?.course_writer),
        ),
        ...plannerLectures.flatMap((lecture) =>
          splitPlannerTextList(lecture?.lecture_writers || lecture?.lecture_writer),
        ),
      ]),
    [plannerCourses, plannerLectures, plannerSettings],
  );

  const difficultyOptions = React.useMemo(
    () =>
      uniqueStrings([
        ...(Array.isArray(plannerSettings?.planDifficultyOptions)
          ? plannerSettings.planDifficultyOptions
          : []),
      ]),
    [plannerSettings],
  );
  const masteryOptions = React.useMemo(
    () =>
      uniqueStrings([
        ...(Array.isArray(plannerSettings?.planMasteryOptions)
          ? plannerSettings.planMasteryOptions
          : []),
      ]),
    [plannerSettings],
  );
  const priorityOptions = React.useMemo(
    () =>
      uniqueStrings([
        ...(Array.isArray(plannerSettings?.planPriorityOptions)
          ? plannerSettings.planPriorityOptions
          : []),
      ]),
    [plannerSettings],
  );

  const handleStudyConceptFieldChange = (fieldName, nextValue) => {
    setStudyConceptForm((currentValue) => ({
      ...currentValue,
      [fieldName]: nextValue,
    }));
  };

  const handleStudyConceptCourseChange = (nextCourseId) => {
    const matchedCourse =
      courseOptions.find(
        (entry) => String(entry.id || "").trim() === String(nextCourseId || "").trim(),
      ) || null;
    setStudyConceptForm((currentValue) => ({
      ...currentValue,
      courseId: String(nextCourseId || "").trim(),
      courseName: matchedCourse?.label || "",
      componentClass: "",
      lectureId: "",
      lectureTitle: "",
    }));
  };

  const handleStudyConceptLectureChange = (nextLectureId) => {
    const matchedLecture =
      lectureOptions.find(
        (entry) => String(entry.id || "").trim() === String(nextLectureId || "").trim(),
      )?.lecture || null;

    setStudyConceptForm((currentValue) => ({
      ...currentValue,
      lectureId: String(nextLectureId || "").trim(),
      lectureTitle: String(
        matchedLecture?.lecture_name || matchedLecture?.title || "",
      ).trim(),
      lectureInstructor: String(
        matchedLecture?.lecture_instructors ||
          matchedLecture?.lecture_instructor ||
          currentValue.lectureInstructor ||
          "",
      ).trim(),
      lectureEditor: String(
        matchedLecture?.lecture_writers ||
          matchedLecture?.lecture_writer ||
          currentValue.lectureEditor ||
          "",
      ).trim(),
    }));
  };

  useEffect(() => {
    if (
      studyConceptForm.courseId &&
      !courseOptions.some(
        (entry) => String(entry.id || "").trim() === studyConceptForm.courseId,
      )
    ) {
      setStudyConceptForm((currentValue) => ({
        ...currentValue,
        courseId: "",
        courseName: "",
        componentClass: "",
        lectureId: "",
        lectureTitle: "",
      }));
    }
  }, [courseOptions, studyConceptForm.courseId]);

  useEffect(() => {
    if (
      studyConceptForm.componentClass &&
      !componentOptions.some(
        (entry) => String(entry.label || "").trim() === studyConceptForm.componentClass,
      )
    ) {
      setStudyConceptForm((currentValue) => ({
        ...currentValue,
        componentClass: "",
        lectureId: "",
        lectureTitle: "",
      }));
      return;
    }

    if (
      studyConceptForm.lectureId &&
      !lectureOptions.some(
        (entry) => String(entry.id || "").trim() === studyConceptForm.lectureId,
      )
    ) {
      setStudyConceptForm((currentValue) => ({
        ...currentValue,
        lectureId: "",
        lectureTitle: "",
      }));
    }
  }, [
    componentOptions,
    lectureOptions,
    studyConceptForm.componentClass,
    studyConceptForm.lectureId,
  ]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const source = String(searchParams.get("source") || "").trim();
    const groupReference = String(searchParams.get("groupReference") || "").trim();
    const messageId = Number(searchParams.get("messageId") || 0);
    const nextTitle = String(searchParams.get("title") || "").trim();

    if (
      source !== "telegram" ||
      !groupReference ||
      !messageId ||
      !String(state?.token || "").trim()
    ) {
      setRemoteLoading(false);
      setRemoteError("");
      setRemoteTitle("");
      setRemoteMediaKind("pdf");
      setRemoteMeta({
        source: "",
        owner: "",
        sizeBytes: 0,
      });
      return undefined;
    }

    let isCancelled = false;
    let objectUrl = "";

    const run = async () => {
      setRemoteLoading(true);
      setRemoteError("");
      try {
        const params = new URLSearchParams({
          groupReference,
          messageId: String(messageId),
        });
        const requestUrl = apiUrl(`/api/telegram/stored-media?${params.toString()}`);
        const requestOptions = {
          method: "GET",
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        };
        let response = await fetch(requestUrl, requestOptions);
        if (!response.ok) {
          const firstPayload = await response.json().catch(() => ({}));
          const firstMessage = String(firstPayload?.message || "");
          const shouldRetry =
            firstMessage.toLowerCase().includes("timed out") ||
            firstMessage.toLowerCase().includes("timeout");
          if (shouldRetry && !isCancelled) {
            await new Promise((resolve) => window.setTimeout(resolve, 700));
            response = await fetch(requestUrl, requestOptions);
          }
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          if (!isCancelled) {
            setRemoteError(
              String(payload?.message || "Unable to open Telegram PDF."),
            );
            setFileUrl("");
            setRemoteMediaKind("pdf");
          }
          return;
        }
        const blob = await response.blob();
        if (isCancelled) {
          return;
        }
        const contentType = String(
          response.headers.get("content-type") || blob?.type || "",
        )
          .trim()
          .toLowerCase();
        const isImage = contentType.startsWith("image/");
        const pdfBlob = isImage ? await convertImageBlobToPdfBlob(blob) : blob;
        objectUrl = URL.createObjectURL(pdfBlob);
        setSelectedFile(null);
        setFileUrl(objectUrl);
        setRemoteMediaKind("pdf");
        setRemoteTitle(nextTitle || "Telegram PDF");
        setRemoteMeta({
          source: "telegram",
          owner: state?.username || "",
          sizeBytes: Number(blob.size || 0),
        });
      } catch (error) {
        if (!isCancelled) {
          setRemoteError(
            String(error?.message || "Unable to open Telegram PDF."),
          );
          setFileUrl("");
          setRemoteMediaKind("pdf");
        }
      } finally {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [state?.token, state?.username]);

  useEffect(() => {
    if (!selectedFile) {
      if (!remoteTitle) {
        setFileUrl("");
      }
      return undefined;
    }

    const nextFileUrl = URL.createObjectURL(selectedFile);
    setFileUrl(nextFileUrl);

    return () => {
      URL.revokeObjectURL(nextFileUrl);
    };
  }, [remoteTitle, selectedFile]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0];

    if (nextFile?.type === "application/pdf") {
      setSelectedFile(nextFile);
    }

    event.target.value = "";
  };

  const handleCloseReader = () => {
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push("/");
  };

  return (
    <section id="pdfReader_page" className="pdfReader_page">
      <input
        id="pdfReader_pageFileInput"
        className="pdfReader_pageFileInput"
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
      />
      {remoteMediaKind === "image" && fileUrl ? (
        <section id="pdfReader_imageMount" className="pdfReader_imageMount">
          <header id="pdfReader_imageHeader" className="pdfReader_imageHeader">
            <h2 id="pdfReader_imageTitle" className="pdfReader_imageTitle">
              {title}
            </h2>
          </header>
          <div id="pdfReader_imageViewport" className="pdfReader_imageViewport">
            <img
              id="pdfReader_imagePreview"
              className="pdfReader_imagePreview"
              src={fileUrl}
              alt={title || "Telegram media preview"}
            />
          </div>
        </section>
      ) : (
        <PdfReaderModal
          isOpen={true}
          renderInline
          fileUrl={fileUrl}
          isLoading={remoteLoading}
          error={remoteError}
          title={title}
          metadata={
            remoteTitle
              ? remoteMeta
              : {
                  source: "local",
                  owner: state?.username || "",
                  sizeBytes: selectedFile?.size || 0,
                }
          }
          initialPage={1}
          studyConceptForm={studyConceptForm}
          courseOptions={courseOptions}
          componentOptions={componentOptions}
          lectureOptions={lectureOptions}
          lectureInstructorOptions={lectureInstructorOptions}
          lectureEditorOptions={lectureEditorOptions}
          difficultyOptions={difficultyOptions}
          masteryOptions={masteryOptions}
          priorityOptions={priorityOptions}
          onStudyConceptCourseChange={handleStudyConceptCourseChange}
          onStudyConceptLectureChange={handleStudyConceptLectureChange}
          onStudyConceptFieldChange={handleStudyConceptFieldChange}
          onClose={handleCloseReader}
          onChooseFile={handleChooseFile}
        />
      )}
    </section>
  );
};

export default PdfReaderPage;

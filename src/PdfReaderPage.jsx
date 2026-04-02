import React from "react";
import { useHistory } from "react-router-dom";
import PdfReaderModal from "./App/components/pdf-reader/PdfReaderModal";
import Nav from "./Nav/Nav";
import { apiUrl } from "./config/api";
import {
  getStoredPdfReaderState,
  setStoredPdfReaderState,
} from "./utils/pdfReaderState";

const normalizeCourseLabel = (value) => String(value || "").trim();

const collectPdfCandidate = (value, bucket) => {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (
      trimmedValue &&
      (trimmedValue.toLowerCase().includes(".pdf") ||
        trimmedValue.toLowerCase().includes("/raw/upload/") ||
        trimmedValue.toLowerCase().includes("application/pdf"))
    ) {
      bucket.push(trimmedValue);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((entry) => collectPdfCandidate(entry, bucket));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value)
      .slice(0, 16)
      .forEach(([key, entryValue]) => {
        if (
          /pdf|url|file|attachment|asset|secure/i.test(String(key || ""))
        ) {
          collectPdfCandidate(entryValue, bucket);
        }
      });
  }
};

const extractLecturePdfUrl = (lecture) => {
  const candidates = [];

  [
    lecture?.lecture_pdfUrl,
    lecture?.lecture_pdf_url,
    lecture?.pdfUrl,
    lecture?.pdf_url,
    lecture?.fileUrl,
    lecture?.file_url,
    lecture?.attachmentUrl,
    lecture?.attachment_url,
    lecture?.url,
    lecture?.lecture_assets,
    lecture?.lecture_files,
    lecture?.lecture_attachments,
    lecture?.lecture_resources,
    lecture?.lecture_corrections,
    lecture?.lecture_outlines,
  ].forEach((value) => collectPdfCandidate(value, candidates));

  return candidates.find(Boolean) || "";
};

const isCloudinaryUrl = (value) =>
  /https?:\/\/res\.cloudinary\.com\//i.test(String(value || "").trim());

const PdfReaderPage = (props) => {
  const history = useHistory();
  const fileInputRef = React.useRef(null);
  const readerFileUrlRef = React.useRef("");
  const [readerFileUrl, setReaderFileUrl] = React.useState("");
  const [readerTitle, setReaderTitle] = React.useState("");
  const [readerMetadata, setReaderMetadata] = React.useState({
    sender: "Local file",
  });
  const [readerStateKey, setReaderStateKey] = React.useState("");
  const [readerDownloadName, setReaderDownloadName] = React.useState("");
  const [selectedCourseName, setSelectedCourseName] = React.useState("");
  const [selectedLectureId, setSelectedLectureId] = React.useState("");

  React.useEffect(() => {
    readerFileUrlRef.current = readerFileUrl;
  }, [readerFileUrl]);

  React.useEffect(() => {
    return () => {
      if (String(readerFileUrlRef.current || "").startsWith("blob:")) {
        window.URL.revokeObjectURL(readerFileUrlRef.current);
      }
    };
  }, []);

  const replaceReaderFileUrl = React.useCallback((nextUrl) => {
    const currentUrl = readerFileUrlRef.current;

    if (
      currentUrl &&
      currentUrl !== nextUrl &&
      String(currentUrl).startsWith("blob:")
    ) {
      window.URL.revokeObjectURL(currentUrl);
    }

    readerFileUrlRef.current = nextUrl;
    setReaderFileUrl(nextUrl);
  }, []);

  const resolvePdfUrl = React.useCallback(
    async ({ url = "", publicId = "" }) => {
      const trimmedUrl = String(url || "").trim();
      const trimmedPublicId = String(publicId || "").trim();
      const token = String(props.state?.token || "").trim();

      if (!trimmedUrl) {
        return "";
      }

      if (!token || (!trimmedPublicId && !isCloudinaryUrl(trimmedUrl))) {
        return trimmedUrl;
      }

      const query = new URLSearchParams();

      if (trimmedPublicId) {
        query.set("publicId", trimmedPublicId);
      } else {
        query.set("url", trimmedUrl);
      }

      const response = await fetch(
        apiUrl(`/api/user/image-gallery/private-download?${query.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to open the protected PDF file.",
        );
      }

      return String(payload?.url || "").trim() || trimmedUrl;
    },
    [props.state?.token],
  );

  const cloudPdfMessages = React.useMemo(() => {
    const galleryItems = Array.isArray(props.state?.imageGallery)
      ? props.state.imageGallery
      : [];

    return galleryItems.filter((item) => {
      const resourceType = String(item?.resourceType || "")
        .trim()
        .toLowerCase();
      const mimeType = String(item?.mimeType || "")
        .trim()
        .toLowerCase();
      const format = String(item?.format || "")
        .trim()
        .toLowerCase();
      const url = String(item?.url || "").trim().toLowerCase();

      return Boolean(
        String(item?.url || "").trim() &&
          (resourceType === "raw" ||
            mimeType === "application/pdf" ||
            format === "pdf" ||
            url.includes(".pdf")),
      );
    });
  }, [props.state?.imageGallery]);

  const storedLectures = React.useMemo(() => {
    const lectureEntries = Array.isArray(props.state?.lectures)
      ? props.state.lectures
      : [];

    return lectureEntries
      .map((lecture, index) => {
        const courseName = normalizeCourseLabel(lecture?.lecture_course);
        const lectureName =
          normalizeCourseLabel(lecture?.lecture_name) || `Lecture ${index + 1}`;
        const pdfUrl = extractLecturePdfUrl(lecture);
        const lectureId =
          String(lecture?._id || lecture?.id || `${courseName}-${lectureName}-${index}`).trim();

        return {
          id: lectureId,
          courseName,
          title: lectureName,
          pdfUrl,
          source: lecture,
        };
      })
      .filter((lecture) => lecture.courseName);
  }, [props.state?.lectures]);

  const storedCourseOptions = React.useMemo(() => {
    const courseLabels = [
      ...(Array.isArray(props.state?.courses) ? props.state.courses : []).map(
        (course) => normalizeCourseLabel(course?.course_name),
      ),
      ...storedLectures.map((lecture) => lecture.courseName),
    ].filter(Boolean);

    return [...new Set(courseLabels)].sort((firstCourse, secondCourse) =>
      firstCourse.localeCompare(secondCourse),
    );
  }, [props.state?.courses, storedLectures]);

  React.useEffect(() => {
    if (!storedCourseOptions.length) {
      setSelectedCourseName("");
      return;
    }

    setSelectedCourseName((currentCourseName) =>
      storedCourseOptions.includes(currentCourseName)
        ? currentCourseName
        : storedCourseOptions[0],
    );
  }, [storedCourseOptions]);

  const selectedCourseLectures = React.useMemo(() => {
    return storedLectures
      .filter((lecture) => lecture.courseName === selectedCourseName)
      .sort((firstLecture, secondLecture) =>
        firstLecture.title.localeCompare(secondLecture.title),
      );
  }, [selectedCourseName, storedLectures]);

  const openFilePicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = React.useCallback(
    (event) => {
      const nextFile = event.target?.files?.[0];
      event.target.value = "";

      if (!nextFile) {
        return;
      }

      replaceReaderFileUrl(window.URL.createObjectURL(nextFile));
      setReaderTitle(
        String(nextFile.name || "Local PDF").trim() || "Local PDF",
      );
      setReaderMetadata({
        sender: "Local file",
        sizeBytes: Number(nextFile.size || 0) || 0,
      });
      setReaderStateKey("");
      setReaderDownloadName(
        String(nextFile.name || "document.pdf").trim() || "document.pdf",
      );
    },
    [replaceReaderFileUrl],
  );

  const openCloudPdf = React.useCallback(
    async (item) => {
      const fileUrl = String(item?.url || "").trim();

      if (!fileUrl) {
        return;
      }

      const title =
        String(item?.publicId || "").trim().split("/").pop() ||
        String(item?.assetId || "").trim() ||
        "Cloud PDF";
      const normalizedTitle = title.toLowerCase().endsWith(".pdf")
        ? title
        : `${title}.pdf`;
      const resolvedUrl = await resolvePdfUrl({
        url: fileUrl,
        publicId: item?.publicId,
      });

      replaceReaderFileUrl(resolvedUrl);
      setReaderTitle(normalizedTitle);
      setReaderMetadata({
        sender: "Cloudinary",
        sizeBytes: Number(item?.bytes || 0) || 0,
      });
      setReaderStateKey(
        `cloud:${String(item?.publicId || item?.assetId || fileUrl).trim()}`,
      );
      setReaderDownloadName(normalizedTitle);
    },
    [replaceReaderFileUrl, resolvePdfUrl],
  );

  const openLecturePdf = React.useCallback(
    async (lecture) => {
      const pdfUrl = String(lecture?.pdfUrl || "").trim();

      setSelectedLectureId(String(lecture?.id || "").trim());

      if (!pdfUrl) {
        return;
      }

      const normalizedTitle = String(lecture?.title || "Lecture PDF").trim();
      const resolvedUrl = await resolvePdfUrl({
        url: pdfUrl,
        publicId: lecture?.source?.publicId,
      });

      replaceReaderFileUrl(resolvedUrl);
      setReaderTitle(
        normalizedTitle.toLowerCase().endsWith(".pdf")
          ? normalizedTitle
          : `${normalizedTitle}.pdf`,
      );
      setReaderMetadata({
        sender: lecture?.courseName || "Lecture",
      });
      setReaderStateKey(`lecture:${String(lecture?.id || normalizedTitle).trim()}`);
      setReaderDownloadName(
        normalizedTitle.toLowerCase().endsWith(".pdf")
          ? normalizedTitle
          : `${normalizedTitle}.pdf`,
      );
    },
    [replaceReaderFileUrl, resolvePdfUrl],
  );

  const activeReaderState = readerStateKey
    ? getStoredPdfReaderState(readerStateKey)
    : {
        page: 1,
        zoom: 1,
      };

  return (
    <React.Fragment>
      <div
        style={{
          width: "100%",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          id="Home_topControls"
          className="fr"
          style={{
            width: "100%",
            justifyContent: "flex-end",
            padding: "12px 12px 0",
          }}
        >
          <div id="Home_navWrap">
            <Nav
              path="/phenomed/pdf-reader"
              state={props.state}
              logOut={props.logOut}
              acceptFriend={props.acceptFriend}
              makeNotificationsRead={props.makeNotificationsRead}
              extraActions={[
                {
                  id: "home",
                  label: "Home",
                  iconClass: "fas fa-house-user",
                  isActive: false,
                  onClick: () => {
                    history.push("/");
                  },
                },
                {
                  id: "pdf-reader",
                  label: "PDF Reader",
                  iconClass: "fas fa-file-pdf",
                  isActive: true,
                  onClick: () => {},
                },
              ]}
              subApps={[
                {
                  id: "study",
                  label: "Phenomed Student",
                  icon: "fas fa-stopwatch",
                  path: "/study",
                },
                {
                  id: "ecg",
                  label: "PhenoMed ECG",
                  icon: "fas fa-heartbeat",
                  path: "/ecg",
                },
                {
                  id: "pdf-reader",
                  label: "PDF Reader",
                  icon: "fas fa-file-pdf",
                  path: "/phenomed/pdf-reader",
                },
                {
                  id: "school",
                  label: "School Planner",
                  icon: "fas fa-layer-group",
                  path: "/phenomed/schoolplanner",
                },
                {
                  id: "social",
                  label: "Phenomed Social",
                  icon: "fas fa-house-user",
                  path: "/phenomedsocial",
                },
              ]}
            />
          </div>
        </div>
        <PdfReaderModal
          isOpen={true}
          fileUrl={readerFileUrl}
          title={readerTitle || "Local PDF Reader"}
          metadata={readerMetadata}
          initialPage={activeReaderState.page}
          initialZoom={activeReaderState.zoom}
          onChooseFile={openFilePicker}
          renderInline={true}
          forceVisible={true}
          storedCourseOptions={storedCourseOptions}
          selectedCourseName={selectedCourseName}
          onSelectCourseName={(nextCourseName) => {
            setSelectedCourseName(nextCourseName);
            setSelectedLectureId("");
          }}
          selectedCourseLectures={selectedCourseLectures}
          selectedLectureId={selectedLectureId}
          onSelectCourseLecture={openLecturePdf}
          cloudPdfMessages={cloudPdfMessages}
          openCloudPdf={openCloudPdf}
          onClose={() => {
            history.push("/");
          }}
          onReaderStateChange={(nextState) => {
            if (readerStateKey) {
              setStoredPdfReaderState(readerStateKey, nextState);
            }
          }}
          onOpenInNewTab={() => {
            if (readerFileUrl) {
              window.open(readerFileUrl, "_blank", "noopener,noreferrer");
            }
          }}
          onDownload={() => {
            if (!readerFileUrl) {
              return;
            }

            const downloadLink = document.createElement("a");
            downloadLink.href = readerFileUrl;
            downloadLink.download =
              readerDownloadName || readerTitle || "document.pdf";
            downloadLink.click();
          }}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
    </React.Fragment>
  );
};

export default PdfReaderPage;

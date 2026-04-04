import React, { useEffect, useRef, useState } from "react";
import PdfReaderModal from "./App/components/pdf-reader/PdfReaderModal";
import Nav from "./Nav/Nav";
import { getHomeSubApps } from "./utils/homeSubApps";

const PdfReaderPage = ({
  state,
  logOut,
  acceptFriend,
  makeNotificationsRead,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const fileInputRef = useRef(null);
  const title = selectedFile?.name || "Local PDF Reader";
  const subApps = getHomeSubApps(state?.username);

  useEffect(() => {
    if (!selectedFile) {
      setFileUrl("");
      return undefined;
    }

    const nextFileUrl = URL.createObjectURL(selectedFile);
    setFileUrl(nextFileUrl);

    return () => {
      URL.revokeObjectURL(nextFileUrl);
    };
  }, [selectedFile]);

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

  return (
    <section
      style={{
        display: "flex",
        flex: "1 1 auto",
        flexDirection: "column",
        minHeight: 0,
        width: "100%",
      }}
    >
      <Nav
        state={state}
        logOut={logOut}
        acceptFriend={acceptFriend}
        makeNotificationsRead={makeNotificationsRead}
        subApps={subApps}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div
        style={{
          display: "flex",
          flex: "1 1 auto",
          minHeight: 0,
          width: "100%",
        }}
      >
        <PdfReaderModal
          isOpen={true}
          renderInline
          fileUrl={fileUrl}
          title={title}
          metadata={{
            source: "local",
            owner: state?.username || "",
            sizeBytes: selectedFile?.size || 0,
          }}
          initialPage={1}
          onClose={() => {}}
          onChooseFile={handleChooseFile}
        />
      </div>
    </section>
  );
};

export default PdfReaderPage;

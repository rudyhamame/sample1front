import React from "react";
import PdfReaderModal from "./App/components/pdf-reader/PdfReaderModal";

const PdfReaderPage = ({ state }) => {
  const title = "Local PDF Reader";

  return (
    <section
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
        fileUrl=""
        title={title}
        metadata={{
          source: "local",
          owner: state?.username || "",
        }}
        initialPage={1}
        onClose={() => {}}
      />
    </section>
  );
};

export default PdfReaderPage;

import React from "react";

const NogaPlannerAIHelperPanel = ({ planner }) => {
  const renderLocalizedText =
    typeof planner?.renderPlannerLocalizedText === "function"
      ? planner.renderPlannerLocalizedText.bind(planner)
      : (value) => value;
  const isTelegramFindingInstructors = Boolean(
    planner?.state?.isTelegramFindingInstructors,
  );
  const telegramHasStoredGroups = Boolean(planner?.state?.telegramHasStoredGroups);
  const isBusy = isTelegramFindingInstructors;

  const storedProgramAIExtractions = Array.isArray(
    planner?.state?.plannerRoot?.programAIExtractions,
  )
    ? planner.state.plannerRoot.programAIExtractions
    : [];

  const latestInstructorsEntry = storedProgramAIExtractions
    .slice()
    .reverse()
    .find((entry) => {
      const arr = Array.isArray(entry?.programInstructorNames)
        ? entry.programInstructorNames
        : Array.isArray(entry?.instructorsNames)
          ? entry.instructorsNames
          : [];
      return arr.length > 0;
    }) || null;
  const instructors = Array.isArray(latestInstructorsEntry?.programInstructorNames)
    ? latestInstructorsEntry.programInstructorNames
    : Array.isArray(latestInstructorsEntry?.instructorsNames)
      ? latestInstructorsEntry.instructorsNames
      : [];

  return (
    <section id="nogaPlanner_aiHelperPanel" className="nogaPlanner_aiHelperPanel">
      <div
        id="nogaPlanner_aiHelperPanel_main"
        className="nogaPlanner_aiHelperPanel_main"
      >
        <div className="nogaPlanner_homePanelCard nogaPlanner_aiHelperCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>{renderLocalizedText("Instructors")}</strong>
            <button
              type="button"
              className={
                "nogaPlanner_coursesMiniBarBtn nogaPlanner_aiHelperTriggerBtn" +
                (isTelegramFindingInstructors
                  ? " nogaPlanner_coursesMiniBarBtn--active"
                  : "")
              }
              disabled={isBusy || !telegramHasStoredGroups}
              onClick={() => planner?.findTelegramInstructors?.()}
              title={renderLocalizedText("Extract instructor names")}
            >
              <i
                className={
                  isTelegramFindingInstructors
                    ? "fi fi-rr-spinner nogaPlanner_aiHelperSpinner"
                    : "fi fi-rr-user"
                }
                aria-hidden="true"
              />
              <span>
                {renderLocalizedText(
                  isTelegramFindingInstructors ? "Searching…" : "Extract",
                )}
              </span>
            </button>
          </div>
          <div className="nogaPlanner_homePanelCardBody nogaPlanner_aiHelperCardBody">
            <div className="nogaPlanner_aiCourseInfoTableWrapper">
              <table className="nogaPlanner_aiCourseInfoTable">
                <thead>
                  <tr>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("#")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("First Name")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("Last Name")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("Full Name")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("Personality")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("Evidence")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh">
                      {renderLocalizedText("Confidence")}
                    </th>
                    <th className="nogaPlanner_aiCourseInfoTh nogaPlanner_aiCourseInfoTh--actions" />
                  </tr>
                </thead>
                <tbody>
                  {instructors.length === 0 ? (
                    <tr>
                      <td
                        className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperEmptyCell"
                        colSpan={8}
                      >
                        {renderLocalizedText("No results yet")}
                      </td>
                    </tr>
                  ) : (
                    instructors.map((entry, idx) => {
                      const firstName = String(entry?.firstName || "").trim();
                      const lastName = String(entry?.lastName || "").trim();
                      const fullName = String(entry?.fullName || "").trim();
                      const displayFirst =
                        firstName || (fullName ? fullName.split(/\s+/)[0] : "—");
                      const displayLast =
                        lastName ||
                        (fullName ? fullName.split(/\s+/).slice(1).join(" ") : "") ||
                        "—";
                      const personality = String(entry?.personality || "").trim() || "—";
                      const evidence =
                        Array.isArray(entry?.evidence) && entry.evidence.length > 0
                          ? entry.evidence.join(" · ")
                          : "—";
                      const confidence = String(entry?.confidence || "").trim() || "—";
                      return (
                        <tr key={idx} className="nogaPlanner_aiCourseInfoTr">
                          <td className="nogaPlanner_aiCourseInfoTd">{idx + 1}</td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(displayFirst)}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(displayLast)}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(fullName || "—")}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(personality)}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(evidence)}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd">
                            {renderLocalizedText(confidence)}
                          </td>
                          <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperRowMinibar">
                            <button
                              type="button"
                              className="nogaPlanner_coursesMiniBarBtn"
                              onClick={() => {
                                const fn =
                                  firstName ||
                                  (fullName ? fullName.split(/\s+/)[0] : "");
                                const ln =
                                  lastName ||
                                  (fullName
                                    ? fullName.split(/\s+/).slice(1).join(" ")
                                    : "");
                                planner?.acceptAIInstructorName?.(fn, ln);
                              }}
                              title={renderLocalizedText("Accept")}
                            >
                              <i className="fi fi-rr-check" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NogaPlannerAIHelperPanel;

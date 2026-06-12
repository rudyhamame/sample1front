import React from "react";

const NogaPlannerAIHelperPanel = ({ planner }) => {
  const isTelegramExtractingCourseNames = Boolean(planner?.state?.isTelegramExtractingCourseNames);
  const isTelegramFindingInstructors = Boolean(planner?.state?.isTelegramFindingInstructors);
  const isTelegramExtractingCourseInfo = Boolean(planner?.state?.isTelegramExtractingCourseInfo);
  const telegramHasStoredGroups = Boolean(planner?.state?.telegramHasStoredGroups);
  const isBusy = isTelegramExtractingCourseNames || isTelegramFindingInstructors || isTelegramExtractingCourseInfo;

  const storedProgramAIExtractions = Array.isArray(planner?.state?.plannerRoot?.programAIExtractions)
    ? planner.state.plannerRoot.programAIExtractions
    : [];

  const latestCourseInfoEntry = storedProgramAIExtractions
    .slice()
    .reverse()
    .find((e) => Array.isArray(e?.subIntervalCourses) && e.subIntervalCourses.length > 0) || null;

  const subIntervalCourses = Array.isArray(latestCourseInfoEntry?.subIntervalCourses)
    ? latestCourseInfoEntry.subIntervalCourses
    : [];

  return (
    <section id="nogaPlanner_aiHelperPanel" className="nogaPlanner_aiHelperPanel">
      <div id="nogaPlanner_aiHelperPanel_main" className="nogaPlanner_aiHelperPanel_main">

        <div id="nogaPlanner_traces_aiGenerateContainer" className="nogaPlanner_tracesAiGenerateRow">
          <button
            id="nogaPlanner_traces_aiExtractCoursesBtn"
            type="button"
            className="nogaPlanner_tracesActionBtn"
            disabled={isBusy || !telegramHasStoredGroups}
            onClick={() => planner?.extractTelegramCourseNames?.()}
          >
            {isTelegramExtractingCourseNames ? "Extracting..." : "Extract course names"}
          </button>
          <button
            id="nogaPlanner_traces_aiExtractInstructorsBtn"
            type="button"
            className="nogaPlanner_tracesActionBtn"
            disabled={isBusy || !telegramHasStoredGroups}
            onClick={() => planner?.findTelegramInstructors?.()}
          >
            {isTelegramFindingInstructors ? "Searching..." : "Extract instructor names"}
          </button>
          <button
            id="nogaPlanner_traces_aiBuildCourseInfoBtn"
            type="button"
            className="nogaPlanner_tracesActionBtn"
            disabled={isBusy || !telegramHasStoredGroups}
            onClick={() => planner?.extractTelegramCourseInfo?.()}
          >
            {isTelegramExtractingCourseInfo ? "Building..." : "Build course info"}
          </button>
        </div>

        <div id="nogaPlanner_aiCourseInfoTable_card" className="nogaPlanner_homePanelCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>Course Info</strong>
          </div>
          <div className="nogaPlanner_aiCourseInfoTableWrapper">
            <table id="nogaPlanner_aiCourseInfoTable" className="nogaPlanner_aiCourseInfoTable">
              <thead>
                <tr>
                  <th className="nogaPlanner_aiCourseInfoTh">#</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Course Name</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Code</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Weight</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Components</th>
                  <th className="nogaPlanner_aiCourseInfoTh"></th>
                </tr>
              </thead>
              <tbody>
                {subIntervalCourses.map((course, idx) => {
                  const components = Array.isArray(course?.courseComponents)
                    ? course.courseComponents
                    : [];
                  return (
                    <tr key={idx} className="nogaPlanner_aiCourseInfoTr">
                      <td className="nogaPlanner_aiCourseInfoTd">{idx + 1}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">{String(course?.courseName || "").trim() || "—"}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">{String(course?.courseCode || "").trim() || "—"}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">{course?.courseWeight ?? "—"}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">
                        {components.length > 0 ? (
                          <ul className="nogaPlanner_aiCourseInfoComponentList">
                            {components.map((comp, cIdx) => (
                              <li key={cIdx} className="nogaPlanner_aiCourseInfoComponentItem">
                                <span className="nogaPlanner_aiCourseInfoComponentClass">
                                  {String(comp?.componentClass || "").trim() || "—"}
                                </span>
                                {comp?.componentWeight != null && (
                                  <span className="nogaPlanner_aiCourseInfoComponentWeight">
                                    {comp.componentWeight}%
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : "—"}
                      </td>
                      <td className="nogaPlanner_aiCourseInfoTd">
                        <button
                          type="button"
                          className="nogaPlanner_aiHistory_acceptBtn"
                          onClick={() => planner?.acceptAISubIntervalCourse?.(course)}
                        >
                          Accept
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="nogaPlanner_homePanelCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>AI History</strong>
          </div>
          <div className="nogaPlanner_homePanelCardStoredBlock">
            {storedProgramAIExtractions.length === 0 ? (
              <span className="nogaPlanner_homePanelCardEmptyValue">No AI extractions yet</span>
            ) : (
              <div className="nogaPlanner_aiHistory_list">
                {storedProgramAIExtractions
                  .slice()
                  .reverse()
                  .map((entry, idx) => {
                    const hasCourses = Array.isArray(entry?.coursesNameCode) && entry.coursesNameCode.length > 0;
                    const hasInstructors = Array.isArray(entry?.instructorsNames) && entry.instructorsNames.length > 0;
                    const hasCourseInfo = Array.isArray(entry?.subIntervalCourses) && entry.subIntervalCourses.length > 0;
                    const label = hasCourses ? "Courses" : hasInstructors ? "Instructors" : hasCourseInfo ? "Course Info" : "AI Extraction";
                    const key = `${label}_${idx}`;

                    return (
                      <div key={key} className="nogaPlanner_aiHistory_entry">
                        <div className="nogaPlanner_aiHistory_entryHeader">
                          <span className="nogaPlanner_aiHistory_goal">{label}</span>
                        </div>

                        {hasCourses && (
                          <ul className="nogaPlanner_aiHistory_items">
                            {entry.coursesNameCode.map((c, iIdx) => (
                              <li key={iIdx} className="nogaPlanner_aiHistory_item">
                                <span>
                                  {[String(c?.courseName || "").trim(), String(c?.courseCode || "").trim()]
                                    .filter(Boolean)
                                    .join(" — ")}
                                </span>
                                <button
                                  type="button"
                                  className="nogaPlanner_aiHistory_acceptBtn"
                                  onClick={() => planner?.acceptAICourseName?.(c?.courseName, c?.courseCode)}
                                >
                                  Accept
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {hasInstructors && (
                          <ul className="nogaPlanner_aiHistory_items">
                            {entry.instructorsNames.map((n, iIdx) => (
                              <li key={iIdx} className="nogaPlanner_aiHistory_item">
                                <span>
                                  {[String(n?.firstName || "").trim(), String(n?.lastName || "").trim()]
                                    .filter(Boolean)
                                    .join(" ")}
                                </span>
                                <button
                                  type="button"
                                  className="nogaPlanner_aiHistory_acceptBtn"
                                  onClick={() => planner?.acceptAIInstructorName?.(n?.firstName, n?.lastName)}
                                >
                                  Accept
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {hasCourseInfo && (
                          <ul className="nogaPlanner_aiHistory_items">
                            {entry.subIntervalCourses.map((c, iIdx) => (
                              <li key={iIdx} className="nogaPlanner_aiHistory_item">
                                <span>{String(c?.courseName || "").trim() || "—"}</span>
                                <button
                                  type="button"
                                  className="nogaPlanner_aiHistory_acceptBtn"
                                  onClick={() => planner?.acceptAISubIntervalCourse?.(c)}
                                >
                                  Accept
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default NogaPlannerAIHelperPanel;

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

  const latestCoursesEntry = storedProgramAIExtractions
    .slice().reverse()
    .find((e) => Array.isArray(e?.coursesNameCode) && e.coursesNameCode.length > 0) || null;
  const courseNames = Array.isArray(latestCoursesEntry?.coursesNameCode)
    ? latestCoursesEntry.coursesNameCode
    : [];

  const latestInstructorsEntry = storedProgramAIExtractions
    .slice().reverse()
    .find((e) => {
      const arr = Array.isArray(e?.programInstructorNames)
        ? e.programInstructorNames
        : Array.isArray(e?.instructorsNames)
          ? e.instructorsNames
          : [];
      return arr.length > 0;
    }) || null;
  const instructors = Array.isArray(latestInstructorsEntry?.programInstructorNames)
    ? latestInstructorsEntry.programInstructorNames
    : Array.isArray(latestInstructorsEntry?.instructorsNames)
      ? latestInstructorsEntry.instructorsNames
      : [];

  const latestCourseInfoEntry = storedProgramAIExtractions
    .slice().reverse()
    .find((e) => Array.isArray(e?.subIntervalCourses) && e.subIntervalCourses.length > 0) || null;
  const subIntervalCourses = Array.isArray(latestCourseInfoEntry?.subIntervalCourses)
    ? latestCourseInfoEntry.subIntervalCourses
    : [];

  return (
    <section id="nogaPlanner_aiHelperPanel" className="nogaPlanner_aiHelperPanel">
      <div id="nogaPlanner_aiHelperPanel_main" className="nogaPlanner_aiHelperPanel_main">

        {/* Card 1 — Extract course names */}
        <div className="nogaPlanner_homePanelCard nogaPlanner_aiHelperCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>Course Names</strong>
            <button
              type="button"
              className={"nogaPlanner_coursesMiniBarBtn nogaPlanner_aiHelperTriggerBtn" + (isTelegramExtractingCourseNames ? " nogaPlanner_coursesMiniBarBtn--active" : "")}
              disabled={isBusy || !telegramHasStoredGroups}
              onClick={() => planner?.extractTelegramCourseNames?.()}
              title="Extract course names"
            >
              <i className={isTelegramExtractingCourseNames ? "fi fi-rr-spinner nogaPlanner_aiHelperSpinner" : "fi fi-rr-magic-wand"} aria-hidden="true" />
              <span>{isTelegramExtractingCourseNames ? "Extracting…" : "Extract"}</span>
            </button>
          </div>
          <div className="nogaPlanner_aiCourseInfoTableWrapper">
            <table className="nogaPlanner_aiCourseInfoTable">
              <thead>
                <tr>
                  <th className="nogaPlanner_aiCourseInfoTh">#</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Course Name</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Code</th>
                  <th className="nogaPlanner_aiCourseInfoTh nogaPlanner_aiCourseInfoTh--actions" />
                </tr>
              </thead>
              <tbody>
                {courseNames.length === 0 ? (
                  <tr>
                    <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperEmptyCell" colSpan={4}>
                      No results yet
                    </td>
                  </tr>
                ) : courseNames.map((c, idx) => (
                  <tr key={idx} className="nogaPlanner_aiCourseInfoTr">
                    <td className="nogaPlanner_aiCourseInfoTd">{idx + 1}</td>
                    <td className="nogaPlanner_aiCourseInfoTd">{String(c?.courseName || "").trim() || "—"}</td>
                    <td className="nogaPlanner_aiCourseInfoTd">{String(c?.courseCode || "").trim() || "—"}</td>
                    <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperRowMinibar">
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={() => planner?.acceptAICourseName?.(c?.courseName, c?.courseCode)}
                        title="Accept"
                      >
                        <i className="fi fi-rr-check" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2 — Extract instructor names */}
        <div className="nogaPlanner_homePanelCard nogaPlanner_aiHelperCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>Instructors</strong>
            <button
              type="button"
              className={"nogaPlanner_coursesMiniBarBtn nogaPlanner_aiHelperTriggerBtn" + (isTelegramFindingInstructors ? " nogaPlanner_coursesMiniBarBtn--active" : "")}
              disabled={isBusy || !telegramHasStoredGroups}
              onClick={() => planner?.findTelegramInstructors?.()}
              title="Extract instructor names"
            >
              <i className={isTelegramFindingInstructors ? "fi fi-rr-spinner nogaPlanner_aiHelperSpinner" : "fi fi-rr-user"} aria-hidden="true" />
              <span>{isTelegramFindingInstructors ? "Searching…" : "Extract"}</span>
            </button>
          </div>
          <div className="nogaPlanner_aiCourseInfoTableWrapper">
            <table className="nogaPlanner_aiCourseInfoTable">
              <thead>
                <tr>
                  <th className="nogaPlanner_aiCourseInfoTh">#</th>
                  <th className="nogaPlanner_aiCourseInfoTh">First Name</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Last Name</th>
                  <th className="nogaPlanner_aiCourseInfoTh nogaPlanner_aiCourseInfoTh--actions" />
                </tr>
              </thead>
              <tbody>
                {instructors.length === 0 ? (
                  <tr>
                    <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperEmptyCell" colSpan={4}>
                      No results yet
                    </td>
                  </tr>
                ) : instructors.map((n, idx) => {
                  const firstName = String(n?.firstName || "").trim();
                  const lastName = String(n?.lastName || "").trim();
                  const fullName = String(n?.fullName || "").trim();
                  const displayFirst = firstName || (fullName ? fullName.split(/\s+/)[0] : "—");
                  const displayLast = lastName || (fullName ? fullName.split(/\s+/).slice(1).join(" ") : "") || "—";
                  return (
                    <tr key={idx} className="nogaPlanner_aiCourseInfoTr">
                      <td className="nogaPlanner_aiCourseInfoTd">{idx + 1}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">{displayFirst}</td>
                      <td className="nogaPlanner_aiCourseInfoTd">{displayLast}</td>
                      <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperRowMinibar">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={() => {
                            const fn = firstName || (fullName ? fullName.split(/\s+/)[0] : "");
                            const ln = lastName || (fullName ? fullName.split(/\s+/).slice(1).join(" ") : "");
                            planner?.acceptAIInstructorName?.(fn, ln);
                          }}
                          title="Accept"
                        >
                          <i className="fi fi-rr-check" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3 — Build course info */}
        <div className="nogaPlanner_homePanelCard nogaPlanner_aiHelperCard">
          <div className="nogaPlanner_homePanelCardTitleRow">
            <strong>Course Info</strong>
            <button
              type="button"
              className={"nogaPlanner_coursesMiniBarBtn nogaPlanner_aiHelperTriggerBtn" + (isTelegramExtractingCourseInfo ? " nogaPlanner_coursesMiniBarBtn--active" : "")}
              disabled={isBusy || !telegramHasStoredGroups}
              onClick={() => planner?.extractTelegramCourseInfo?.()}
              title="Build course info"
            >
              <i className={isTelegramExtractingCourseInfo ? "fi fi-rr-spinner nogaPlanner_aiHelperSpinner" : "fi fi-rr-hammer"} aria-hidden="true" />
              <span>{isTelegramExtractingCourseInfo ? "Building…" : "Build"}</span>
            </button>
          </div>
          <div className="nogaPlanner_aiCourseInfoTableWrapper">
            <table className="nogaPlanner_aiCourseInfoTable">
              <thead>
                <tr>
                  <th className="nogaPlanner_aiCourseInfoTh">#</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Course Name</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Code</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Weight</th>
                  <th className="nogaPlanner_aiCourseInfoTh">Components</th>
                  <th className="nogaPlanner_aiCourseInfoTh nogaPlanner_aiCourseInfoTh--actions" />
                </tr>
              </thead>
              <tbody>
                {subIntervalCourses.length === 0 ? (
                  <tr>
                    <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperEmptyCell" colSpan={6}>
                      No results yet
                    </td>
                  </tr>
                ) : subIntervalCourses.map((course, idx) => {
                  const components = Array.isArray(course?.courseComponents) ? course.courseComponents : [];
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
                      <td className="nogaPlanner_aiCourseInfoTd nogaPlanner_aiHelperRowMinibar">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={() => planner?.acceptAISubIntervalCourse?.(course)}
                          title="Accept"
                        >
                          <i className="fi fi-rr-check" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};

export default NogaPlannerAIHelperPanel;

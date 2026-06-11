import React from "react";

const NogaPlannerAIHelperPanel = ({ planner }) => {
  const storedProgramAIExtractions = Array.isArray(
    planner?.state?.plannerRoot?.programAIExtractions,
  )
    ? planner.state.plannerRoot.programAIExtractions
    : [];

  const quickActions = [
    {
      label: "Home",
      description: "Jump back to the program setup and interval tools.",
      onClick: () => planner?.handleWrapperTabChange?.("home"),
    },
    {
      label: "Study Materials",
      description: "Open Telegram-backed study materials and AI extraction tools.",
      onClick: () => planner?.handleWrapperTabChange?.("traces"),
    },
    {
      label: "Plan",
      description: "Return to the study plan calendar.",
      onClick: () => planner?.handleWrapperTabChange?.("plan"),
    },
    {
      label: "Settings",
      description: "Open planner settings and registry options.",
      onClick: () => planner?.handleWrapperTabChange?.("settings"),
    },
  ];

  return (
    <section id="nogaPlanner_aiHelperPanel" className="nogaPlanner_aiHelperPanel">
      <div className="nogaPlanner_homePanelCard">
        <div className="nogaPlanner_homePanelCardTitleRow">
          <strong>AI Helper</strong>
        </div>
        <div className="nogaPlanner_homePanelCardStoredBlock">
          <p className="nogaPlanner_aiHelperIntro">
            Use this tab to review the planner&apos;s stored AI extraction history
            and jump to the places where AI-assisted actions live.
          </p>
          <div className="nogaPlanner_aiHelperQuickActions">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="nogaPlanner_homePanelCardSetBtn"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nogaPlanner_homePanelCard">
        <div className="nogaPlanner_homePanelCardTitleRow">
          <strong>AI History</strong>
        </div>
        <div className="nogaPlanner_homePanelCardStoredBlock">
          {storedProgramAIExtractions.length === 0 ? (
            <span className="nogaPlanner_homePanelCardEmptyValue">
              No AI extractions yet
            </span>
          ) : (
            <div className="nogaPlanner_aiHistory_list">
              {storedProgramAIExtractions
                .slice()
                .reverse()
                .map((entry, idx) => {
                  const goal = String(entry?.extractionGoal || "").trim();
                  const items = Array.isArray(entry?.extractionItems)
                    ? entry.extractionItems
                    : [];
                  const ts = String(entry?.extractionTimestamp || "").trim();
                  const displayTs = ts
                    ? (() => {
                        try {
                          return new Date(ts).toLocaleString();
                        } catch (_) {
                          return ts;
                        }
                      })()
                    : "";
                  const key = `${goal}_${ts}_${idx}`;
                  return (
                    <div key={key} className="nogaPlanner_aiHistory_entry">
                      <div className="nogaPlanner_aiHistory_entryHeader">
                        <span className="nogaPlanner_aiHistory_goal">
                          {goal === "instructors"
                            ? "Instructors"
                            : goal === "courses"
                              ? "Courses"
                              : goal || "AI Extraction"}
                        </span>
                        {displayTs ? (
                          <span className="nogaPlanner_aiHistory_ts">
                            {displayTs}
                          </span>
                        ) : null}
                      </div>
                      {items.length > 0 ? (
                        <ul className="nogaPlanner_aiHistory_items">
                          {items.map((item, itemIndex) => (
                            <li
                              key={itemIndex}
                              className="nogaPlanner_aiHistory_item"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NogaPlannerAIHelperPanel;

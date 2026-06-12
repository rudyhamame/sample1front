const PLANNER_COUNTDOWN_EVENT = "planner-countdown-change";
const PLANNER_ACTIVE_EVENT = "noga-planner-active";

let _endIso = null;
let _isActive = false;

export const updatePlannerCountdownEndDate = (isoDate) => {
  const next = typeof isoDate === "string" ? isoDate.trim() : null;
  _endIso = next || null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PLANNER_COUNTDOWN_EVENT, { detail: { endIso: _endIso, active: _isActive } }),
    );
  }
};

export const setPlannerActive = (active) => {
  _isActive = Boolean(active);
  if (!_isActive) _endIso = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PLANNER_ACTIVE_EVENT, { detail: { active: _isActive, endIso: _endIso } }),
    );
  }
};

export const getPlannerCountdownEndDate = () => _endIso;
export const isPlannerActive = () => _isActive;

export { PLANNER_COUNTDOWN_EVENT, PLANNER_ACTIVE_EVENT };

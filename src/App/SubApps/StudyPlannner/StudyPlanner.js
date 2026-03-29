import React from "react";
import SchoolPlannerEn from "../../../SchoolPlanner/SchoolPlanner_en";
import SchoolPlannerAr from "../../../SchoolPlanner/SchoolPlanner_ar";

const StudyPlanner = (props) => {
  const PlannerComponent = props.locale === "ar" ? SchoolPlannerAr : SchoolPlannerEn;

  return (
    <PlannerComponent
      state={props.state}
      locale={props.locale === "ar" ? "ar" : "en"}
      logOut={props.logOut}
      acceptFriend={props.acceptFriend}
      type={props.type}
      show_profile={props.show_profile}
      memory={props.memory}
      serverReply={props.serverReply}
    />
  );
};

export default StudyPlanner;

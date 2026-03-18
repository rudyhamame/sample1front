//..............IMPORT................
import React, { Component } from "react";
import "./schoolPlanner.css";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { apiUrl } from "../../../../../config/api";
//.........VARIABLES................
var courses = [];
var lectures = [];
var courses_partOfPlan = [];
var checkedLectures = [];
var checkedCourses = [];
var courseDayAndTime = [];
var courseExams = [];
var lectureOutlines = [];
var courseNames = [];
var courseNames_filtered = [];
var courseInstructorsNames = [];
var courseInstructorsNames_filtered = [];
var target_editCourse;
var selectedLecture;
var course_pages = [];
var lectureInEdit = {};

var timezone = new Date().getTimezoneOffset();
var todayDate = Date.now() - timezone * 60000;

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProgressStats = (progressValue, lengthValue) => {
  const progress = Math.max(0, toSafeNumber(progressValue));
  const length = Math.max(0, toSafeNumber(lengthValue));
  const remaining = Math.max(0, length - progress);
  const percent = length > 0 ? Math.round((progress * 100) / length) : 0;

  return {
    progress,
    length,
    remaining,
    percent,
    indicatorWidth: (150 * percent) / 100,
  };
};

const getSafePagesPerDay = (lengthValue, progressValue, daysValue) => {
  const length = toSafeNumber(lengthValue);
  const progress = toSafeNumber(progressValue);
  const days = Math.max(0, toSafeNumber(daysValue));

  if (days <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((length - progress) / days));
};

const getPrimaryCourseExam = (examEntries = []) => {
  const firstExam = examEntries[0] || {};

  return {
    exam_type: firstExam.exam_type || "-",
    exam_date: firstExam.exam_date || "-",
    exam_time: firstExam.exam_time || "-",
    course_grade: firstExam.course_grade || "",
    course_fullGrade: firstExam.course_fullGrade || "",
  };
};

const formatExamDateParts = (value) => {
  if (!value || value === "-") {
    return { day: "", month: "", year: "" };
  }

  const dateParts = String(value).split("-");
  if (dateParts.length === 3) {
    return {
      year: dateParts[0] || "",
      month: dateParts[1] || "",
      day: dateParts[2] || "",
    };
  }

  return { day: "", month: "", year: "" };
};

const buildExamDateValue = ({ day, month, year }) => {
  const normalizedDay = String(day || "").trim();
  const normalizedMonth = String(month || "").trim();
  const normalizedYear = String(year || "").trim();

  if (!normalizedDay || !normalizedMonth || !normalizedYear) {
    return "";
  }

  return `${normalizedYear.padStart(4, "0")}-${normalizedMonth.padStart(2, "0")}-${normalizedDay.padStart(2, "0")}`;
};

const formatExamTimeParts = (value) => {
  if (!value || value === "-") {
    return { hour: "", minute: "" };
  }

  const timeParts = String(value).split(":");
  return {
    hour: timeParts[0] || "",
    minute: timeParts[1] || "",
  };
};

const buildExamTimeValue = ({ hour, minute }) => {
  const normalizedHour = String(hour || "").trim();
  const normalizedMinute = String(minute || "").trim();

  if (!normalizedHour || !normalizedMinute) {
    return "";
  }

  return `${normalizedHour.padStart(2, "0")}:${normalizedMinute.padStart(2, "0")}`;
};

const getCourseDueText = (course) => {
  const examDateinMillisec = new Date(course.exam_date);
  const diffDaysWithDecimals = (examDateinMillisec - todayDate) / 86400000;
  const diffDaysWithoutDecimals = Math.floor(diffDaysWithDecimals);
  const dayDecimals = diffDaysWithDecimals - diffDaysWithoutDecimals;
  const diffHoursWithDecimals = dayDecimals * 24;
  const diffHoursWithoutDecimals = Math.floor(diffHoursWithDecimals);
  const hourDecimals = diffHoursWithDecimals - diffHoursWithoutDecimals;
  const diffMinsWithDecimals = hourDecimals * 60;
  const diffMinsWithoutDecimals = Math.ceil(diffMinsWithDecimals);
  const examTime_hour = Number(String(course.exam_time).split(":")[0]);
  const examTime_mins = Number(String(course.exam_time).split(":")[1]);

  if (!Number.isFinite(diffDaysWithoutDecimals)) {
    return "-";
  }

  return (
    "Due in " +
    diffDaysWithoutDecimals +
    " day(s) and " +
    diffHoursWithoutDecimals +
    " hour(s) and " +
    diffMinsWithoutDecimals +
    " min(s) with " +
    examTime_hour +
    " more hour(s) and " +
    examTime_mins +
    " min(s) on the exam day"
  );
};

//..................................

export default class SchoolPlanner extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lectures: [],
      courses: [],
      course_isLoading: false,
      lecture_isLoading: false,
    };
  }

  componentDidMount() {
    this.retrieveLectures();
    this.retrieveCourses();
  }

  setPageFinishLecture = async (lecture, pageNum, boolean) => {
    let div_progression = document.getElementById("div_progression");
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/setPageFinishLecture/") +
      this.props.state.my_id +
      "/" +
      lecture._id +
      "/" +
      boolean;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageNum: pageNum,
      }),
    };
    let req = new Request(url, options);
    await fetch(req)
      .then((result) => {
        if (result.status === 201) {
          return result.json();
        }
      })
      .then((result) => {
        let lecture = result.lectureFound;
        this.setState({
          lecture_isLoading: false,
        });
        let p_progression = div_progression.children[1];
        let div_indicator_progression = div_progression.children[2].children[0];
        let progressionStats = getProgressStats(
          lecture.lecture_progress,
          lecture.lecture_length,
        );
        p_progression.textContent = String(
          progressionStats.length +
            " (" +
            progressionStats.progress +
            " : " +
            progressionStats.remaining +
            " | " +
            progressionStats.percent +
            "%)",
        );
        div_indicator_progression.style.width =
          progressionStats.indicatorWidth + "px";
        if (progressionStats.percent < 50)
          div_indicator_progression.style.backgroundColor = "var(--red2)";
      });
  };
  hideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/hideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
      }
    });
  };
  unhideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/unhideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
      }
    });
  };

  calculateLectureNum = () => {
    let ul_lectures_array = document.getElementById(
      "schoolPlanner_lectures_ul",
    ).children;
    let p_num = document.getElementById("schoolPlanner_lectures_num_p");
    p_num.textContent = Number(ul_lectures_array.length);
  };

  openAddLectureForm = (object) => {
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "flex";
    document.getElementById(
      "schoolPlanner_addLecture_addButton_label",
    ).textContent = object.buttonName;
    //.........
    if (object.buttonName === "Add") {
      lectureOutlines = [];
      document.getElementById("schoolPlanner_addLecture_name_input").value = "";
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        "Lecture course";
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = "Lecture instructor name";
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = "";
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        "Lecture date";
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        "";
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";
    }
    if (object.buttonName === "Edit") {
      selectedLecture = object._id;
      lectureOutlines = object.lecture_outlines;
      document.getElementById("schoolPlanner_addLecture_name_input").value =
        object.lecture_name;
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        object.lecture_course;
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = object.lecture_instructor;
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = object.lecture_writer;
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        object.lecture_date;
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        object.lecture_length;
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";

      this.retrieveLectureOutlines();
    }
  };
  closeAddLectureForm = () => {
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "none";
  };
  openAddCourseForm = (object) => {
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "flex";
    document.getElementById(
      "schoolPlanner_addCourse_addButton_label",
    ).textContent = object.buttonName;
    if (object.buttonName === "Add") {
      courseDayAndTime = [];
      courseInstructorsNames = [];
      courseExams = [];
      document.getElementById("schoolPlanner_addCourse_name_input").value = "";
      document.getElementById("schoolPlanner_addCourse_component_input").value =
        "Course component";
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      document.getElementById("schoolPlanner_addCourse_year_input").value =
        "Course year";
      document.getElementById("schoolPlanner_addCourse_term_input").value =
        "Course term";
      document.getElementById("schoolPlanner_addCourse_class_input").value =
        "Course classification";
      document.getElementById("schoolPlanner_addCourse_status_input").value =
        "Course status";
      document.getElementById("schoolPlanner_addCourse_grade_input").value = "";
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        "";
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorName_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorsNames_ul",
      ).innerHTML = "";
      document.getElementById(
        "schoolPlanner_addCourse_dayAndTime_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_exams_ul").innerHTML =
        "";
    }
    if (object.buttonName === "Edit") {
      courseDayAndTime = object.course.course_dayAndTime;
      courseInstructorsNames = object.course.course_instructors;
      courseExams =
        object.course.course_exams && object.course.course_exams.length > 0
          ? object.course.course_exams
          : object.course.exam_date ||
              object.course.exam_time ||
              object.course.exam_type ||
              object.course.course_grade ||
              object.course.course_fullGrade
            ? [
                {
                  exam_type: object.course.exam_type || "-",
                  exam_date: object.course.exam_date || "-",
                  exam_time: object.course.exam_time || "-",
                  course_grade: object.course.course_grade || "",
                  course_fullGrade: object.course.course_fullGrade || "",
                },
              ]
            : [];
      //.........
      document.getElementById("schoolPlanner_addCourse_name_input").value =
        object.course.course_name.split(" (")[0];
      document.getElementById("schoolPlanner_addCourse_component_input").value =
        object.course.course_component;
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_dayAndTime_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_year_input").value =
        object.course.course_year;
      document.getElementById("schoolPlanner_addCourse_term_input").value =
        object.course.course_term;
      document.getElementById("schoolPlanner_addCourse_class_input").value =
        object.course.course_class;
      document.getElementById("schoolPlanner_addCourse_status_input").value =
        object.course.course_status;
      document.getElementById(
        "schoolPlanner_addCourse_instructorName_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorsNames_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_grade_input").value =
        object.course.course_grade;
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        object.course.course_fullGrade;
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        object.course.exam_type || "Exam type";
      const examDateParts = formatExamDateParts(object.course.exam_date);
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = examDateParts.day;
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = examDateParts.month;
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = examDateParts.year;
      const examTimeParts = formatExamTimeParts(object.course.exam_time);
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = examTimeParts.hour;
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = examTimeParts.minute;
      //................
      this.retrieveCourseDayAndTime();
      this.retrieveCourseInstructorsNames();
      this.retrieveCourseExams();
    }
  };
  closeAddCourseForm = () => {
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
  };
  addCourseDayAndTime = (object) => {
    if (object.day && object.time) {
      courseDayAndTime.push({
        day: object.day,
        time: object.time,
      });
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      this.retrieveCourseDayAndTime();
    }
  };

  addLectureOutline = () => {
    let outline = document.getElementById(
      "schoolPlanner_addLecture_outlines_input",
    ).value;
    lectureOutlines.push(outline);
    this.retrieveLectureOutlines();
  };

  addCourseInstructorsNames = () => {
    let instructorName = document.getElementById(
      "schoolPlanner_addCourse_instructorName_input",
    ).value;
    courseInstructorsNames.push(instructorName);
    this.retrieveCourseInstructorsNames();
  };
  addCourseExam = () => {
    const exam_type = document.getElementById(
      "schoolPlanner_addCourse_examType_input",
    ).value;
    const exam_date = buildExamDateValue({
      day: document.getElementById("schoolPlanner_addCourse_examDate_day_input")
        .value,
      month: document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value,
      year: document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value,
    });
    const exam_time = buildExamTimeValue({
      hour: document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value,
      minute: document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value,
    });
    const course_grade = document.getElementById(
      "schoolPlanner_addCourse_grade_input",
    ).value;
    const course_fullGrade = document.getElementById(
      "schoolPlanner_addCourse_fullGrade_input",
    ).value;

    if (exam_type && exam_date && exam_time) {
      courseExams.push({
        exam_type,
        exam_date,
        exam_time,
        course_grade,
        course_fullGrade,
      });
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById("schoolPlanner_addCourse_grade_input").value = "";
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        "";
      this.retrieveCourseExams();
    }
  };
  retrieveCourseDayAndTime = () => {
    var courseDayAndTime_ul = document.getElementById(
      "schoolPlanner_addCourse_dayAndTime_ul",
    );
    courseDayAndTime_ul.innerHTML = "";
    for (var i = 0; i < courseDayAndTime.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_dayAndTime = document.createElement("div");

      p.textContent = courseDayAndTime[i].day + " " + courseDayAndTime[i].time;

      deleteIcon.setAttribute("class", "fa fa-close");
      deleteIcon.setAttribute("id", i + "DIdayAndTime");
      div_dayAndTime.setAttribute(
        "class",
        "schoolPlanner_addCourse_dayAndTime_div fr",
      );

      const removeDayAndTimeItem = () => {
        div_dayAndTime.remove();
        courseDayAndTime.splice(parseInt(deleteIcon.id), 1);
      };

      deleteIcon.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      p.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      div_dayAndTime.append(deleteIcon, p);
      courseDayAndTime_ul.appendChild(div_dayAndTime);
    }
  };
  retrieveLectureOutlines = () => {
    var ul_outlines = document.getElementById(
      "schoolPlanner_addLecture_outlines_ul",
    );
    ul_outlines.innerHTML = "";
    for (var i = 0; i < lectureOutlines.length; i++) {
      let p_lectureOutlines = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_lectureOutlines = document.createElement("div");

      p_lectureOutlines.textContent = lectureOutlines[i];

      div_lectureOutlines.setAttribute(
        "class",
        "schoolPlanner_addCourse_outlines_div fr",
      );
      deleteIcon.setAttribute("class", "fa fa-close");
      deleteIcon.setAttribute("id", i + "DIlectureOutlines");
      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        lectureOutlines.splice(parseInt(deleteIcon.id), 1);
      });
      div_lectureOutlines.append(deleteIcon, p_lectureOutlines);
      ul_outlines.append(div_lectureOutlines);
    }
  };
  retrieveCourseInstructorsNames = () => {
    let courseInstructorsNames_ul = document.getElementById(
      "schoolPlanner_addCourse_instructorsNames_ul",
    );
    courseInstructorsNames_ul.innerHTML = "";
    for (var i = 0; i < courseInstructorsNames.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_instructorsNames = document.createElement("div");

      p.textContent = courseInstructorsNames[i];

      deleteIcon.setAttribute("class", "fa fa-close");
      deleteIcon.setAttribute("id", i + "DIinstructorsNames");
      div_instructorsNames.setAttribute(
        "class",
        "schoolPlanner_addCourse_instructorsNames_div fr",
      );

      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        courseInstructorsNames.splice(parseInt(deleteIcon.id), 1);
      });
      div_instructorsNames.append(deleteIcon, p);
      courseInstructorsNames_ul.appendChild(div_instructorsNames);
    }
  };
  retrieveCourseExams = () => {
    let courseExams_ul = document.getElementById(
      "schoolPlanner_addCourse_exams_ul",
    );
    courseExams_ul.innerHTML = "";
    for (var i = 0; i < courseExams.length; i++) {
      const examIndex = i;
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_exam = document.createElement("div");

      p.textContent =
        courseExams[i].exam_type +
        " | " +
        courseExams[i].exam_date +
        " | " +
        courseExams[i].exam_time +
        " | " +
        courseExams[i].course_grade +
        "/" +
        courseExams[i].course_fullGrade;

      deleteIcon.setAttribute("class", "fa fa-close");
      div_exam.setAttribute("class", "schoolPlanner_addCourse_exams_div fr");

      const removeCourseExamItem = () => {
        courseExams.splice(examIndex, 1);
        this.retrieveCourseExams();
      };

      deleteIcon.addEventListener("click", () => {
        removeCourseExamItem();
      });
      p.addEventListener("click", () => {
        removeCourseExamItem();
      });
      div_exam.append(deleteIcon, p);
      courseExams_ul.appendChild(div_exam);
    }
  };
  renderCourseDetailsCard = (course) => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    if (!detailsDiv) return;

    detailsDiv.innerHTML = "";

    if (!course) {
      let emptyState = document.createElement("p");
      emptyState.setAttribute("id", "schoolPlanner_courses_emptyState");
      emptyState.textContent = "Select a course to view its details.";
      detailsDiv.appendChild(emptyState);
      return;
    }

    const courseProgressStats = getProgressStats(
      course.course_progress,
      course.course_length,
    );
    const courseRows = [
      ["Course name", course.course_name || "-"],
      [
        "Course time",
        course.course_dayAndTime?.length
          ? course.course_dayAndTime
              .map((entry) => `${entry.day} ${entry.time}`)
              .join(" | ")
          : "-",
      ],
      [
        "Course year/term",
        `${course.course_term || "-"} ${course.course_year || "-"}`.trim(),
      ],
      ["Course class", course.course_class || "-"],
      ["Course status", course.course_status || "-"],
      [
        "Course instructors",
        course.course_instructors?.length
          ? course.course_instructors.join(" | ")
          : "-",
      ],
      [
        "Actual grade",
        `${course.course_grade || "-"} / ${course.course_fullGrade || "-"}`,
      ],
      [
        "Course pages",
        `${courseProgressStats.progress}/${courseProgressStats.length} (${courseProgressStats.percent}%)`,
      ],
      [
        "Target pages to study per day",
        String(
          getSafePagesPerDay(
            course.course_length,
            course.course_progress,
            Math.floor((new Date(course.exam_date) - todayDate) / 86400000),
          ),
        ),
      ],
    ];
    const examEntries =
      course.course_exams && course.course_exams.length > 0
        ? course.course_exams
        : course.exam_date || course.exam_time || course.exam_type
          ? [
              {
                exam_type: course.exam_type || "-",
                exam_date: course.exam_date || "-",
                exam_time: course.exam_time || "-",
                course_grade: course.course_grade || "-",
                course_fullGrade: course.course_fullGrade || "-",
              },
            ]
          : [];

    let actionsRow = document.createElement("div");
    actionsRow.setAttribute("id", "schoolPlanner_courses_actions");

    let editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      target_editCourse = course._id;
      this.openAddCourseForm({
        buttonName: "Edit",
        course: course,
      });
    });

    let deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      this.deleteCourseById(course._id);
    });

    let planButton = document.createElement("button");
    planButton.type = "button";
    planButton.textContent = course.course_partOfPlan
      ? "Remove From Plan"
      : "Add To Plan";
    planButton.addEventListener("click", () => {
      target_editCourse = course._id;
      this.partOfPlanCourse(
        course,
        `${course._id}menu_partOfPlan`,
        !course.course_partOfPlan,
      );
    });

    actionsRow.append(editButton, deleteButton, planButton);
    detailsDiv.appendChild(actionsRow);

    let courseSectionTitle = document.createElement("h3");
    courseSectionTitle.setAttribute(
      "class",
      "schoolPlanner_courses_sectionTitle",
    );
    courseSectionTitle.textContent = "Course information";
    detailsDiv.appendChild(courseSectionTitle);

    courseRows.forEach(([labelText, valueText]) => {
      let row = document.createElement("div");
      row.setAttribute("class", "schoolPlanner_courseDetail_row");

      let label = document.createElement("p");
      label.textContent = labelText;

      let value = document.createElement("p");
      value.textContent = valueText;

      row.append(label, value);
      detailsDiv.appendChild(row);
    });

    let examSectionTitle = document.createElement("h3");
    examSectionTitle.setAttribute(
      "class",
      "schoolPlanner_courses_sectionTitle",
    );
    examSectionTitle.textContent = "Exam information";
    detailsDiv.appendChild(examSectionTitle);

    let examBlock = document.createElement("div");
    examBlock.setAttribute("id", "schoolPlanner_courses_examBlock");

    if (examEntries.length === 0) {
      let emptyExamState = document.createElement("p");
      emptyExamState.setAttribute("id", "schoolPlanner_courses_examEmpty");
      emptyExamState.textContent = "No exam entries.";
      examBlock.appendChild(emptyExamState);
    } else {
      let examList = document.createElement("ul");
      examList.setAttribute("id", "schoolPlanner_courses_exam_ul");

      examEntries.forEach((examEntry) => {
        let examItem = document.createElement("li");
        examItem.setAttribute("class", "schoolPlanner_courses_exam_li");

        const examRows = [
          ["Exam type", examEntry.exam_type || "-"],
          ["Exam date", examEntry.exam_date || "-"],
          ["Exam time", examEntry.exam_time || "-"],
          [
            "Grades",
            `${examEntry.course_grade || "-"} / ${examEntry.course_fullGrade || "-"}`,
          ],
          [
            "Exam due",
            getCourseDueText({
              ...course,
              exam_date: examEntry.exam_date,
              exam_time: examEntry.exam_time,
            }),
          ],
        ];

        examRows.forEach(([labelText, valueText]) => {
          let row = document.createElement("div");
          row.setAttribute(
            "class",
            "schoolPlanner_courseDetail_row schoolPlanner_courseDetail_row_exam",
          );

          let label = document.createElement("p");
          label.textContent = labelText;

          let value = document.createElement("p");
          value.textContent = valueText;

          row.append(label, value);
          examItem.appendChild(row);
        });

        examList.appendChild(examItem);
      });

      examBlock.appendChild(examList);
    }

    detailsDiv.appendChild(examBlock);
  };

  retrieveLecturesSearched = (searchKeyword) => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("schoolPlanner_lectures_ul");
    ul.innerHTML = "";
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          if (searchKeyword) {
            if (
              String(lecture.lecture_name).includes(searchKeyword) ||
              String(lecture.lecture_course).includes(searchKeyword) ||
              String(lecture.lecture_instructor).includes(searchKeyword) ||
              String(lecture.lecture_outlines).includes(searchKeyword)
            ) {
              let progressionStats = getProgressStats(
                lecture.lecture_progress,
                lecture.lecture_length,
              );
              lecture_courses.push(lecture.lecture_course);
              let p1 = document.createElement("p");
              let p2 = document.createElement("p");
              let p3 = document.createElement("p");
              let p4 = document.createElement("p");
              let p5 = document.createElement("p");

              let p_progression = document.createElement("p");
              let div_indicatorBox_progression = document.createElement("div");
              let div_indicator_progression = document.createElement("div");
              let ul_pages_finished = document.createElement("ul");
              let div_progression = document.createElement("div");

              let div_outline = document.createElement("div");
              let checkBox_partOfPlan = document.createElement("input");
              let div_partOfPlan = document.createElement("div");
              let div_pLi = document.createElement("div");

              let li = document.createElement("li");
              let menu_div = document.createElement("div");
              let menu_subdiv = document.createElement("div");
              let menu_showIcon = document.createElement("i");
              let menu_selectIcon = document.createElement("i");
              let menu_deleteIcon = document.createElement("i");
              let menu_editIcon = document.createElement("i");
              let menuLi_div = document.createElement("div");

              p1.textContent = lecture.lecture_name;
              p2.textContent = lecture.lecture_course;
              p3.textContent = lecture.lecture_instructor;
              p4.textContent = lecture.lecture_writer;
              p5.textContent = lecture.lecture_date;
              p_progression.textContent = String(
                progressionStats.length +
                  " (" +
                  progressionStats.progress +
                  " : " +
                  progressionStats.remaining +
                  " | " +
                  progressionStats.percent +
                  "%)",
              );

              for (var i = 0; i < lecture.lecture_outlines.length; i++) {
                let p = document.createElement("p");
                p.textContent =
                  Number(i + 1) + ") " + lecture.lecture_outlines[i];
                div_outline.append(p);
              }
              div_pLi.setAttribute("class", "schoolPlanner_lectures_div_pLi");

              li.setAttribute("class", "schoolPlanner_lectures_li fc");
              li.setAttribute("id", lecture._id + "li");
              menu_showIcon.setAttribute(
                "class",
                "fa fa-sharp fa-solid fa-bars",
              );
              menu_showIcon.setAttribute("id", lecture._id + "menu_showIcon");
              menu_showIcon.setAttribute("title", "");
              menu_editIcon.setAttribute("title", "");
              menu_selectIcon.setAttribute(
                "class",
                "fa fa-sharp fa-solid fa-check",
              );
              menu_selectIcon.setAttribute("title", "");
              menu_selectIcon.setAttribute(
                "id",
                lecture._id + "menu_selectIcon",
              );
              menu_deleteIcon.setAttribute(
                "class",
                "fa fa-sharp fa-solid fa-trash",
              );
              menu_editIcon.setAttribute(
                "class",
                "fa fa-sharp fa-solid fa-pencil",
              );
              div_outline.setAttribute("class", "div_outline fc");

              checkBox_partOfPlan.type = "checkbox";
              div_partOfPlan.setAttribute("class", "div_partOfPlan fc");
              checkBox_partOfPlan.setAttribute(
                "id",
                lecture._id + "checkBox_partOfPlan",
              );

              if (lecture.lecture_partOfPlan === true)
                checkBox_partOfPlan.checked = true;

              div_indicatorBox_progression.setAttribute(
                "class",
                "div_indicatorBox_progression",
              );
              div_indicator_progression.setAttribute(
                "class",
                "div_indicator_progression",
              );
              div_indicator_progression.setAttribute(
                "id",
                lecture._id + "div_indicator_progression",
              );
              ul_pages_finished.setAttribute("class", "ul_pages_finished");
              div_progression.setAttribute("class", "div_progression fc");

              menu_div.setAttribute("class", "fr lecuturesTable_menu_div");
              menu_subdiv.setAttribute(
                "class",
                "fr lecuturesTable_menu_subdiv",
              );
              menu_subdiv.setAttribute("id", lecture._id + "menu_subdiv");
              menuLi_div.setAttribute("class", "menuLi_div fr");
              menuLi_div.setAttribute("id", lecture._id + "menuLi_div");
              menu_editIcon.setAttribute("id", lecture._id + "menu_editIcon");

              //........Progression logic
              div_indicator_progression.style.width =
                progressionStats.indicatorWidth + "px";
              if (progressionStats.percent < 50)
                div_indicator_progression.style.backgroundColor = "var(--red2)";
              //........
              //.......PagesFinished Logic
              for (var i = 0; i < lecture.lecture_length; i++) {
                let p_num = document.createElement("p");
                p_num.textContent = Number(i + 1);
                p_num.addEventListener("click", () => {
                  let p_num_color = getComputedStyle(p_num).color;
                  alert(p_num_color);
                });
                ul_pages_finished.append(p_num);
              }
              //...........
              menu_showIcon.addEventListener("click", () => {
                let menu_showIcon = document.getElementById(
                  lecture._id + "menu_showIcon",
                );
                let menu_subdiv = document.getElementById(
                  lecture._id + "menu_subdiv",
                );
                if (menu_showIcon.title === "") {
                  menu_subdiv.style.width = "15%";
                  menu_showIcon.title = "clicked";
                } else {
                  menu_subdiv.style.width = "0";
                  menu_showIcon.title = "";
                }
              });

              //.............EDIT FUNCTION
              menu_editIcon.addEventListener("click", () => {
                document.getElementById(
                  lecture._id + "menu_subdiv",
                ).style.width = "0";
                this.openAddLectureForm({
                  buttonName: "Edit",
                  _id: lecture._id,
                  lecture_name: lecture.lecture_name,
                  lecture_course: lecture.lecture_course,
                  lecture_instructor: lecture.lecture_instructor,
                  lecture_writer: lecture.lecture_writer,
                  lecture_date: lecture.lecture_date,
                  lecture_length: lecture.lecture_length,
                  lecture_progress: lecture.lecture_progress,
                  lecture_outlines: lecture.lecture_outlines,
                  lecture_partOfPlan: lecture.lecture_partOfPlan,
                  lecture_hidden: lecture.lecture_hidden,
                });
              });

              //................DELETE ONE LECTURE..........
              menu_deleteIcon.addEventListener("click", () => {
                checkedLectures.push(lecture._id);
                this.deleteLecture();
              });

              menu_selectIcon.addEventListener("click", () => {
                let menu_selectIcon = document.getElementById(
                  lecture._id + "menu_selectIcon",
                );
                let li = document.getElementById(lecture._id + "li");
                if (menu_selectIcon.title === "") {
                  li.style.backgroundColor = "var(--yellow)";
                  menu_selectIcon.style.color = "var(--yellow)";
                  menu_selectIcon.title = "clicked";
                  if (checkedLectures.length > 0) {
                    for (var i = 0; i < checkedLectures.length; i++) {
                      if (checkedLectures[i] === lecture._id) {
                        checkedLectures.splice(i, 1);
                      } else {
                        checkedLectures.push(lecture._id);
                        break;
                      }
                    }
                  } else {
                    checkedLectures.push(lecture._id);
                  }
                } else {
                  li.style.backgroundColor = "var(--white2)";
                  menu_selectIcon.style.color = "var(--white2)";
                  menu_selectIcon.title = "";
                  for (var i = 0; i < checkedLectures.length; i++) {
                    if (checkedLectures[i] === lecture._id) {
                      checkedLectures.splice(i, 1);
                    }
                  }
                }
              });
              //.......Check box
              checkBox_partOfPlan.addEventListener("click", () => {
                if (checkBox_partOfPlan.checked === true) {
                  this.editLecture({
                    _id: lecture._id,
                    lecture_name: lecture.lecture_name,
                    lecture_course: lecture.lecture_course,
                    lecture_instructor: lecture.lecture_instructor,
                    lecture_writer: lecture.lecture_writer,
                    lecture_date: lecture.lecture_date,
                    lecture_length: lecture.lecture_length,
                    lecture_progress: lecture.lecture_progress,
                    lecture_pagesFinished: lecture.lecture_pagesFinished,
                    lecture_outlines: lecture.lecture_outlines,
                    lecture_partOfPlan: true,
                    lecture_hidden: lecture.lecture_hidden,
                  });
                } else {
                  this.editLecture({
                    _id: lecture._id,
                    lecture_name: lecture.lecture_name,
                    lecture_course: lecture.lecture_course,
                    lecture_instructor: lecture.lecture_instructor,
                    lecture_writer: lecture.lecture_writer,
                    lecture_date: lecture.lecture_date,
                    lecture_length: lecture.lecture_length,
                    lecture_progress: lecture.lecture_progress,
                    lecture_pagesFinished: lecture.lecture_pagesFinished,
                    lecture_outlines: lecture.lecture_outlines,
                    lecture_partOfPlan: false,
                    lecture_hidden: lecture.lecture_hidden,
                  });
                }
              });
              //.................
              menu_subdiv.append(
                menu_deleteIcon,
                menu_editIcon,
                menu_selectIcon,
              );
              menu_div.append(menu_showIcon);
              div_pLi.append(p1, p2, p3, p4, p5, div_progression);
              div_indicatorBox_progression.append(div_indicator_progression);
              div_progression.append(
                p_progression,
                div_indicatorBox_progression,
                ul_pages_finished,
              );
              li.append(div_pLi);
              div_partOfPlan.appendChild(checkBox_partOfPlan);
              if (lecture.lecture_outlines.length > 0) li.append(div_outline);
              menuLi_div.append(menu_subdiv, menu_div, li, div_partOfPlan);
              ul.prepend(menuLi_div);
            }
          }
        });
      })
      .then(() => {
        this.calculateLectureNum();
      });
  };
  retrieveLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("schoolPlanner_lectures_ul");
    ul.innerHTML = "";
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        console.log(jsonData.schoolPlanner.lectures);
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          let progressionStats = getProgressStats(
            lecture.lecture_progress,
            lecture.lecture_length,
          );
          lecture_courses.push(lecture.lecture_course);
          if (lecture.lecture_hidden === false) {
            let p1 = document.createElement("p");
            let p2 = document.createElement("p");
            let p3 = document.createElement("p");
            let p4 = document.createElement("p");
            let p5 = document.createElement("p");

            let p_progression = document.createElement("p");
            let div_indicatorBox_progression = document.createElement("div");
            let div_indicator_progression = document.createElement("div");
            let ul_pages_finished = document.createElement("ul");
            let div_progression = document.createElement("div");

            let div_outline = document.createElement("div");
            let checkBox_partOfPlan = document.createElement("input");
            let div_partOfPlan = document.createElement("div");
            let div_pLi = document.createElement("div");

            let li = document.createElement("li");
            let menu_div = document.createElement("div");
            let menu_subdiv = document.createElement("div");
            let menu_showIcon = document.createElement("i");
            let menu_selectIcon = document.createElement("i");
            let menu_deleteIcon = document.createElement("i");
            let menu_editIcon = document.createElement("i");
            let menuLi_div = document.createElement("div");

            p1.textContent = lecture.lecture_name;
            p2.textContent = lecture.lecture_course;
            p3.textContent = lecture.lecture_instructor;
            p4.textContent = lecture.lecture_writer;
            p5.textContent = lecture.lecture_date;
            p_progression.textContent = String(
              progressionStats.length +
                " (" +
                progressionStats.progress +
                " : " +
                progressionStats.remaining +
                " | " +
                progressionStats.percent +
                "%)",
            );

            for (var i = 0; i < lecture.lecture_outlines.length; i++) {
              let p = document.createElement("p");
              p.textContent =
                Number(i + 1) + ") " + lecture.lecture_outlines[i];
              div_outline.append(p);
            }
            div_pLi.setAttribute("class", "schoolPlanner_lectures_div_pLi");

            li.setAttribute("class", "schoolPlanner_lectures_li fc");
            li.setAttribute("id", lecture._id + "li");
            menu_showIcon.setAttribute("class", "fa fa-sharp fa-solid fa-bars");
            menu_showIcon.setAttribute("id", lecture._id + "menu_showIcon");
            menu_showIcon.setAttribute("title", "");
            menu_editIcon.setAttribute("title", "");
            menu_selectIcon.setAttribute(
              "class",
              "fa fa-sharp fa-solid fa-check",
            );
            menu_selectIcon.setAttribute("title", "");
            menu_selectIcon.setAttribute("id", lecture._id + "menu_selectIcon");
            menu_deleteIcon.setAttribute(
              "class",
              "fa fa-sharp fa-solid fa-trash",
            );
            menu_editIcon.setAttribute(
              "class",
              "fa fa-sharp fa-solid fa-pencil",
            );
            div_outline.setAttribute("class", "div_outline fc");

            checkBox_partOfPlan.type = "checkbox";
            div_partOfPlan.setAttribute("class", "div_partOfPlan fc");
            checkBox_partOfPlan.setAttribute(
              "id",
              lecture._id + "checkBox_partOfPlan",
            );

            if (lecture.lecture_partOfPlan === true)
              checkBox_partOfPlan.checked = true;

            div_indicatorBox_progression.setAttribute(
              "class",
              "div_indicatorBox_progression",
            );
            div_indicatorBox_progression.setAttribute(
              "id",
              lecture._id + "div_indicatorBox_progression",
            );
            div_indicator_progression.setAttribute(
              "class",
              "div_indicator_progression",
            );
            div_indicator_progression.setAttribute(
              "id",
              lecture._id + "div_indicator_progression",
            );
            ul_pages_finished.setAttribute("class", "ul_pages_finished");
            div_progression.setAttribute("class", "div_progression fc");

            menu_div.setAttribute("class", "fr lecuturesTable_menu_div");
            menu_subdiv.setAttribute("class", "fr lecuturesTable_menu_subdiv");
            menu_subdiv.setAttribute("id", lecture._id + "menu_subdiv");
            menuLi_div.setAttribute("class", "menuLi_div fr");
            menuLi_div.setAttribute("id", lecture._id + "menuLi_div");
            menu_editIcon.setAttribute("id", lecture._id + "menu_editIcon");

            //........Progression logic
            div_indicator_progression.style.width =
              progressionStats.indicatorWidth + "px";
            if (progressionStats.percent < 50)
              div_indicator_progression.style.backgroundColor = "var(--red2)";
            //........
            //.......PagesFinished Logic
            for (var i = 0; i < lecture.lecture_length; i++) {
              let pagenumber = Number(i + 1);
              let p_num = document.createElement("p");
              p_num.textContent = Number(i + 1);
              p_num.addEventListener("click", () => {
                this.setState({
                  lecture_isLoading: true,
                });
                setTimeout(() => {
                  console.log(
                    lecture.lecture_pagesFinished.indexOf(pagenumber),
                  );
                  // let p_num_fontWeight = getComputedStyle(p_num).fontWeight
                  if (lecture.lecture_pagesFinished.indexOf(pagenumber) == -1) {
                    // if(p_num_fontWeight==="400"){
                    this.setPageFinishLecture(lecture, pagenumber, true);
                    p_num.style.backgroundColor = "var(--green4)";
                    p_num.style.color = "var(--white)";
                    p_num.style.fontWeight = "bold";
                  } else {
                    this.setPageFinishLecture(
                      lecture,
                      p_num.textContent,
                      false,
                    );
                    p_num.style.backgroundColor = "var(--white2)";
                    p_num.style.color = "black";
                    p_num.style.fontWeight = "normal";
                  }
                  // }
                }, 3000);
              });
              for (var j = 0; j < lecture.lecture_pagesFinished.length; j++) {
                if (lecture.lecture_pagesFinished.indexOf(pagenumber) !== -1) {
                  p_num.style.backgroundColor = "var(--green4)";
                  p_num.style.color = "var(--white)";
                  p_num.style.fontWeight = "bold";
                }
              }
              ul_pages_finished.append(p_num);
            }
            //...........
            menu_showIcon.addEventListener("click", () => {
              let menu_showIcon = document.getElementById(
                lecture._id + "menu_showIcon",
              );
              let menu_subdiv = document.getElementById(
                lecture._id + "menu_subdiv",
              );
              if (menu_showIcon.title === "") {
                menu_subdiv.style.width = "15%";
                menu_showIcon.title = "clicked";
              } else {
                menu_subdiv.style.width = "0";
                menu_showIcon.title = "";
              }
            });

            //.............EDIT FUNCTION
            menu_editIcon.addEventListener("click", () => {
              lectureInEdit = lecture;
              document.getElementById(lecture._id + "menu_subdiv").style.width =
                "0";
              this.openAddLectureForm({
                buttonName: "Edit",
                _id: lecture._id,
                lecture_name: lecture.lecture_name,
                lecture_course: lecture.lecture_course,
                lecture_instructor: lecture.lecture_instructor,
                lecture_writer: lecture.lecture_writer,
                lecture_date: lecture.lecture_date,
                lecture_length: lecture.lecture_length,
                lecture_progress: lecture.lecture_progress,
                lecture_outlines: lecture.lecture_outlines,
                lecture_partOfPlan: lecture.lecture_partOfPlan,
                lecture_hidden: lecture.lecture_hidden,
              });
            });

            //................DELETE ONE LECTURE..........
            menu_deleteIcon.addEventListener("click", () => {
              checkedLectures.push(lecture._id);
              this.deleteLecture();
            });

            menu_selectIcon.addEventListener("click", () => {
              let menu_selectIcon = document.getElementById(
                lecture._id + "menu_selectIcon",
              );
              let li = document.getElementById(lecture._id + "li");
              if (menu_selectIcon.title === "") {
                li.style.backgroundColor = "var(--yellow)";
                menu_selectIcon.style.color = "var(--yellow)";
                menu_selectIcon.title = "clicked";
                if (checkedLectures.length > 0) {
                  for (var i = 0; i < checkedLectures.length; i++) {
                    if (checkedLectures[i] === lecture._id) {
                      checkedLectures.splice(i, 1);
                    } else {
                      checkedLectures.push(lecture._id);
                      break;
                    }
                  }
                } else {
                  checkedLectures.push(lecture._id);
                }
              } else {
                li.style.backgroundColor = "var(--white2)";
                menu_selectIcon.style.color = "var(--white2)";
                menu_selectIcon.title = "";
                for (var i = 0; i < checkedLectures.length; i++) {
                  if (checkedLectures[i] === lecture._id) {
                    checkedLectures.splice(i, 1);
                  }
                }
              }
            });
            //.......Check box
            checkBox_partOfPlan.addEventListener("click", () => {
              if (checkBox_partOfPlan.checked === true) {
                this.editLecture({
                  _id: lecture._id,
                  lecture_name: lecture.lecture_name,
                  lecture_course: lecture.lecture_course,
                  lecture_instructor: lecture.lecture_instructor,
                  lecture_writer: lecture.lecture_writer,
                  lecture_date: lecture.lecture_date,
                  lecture_length: lecture.lecture_length,
                  lecture_progress: lecture.lecture_progress,
                  lecture_pagesFinished: lecture.lecture_pagesFinished,
                  lecture_outlines: lecture.lecture_outlines,
                  lecture_partOfPlan: true,
                  lecture_hidden: lecture.lecture_hidden,
                });
              } else {
                this.editLecture({
                  _id: lecture._id,
                  lecture_name: lecture.lecture_name,
                  lecture_course: lecture.lecture_course,
                  lecture_instructor: lecture.lecture_instructor,
                  lecture_writer: lecture.lecture_writer,
                  lecture_date: lecture.lecture_date,
                  lecture_length: lecture.lecture_length,
                  lecture_progress: lecture.lecture_progress,
                  lecture_pagesFinished: lecture.lecture_pagesFinished,
                  lecture_outlines: lecture.lecture_outlines,
                  lecture_partOfPlan: false,
                  lecture_hidden: lecture.lecture_hidden,
                });
              }
            });
            //.........
            div_progression.addEventListener("click", () => {
              let div_progressionInHTML =
                document.getElementById("div_progression");
              let i_close = document.createElement("i");
              i_close.setAttribute("class", "fi fi-rr-cross-circle");
              div_progressionInHTML.innerHTML = "";
              i_close.addEventListener("click", () => {
                document.getElementById("div_progression").style.display =
                  "none";
                ul.style.opacity = "1";
                ul_pages_finished.style.padding = "0px";
                div_progression.append(
                  p_progression,
                  div_indicatorBox_progression,
                );
              });
              ul.style.opacity = "0";
              ul_pages_finished.style.height = "fit-content";
              ul_pages_finished.style.padding = "10px";
              div_progressionInHTML.style.display = "flex";
              div_progressionInHTML.append(
                i_close,
                p_progression,
                div_indicatorBox_progression,
                ul_pages_finished,
              );
            });
            //...........
            //.................
            menu_subdiv.append(menu_deleteIcon, menu_editIcon, menu_selectIcon);
            menu_div.append(menu_showIcon);
            div_pLi.append(p1, p2, p3, p4, p5, div_progression);
            div_indicatorBox_progression.append(div_indicator_progression);
            div_progression.append(
              p_progression,
              div_indicatorBox_progression,
              ul_pages_finished,
            );
            li.append(div_pLi);
            div_partOfPlan.appendChild(checkBox_partOfPlan);
            if (lecture.lecture_outlines.length > 0) li.append(div_outline);
            menuLi_div.append(menu_subdiv, menu_div, li, div_partOfPlan);
            ul.prepend(menuLi_div);
          }
        });
        return {
          lecture_courses: lecture_courses,
          jsonData: jsonData,
        };
      })
      .then((object) => {
        course_pages = [];
        let unique_lecture_courses = [...new Set(object.lecture_courses)];
        unique_lecture_courses.forEach((unique_lecture_course) => {
          let course_length = 0;
          let course_progress = 0;
          object.jsonData.schoolPlanner.lectures.forEach((lecture) => {
            if (
              lecture.lecture_course === unique_lecture_course &&
              lecture.lecture_partOfPlan === true
            ) {
              course_length =
                Number(course_length) + Number(lecture.lecture_length);
              course_progress =
                Number(course_progress) + Number(lecture.lecture_progress);
            }
          });
          course_pages.push({
            course_name: unique_lecture_course,
            course_length: course_length,
            course_progress: course_progress,
          });
        });
        this.calculateLectureNum();
      })
      .catch((err) => {
        if (err.message === "Cannot read property 'credentials' of null")
          console.log("Error", err.message);
      });

    // });
  };

  //.........RETRIEVE COURSES.................
  retrieveCourses = () => {
    this.setState({
      course_isLoading: true,
    });
    let courseSelect = document.getElementById("schoolPlanner_courses_select");
    let courseDetails = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    if (courseSelect) {
      courseSelect.innerHTML = "";
    }
    if (courseDetails) {
      courseDetails.innerHTML = "";
    }
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            course_isLoading: false,
          });
          courseNames = [];
          courseInstructorsNames = [];
          courses_partOfPlan = [];
          return response.json();
        }
      })
      .then((jsonData) => {
        courses = jsonData.schoolPlanner.courses;
        jsonData.schoolPlanner.courses.forEach((course) => {
          if (course.course_name !== "-") courseNames.push(course.course_name);
          course.course_instructors.forEach((instructor) => {
            courseInstructorsNames.push(instructor);
          });

          courseNames_filtered = courseNames.filter((value, index) => {
            return courseNames.indexOf(value) === index;
          });
          courseInstructorsNames_filtered = courseInstructorsNames.filter(
            (value, index) => {
              return courseInstructorsNames.indexOf(value) === index;
            },
          );
          if (course.course_partOfPlan === true) {
            courses_partOfPlan.push(course);
          }
        });

        if (courseSelect) {
          courseSelect.innerHTML =
            "<option selected disabled>Select a course</option>";
          courses.forEach((course) => {
            let option = document.createElement("option");
            option.value = course._id;
            option.textContent = course.course_name;
            courseSelect.append(option);
          });

          if (courses.length > 0) {
            courseSelect.value = courses[0]._id;
            this.renderCourseDetailsCard(courses[0]);
          } else {
            this.renderCourseDetailsCard(null);
          }

          courseSelect.onchange = (event) => {
            const selectedCourse = courses.find(
              (course) => course._id === event.target.value,
            );
            this.renderCourseDetailsCard(selectedCourse);
          };
        }
      })
      .then(() => {
        console.log(courses_partOfPlan);
        //....TO ADD COURSE NAMES OPTIONS TO SELECT COURSE IN LECTURE ADD FORM
        var select_courseNames = document.getElementById(
          "schoolPlanner_addLecture_course_input",
        );
        select_courseNames.innerHTML =
          " <option selected disabled>Lecture course</option>";
        for (var i = 0; i < courseNames_filtered.length; i++) {
          let option = document.createElement("option");
          option.innerHTML = courseNames_filtered[i];
          select_courseNames.append(option);
        }
        var select_courseInstructorsNames = document.getElementById(
          "schoolPlanner_addLecture_instructorName_input",
        );
        select_courseInstructorsNames.innerHTML =
          " <option selected disabled>Lecture instructor name</option>";
        for (var i = 0; i < courseInstructorsNames_filtered.length; i++) {
          let option = document.createElement("option");
          option.innerHTML = courseInstructorsNames_filtered[i];
          select_courseInstructorsNames.append(option);
        }
      });
  };
  //.............................................

  deleteLecture = async () => {
    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedLectures.length; i++) {
      console.log(checkedLectures[i]);
      let url =
        apiUrl("/api/user/deleteLecture/") +
        this.props.state.my_id +
        "/" +
        checkedLectures[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          document.getElementById(checkedLectures[i] + "menuLi_div").remove();
        }
      });
    }

    checkedLectures = [];
  };

  //.............DELETE COURSE.....................
  deleteCourse = async () => {
    alert("afsd");
    if (checkedCourses.length === 0) {
      const courseSelect = document.getElementById(
        "schoolPlanner_courses_select",
      );
      if (courseSelect && courseSelect.value) {
        checkedCourses = [courseSelect.value];
      }
    }

    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedCourses.length; i++) {
      let url =
        apiUrl("/api/user/deleteCourse/") +
        this.props.state.my_id +
        "/" +
        checkedCourses[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.retrieveCourses();
        }
      });
    }

    checkedCourses = [];
  };
  deleteCourseById = async (courseId) => {
    let url =
      apiUrl("/api/user/deleteCourse/") +
      this.props.state.my_id +
      "/" +
      courseId;
    let options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    await fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................
  editCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: courseDayAndTime,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: courseInstructorsNames,
        course_grade: primaryExam.course_grade,
        course_fullGrade: primaryExam.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: false,
        course_exams: courseExams,
        exam_type: primaryExam.exam_type,
        exam_date: primaryExam.exam_date,
        exam_time: primaryExam.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //..............PartofPlan COURSE....................
  partOfPlanCourse = (object, partOfPlanID, boolean) => {
    const storedCourseExams = object.course_exams || [];
    const primaryExam = getPrimaryCourseExam(storedCourseExams);
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: object.course_component,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: object.course_instructors,
        course_grade: primaryExam.course_grade || object.course_grade,
        course_fullGrade:
          primaryExam.course_fullGrade || object.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: boolean,
        course_exams: storedCourseExams,
        exam_type: primaryExam.exam_type || object.exam_type,
        exam_date: primaryExam.exam_date || object.exam_date,
        exam_time: primaryExam.exam_time || object.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................
  editCoursePages = async () => {
    this.setState({
      course_isLoading: true,
    });
    for (var i = 0; i < course_pages.length; i++) {
      let url =
        apiUrl("/api/user/editCoursePages/") +
        this.props.state.my_id +
        "/" +
        course_pages[i].course_name;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_length: course_pages[i].course_length,
          course_progress: course_pages[i].course_progress,
        }),
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.setState({
            course_isLoading: false,
          });
          if (i === course_pages.length - 1) this.retrieveCourses();
        }
      });
    }
  };
  //...............................................

  //......................................

  //......................................

  //........................EDIT item......................
  editLecture = (object) => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/editLecture/") +
      this.props.state.my_id +
      "/" +
      object._id;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(object),
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        lectureInEdit = {};
        document.getElementById("schoolPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
      }
    });
  };
  //..............EDIT COURSE PAGES............
  //........................ADD item.......................
  addLecture = (object) => {
    if (!object.lecture_name) object.lecture_name = "-";
    if (object.lecture_course === "Lecture course") object.lecture_course = "-";
    if (object.lecture_instructor === "Lecture instructor name")
      object.lecture_instructor = "-";
    if (!object.lecture_writer) object.lecture_writer = "-";
    if (!object.lecture_date) object.lecture_date = "-";
    if (!object.lecture_length) object.lecture_length = 0;
    if (!object.lecture_progress) object.lecture_progress = 0;
    let url = apiUrl("/api/user/addLecture/") + this.props.state.my_id;
    let options = {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(object),
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        document.getElementById("schoolPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
      }
    });
  };

  //.........ADD COURSE............
  addCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    if (object.course_name) {
      if (object.course_component === "Course component")
        object.course_component = "-";
      if (object.course_year === "Course year") object.course_year = "-";
      if (object.course_term === "Course term") object.course_term = "-";
      if (object.course_class === "Course classification")
        object.course_class = "-";
      if (object.course_status === "Course status") object.course_status = "-";
      if (object.exam_type === "Exam type") object.exam_type = "-";

      let url = apiUrl("/api/user/addCourse/") + this.props.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_name: object.course_name,
          course_component: object.course_component,
          course_dayAndTime: courseDayAndTime,
          course_year: object.course_year,
          course_term: object.course_term,
          course_class: object.course_class,
          course_status: object.course_status,
          course_instructors: courseInstructorsNames,
          course_grade: primaryExam.course_grade,
          course_fullGrade: primaryExam.course_fullGrade,
          course_length: 0,
          course_progress: 0,
          course_exams: courseExams,
          exam_type: primaryExam.exam_type,
          exam_date: primaryExam.exam_date,
          exam_time: primaryExam.exam_time,
        }),
      };
      let req = new Request(url, options);
      fetch(req).then((course) => {
        if (course.status === 201) {
          document.getElementById("schoolPlanner_addCourse_div").style.display =
            "none";
          this.retrieveCourses();
        }
      });
    } else {
      this.props.serverReply("Posting failed. Please add course name");
    }
  };
  render() {
    return (
      <React.Fragment>
        <article id="schoolPlanner_article" className="fr">
          <div className="fr" id="schoolPlanner_coursesLectures_wrapper">
            <aside id="schoolPlanner_courses_aside" className="fc">
              {this.state.course_isLoading === true && (
                <div id="course_loaderImg" className="loaderImg_div fc">
                  <img src="/img/loader.gif" alt="" width="50px" />
                </div>
              )}
              <nav id="schoolPlanner_courses_nav" className="fr">
                <button
                  onClick={() =>
                    this.openAddCourseForm({
                      buttonName: "Add",
                    })
                  }
                >
                  Add course
                </button>
              </nav>
              <div id="schoolPlanner_courses_ulLabels_div">
                <p>Courses</p>
              </div>
              <div id="schoolPlanner_courses_select_shell">
                <select id="schoolPlanner_courses_select"></select>
              </div>
              <div id="schoolPlanner_courses_details_div" className="fc"></div>
              {}
            </aside>
            <div id="schoolPlanner_coursesDoor_div" className="fc"></div>
            <section id="schoolPlanner_lectures_section">
              {this.state.lecture_isLoading === true && (
                <div id="lecture_loaderImg" className="loaderImg_div fc">
                  <img src="/img/loader.gif" alt="" width="50px" />
                </div>
              )}
              <nav id="schoolPlanner_lectures_nav" className="fr">
                <button
                  onClick={() =>
                    this.openAddLectureForm({
                      buttonName: "Add",
                    })
                  }
                >
                  Add lecture
                </button>
                <button onClick={() => this.deleteLecture(checkedLectures)}>
                  Delete lecture
                </button>
                <button
                  id="schoolPlanner_lectures_hideUnchecked_button"
                  onClick={() => this.hideUncheckedLectures()}
                >
                  Hide unchecked lectures
                </button>
                <button
                  id="schoolPlanner_lectures_unhideUnchecked_button"
                  onClick={() => this.unhideUncheckedLectures()}
                >
                  Unhide unchecked lectures
                </button>
                <div id="schoolPlanner_lectures_search_div" className="fr">
                  <input
                    placeholder="search"
                    id="schoolPlanner_lectures_search_input"
                    onKeyUp={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        this.retrieveLecturesSearched(
                          document.getElementById(
                            "schoolPlanner_lectures_search_input",
                          ).value,
                        );
                      }
                    }}
                    onChange={() => {
                      if (
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value === ""
                      )
                        this.retrieveLectures();
                    }}
                  />
                  <button
                    id="schoolPlanner_lectures_search_button"
                    onClick={() => {
                      this.retrieveLecturesSearched(
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value,
                      );
                    }}
                  >
                    <i class="fi fi-rr-search"></i>
                  </button>
                </div>
              </nav>
              <section id="schoolPlanner_lectures_tableLabels_section">
                <div id="schoolPlanner_lectures_tableLabels_div">
                  <p>Lecture title</p>
                  <p>Lecture course</p>
                  <p>Instructor name</p>
                  <p>Writer name</p>
                  <p>Date</p>
                  <p>Progression</p>
                </div>
              </section>
              <ul id="schoolPlanner_lectures_ul"></ul>
              <div id="schoolPlanner_lectures_num_div" className="fr">
                <p id="schoolPlanner_lectures_num_label">
                  Number of lectures shown:
                </p>
                <p id="schoolPlanner_lectures_num_p"></p>
              </div>
            </section>
          </div>
          <div id="schoolPlanner_planDoor_div" className="fc">
            <i
              class="fi fi-rr-calendar-clock"
              onClick={() => {
                let schoolPlanner_plan_aside = document.getElementById(
                  "schoolPlanner_plan_aside",
                );
                let schoolPlanner_coursesLectures_wrapper =
                  document.getElementById(
                    "schoolPlanner_coursesLectures_wrapper",
                  );
                let schoolPlanner_plan_aside_width = getComputedStyle(
                  schoolPlanner_plan_aside,
                ).width;
                if (schoolPlanner_plan_aside_width === "0px") {
                  schoolPlanner_coursesLectures_wrapper.style.width = "0";
                  schoolPlanner_plan_aside.style.width = "100vw";
                  //..........
                  let schoolPlanner_plan_days_wrapper = document.getElementById(
                    "schoolPlanner_plan_days_wrapper",
                  );
                  schoolPlanner_plan_days_wrapper.innerHTML = "";
                  let coursesDays = [];
                  courses_partOfPlan.forEach((course) => {
                    var examDateinMillisec = new Date(course.exam_date);
                    var diffDaysWithDecimals =
                      (examDateinMillisec - todayDate) / 86400000;
                    var diffDaysWithoutDecimals =
                      Math.floor(diffDaysWithDecimals);
                    coursesDays.push(diffDaysWithoutDecimals);
                  });
                  let highestNum = coursesDays.sort().reverse()[0];
                  for (var i = 0; i < highestNum; i++) {
                    let p_dayNum = document.createElement("p");
                    p_dayNum.setAttribute("class", "plan_p_dayNum");
                    if (i == 0) p_dayNum.textContent = "Today";
                    if (i == 1) p_dayNum.textContent = "Tomorrow";
                    if (i == 2) p_dayNum.textContent = "The day after tomorrow";
                    if (i > 2) p_dayNum.textContent = "Day " + Number(i + 1);
                    let div_day = document.createElement("div");
                    div_day.setAttribute(
                      "class",
                      "schoolPlanner_plan_days_div",
                    );
                    div_day.append(p_dayNum);
                    schoolPlanner_plan_days_wrapper.append(div_day);
                  }
                  courses_partOfPlan.forEach((course) => {
                    var examDateinMillisec = new Date(course.exam_date);
                    var diffDaysWithDecimals =
                      (examDateinMillisec - todayDate) / 86400000;
                    var diffDaysWithoutDecimals =
                      Math.floor(diffDaysWithDecimals);
                    for (var j = 0; j < diffDaysWithoutDecimals; j++) {
                      let pageNum = getSafePagesPerDay(
                        course.course_length,
                        course.course_progress,
                        diffDaysWithoutDecimals,
                      );
                      let p_courseName = document.createElement("p");
                      let p_coursePagesPerDay = document.createElement("p");
                      let div_course = document.createElement("div");
                      div_course.setAttribute("class", "fr plan_div_course");
                      p_courseName.textContent = course.course_name;
                      if (pageNum !== 0)
                        p_coursePagesPerDay.textContent = pageNum + " page";
                      if (pageNum == 0)
                        p_coursePagesPerDay.textContent = "Done";
                      div_course.append(p_courseName, p_coursePagesPerDay);
                      schoolPlanner_plan_days_wrapper.children[j].append(
                        div_course,
                      );
                    }
                  });
                  let totalPagesInDays = [];
                  for (
                    var i = 0;
                    i < schoolPlanner_plan_days_wrapper.children.length;
                    i++
                  ) {
                    let totalPagesPerDay = 0;
                    for (
                      var j = 1;
                      j <
                      schoolPlanner_plan_days_wrapper.children[i].children
                        .length;
                      j++
                    ) {
                      var str =
                        schoolPlanner_plan_days_wrapper.children[i].children[j]
                          .children[1].textContent;
                      var matches = str.match(/(\d+)/);
                      if (matches) {
                        totalPagesPerDay += Number(matches[0]);
                      }
                    }
                    let p_total = document.createElement("p");
                    p_total.textContent = "Total pages: " + totalPagesPerDay;
                    p_total.setAttribute("class", "plan_p_total");
                    schoolPlanner_plan_days_wrapper.children[i].append(p_total);
                  }
                  //...........
                } else {
                  schoolPlanner_coursesLectures_wrapper.style.width = "100%";
                  schoolPlanner_plan_aside.style.width = "0";
                }
              }}
            ></i>
          </div>
          <aside
            id="schoolPlanner_plan_aside"
            style={{ width: "0px" }}
            className="fc"
          >
            <div id="schoolPlanner_plan_wrapper" className="fc">
              <ul id="schoolPlanner_plan_days_wrapper"></ul>
            </div>
          </aside>
          <div id="schoolPlanner_addLecture_div" className="fc">
            <label onClick={this.closeAddLectureForm}>Close</label>
            <form id="schoolPlanner_addLecture_form" className="fc">
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowWide">
                <input
                  id="schoolPlanner_addLecture_name_input"
                  placeholder="Lecture name"
                />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <select id="schoolPlanner_addLecture_course_input">
                  <option selected disabled>
                    Lecture course
                  </option>
                </select>
                <select id="schoolPlanner_addLecture_instructorName_input">
                  <option selected disabled>
                    Lecture instructor name
                  </option>
                </select>
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <input
                  id="schoolPlanner_addLecture_writerName_input"
                  placeholder="Lecture writer name"
                />
                <input id="schoolPlanner_addLecture_date_input" type="date" />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowNarrow">
                <input
                  id="schoolPlanner_addLecture_length_input"
                  placeholder="Lecture length"
                />
              </div>
              <div id="schoolPlanner_addLecture_outlines_div" className="fr">
                <div className="fc">
                  <textarea
                    id="schoolPlanner_addLecture_outlines_input"
                    placeholder="Lecture outline"
                  />
                  <ul
                    id="schoolPlanner_addLecture_outlines_ul"
                    className="fr"
                  ></ul>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    this.addLectureOutline();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      this.addLectureOutline();
                    }
                  }}
                >
                  add
                </div>
              </div>
            </form>
            <label
              id="schoolPlanner_addLecture_addButton_label"
              onClick={() => {
                let buttonName = document.getElementById(
                  "schoolPlanner_addLecture_addButton_label",
                ).textContent;
                let lecture_name = document.getElementById(
                  "schoolPlanner_addLecture_name_input",
                ).value;
                let lecture_course = document.getElementById(
                  "schoolPlanner_addLecture_course_input",
                ).value;
                let lecture_instructor = document.getElementById(
                  "schoolPlanner_addLecture_instructorName_input",
                ).value;
                let lecture_writer = document.getElementById(
                  "schoolPlanner_addLecture_writerName_input",
                ).value;
                let lecture_date = document.getElementById(
                  "schoolPlanner_addLecture_date_input",
                ).value;
                let lecture_length = document.getElementById(
                  "schoolPlanner_addLecture_length_input",
                ).value;

                if (buttonName === "Add") {
                  this.addLecture({
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: {},
                    lecture_pagesFinished: [],
                    lecture_outlines: [],
                    lecture_partOfPlan: true,
                    lecture_hidden: false,
                  });
                }
                if (buttonName === "Edit") {
                  this.editLecture({
                    _id: selectedLecture,
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: lectureInEdit.lecture_progress,
                    lecture_pagesFinished: lectureInEdit.lecture_pagesFinished,
                    lecture_outlines: lectureOutlines,
                    lecture_partOfPlan: lectureInEdit.lecture_partOfPlan,
                    lecture_hidden: lectureInEdit.lecture_hidden,
                  });
                }
              }}
            >
              Add
            </label>
          </div>
          <div id="schoolPlanner_addCourse_div" className="fc">
            <div
              id="schoolPlanner_addCourse_closeButton"
              role="button"
              tabIndex={0}
              onClick={this.closeAddCourseForm}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  this.closeAddCourseForm();
                }
              }}
            >
              Close
            </div>
            <div id="schoolPlanner_addCourse_scrollArea" className="fc">
              <form id="schoolPlanner_addCourse_form" className="fc">
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowSplit">
                  <input
                    id="schoolPlanner_addCourse_name_input"
                    placeholder="Course name"
                  />
                  <select id="schoolPlanner_addCourse_component_input">
                    <option selected={true} disabled="disabled">
                      Course component
                    </option>
                    <option>In-class</option>
                    <option>Out-of-class</option>
                  </select>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                  <div
                    id="schoolPlanner_addCourse_dayAndTime_div"
                    className="fr"
                  >
                    <section
                      id="schoolPlanner_addCourse_dayAndTime_input_section"
                      className="fc"
                    >
                      <div className="fc">
                        <select id="schoolPlanner_addCourse_day_input">
                          <option selected={true} disabled="disabled">
                            Course day
                          </option>
                          <option>Sunday</option>
                          <option>Monday</option>
                          <option>Tuesday</option>
                          <option>Wednesday</option>
                          <option>Thursday</option>
                          <option>Friday</option>
                          <option>Saturday</option>
                        </select>
                        <div
                          id="schoolPlanner_addCourse_time_inputs"
                          className="fr"
                        >
                          <input
                            placeholder="hh"
                            id="schoolPlanner_addCourse_time_hour_input"
                          />
                          <input
                            placeholder="mm"
                            id="schoolPlanner_addCourse_time_minute_input"
                          />
                        </div>
                      </div>
                    </section>
                    <ul
                      id="schoolPlanner_addCourse_dayAndTime_ul"
                      className="fr"
                    ></ul>
                    <div id="schoolPlanner_addCourse_dayAndTime_label">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          this.addCourseDayAndTime({
                            day: document.getElementById(
                              "schoolPlanner_addCourse_day_input",
                            ).value,
                            time: buildExamTimeValue({
                              hour: document.getElementById(
                                "schoolPlanner_addCourse_time_hour_input",
                              ).value,
                              minute: document.getElementById(
                                "schoolPlanner_addCourse_time_minute_input",
                              ).value,
                            }),
                          });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            this.addCourseDayAndTime({
                              day: document.getElementById(
                                "schoolPlanner_addCourse_day_input",
                              ).value,
                              time: buildExamTimeValue({
                                hour: document.getElementById(
                                  "schoolPlanner_addCourse_time_hour_input",
                                ).value,
                                minute: document.getElementById(
                                  "schoolPlanner_addCourse_time_minute_input",
                                ).value,
                              }),
                            });
                          }
                        }}
                      >
                        add
                      </div>
                    </div>
                  </div>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowQuad">
                  <select
                    class="form-select"
                    name="year"
                    id="schoolPlanner_addCourse_year_input"
                  >
                    <option selected={true} disabled="disabled">
                      Course year
                    </option>
                    <option value="1940">1940</option>
                    <option value="1941">1941</option>
                    <option value="1942">1942</option>
                    <option value="1943">1943</option>
                    <option value="1944">1944</option>
                    <option value="1945">1945</option>
                    <option value="1946">1946</option>
                    <option value="1947">1947</option>
                    <option value="1948">1948</option>
                    <option value="1949">1949</option>
                    <option value="1950">1950</option>
                    <option value="1951">1951</option>
                    <option value="1952">1952</option>
                    <option value="1953">1953</option>
                    <option value="1954">1954</option>
                    <option value="1955">1955</option>
                    <option value="1956">1956</option>
                    <option value="1957">1957</option>
                    <option value="1958">1958</option>
                    <option value="1959">1959</option>
                    <option value="1960">1960</option>
                    <option value="1961">1961</option>
                    <option value="1962">1962</option>
                    <option value="1963">1963</option>
                    <option value="1964">1964</option>
                    <option value="1965">1965</option>
                    <option value="1966">1966</option>
                    <option value="1967">1967</option>
                    <option value="1968">1968</option>
                    <option value="1969">1969</option>
                    <option value="1970">1970</option>
                    <option value="1971">1971</option>
                    <option value="1972">1972</option>
                    <option value="1973">1973</option>
                    <option value="1974">1974</option>
                    <option value="1975">1975</option>
                    <option value="1976">1976</option>
                    <option value="1977">1977</option>
                    <option value="1978">1978</option>
                    <option value="1979">1979</option>
                    <option value="1980">1980</option>
                    <option value="1981">1981</option>
                    <option value="1982">1982</option>
                    <option value="1983">1983</option>
                    <option value="1984">1984</option>
                    <option value="1985">1985</option>
                    <option value="1986">1986</option>
                    <option value="1987">1987</option>
                    <option value="1988">1988</option>
                    <option value="1989">1989</option>
                    <option value="1990">1990</option>
                    <option value="1991">1991</option>
                    <option value="1992">1992</option>
                    <option value="1993">1993</option>
                    <option value="1994">1994</option>
                    <option value="1995">1995</option>
                    <option value="1996">1996</option>
                    <option value="1997">1997</option>
                    <option value="1998">1998</option>
                    <option value="1999">1999</option>
                    <option value="2000">2000</option>
                    <option value="2001">2001</option>
                    <option value="2002">2002</option>
                    <option value="2003">2003</option>
                    <option value="2004">2004</option>
                    <option value="2005">2005</option>
                    <option value="2006">2006</option>
                    <option value="2007">2007</option>
                    <option value="2008">2008</option>
                    <option value="2009">2009</option>
                    <option value="2010">2010</option>
                    <option value="2011">2011</option>
                    <option value="2012">2012</option>
                    <option value="2013">2013</option>
                    <option value="2014">2014</option>
                    <option value="2015">2015</option>
                    <option value="2016">2016</option>
                    <option value="2017">2017</option>
                    <option value="2018">2018</option>
                    <option value="2019">2019</option>
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                  </select>
                  <select name="" id="schoolPlanner_addCourse_term_input">
                    <option selected={true} disabled="disabled">
                      Course term
                    </option>
                    <option>Fall</option>
                    <option>Winter</option>
                    <option>Summer</option>
                  </select>
                  <select id="schoolPlanner_addCourse_class_input">
                    <option selected={true} disabled="disabled">
                      Course classification
                    </option>
                    <option disabled="disabled">IN-CLASS</option>
                    <option>Basic science</option>
                    <option>Applied science</option>
                    <option disabled="disabled">OUT-OF-CLASS</option>
                    <option>Lab</option>
                    <option>Clinical rotation</option>
                  </select>
                  <select name="" id="schoolPlanner_addCourse_status_input">
                    <option selected={true} disabled="disabled">
                      Course status
                    </option>
                    <option>Unstarted</option>
                    <option>Ongoing</option>
                    <option>Pass</option>
                    <option>Fail</option>
                  </select>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                  <div
                    id="schoolPlanner_addCourse_instructorsNames_div"
                    className="fr"
                  >
                    <div
                      id="schoolPlanner_addCourse_instructorName_section"
                      className="fr"
                    >
                      <input
                        id="schoolPlanner_addCourse_instructorName_input"
                        placeholder="Course instructors"
                      />
                      <ul
                        id="schoolPlanner_addCourse_instructorsNames_ul"
                        className="fr"
                      ></ul>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        this.addCourseInstructorsNames();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          this.addCourseInstructorsNames();
                        }
                      }}
                    >
                      add
                    </div>
                  </div>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide schoolPlanner_addCourse_rowMeta">
                  <div id="schoolPlanner_addCourse_examSection" className="fc">
                    <div id="schoolPlanner_addCourse_exam_div" className="fr">
                      <section
                        id="schoolPlanner_addCourse_exam_input_section"
                        className="fc"
                      >
                        <div
                          id="schoolPlanner_addCourse_exam_input_section_inner"
                          className="fc"
                        >
                          <label
                            htmlFor="schoolPlanner_addCourse_examDate_day_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam date
                          </label>
                          <div
                            id="schoolPlanner_addCourse_examDate_inputs"
                            className="fr"
                          >
                            <input
                              placeholder="DD"
                              id="schoolPlanner_addCourse_examDate_day_input"
                            />
                            <input
                              placeholder="MM"
                              id="schoolPlanner_addCourse_examDate_month_input"
                            />
                            <input
                              placeholder="YYYY"
                              id="schoolPlanner_addCourse_examDate_year_input"
                            />
                          </div>
                          <label
                            htmlFor="schoolPlanner_addCourse_examTime_hour_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam time
                          </label>
                          <div
                            id="schoolPlanner_addCourse_examTime_inputs"
                            className="fr"
                          >
                            <input
                              placeholder="hh"
                              id="schoolPlanner_addCourse_examTime_hour_input"
                            />
                            <input
                              placeholder="mm"
                              id="schoolPlanner_addCourse_examTime_minute_input"
                            />
                          </div>
                          <label
                            htmlFor="schoolPlanner_addCourse_examType_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam type
                          </label>
                          <select id="schoolPlanner_addCourse_examType_input">
                            <option selected={true} disabled="disabled">
                              Exam type
                            </option>
                            <option>Quiz</option>
                            <option>Midterm</option>
                            <option>Final</option>
                            <option>Practical</option>
                            <option>Oral</option>
                          </select>
                          <label
                            htmlFor="schoolPlanner_addCourse_grade_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Grades
                          </label>
                          <div
                            id="schoolPlanner_addCourse_grade_div"
                            className="fr"
                          >
                            <input
                              placeholder="Actual grade"
                              id="schoolPlanner_addCourse_grade_input"
                            />
                            <input
                              placeholder="Full grate"
                              id="schoolPlanner_addCourse_fullGrade_input"
                            />
                          </div>
                        </div>
                      </section>
                      <ul
                        id="schoolPlanner_addCourse_exams_ul"
                        className="fr"
                      ></ul>
                      <div id="schoolPlanner_addCourse_exam_label">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            this.addCourseExam();
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              this.addCourseExam();
                            }
                          }}
                        >
                          add
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div
              id="schoolPlanner_addCourse_addButton_label"
              role="button"
              tabIndex={0}
              onClick={() => {
                let buttonName = document.getElementById(
                  "schoolPlanner_addCourse_addButton_label",
                ).textContent;
                let course_name = document.getElementById(
                  "schoolPlanner_addCourse_name_input",
                ).value;
                let course_component = document.getElementById(
                  "schoolPlanner_addCourse_component_input",
                ).value;
                let course_year = document.getElementById(
                  "schoolPlanner_addCourse_year_input",
                ).value;
                let course_term = document.getElementById(
                  "schoolPlanner_addCourse_term_input",
                ).value;
                let course_class = document.getElementById(
                  "schoolPlanner_addCourse_class_input",
                ).value;
                let course_status = document.getElementById(
                  "schoolPlanner_addCourse_status_input",
                ).value;
                let course_grade = document.getElementById(
                  "schoolPlanner_addCourse_grade_input",
                ).value;
                let course_fullGrade = document.getElementById(
                  "schoolPlanner_addCourse_fullGrade_input",
                ).value;
                let exam_date = buildExamDateValue({
                  day: document.getElementById(
                    "schoolPlanner_addCourse_examDate_day_input",
                  ).value,
                  month: document.getElementById(
                    "schoolPlanner_addCourse_examDate_month_input",
                  ).value,
                  year: document.getElementById(
                    "schoolPlanner_addCourse_examDate_year_input",
                  ).value,
                });
                let exam_time = buildExamTimeValue({
                  hour: document.getElementById(
                    "schoolPlanner_addCourse_examTime_hour_input",
                  ).value,
                  minute: document.getElementById(
                    "schoolPlanner_addCourse_examTime_minute_input",
                  ).value,
                });
                if (buttonName === "Add") {
                  this.addCourse({
                    course_name: course_name + " (" + course_component + ")",
                    course_component: course_component,
                    course_year: course_year,
                    course_term: course_term,
                    course_class: course_class,
                    course_status: course_status,
                    course_grade: course_grade,
                    course_fullGrade: course_fullGrade,
                    course_length: 0,
                    course_progress: 0,
                    exam_date: exam_date,
                    exam_time: exam_time,
                  });
                }
                if (buttonName === "Edit") {
                  this.editCourse({
                    course_name: course_name + " (" + course_component + ")",
                    course_component: course_component,
                    course_year: course_year,
                    course_term: course_term,
                    course_class: course_class,
                    course_status: course_status,
                    course_grade: course_grade,
                    course_fullGrade: course_fullGrade,
                    course_length: 0,
                    course_progress: 0,
                    exam_date: exam_date,
                    exam_time: exam_time,
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  let buttonName = document.getElementById(
                    "schoolPlanner_addCourse_addButton_label",
                  ).textContent;
                  let course_name = document.getElementById(
                    "schoolPlanner_addCourse_name_input",
                  ).value;
                  let course_component = document.getElementById(
                    "schoolPlanner_addCourse_component_input",
                  ).value;
                  let course_year = document.getElementById(
                    "schoolPlanner_addCourse_year_input",
                  ).value;
                  let course_term = document.getElementById(
                    "schoolPlanner_addCourse_term_input",
                  ).value;
                  let course_class = document.getElementById(
                    "schoolPlanner_addCourse_class_input",
                  ).value;
                  let course_status = document.getElementById(
                    "schoolPlanner_addCourse_status_input",
                  ).value;
                  let course_grade = document.getElementById(
                    "schoolPlanner_addCourse_grade_input",
                  ).value;
                  let course_fullGrade = document.getElementById(
                    "schoolPlanner_addCourse_fullGrade_input",
                  ).value;
                  let exam_type = document.getElementById(
                    "schoolPlanner_addCourse_examType_input",
                  ).value;
                  let exam_date = buildExamDateValue({
                    day: document.getElementById(
                      "schoolPlanner_addCourse_examDate_day_input",
                    ).value,
                    month: document.getElementById(
                      "schoolPlanner_addCourse_examDate_month_input",
                    ).value,
                    year: document.getElementById(
                      "schoolPlanner_addCourse_examDate_year_input",
                    ).value,
                  });
                  let exam_time = buildExamTimeValue({
                    hour: document.getElementById(
                      "schoolPlanner_addCourse_examTime_hour_input",
                    ).value,
                    minute: document.getElementById(
                      "schoolPlanner_addCourse_examTime_minute_input",
                    ).value,
                  });
                  if (buttonName === "Add") {
                    this.addCourse({
                      course_name: course_name + " (" + course_component + ")",
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_type: exam_type,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                  if (buttonName === "Edit") {
                    this.editCourse({
                      course_name: course_name + " (" + course_component + ")",
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_type: exam_type,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                }
              }}
            >
              Add
            </div>
          </div>
          <div id="div_progression" className="div_progression fc"></div>
        </article>
      </React.Fragment>
    );
  }
}

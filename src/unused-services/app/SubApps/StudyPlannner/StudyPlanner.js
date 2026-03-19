import React, { Component } from "react";
import { Link, Route } from "react-router-dom";
import Header from "../../Header/Header";
import Study from "./components/Study/Study";
import Library from "./components/Library/Library";
import "./studyplanner.css";

export default class StudyPlanner extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lecture: "",
    };
  }

  //............................
  componentDidMount() {}
  componentDidUpdate() {}
  //.....................CHANGE STATES OUTSIDE THE CLASS..................
  selectLectureToStudy = (lectureSelected) => {
    this.setState({
      lecture: lectureSelected,
    });
  };

  render() {
    return (
      <React.Fragment>
        <Route exact path="/studyplanner/organizer">
          <Library
            state={this.props.state}
            selectLectureToStudy={(x) => this.selectLectureToStudy(x)}
          />
        </Route>
        <Route exact path="/studyplanner/statements">
          <Study
            state={this.props.state}
            lecture={this.state.lecture}
            selectLectureToStudy={(x) => this.selectLectureToStudy(x)}
          />
        </Route>
        <article id="app_page" className="fc">
          <Header
            state={this.props.state}
            logOut={this.logOut}
            acceptFriend={this.acceptFriend}
            type={this.type}
            show_profile={this.show_profile}
          />
          <main id="Main_article">
            <article id="studyplanner_article" className="fc">
              <section id="studyplanner_button_section" className="fc">
                <Link to="/studyplanner/statements">
                  <button>Study</button>
                </Link>
                <Link to="/studyplanner/organizer">
                  <button>Organizer</button>
                </Link>
              </section>
            </article>
          </main>
        </article>
      </React.Fragment>
    );
  }
}

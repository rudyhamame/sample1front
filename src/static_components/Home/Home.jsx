import React from "react";
import Footer from "../Footer";
import Header from "../Header";
import Main from "../Main";

//........Home Component...........
const Home = (props) => {
  return (
    <div id="app_page" className="fc">
      <Main state={props.state} fetchData={props.fetchData} page="home" />
    </div>
  );
};

export default Home;

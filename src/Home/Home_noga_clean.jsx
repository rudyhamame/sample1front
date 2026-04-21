import { Link, useHistory } from "react-router-dom";
import "./home-noga.css";
import Nav from "../Nav/Nav";
import React, { useEffect, useRef, useState } from "react";
import { apiUrl } from "../config/api";
import {
  drawHomeLedRopePath,
  drawHomeSketchPath,
  HOME_DRAWING_PALETTES,
  mergeNearbyHomeDrawingPaths,
  smoothHomeDrawingPoints,
} from "../utils/homeDrawingRope";
import { getHomeSubApps } from "../utils/homeSubApps";
import FriendChat from "../HomeChat/FriendChat";
import { refreshSharedPlannerMusicLibrary } from "../music/globalMusicPlayer";
import io from "socket.io-client";

// ...rest of the code copied from the original file...

function HomeNoga(props) {
  // ...component code...
}

export default HomeNoga;

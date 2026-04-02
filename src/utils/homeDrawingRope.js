export const HOME_DRAWING_PALETTES = [
  {
    id: "aurora",
    label: "Aurora",
    stroke: "rgba(178, 248, 255, 0.96)",
    glow: "rgba(125, 238, 255, 0.36)",
    bulb: "rgba(214, 255, 255, 0.96)",
  },
  {
    id: "rose",
    label: "Rose",
    stroke: "rgba(255, 182, 210, 0.96)",
    glow: "rgba(248, 126, 176, 0.34)",
    bulb: "rgba(255, 225, 235, 0.98)",
  },
  {
    id: "mint",
    label: "Mint",
    stroke: "rgba(185, 255, 220, 0.96)",
    glow: "rgba(88, 236, 169, 0.32)",
    bulb: "rgba(233, 255, 244, 0.98)",
  },
  {
    id: "gold",
    label: "Gold",
    stroke: "rgba(255, 225, 154, 0.96)",
    glow: "rgba(255, 191, 87, 0.34)",
    bulb: "rgba(255, 244, 214, 0.98)",
  },
];

const pointDistance = (firstPoint, secondPoint) => {
  const deltaX = Number(secondPoint?.x || 0) - Number(firstPoint?.x || 0);
  const deltaY = Number(secondPoint?.y || 0) - Number(firstPoint?.y || 0);
  return Math.hypot(deltaX, deltaY);
};

const clonePoint = (point) => ({
  x: Number(point?.x || 0),
  y: Number(point?.y || 0),
});

const clonePath = (path) => ({
  paletteId: String(path?.paletteId || "aurora").trim() || "aurora",
  stroke: String(path?.stroke || "").trim(),
  glow: String(path?.glow || "").trim(),
  bulb: String(path?.bulb || "").trim(),
  points: Array.isArray(path?.points) ? path.points.map(clonePoint) : [],
});

const cloneRect = (rect) => ({
  left: Number(rect?.left || 0),
  top: Number(rect?.top || 0),
  right: Number(rect?.right || 0),
  bottom: Number(rect?.bottom || 0),
});

const expandRect = (rect, padding = 0) => ({
  left: rect.left - padding,
  top: rect.top - padding,
  right: rect.right + padding,
  bottom: rect.bottom + padding,
});

const isPointInsideRect = (point, rect) =>
  point.x >= rect.left &&
  point.x <= rect.right &&
  point.y >= rect.top &&
  point.y <= rect.bottom;

const getOrientation = (firstPoint, secondPoint, thirdPoint) => {
  const crossProduct =
    (secondPoint.y - firstPoint.y) * (thirdPoint.x - secondPoint.x) -
    (secondPoint.x - firstPoint.x) * (thirdPoint.y - secondPoint.y);

  if (Math.abs(crossProduct) < 0.0001) {
    return 0;
  }

  return crossProduct > 0 ? 1 : 2;
};

const isPointOnSegment = (firstPoint, secondPoint, point) =>
  point.x <= Math.max(firstPoint.x, secondPoint.x) &&
  point.x >= Math.min(firstPoint.x, secondPoint.x) &&
  point.y <= Math.max(firstPoint.y, secondPoint.y) &&
  point.y >= Math.min(firstPoint.y, secondPoint.y);

const doSegmentsIntersect = (firstStart, firstEnd, secondStart, secondEnd) => {
  const orientationOne = getOrientation(firstStart, firstEnd, secondStart);
  const orientationTwo = getOrientation(firstStart, firstEnd, secondEnd);
  const orientationThree = getOrientation(secondStart, secondEnd, firstStart);
  const orientationFour = getOrientation(secondStart, secondEnd, firstEnd);

  if (
    orientationOne !== orientationTwo &&
    orientationThree !== orientationFour
  ) {
    return true;
  }

  if (
    orientationOne === 0 &&
    isPointOnSegment(firstStart, firstEnd, secondStart)
  ) {
    return true;
  }

  if (
    orientationTwo === 0 &&
    isPointOnSegment(firstStart, firstEnd, secondEnd)
  ) {
    return true;
  }

  if (
    orientationThree === 0 &&
    isPointOnSegment(secondStart, secondEnd, firstStart)
  ) {
    return true;
  }

  if (
    orientationFour === 0 &&
    isPointOnSegment(secondStart, secondEnd, firstEnd)
  ) {
    return true;
  }

  return false;
};

const doesSegmentIntersectRect = (startPoint, endPoint, rect) => {
  if (!startPoint || !endPoint || !rect) {
    return false;
  }

  if (isPointInsideRect(startPoint, rect) || isPointInsideRect(endPoint, rect)) {
    return true;
  }

  const corners = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];

  for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex += 1) {
    const nextCorner = corners[(cornerIndex + 1) % corners.length];
    if (
      doSegmentsIntersect(
        startPoint,
        endPoint,
        corners[cornerIndex],
        nextCorner,
      )
    ) {
      return true;
    }
  }

  return false;
};

const doesRouteIntersectRects = (routePoints, forbiddenRects = []) => {
  for (let pointIndex = 0; pointIndex < routePoints.length - 1; pointIndex += 1) {
    const currentPoint = routePoints[pointIndex];
    const nextPoint = routePoints[pointIndex + 1];

    if (
      forbiddenRects.some((rect) =>
        doesSegmentIntersectRect(currentPoint, nextPoint, rect),
      )
    ) {
      return true;
    }
  }

  return false;
};

const buildBridgePoints = (
  startPoint,
  endPoint,
  steps = 4,
  { forbiddenRects = [], clearance = 18 } = {},
) => {
  const normalizedForbiddenRects = (Array.isArray(forbiddenRects)
    ? forbiddenRects
    : []
  ).map((rect) => expandRect(cloneRect(rect), clearance));

  const straightRoute = [startPoint, endPoint];
  const intersectsForbiddenRects = doesRouteIntersectRects(
    straightRoute,
    normalizedForbiddenRects,
  );

  let routePoints = straightRoute;

  if (intersectsForbiddenRects) {
    const candidateRoutes = normalizedForbiddenRects.flatMap((rect) => [
      [
        startPoint,
        { x: startPoint.x, y: rect.top },
        { x: endPoint.x, y: rect.top },
        endPoint,
      ],
      [
        startPoint,
        { x: startPoint.x, y: rect.bottom },
        { x: endPoint.x, y: rect.bottom },
        endPoint,
      ],
      [
        startPoint,
        { x: rect.left, y: startPoint.y },
        { x: rect.left, y: endPoint.y },
        endPoint,
      ],
      [
        startPoint,
        { x: rect.right, y: startPoint.y },
        { x: rect.right, y: endPoint.y },
        endPoint,
      ],
    ]);

    const validRoute = candidateRoutes
      .filter(
        (candidateRoute) =>
          !doesRouteIntersectRects(candidateRoute, normalizedForbiddenRects),
      )
      .map((candidateRoute) => ({
        points: candidateRoute,
        distance: candidateRoute.reduce((totalDistance, point, pointIndex) => {
          if (pointIndex === 0) {
            return 0;
          }

          return (
            totalDistance +
            pointDistance(candidateRoute[pointIndex - 1], point)
          );
        }, 0),
      }))
      .sort((firstRoute, secondRoute) => firstRoute.distance - secondRoute.distance)[0];

    if (validRoute?.points?.length) {
      routePoints = validRoute.points;
    }
  }

  const bridgeDistance = pointDistance(startPoint, endPoint);
  const adaptiveSteps = Math.ceil(bridgeDistance / 18);
  const safeSteps = Math.max(2, steps, adaptiveSteps);
  const nextPoints = [];

  for (let routeIndex = 0; routeIndex < routePoints.length - 1; routeIndex += 1) {
    const currentStart = routePoints[routeIndex];
    const currentEnd = routePoints[routeIndex + 1];
    const segmentDistance = pointDistance(currentStart, currentEnd);
    const segmentSteps = Math.max(
      2,
      Math.ceil((segmentDistance / Math.max(bridgeDistance, 1)) * safeSteps),
    );

    for (let stepIndex = 1; stepIndex < segmentSteps; stepIndex += 1) {
      const ratio = stepIndex / segmentSteps;
      nextPoints.push({
        x: currentStart.x + (currentEnd.x - currentStart.x) * ratio,
        y: currentStart.y + (currentEnd.y - currentStart.y) * ratio,
      });
    }

    if (routeIndex < routePoints.length - 2) {
      nextPoints.push(clonePoint(currentEnd));
    }
  }

  return nextPoints;
};

const getPathEndpoints = (path) => {
  const points = Array.isArray(path?.points) ? path.points : [];
  return {
    start: points[0],
    end: points[points.length - 1],
  };
};

const closeNearbyPathEnds = (
  path,
  { snapThreshold = 20, forbiddenRects = [] } = {},
) => {
  const normalizedPath = clonePath(path);
  const { start, end } = getPathEndpoints(normalizedPath);

  if (!start || !end || normalizedPath.points.length < 3) {
    return normalizedPath;
  }

  const closingDistance = pointDistance(start, end);
  if (closingDistance > snapThreshold) {
    return normalizedPath;
  }

  const connectorPoints =
    closingDistance <= 1
      ? []
      : buildBridgePoints(end, start, 4, { forbiddenRects });

  return {
    ...normalizedPath,
    points: [
      ...normalizedPath.points,
      ...connectorPoints,
      clonePoint(start),
    ],
  };
};

const buildMergedPoints = (
  leadingPoints,
  startPoint,
  endPoint,
  trailingPoints,
  { forbiddenRects = [], snapThreshold = 20 } = {},
) => {
  const mergeDistance = pointDistance(startPoint, endPoint);
  const connectorPoints =
    mergeDistance <= snapThreshold
      ? []
      : buildBridgePoints(startPoint, endPoint, 6, { forbiddenRects });

  return [
    ...leadingPoints,
    ...connectorPoints,
    clonePoint(endPoint),
    ...trailingPoints,
  ];
};

const mergeTwoPaths = (
  firstPath,
  secondPath,
  { forbiddenRects = [] } = {},
) => {
  const { start: firstStart, end: firstEnd } = getPathEndpoints(firstPath);
  const { start: secondStart, end: secondEnd } = getPathEndpoints(secondPath);

  const candidates = [
    {
      distance: pointDistance(firstEnd, secondStart),
      nextPoints: buildMergedPoints(
        firstPath.points,
        firstEnd,
        secondStart,
        secondPath.points.slice(1),
        { forbiddenRects },
      ),
    },
    {
      distance: pointDistance(firstEnd, secondEnd),
      nextPoints: buildMergedPoints(
        firstPath.points,
        firstEnd,
        secondEnd,
        [...secondPath.points].reverse().slice(1),
        { forbiddenRects },
      ),
    },
    {
      distance: pointDistance(firstStart, secondStart),
      nextPoints: buildMergedPoints(
        [...firstPath.points].reverse(),
        firstStart,
        secondStart,
        secondPath.points.slice(1),
        { forbiddenRects },
      ),
    },
    {
      distance: pointDistance(firstStart, secondEnd),
      nextPoints: buildMergedPoints(
        [...firstPath.points].reverse(),
        firstStart,
        secondEnd,
        [...secondPath.points].reverse().slice(1),
        { forbiddenRects },
      ),
    },
  ].sort((firstCandidate, secondCandidate) => {
    return firstCandidate.distance - secondCandidate.distance;
  });

  return {
    distance: candidates[0].distance,
    path: {
      paletteId: firstPath.paletteId,
      stroke: String(firstPath?.stroke || "").trim(),
      glow: String(firstPath?.glow || "").trim(),
      bulb: String(firstPath?.bulb || "").trim(),
      points: candidates[0].nextPoints,
    },
  };
};

export const smoothHomeDrawingPoints = (
  points,
  { minimumStep = 6, iterations = 2 } = {},
) => {
  const filteredPoints = Array.isArray(points)
    ? points.filter(
        (point) =>
          Number.isFinite(point?.x) &&
          Number.isFinite(point?.y),
      )
    : [];

  if (filteredPoints.length < 3) {
    return filteredPoints;
  }

  const simplifiedPoints = filteredPoints.reduce((collectedPoints, point) => {
    if (collectedPoints.length === 0) {
      return [point];
    }

    const lastPoint = collectedPoints[collectedPoints.length - 1];
    if (pointDistance(lastPoint, point) >= minimumStep) {
      return [...collectedPoints, point];
    }

    return collectedPoints;
  }, []);

  let nextPoints =
    simplifiedPoints.length >= 2 ? simplifiedPoints : filteredPoints;

  for (let iterationIndex = 0; iterationIndex < iterations; iterationIndex += 1) {
    if (nextPoints.length < 3) {
      break;
    }

    const refinedPoints = [nextPoints[0]];
    for (let pointIndex = 0; pointIndex < nextPoints.length - 1; pointIndex += 1) {
      const currentPoint = nextPoints[pointIndex];
      const followingPoint = nextPoints[pointIndex + 1];
      const quarterPoint = {
        x: currentPoint.x * 0.75 + followingPoint.x * 0.25,
        y: currentPoint.y * 0.75 + followingPoint.y * 0.25,
      };
      const threeQuarterPoint = {
        x: currentPoint.x * 0.25 + followingPoint.x * 0.75,
        y: currentPoint.y * 0.25 + followingPoint.y * 0.75,
      };

      refinedPoints.push(quarterPoint, threeQuarterPoint);
    }
    refinedPoints.push(nextPoints[nextPoints.length - 1]);
    nextPoints = refinedPoints;
  }

  return nextPoints;
};

export const drawHomeLedRopePath = (
  context,
  points,
  palette,
  { ropeWidth = 0.75, bulbSpacing = 13 } = {},
) => {
  if (!context || !Array.isArray(points) || points.length < 2 || !palette) {
    return;
  }

  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = String(palette.stroke || "").replace("0.96", "0.34");
  context.lineWidth = ropeWidth;
  context.shadowBlur = 14;
  context.shadowColor = palette.glow;
  context.stroke();

  context.shadowBlur = 6;
  context.shadowColor = palette.bulb;
  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = Math.max(0.38, ropeWidth * 0.18);
  context.stroke();
  context.restore();

  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = String(palette.stroke || "").replace("0.96", "0.22");
  context.lineWidth = Math.max(0.9, ropeWidth);
  context.globalAlpha = 0.35;
  context.stroke();
  context.restore();

  const drawBulb = (bulbPoint, radius = 1.8) => {
    context.save();
    context.beginPath();
    context.fillStyle = palette.bulb;
    context.shadowBlur = 34;
    context.shadowColor = palette.glow;
    context.arc(bulbPoint.x, bulbPoint.y, radius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.shadowBlur = 12;
    context.shadowColor = palette.bulb;
    context.arc(bulbPoint.x, bulbPoint.y, Math.max(0.55, radius * 0.42), 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  drawBulb(points[0], 1.7);
  drawBulb(points[points.length - 1], 1.7);

  let carriedDistance = 0;
  let lastBulbPoint = points[0];
  let renderedBulbCount = 2;

  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const nextPoint = points[pointIndex];
    let segmentDistance = pointDistance(lastBulbPoint, nextPoint);

    while (segmentDistance + carriedDistance >= bulbSpacing && segmentDistance > 0) {
      const interpolationRatio =
        (bulbSpacing - carriedDistance) / segmentDistance;
      const bulbPoint = {
        x: lastBulbPoint.x + (nextPoint.x - lastBulbPoint.x) * interpolationRatio,
        y: lastBulbPoint.y + (nextPoint.y - lastBulbPoint.y) * interpolationRatio,
      };

      drawBulb(bulbPoint, 1.65);

      lastBulbPoint = bulbPoint;
      segmentDistance = pointDistance(lastBulbPoint, nextPoint);
      carriedDistance = 0;
      renderedBulbCount += 1;
    }

    carriedDistance += segmentDistance;
    lastBulbPoint = nextPoint;
  }

  if (renderedBulbCount <= 2) {
    const midpoint = points[Math.floor(points.length / 2)];
    if (midpoint) {
      drawBulb(midpoint, 1.55);
    }
  }
};

export const drawHomeSketchPath = (
  context,
  points,
  palette,
  { lineWidth = 2 } = {},
) => {
  if (!context || !Array.isArray(points) || points.length < 2 || !palette) {
    return;
  }

  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  context.strokeStyle = palette.stroke;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([6, 6]);
  context.globalAlpha = 0.9;
  context.shadowBlur = 8;
  context.shadowColor = palette.glow;
  context.stroke();
  context.restore();
};

export const drawHomeLedText = (
  context,
  text,
  point,
  palette,
  { fontSize = 18 } = {},
) => {
  const content = String(text || "").trim();
  if (
    !context ||
    !content ||
    !palette ||
    !Number.isFinite(point?.x) ||
    !Number.isFinite(point?.y)
  ) {
    return;
  }

  context.save();
  context.font = `600 ${fontSize}px "IBM Plex Sans", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.lineJoin = "round";

  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.lineWidth = 3.2;
  context.shadowBlur = 22;
  context.shadowColor = palette.glow;
  context.strokeText(content, point.x, point.y);

  context.fillStyle = palette.bulb;
  context.shadowBlur = 18;
  context.shadowColor = palette.glow;
  context.fillText(content, point.x, point.y);

  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.shadowBlur = 8;
  context.shadowColor = palette.bulb;
  context.fillText(content, point.x, point.y);
  context.restore();
};

export const mergeNearbyHomeDrawingPaths = (
  paths,
  { distanceThreshold = Number.POSITIVE_INFINITY, forbiddenRects = [] } = {},
) => {
  const normalizedPaths = Array.isArray(paths)
    ? paths
        .map(clonePath)
        .filter((path) => path.points.length >= 2)
    : [];

  const groupedByPalette = normalizedPaths.reduce((groups, path) => {
    const groupKey = path.paletteId;
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(path);
    return groups;
  }, {});

  return Object.values(groupedByPalette).flatMap((palettePaths) => {
    const remainingPaths = [...palettePaths];
    const stitchedPaths = [];

    while (remainingPaths.length > 0) {
      let currentPath = remainingPaths.shift();

      if (!currentPath) {
        break;
      }

      let didMerge = true;

      while (didMerge && remainingPaths.length > 0) {
        didMerge = false;
        let bestIndex = -1;
        let bestMerge = null;

        remainingPaths.forEach((candidatePath, candidateIndex) => {
          const candidateMerge = mergeTwoPaths(currentPath, candidatePath, {
            forbiddenRects,
          });

          if (
            candidateMerge.distance <= distanceThreshold &&
            (!bestMerge || candidateMerge.distance < bestMerge.distance)
          ) {
            bestMerge = candidateMerge;
            bestIndex = candidateIndex;
          }
        });

        if (bestMerge && bestIndex >= 0) {
          currentPath = bestMerge.path;
          remainingPaths.splice(bestIndex, 1);
          didMerge = true;
        }
      }

      stitchedPaths.push(currentPath);
    }

    return stitchedPaths.map((stitchedPath) =>
      closeNearbyPathEnds(stitchedPath, { forbiddenRects }),
    );
  });
};

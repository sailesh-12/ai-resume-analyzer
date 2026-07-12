/**
 * components/RadarChart.jsx
 * 
 * Custom radar/spider chart for 6-dimension resume analysis.
 * Pure SVG - no external charting library needed.
 * Supports dark theme via CSS custom properties.
 */

export function RadarChart({ data, size = 400 }) {
  const dimensions = 6;
  const radius = size / 2 - 50;
  const centerX = size / 2;
  const centerY = size / 2;
  const levels = 5; // 5 concentric levels (0, 2, 4, 6, 8, 10 scores)

  // Order: communication, technical, experience, ats, achievement, presentation
  const dimensionKeys = [
    'communication',
    'technical',
    'experience',
    'ats',
    'achievement',
    'presentation',
  ];

  // Calculate angle for each dimension
  const angleSlice = (Math.PI * 2) / dimensions;

  // Convert polar to cartesian
  const polarToCartesian = (angle, distance) => {
    const x = centerX + distance * Math.cos(angle - Math.PI / 2);
    const y = centerY + distance * Math.sin(angle - Math.PI / 2);
    return [x, y];
  };

  // Generate grid lines (concentric hexagons — CLOSED)
  const gridLines = [];
  for (let level = 1; level <= levels; level++) {
    const levelRadius = (radius / levels) * level;
    const points = [];
    for (let i = 0; i < dimensions; i++) {
      const [x, y] = polarToCartesian(angleSlice * i, levelRadius);
      points.push(`${x},${y}`);
    }
    // Close the polygon by repeating the first point
    points.push(points[0]);
    gridLines.push(
      <polyline
        key={`grid-${level}`}
        points={points.join(' ')}
        className="radar-grid-line"
        strokeWidth="1"
        fill="none"
      />
    );
  }

  // Generate axis lines
  const axisLines = [];
  for (let i = 0; i < dimensions; i++) {
    const [x, y] = polarToCartesian(angleSlice * i, radius);
    axisLines.push(
      <line
        key={`axis-${i}`}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        className="radar-axis-line"
        strokeWidth="1"
      />
    );
  }

  // Plot data points
  const dataPoints = [];
  const scores = dimensionKeys.map((key) => {
    const dimension = data[key];
    return dimension ? Math.min(10, Math.max(0, Number(dimension.score) || 0)) : 0;
  });

  // Draw data polygon
  const polygonPoints = [];
  scores.forEach((score, i) => {
    const distance = (radius / 10) * score;
    const [x, y] = polarToCartesian(angleSlice * i, distance);
    polygonPoints.push(`${x},${y}`);
    dataPoints.push(
      <circle
        key={`point-${i}`}
        cx={x}
        cy={y}
        r="6"
        className="radar-data-point"
      />
    );
  });

  // Color mapping for score labels
  const getScoreClass = (s) => {
    if (s >= 8) return 'excellent';
    if (s >= 6) return 'good';
    if (s >= 4) return 'fair';
    return 'poor';
  };

  // Labels with scores
  const labels = [];
  dimensionKeys.forEach((key, i) => {
    const dimension = data[key];
    const label = dimension?.label || key.replace(/_/g, ' ');
    const score = Number(dimension?.score) || 0;
    
    const labelDistance = radius + 42;
    const [x, y] = polarToCartesian(angleSlice * i, labelDistance);

    labels.push(
      <g key={`label-${i}`}>
        <text
          x={x}
          y={y - 2}
          textAnchor="middle"
          className="radar-label-text"
          fontSize="11.5"
          fontWeight="600"
        >
          {label}
        </text>
        <text
          x={x}
          y={y + 15}
          textAnchor="middle"
          className={`radar-score-text score-${getScoreClass(score)}`}
          fontSize="13"
          fontWeight="700"
        >
          {score}/10
        </text>
      </g>
    );
  });

  return (
    <div className="radar-chart-container">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="radar-svg"
      >
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent, #4f46e5)" stopOpacity="0.05" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {gridLines}

        {/* Axes */}
        {axisLines}

        {/* Level labels (2, 4, 6, 8, 10) */}
        {[1, 2, 3, 4, 5].map((level) => (
          <text
            key={`level-${level}`}
            x={centerX + 5}
            y={centerY - (radius / levels) * level + 4}
            className="radar-level-text"
            fontSize="9"
          >
            {level * 2}
          </text>
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonPoints.join(' ')}
          fill="url(#radarGradient)"
          stroke="var(--primary)"
          strokeWidth="2.5"
          filter="url(#glow)"
          className="radar-polygon"
        />

        {/* Data points */}
        {dataPoints}

        {/* Labels */}
        {labels}
      </svg>

      {/* Insights below chart */}
      <div className="radar-insights">
        {dimensionKeys.map((key) => {
          const dimension = data[key];
          if (!dimension) return null;
          
          const score = Number(dimension.score) || 0;
          let ratingClass = '';
          if (score >= 8) ratingClass = 'excellent';
          else if (score >= 6) ratingClass = 'good';
          else if (score >= 4) ratingClass = 'fair';
          else ratingClass = 'poor';

          return (
            <div key={`insight-${key}`} className={`insight-item ${ratingClass}`}>
              <div className="insight-item-header">
                <strong>{dimension.label}</strong>
                <span className={`insight-score-pill ${ratingClass}`}>{score}/10</span>
              </div>
              <p>{dimension.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

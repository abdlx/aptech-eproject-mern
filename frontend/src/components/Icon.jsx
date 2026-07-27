// ============================================================================
// Original author: Munawwar (base Fitness Tracker UI) — extracted from main.jsx
// by Abdullah, who added the routine/session icons.
// ============================================================================

import React from 'react';

export default function Icon({ name, size = 26 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2.2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  const filled = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' };

  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4.2-4.2" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    flame: <path d="M12 21c3.9 0 7-2.7 7-6.6 0-2.5-1.3-4.7-3.4-5.9.1 1.8-.6 3-1.6 3.8.1-3.6-2-6.4-5.1-8.3.4 3.2-1.2 5.1-2.5 6.7A6.2 6.2 0 0 0 5 14.4C5 18.3 8.1 21 12 21Zm0-3.2a2.8 2.8 0 0 1-2.9-2.9c0-1.2.8-2.1 1.6-3 .2 1.3 1 2.1 2.2 2.7.8-.5 1.3-1.2 1.5-2.1 1 1 1.5 2 1.5 3A3 3 0 0 1 12 17.8Z" />,
    dumbbell: <><path d="M6 7v10M18 7v10M3.5 9v6M20.5 9v6M6 12h12" /></>,
    wheel: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.3" /><path d="M12 4v5.6M12 14.4V20M4 12h5.6M14.4 12H20M7 7l3.4 3.4M13.6 13.6 17 17M17 7l-3.4 3.4M10.4 13.6 7 17" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
    utensils: <><path d="M6 3v8M9 3v8M3 3v8a3 3 0 0 0 6 0M15 3v18M15 10c4 0 6-2.5 6-7" /></>,
    scale: <><path d="M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><path d="M9 8a3 3 0 0 1 6 0M12 12v2" /></>,
    chartPie: <><path d="M12 3v9h9" /><path d="M21 12a9 9 0 1 1-9-9" /></>,
    dots: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    home: <path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.2v-5.7H9.2v5.7H4a1 1 0 0 1-1-1Z" />,
    progress: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 3 5-7" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.2 2.4-5 6-5s5.5 1.8 6 5" /><circle cx="17" cy="10" r="2.4" /><path d="M16 15c2.8.2 4.4 1.8 4.8 5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 15H6L5 6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 3.7-6 8-6s7 2 8 6" /></>,
    settings: <><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9c.3.6.9 1 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    heart: <path d="M12 20.5s-7.5-4.6-9.7-9.1C.9 8.2 2.4 5 5.5 5c1.9 0 3.3 1 4.5 2.6C11.2 6 12.6 5 14.5 5c3.1 0 4.6 3.2 3.2 6.4-2.2 4.5-9.7 9.1-9.7 9.1Z" />,
    comment: <><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-3a8 8 0 1 1 18-8Z" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 18 5-5 4 3.5L16 13l4 4" /></>,
    feed: <><path d="M4 5h16M4 12h16M4 19h10" /></>,
    // Added for routines / live sessions.
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1.4" fill="currentColor" stroke="none" /></>,
    play: <path d="M7 4.5v15l13-7.5Z" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2.5" />,
    timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></>,
    // Added for the step-wizard headers (routine/workout/meal creation).
    back: <path d="m15 6-6 6 6 6" />,
    forward: <path d="m9 6 6 6-6 6" />,
  };

  const isFilled = name === 'home' || name === 'flame' || name === 'heart' || name === 'play' || name === 'stop';
  return <svg {...(isFilled ? filled : common)}>{paths[name]}</svg>;
}

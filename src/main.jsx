import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const stats = [
  { label: 'Calories', value: '1,800', target: '/ 2,200 kcal', icon: 'flame', color: 'pink', progress: 86 },
  { label: 'Workout', value: '75', target: '/ 90 min', icon: 'dumbbell', color: 'lime', progress: 84 },
  { label: 'Steps', value: '8,245', target: '/ 10,000', icon: 'wheel', color: 'cyan', progress: 82 },
];

const actions = [
  { label: 'Log\nWorkout', icon: 'plus', color: 'lime', featured: true },
  { label: 'Log\nMeal', icon: 'utensils', color: 'pink' },
  { label: 'Update\nWeight', icon: 'scale', color: 'cyan' },
  { label: 'View\nReports', icon: 'chartPie', color: 'amber' },
  { label: 'More', icon: 'dots', color: 'muted' },
];

const activities = [
  { title: 'Push Day Workout', detail: 'Chest, Shoulders, Triceps', time: '2h ago', icon: 'dumbbell', color: 'lime' },
  { title: 'High Protein Meal', detail: '520 kcal  \u2022  40g protein', time: '4h ago', icon: 'utensils', color: 'pink' },
  { title: 'Weight Update', detail: '75.2 kg', time: 'Yesterday', icon: 'scale', color: 'cyan' },
];

function Icon({ name, size = 28 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const filled = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' };

  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4.2-4.2" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    flame: <path d="M12 21c3.9 0 7-2.7 7-6.6 0-2.5-1.3-4.7-3.4-5.9.1 1.8-.6 3-1.6 3.8.1-3.6-2-6.4-5.1-8.3.4 3.2-1.2 5.1-2.5 6.7A6.2 6.2 0 0 0 5 14.4C5 18.3 8.1 21 12 21Zm0-3.2a2.8 2.8 0 0 1-2.9-2.9c0-1.2.8-2.1 1.6-3 .2 1.3 1 2.1 2.2 2.7.8-.5 1.3-1.2 1.5-2.1 1 1 1.5 2 1.5 3A3 3 0 0 1 12 17.8Z" />,
    dumbbell: <><path d="M6 7v10M18 7v10M3.5 9v6M20.5 9v6M6 12h12" /></>,
    wheel: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.3" /><path d="M12 4v5.6M12 14.4V20M4 12h5.6M14.4 12H20M7 7l3.4 3.4M13.6 13.6 17 17M17 7l-3.4 3.4M10.4 13.6 7 17" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    utensils: <><path d="M6 3v8M9 3v8M3 3v8a3 3 0 0 0 6 0M15 3v18M15 10c4 0 6-2.5 6-7" /></>,
    scale: <><path d="M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><path d="M9 8a3 3 0 0 1 6 0M12 12v2" /></>,
    chartPie: <><path d="M12 3v9h9" /><path d="M21 12a9 9 0 1 1-9-9" /></>,
    dots: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    home: <path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.2v-5.7H9.2v5.7H4a1 1 0 0 1-1-1Z" />,
    progress: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 3 5-7" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.2 2.4-5 6-5s5.5 1.8 6 5" /><circle cx="17" cy="10" r="2.4" /><path d="M16 15c2.8.2 4.4 1.8 4.8 5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  return <svg {...(name === 'home' || name === 'flame' ? filled : common)}>{paths[name]}</svg>;
}

function StatCard({ stat }) {
  return (
    <section className="glass stat-card">
      <div className={`icon-bubble ${stat.color}`}><Icon name={stat.icon} /></div>
      <div>
        <p>{stat.label}</p>
        <strong>{stat.value}</strong>
        <span>{stat.target}</span>
      </div>
      <div className="meter"><i className={stat.color} style={{ width: `${stat.progress}%` }} /></div>
    </section>
  );
}

function ProgressChart() {
  const points = [[22, 108], [132, 130], [242, 76], [352, 111], [462, 73], [572, 74], [682, 30]];

  return (
    <section className="glass progress-card">
      <div className="chart-grid">
        <span>80 kg</span><span>75 kg</span><span>70 kg</span><span>65 kg</span>
      </div>
      <svg className="chart" viewBox="0 0 704 190" preserveAspectRatio="none">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b8ff00" stopOpacity=".25" /><stop offset="1" stopColor="#b8ff00" stopOpacity="0" /></linearGradient>
        </defs>
        <path className="area" d="M22 108 C70 112 88 140 132 130 C180 119 194 82 242 76 C294 70 304 121 352 111 C398 102 412 75 462 73 C512 71 522 76 572 74 C624 71 638 45 682 30 L682 190 L22 190 Z" />
        <path className="line" d="M22 108 C70 112 88 140 132 130 C180 119 194 82 242 76 C294 70 304 121 352 111 C398 102 412 75 462 73 C512 71 522 76 572 74 C624 71 638 45 682 30" filter="url(#glow)" />
        {points.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />)}
        <line x1="462" x2="462" y1="73" y2="178" />
      </svg>
      <div className="tooltip">75 kg</div>
      <div className="days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
    </section>
  );
}

function App() {
  return (
    <main className="phone">
      <header className="topbar">
        <div className="logo">Ly<span>fta</span></div>
        <nav className="top-icons" aria-label="Header actions">
          <Icon name="search" size={32} />
          <div className="notif"><Icon name="bell" size={30} /></div>
          <div className="avatar" aria-label="Profile"><span /></div>
        </nav>
      </header>

      <section className="hero">
        <h1>Good Night, Abdullah</h1>
        <p>Keep pushing your limits. You're doing great!</p>
      </section>

      <div className="stats">{stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</div>

      <section className="section-title"><h2>Today's Overview</h2><a>View All</a></section>
      <section className="glass overview">
        <div className="overview-block workout-bg">
          <img src="/images/next-workout.png" alt="" />
          <small>Next Workout</small><h3>Push Day</h3><p><Icon name="clock" size={21} /> in 2h 30m</p>
        </div>
        <div className="overview-block meal-bg">
          <img src="/images/next-meal.png" alt="" />
          <small>Next Meal</small><h3>Lunch</h3><p><Icon name="clock" size={21} /> in 3h 15m</p>
        </div>
      </section>

      <section className="section-title"><h2>Weekly Progress</h2><a>This Week</a></section>
      <ProgressChart />

      <section className="section-title solo"><h2>Quick Actions</h2></section>
      <section className="actions">{actions.map((action) => (
        <button className="glass action" key={action.label}>
          <span className={`${action.color}${action.featured ? ' featured-action' : ''}`}><Icon name={action.icon} /></span>
          {action.label.split('\n').map((part) => <b key={part}>{part}</b>)}
        </button>
      ))}</section>

      <section className="section-title"><h2>Recent Activity</h2><a>View All</a></section>
      <section className="glass activity-list">{activities.map((item) => (
        <article className="activity" key={item.title}>
          <div className={`mini-icon ${item.color}`}><Icon name={item.icon} size={24} /></div>
          <div><h3>{item.title}</h3><p>{item.detail}</p></div>
          <time>{item.time}</time>
          <Icon name="check" size={25} />
        </article>
      ))}</section>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <svg className="nav-shape" viewBox="0 0 390 74" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="navFill" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="#11161c" />
              <stop offset=".34" stopColor="#080b0f" />
              <stop offset="1" stopColor="#080b0f" />
            </linearGradient>
          </defs>
          <path
            className="nav-fill"
            d="M36 0 H143 C158 0 161 22 177 25 C186 27 204 27 213 25 C229 22 232 0 247 0 H354 C374 0 390 16 390 37 V74 H0 V37 C0 16 16 0 36 0 Z"
          />
          <path
            className="nav-inner-highlight"
            d="M36 1 H143 C158 1 161 23 177 26 C186 28 204 28 213 26 C229 23 232 1 247 1 H354"
          />
        </svg>
        <div className="nav-items">
          <a className="nav-item active"><Icon name="home" size={24} /><span>Home</span></a>
          <a className="nav-item"><Icon name="dumbbell" size={23} /><span>Workout</span></a>
          <div className="nav-item nav-center"><span>Nutrition</span></div>
          <a className="nav-item"><Icon name="progress" size={23} /><span>Progress</span></a>
          <a className="nav-item"><Icon name="community" size={23} /><span>Community</span></a>
        </div>
        <button className="nav-add" aria-label="Add nutrition entry"><Icon name="plus" size={28} /></button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

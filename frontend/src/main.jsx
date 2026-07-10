import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const AUTH_KEY = 'lyfta.auth';
const REMINDERS_KEY = 'lyfta.reminders';

const emptyWorkout = {
  name: '',
  category: 'strength',
  exerciseName: '',
  sets: '',
  reps: '',
  weight: '',
  notes: '',
  tags: '',
};

const emptyMeal = {
  mealType: 'breakfast',
  foodName: '',
  quantity: '',
  unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
};

const emptyProgress = {
  weight: '',
  chest: '',
  waist: '',
  hips: '',
  arms: '',
  legs: '',
  runTime: '',
  liftingWeight: '',
  notes: '',
};

const emptyReminder = {
  title: '',
  type: 'workout',
  time: '',
};

function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function relativeTime(value) {
  if (!value) return 'Just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function request(path, { method = 'GET', body, token } = {}) {
  if (!API_BASE) {
    throw new Error('Missing VITE_API_URL. Add it to frontend/.env');
  }

  const headers = {};
  const config = { method, headers };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, config);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}

function Icon({ name, size = 26 }) {
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
  };

  return <svg {...(name === 'home' || name === 'flame' ? filled : common)}>{paths[name]}</svg>;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const user = await request(path, { method: 'POST', body: payload });
      saveJson(AUTH_KEY, user);
      onAuth(user);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card glass">
        <div className="logo auth-logo">Ly<span>fta</span></div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p>Connect to the fitness server to track workouts, meals, progress, reports, and reminders.</p>
        <form className="form-grid" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength="6" />
          </label>
          {status && <p className="form-error">{status}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            <Icon name="check" size={20} />
            {loading ? 'Connecting...' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>
        <button className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
        </button>
      </section>
    </main>
  );
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
      <div className="meter"><i className={stat.color} style={{ width: `${Math.min(100, stat.progress)}%` }} /></div>
    </section>
  );
}

function ProgressChart({ entries }) {
  const newestFirst = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const week = newestFirst.slice(0, 7).reverse();
  const values = week.map((entry) => num(entry.weight)).filter(Boolean);
  const fallback = values.length ? values : [70, 71, 70, 72, 71, 73, 74];
  const min = Math.min(...fallback) - 2;
  const max = Math.max(...fallback) + 2;
  const range = Math.max(1, max - min);
  const points = fallback.map((value, index) => {
    const x = 22 + index * (660 / Math.max(1, fallback.length - 1));
    const y = 170 - ((value - min) / range) * 125;
    return [x, y, value];
  });
  const path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${points.at(-1)[0].toFixed(1)} 190 L22 190 Z`;
  const latest = fallback.at(-1);

  return (
    <section className="glass progress-card">
      <div className="chart-grid">
        <span>{Math.round(max)} kg</span><span>{Math.round((max + min) / 2)} kg</span><span>{Math.round(min)} kg</span>
      </div>
      <svg className="chart" viewBox="0 0 704 190" preserveAspectRatio="none">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b8ff00" stopOpacity=".25" /><stop offset="1" stopColor="#b8ff00" stopOpacity="0" /></linearGradient>
        </defs>
        <path className="area" d={area} />
        <path className="line" d={path} filter="url(#glow)" />
        {points.map(([x, y, value]) => <circle key={`${x}-${value}`} cx={x} cy={y} r="8" />)}
      </svg>
      <div className="tooltip">{latest ? `${latest} kg` : 'No data'}</div>
      <div className="days">{points.map((_, index) => <span key={index}>{week[index] ? formatDate(week[index].date) : `Day ${index + 1}`}</span>)}</div>
    </section>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <section className="section-title">
      <h2>{title}</h2>
      {action && <button className="link-btn compact" onClick={onAction}>{action}</button>}
    </section>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function WorkoutForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial || emptyWorkout);

  function submit(event) {
    event.preventDefault();
    onSubmit({
      name: form.name,
      category: form.category,
      exercises: [{
        name: form.exerciseName,
        sets: num(form.sets),
        reps: num(form.reps),
        weight: num(form.weight),
        notes: form.notes,
      }],
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit workout' : 'Log workout'}</h3>
      <label>Routine name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="strength">Strength</option><option value="cardio">Cardio</option><option value="flexibility">Flexibility</option><option value="other">Other</option></select></label>
      <label>Exercise<input value={form.exerciseName} onChange={(event) => setForm({ ...form, exerciseName: event.target.value })} required /></label>
      <div className="form-row">
        <label>Sets<input type="number" min="0" value={form.sets} onChange={(event) => setForm({ ...form, sets: event.target.value })} /></label>
        <label>Reps<input type="number" min="0" value={form.reps} onChange={(event) => setForm({ ...form, reps: event.target.value })} /></label>
        <label>Weight<input type="number" min="0" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></label>
      </div>
      <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="push, chest" /></label>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function MealForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial || emptyMeal);

  function submit(event) {
    event.preventDefault();
    onSubmit({
      mealType: form.mealType,
      foods: [{
        name: form.foodName,
        quantity: num(form.quantity),
        unit: form.unit,
        calories: num(form.calories),
        protein: num(form.protein),
        carbs: num(form.carbs),
        fats: num(form.fats),
      }],
    });
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit meal' : 'Log meal'}</h3>
      <label>Meal type<select value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
      <label>Food<input value={form.foodName} onChange={(event) => setForm({ ...form, foodName: event.target.value })} required /></label>
      <div className="form-row">
        <label>Qty<input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>
        <label>Unit<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
        <label>Calories<input type="number" min="0" value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Protein<input type="number" min="0" value={form.protein} onChange={(event) => setForm({ ...form, protein: event.target.value })} /></label>
        <label>Carbs<input type="number" min="0" value={form.carbs} onChange={(event) => setForm({ ...form, carbs: event.target.value })} /></label>
        <label>Fats<input type="number" min="0" value={form.fats} onChange={(event) => setForm({ ...form, fats: event.target.value })} /></label>
      </div>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function ProgressForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial || emptyProgress);

  function submit(event) {
    event.preventDefault();
    onSubmit({
      weight: num(form.weight),
      bodyMeasurements: {
        chest: num(form.chest),
        waist: num(form.waist),
        hips: num(form.hips),
        arms: num(form.arms),
        legs: num(form.legs),
      },
      performanceMetrics: {
        runTime: num(form.runTime),
        liftingWeight: num(form.liftingWeight),
      },
      notes: form.notes,
    });
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit progress' : 'Update progress'}</h3>
      <div className="form-row">
        <label>Weight kg<input type="number" min="0" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></label>
        <label>Run min<input type="number" min="0" value={form.runTime} onChange={(event) => setForm({ ...form, runTime: event.target.value })} /></label>
        <label>Lift kg<input type="number" min="0" value={form.liftingWeight} onChange={(event) => setForm({ ...form, liftingWeight: event.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Chest<input type="number" min="0" value={form.chest} onChange={(event) => setForm({ ...form, chest: event.target.value })} /></label>
        <label>Waist<input type="number" min="0" value={form.waist} onChange={(event) => setForm({ ...form, waist: event.target.value })} /></label>
        <label>Hips<input type="number" min="0" value={form.hips} onChange={(event) => setForm({ ...form, hips: event.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Arms<input type="number" min="0" value={form.arms} onChange={(event) => setForm({ ...form, arms: event.target.value })} /></label>
        <label>Legs<input type="number" min="0" value={form.legs} onChange={(event) => setForm({ ...form, legs: event.target.value })} /></label>
      </div>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function ReminderForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState(emptyReminder);

  function submit(event) {
    event.preventDefault();
    onSubmit({ ...form, id: crypto.randomUUID() });
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>Add reminder</h3>
      <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
      <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="workout">Workout</option><option value="nutrition">Meal</option><option value="goal">Goal</option></select></label>
      <label>Time<input type="datetime-local" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function FormActions({ onCancel }) {
  return (
    <div className="form-actions">
      <button className="secondary-btn" type="button" onClick={onCancel}><Icon name="x" size={18} />Cancel</button>
      <button className="primary-btn" type="submit"><Icon name="save" size={18} />Save</button>
    </div>
  );
}

function Dashboard({ stats, workouts, nutrition, progress, reminders, openForm, setView }) {
  const recent = [
    ...workouts.slice(0, 2).map((item) => ({
      id: `w-${item._id}`,
      title: item.name,
      detail: item.exercises?.map((exercise) => exercise.name).join(', ') || item.category,
      time: relativeTime(item.date || item.createdAt),
      icon: 'dumbbell',
      color: 'lime',
    })),
    ...nutrition.slice(0, 2).map((item) => ({
      id: `n-${item._id}`,
      title: `${item.mealType[0].toUpperCase()}${item.mealType.slice(1)} meal`,
      detail: `${item.foods?.reduce((sum, food) => sum + num(food.calories), 0) || 0} kcal`,
      time: relativeTime(item.date || item.createdAt),
      icon: 'utensils',
      color: 'pink',
    })),
    ...progress.slice(0, 2).map((item) => ({
      id: `p-${item._id}`,
      title: 'Weight update',
      detail: `${item.weight || 0} kg`,
      time: relativeTime(item.date || item.createdAt),
      icon: 'scale',
      color: 'cyan',
    })),
  ].slice(0, 4);
  const nextWorkout = workouts[0];
  const nextMeal = nutrition[0];

  return (
    <>
      <div className="stats">{stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</div>
      <SectionTitle title="Today's Overview" action="View All" onAction={() => setView('workout')} />
      <section className="glass overview">
        <div className="overview-block workout-bg">
          <img src="/images/next-workout.png" alt="" />
          <small>Next Workout</small><h3>{nextWorkout?.name || 'Add a workout'}</h3><p><Icon name="clock" size={21} /> {nextWorkout ? formatDate(nextWorkout.date) : 'No schedule yet'}</p>
        </div>
        <div className="overview-block meal-bg">
          <img src="/images/next-meal.png" alt="" />
          <small>Next Meal</small><h3>{nextMeal?.mealType || 'Log a meal'}</h3><p><Icon name="clock" size={21} /> {nextMeal ? formatDate(nextMeal.date) : 'No meal yet'}</p>
        </div>
      </section>
      <SectionTitle title="Weekly Progress" action="This Week" />
      <ProgressChart entries={progress} />
      <SectionTitle title="Quick Actions" />
      <section className="actions">
        <button className="glass action" onClick={() => openForm('workout')}><span className="lime featured-action"><Icon name="plus" /></span><b>Log</b><b>Workout</b></button>
        <button className="glass action" onClick={() => openForm('meal')}><span className="pink"><Icon name="utensils" /></span><b>Log</b><b>Meal</b></button>
        <button className="glass action" onClick={() => openForm('progress')}><span className="cyan"><Icon name="scale" /></span><b>Update</b><b>Weight</b></button>
        <button className="glass action" onClick={() => setView('reports')}><span className="amber"><Icon name="chartPie" /></span><b>View</b><b>Reports</b></button>
        <button className="glass action" onClick={() => openForm('reminder')}><span className="muted"><Icon name="bell" /></span><b>Add</b><b>Reminder</b></button>
      </section>
      <SectionTitle title="Recent Activity" action="View All" onAction={() => setView('workout')} />
      <section className="glass activity-list">
        {recent.length ? recent.map((item) => (
          <article className="activity" key={item.id}>
            <div className={`mini-icon ${item.color}`}><Icon name={item.icon} size={24} /></div>
            <div><h3>{item.title}</h3><p>{item.detail}</p></div>
            <time>{item.time}</time>
            <Icon name="check" size={25} />
          </article>
        )) : <EmptyState icon="plus" title="No activity yet" text="Use quick actions to add your first workout, meal, or progress update." />}
      </section>
      {!!reminders.length && (
        <>
          <SectionTitle title="Upcoming Reminders" />
          <section className="glass compact-list">
            {reminders.slice(0, 3).map((item) => <p key={item.id}><Icon name="bell" size={18} /><span>{item.title}</span><time>{formatDate(item.time)}</time></p>)}
          </section>
        </>
      )}
    </>
  );
}

function WorkoutView({ workouts, onEdit, onDelete, onAdd, search, setSearch, category, setCategory }) {
  return (
    <Panel title="Workouts" action="Add workout" onAction={onAdd}>
      <div className="filters">
        <label><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workouts" /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option><option value="strength">Strength</option><option value="cardio">Cardio</option><option value="flexibility">Flexibility</option><option value="other">Other</option>
        </select>
      </div>
      <div className="record-grid">
        {workouts.length ? workouts.map((workout) => (
          <article className="record-card glass" key={workout._id}>
            <div className="record-heading"><span className="pill">{workout.category}</span><time>{formatDate(workout.date)}</time></div>
            <h3>{workout.name}</h3>
            {(workout.exercises || []).map((exercise) => <p key={exercise._id || exercise.name}>{exercise.name}: {exercise.sets || 0} sets x {exercise.reps || 0} reps, {exercise.weight || 0} kg</p>)}
            <div className="tag-row">{(workout.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
            <CardActions onEdit={() => onEdit(workout)} onDelete={() => onDelete(workout._id)} />
          </article>
        )) : <EmptyState icon="dumbbell" title="No workouts found" text="Add routines with exercise names, sets, reps, weights, notes, and tags." />}
      </div>
    </Panel>
  );
}

function NutritionView({ nutrition, onEdit, onDelete, onAdd, search, setSearch, mealType, setMealType }) {
  return (
    <Panel title="Nutrition" action="Log meal" onAction={onAdd}>
      <div className="filters">
        <label><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search foods" /></label>
        <select value={mealType} onChange={(event) => setMealType(event.target.value)}>
          <option value="">All meals</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
        </select>
      </div>
      <div className="record-grid">
        {nutrition.length ? nutrition.map((meal) => (
          <article className="record-card glass" key={meal._id}>
            <div className="record-heading"><span className="pill pink-fill">{meal.mealType}</span><time>{formatDate(meal.date)}</time></div>
            <h3>{meal.foods?.map((food) => food.name).join(', ') || 'Meal'}</h3>
            <p>{meal.foods?.reduce((sum, food) => sum + num(food.calories), 0) || 0} kcal</p>
            <div className="macro-row">
              <span>Protein {meal.foods?.reduce((sum, food) => sum + num(food.protein), 0) || 0}g</span>
              <span>Carbs {meal.foods?.reduce((sum, food) => sum + num(food.carbs), 0) || 0}g</span>
              <span>Fats {meal.foods?.reduce((sum, food) => sum + num(food.fats), 0) || 0}g</span>
            </div>
            <CardActions onEdit={() => onEdit(meal)} onDelete={() => onDelete(meal._id)} />
          </article>
        )) : <EmptyState icon="utensils" title="No meals found" text="Log food quantities, calories, and macros for daily nutrition insight." />}
      </div>
    </Panel>
  );
}

function ProgressView({ progress, onEdit, onDelete, onAdd }) {
  return (
    <Panel title="Progress" action="Update progress" onAction={onAdd}>
      <ProgressChart entries={progress} />
      <div className="record-grid">
        {progress.length ? progress.map((entry) => (
          <article className="record-card glass" key={entry._id}>
            <div className="record-heading"><span className="pill cyan-fill">Progress</span><time>{formatDate(entry.date)}</time></div>
            <h3>{entry.weight || 0} kg</h3>
            <p>Lift {entry.performanceMetrics?.liftingWeight || 0} kg · Run {entry.performanceMetrics?.runTime || 0} min</p>
            <div className="macro-row">
              <span>Chest {entry.bodyMeasurements?.chest || 0}</span>
              <span>Waist {entry.bodyMeasurements?.waist || 0}</span>
              <span>Hips {entry.bodyMeasurements?.hips || 0}</span>
            </div>
            {entry.notes && <p>{entry.notes}</p>}
            <CardActions onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry._id)} />
          </article>
        )) : <EmptyState icon="scale" title="No progress records" text="Track weight, body measurements, and performance metrics over time." />}
      </div>
    </Panel>
  );
}

function ReportsView({ onExportCsv, onExportPdf, totals }) {
  return (
    <Panel title="Reports">
      <section className="report-actions">
        <article className="glass report-card"><Icon name="file" /><h3>CSV export</h3><p>Download workouts, nutrition, and progress in spreadsheet-friendly format.</p><button className="primary-btn" onClick={onExportCsv}>Download CSV</button></article>
        <article className="glass report-card"><Icon name="chartPie" /><h3>Printable PDF</h3><p>Open a printable report from the backend report data.</p><button className="secondary-btn" onClick={onExportPdf}>Open report</button></article>
      </section>
      <section className="glass report-summary">
        <p><strong>{totals.workouts}</strong><span>Workouts</span></p>
        <p><strong>{totals.meals}</strong><span>Meals</span></p>
        <p><strong>{totals.progress}</strong><span>Progress logs</span></p>
      </section>
    </Panel>
  );
}

function CommunityView({ feedback, notifications, reminders, onFeedback, onReadNotification, onDeleteNotification, onDeleteReminder, onReminder }) {
  const [form, setForm] = useState({ subject: '', message: '' });

  function submit(event) {
    event.preventDefault();
    onFeedback(form);
    setForm({ subject: '', message: '' });
  }

  return (
    <Panel title="Community">
      <form className="glass data-form feedback-form" onSubmit={submit}>
        <h3>Send feedback</h3>
        <label>Subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label>
        <label>Message<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></label>
        <button className="primary-btn" type="submit"><Icon name="save" size={18} />Submit feedback</button>
      </form>
      <section className="split-grid">
        <div className="glass side-list">
          <div className="subheading"><h3>Notifications</h3></div>
          {notifications.length ? notifications.map((item) => (
            <article key={item._id} className={item.isRead ? 'muted-record' : ''}>
              <p>{item.message}</p><small>{item.type} · {relativeTime(item.date)}</small>
              <div className="mini-actions">
                {!item.isRead && <button onClick={() => onReadNotification(item._id)}><Icon name="check" size={16} />Read</button>}
                <button onClick={() => onDeleteNotification(item._id)}><Icon name="trash" size={16} />Delete</button>
              </div>
            </article>
          )) : <EmptyState icon="bell" title="No notifications" text="Server notifications will appear here." />}
        </div>
        <div className="glass side-list">
          <div className="subheading"><h3>Reminders</h3><button className="link-btn compact" onClick={onReminder}>Add</button></div>
          {reminders.length ? reminders.map((item) => (
            <article key={item.id}>
              <p>{item.title}</p><small>{item.type} · {new Date(item.time).toLocaleString()}</small>
              <div className="mini-actions"><button onClick={() => onDeleteReminder(item.id)}><Icon name="trash" size={16} />Delete</button></div>
            </article>
          )) : <EmptyState icon="clock" title="No reminders" text="Add workout, meal, or goal reminders stored on this device." />}
        </div>
      </section>
      {!!feedback.length && (
        <section className="glass side-list">
          <div className="subheading"><h3>Your feedback</h3></div>
          {feedback.map((item) => <article key={item._id}><p>{item.subject}</p><small>{item.status} · {relativeTime(item.createdAt)}</small></article>)}
        </section>
      )}
    </Panel>
  );
}

function SettingsView({ profile, onSave }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    password: '',
    units: profile?.preferences?.units || 'metric',
    theme: profile?.preferences?.theme || 'dark',
    notificationsEnabled: profile?.preferences?.notificationsEnabled ?? true,
  });

  function submit(event) {
    event.preventDefault();
    onSave({
      name: form.name,
      email: form.email,
      ...(form.password ? { password: form.password } : {}),
      preferences: {
        units: form.units,
        theme: form.theme,
        notificationsEnabled: form.notificationsEnabled,
      },
    });
  }

  return (
    <Panel title="Settings">
      <form className="glass data-form" onSubmit={submit}>
        <h3>Profile and preferences</h3>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>New password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to keep current" /></label>
        <div className="form-row">
          <label>Units<select value={form.units} onChange={(event) => setForm({ ...form, units: event.target.value })}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
          <label>Theme<select value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })}><option value="dark">Dark</option><option value="light">Light</option></select></label>
        </div>
        <label className="toggle-row"><input type="checkbox" checked={form.notificationsEnabled} onChange={(event) => setForm({ ...form, notificationsEnabled: event.target.checked })} />Notifications enabled</label>
        <button className="primary-btn" type="submit"><Icon name="save" size={18} />Save profile</button>
      </form>
    </Panel>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <section className="panel-view">
      <SectionTitle title={title} action={action} onAction={onAction} />
      {children}
    </section>
  );
}

function CardActions({ onEdit, onDelete }) {
  return (
    <div className="card-actions">
      <button onClick={onEdit}><Icon name="edit" size={17} />Edit</button>
      <button onClick={onDelete}><Icon name="trash" size={17} />Delete</button>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(() => loadJson(AUTH_KEY, null));
  const [view, setView] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [reminders, setReminders] = useState(() => loadJson(REMINDERS_KEY, []));
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [workoutCategory, setWorkoutCategory] = useState('');
  const [mealSearch, setMealSearch] = useState('');
  const [mealType, setMealType] = useState('');

  const token = auth?.token;

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  useEffect(() => {
    saveJson(REMINDERS_KEY, reminders);
  }, [reminders]);

  async function loadAll() {
    setLoading(true);
    setStatus('');
    try {
      const [profileData, workoutData, nutritionData, progressData, notificationData, feedbackData] = await Promise.all([
        request('/users', { token }),
        request('/workouts', { token }),
        request('/nutrition', { token }),
        request('/progress', { token }),
        request('/notifications', { token }).catch(() => []),
        request('/feedback', { token }).catch(() => []),
      ]);
      setProfile(profileData);
      setWorkouts(workoutData);
      setNutrition(nutritionData);
      setProgress(progressData);
      setNotifications(notificationData);
      setFeedback(feedbackData);
    } catch (error) {
      setStatus(`${error.message}. Check that the backend is running at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
    setProfile(null);
  }

  function openForm(type, item = null) {
    setEditing(item);
    setFormType(type);
  }

  function closeForm() {
    setEditing(null);
    setFormType(null);
  }

  async function saveWorkout(payload) {
    const path = editing?._id ? `/workouts/${editing._id}` : '/workouts';
    const method = editing?._id ? 'PUT' : 'POST';
    await request(path, { method, body: payload, token });
    closeForm();
    await loadAll();
  }

  async function saveMeal(payload) {
    const path = editing?._id ? `/nutrition/${editing._id}` : '/nutrition';
    const method = editing?._id ? 'PUT' : 'POST';
    await request(path, { method, body: payload, token });
    closeForm();
    await loadAll();
  }

  async function saveProgress(payload) {
    const path = editing?._id ? `/progress/${editing._id}` : '/progress';
    const method = editing?._id ? 'PUT' : 'POST';
    await request(path, { method, body: payload, token });
    closeForm();
    await loadAll();
  }

  async function removeRecord(path) {
    await request(path, { method: 'DELETE', token });
    await loadAll();
  }

  async function saveProfile(payload) {
    const data = await request('/users', { method: 'PUT', body: payload, token });
    setProfile(data);
    setStatus('Profile updated.');
  }

  async function submitFeedback(payload) {
    await request('/feedback', { method: 'POST', body: payload, token });
    await loadAll();
  }

  async function markNotificationRead(id) {
    await request(`/notifications/${id}/read`, { method: 'PUT', token });
    await loadAll();
  }

  async function deleteNotification(id) {
    await request(`/notifications/${id}`, { method: 'DELETE', token });
    await loadAll();
  }

  async function exportCsv() {
    const report = await request('/reports/csv', { token });
    const rows = [['type', 'name', 'date', 'detail']];
    report.data.workouts.forEach((item) => rows.push(['workout', item.name, item.date, item.category]));
    report.data.nutrition.forEach((item) => rows.push(['nutrition', item.mealType, item.date, item.foods.map((food) => `${food.name} ${food.calories || 0}kcal`).join('; ')]));
    report.data.progress.forEach((item) => rows.push(['progress', `${item.weight || 0}kg`, item.date, item.notes || '']));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile('lyfta-report.csv', csv, 'text/csv');
  }

  async function exportPdf() {
    const report = await request('/reports/pdf', { token });
    const html = `<!doctype html><title>Lyfta Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{margin-top:0}section{margin:24px 0}li{margin:8px 0}</style><h1>Lyfta Fitness Report</h1><section><h2>Workouts</h2><ul>${report.data.workouts.map((item) => `<li>${item.name} - ${item.category}</li>`).join('')}</ul></section><section><h2>Nutrition</h2><ul>${report.data.nutrition.map((item) => `<li>${item.mealType}: ${item.foods.map((food) => food.name).join(', ')}</li>`).join('')}</ul></section><section><h2>Progress</h2><ul>${report.data.progress.map((item) => `<li>${item.weight || 0} kg - ${item.notes || ''}</li>`).join('')}</ul></section>`;
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.print();
    } else {
      downloadFile('lyfta-report.html', html, 'text/html');
    }
  }

  const filteredWorkouts = useMemo(() => workouts.filter((item) => {
    const matchesSearch = !workoutSearch || item.name.toLowerCase().includes(workoutSearch.toLowerCase());
    const matchesCategory = !workoutCategory || item.category === workoutCategory;
    return matchesSearch && matchesCategory;
  }), [workouts, workoutSearch, workoutCategory]);

  const filteredNutrition = useMemo(() => nutrition.filter((item) => {
    const foods = item.foods?.map((food) => food.name).join(' ').toLowerCase() || '';
    const matchesSearch = !mealSearch || foods.includes(mealSearch.toLowerCase());
    const matchesMeal = !mealType || item.mealType === mealType;
    return matchesSearch && matchesMeal;
  }), [nutrition, mealSearch, mealType]);

  const totals = useMemo(() => {
    const calories = nutrition.reduce((sum, meal) => sum + (meal.foods || []).reduce((foodSum, food) => foodSum + num(food.calories), 0), 0);
    const protein = nutrition.reduce((sum, meal) => sum + (meal.foods || []).reduce((foodSum, food) => foodSum + num(food.protein), 0), 0);
    const latestWeight = progress[0]?.weight || 0;
    return { calories, protein, latestWeight, workouts: workouts.length, meals: nutrition.length, progress: progress.length };
  }, [nutrition, progress, workouts]);

  const stats = [
    { label: 'Calories', value: totals.calories.toLocaleString(), target: '/ 2,200 kcal', icon: 'flame', color: 'pink', progress: (totals.calories / 2200) * 100 },
    { label: 'Workouts', value: String(totals.workouts), target: '/ routines', icon: 'dumbbell', color: 'lime', progress: Math.min(100, totals.workouts * 15) },
    { label: 'Weight', value: totals.latestWeight ? String(totals.latestWeight) : '--', target: 'kg latest', icon: 'scale', color: 'cyan', progress: totals.latestWeight ? 75 : 10 },
  ];

  if (!auth) return <AuthScreen onAuth={setAuth} />;

  const mappedWorkout = editing && {
    ...emptyWorkout,
    ...editing,
    exerciseName: editing.exercises?.[0]?.name || '',
    sets: editing.exercises?.[0]?.sets || '',
    reps: editing.exercises?.[0]?.reps || '',
    weight: editing.exercises?.[0]?.weight || '',
    notes: editing.exercises?.[0]?.notes || '',
    tags: editing.tags?.join(', ') || '',
  };
  const mappedMeal = editing && {
    ...emptyMeal,
    ...editing,
    foodName: editing.foods?.[0]?.name || '',
    quantity: editing.foods?.[0]?.quantity || '',
    unit: editing.foods?.[0]?.unit || 'g',
    calories: editing.foods?.[0]?.calories || '',
    protein: editing.foods?.[0]?.protein || '',
    carbs: editing.foods?.[0]?.carbs || '',
    fats: editing.foods?.[0]?.fats || '',
  };
  const mappedProgress = editing && {
    ...emptyProgress,
    ...editing,
    chest: editing.bodyMeasurements?.chest || '',
    waist: editing.bodyMeasurements?.waist || '',
    hips: editing.bodyMeasurements?.hips || '',
    arms: editing.bodyMeasurements?.arms || '',
    legs: editing.bodyMeasurements?.legs || '',
    runTime: editing.performanceMetrics?.runTime || '',
    liftingWeight: editing.performanceMetrics?.liftingWeight || '',
  };

  return (
    <main className="phone">
      <header className="topbar">
        <button className="logo logo-button" onClick={() => setView('dashboard')}>Ly<span>fta</span></button>
        <nav className="top-icons" aria-label="Header actions">
          <button onClick={() => setView('workout')}><Icon name="search" size={30} /></button>
          <button className="notif" onClick={() => setView('community')}><Icon name="bell" size={28} /></button>
          <button className="avatar" aria-label="Profile" onClick={() => setView('settings')}><span /></button>
          <button onClick={logout}><Icon name="logout" size={26} /></button>
        </nav>
      </header>

      <section className="hero">
        <h1>Good Night, {profile?.name || auth.name || 'Athlete'}</h1>
        <p>Keep pushing your limits. Your dashboard is synced with the backend server.</p>
      </section>

      {status && <div className="status-banner">{status}</div>}
      {loading && <div className="status-banner">Loading fitness data...</div>}

      {view === 'dashboard' && <Dashboard stats={stats} workouts={workouts} nutrition={nutrition} progress={progress} reminders={reminders} openForm={openForm} setView={setView} />}
      {view === 'workout' && <WorkoutView workouts={filteredWorkouts} onEdit={(item) => openForm('workout', item)} onDelete={(id) => removeRecord(`/workouts/${id}`)} onAdd={() => openForm('workout')} search={workoutSearch} setSearch={setWorkoutSearch} category={workoutCategory} setCategory={setWorkoutCategory} />}
      {view === 'nutrition' && <NutritionView nutrition={filteredNutrition} onEdit={(item) => openForm('meal', item)} onDelete={(id) => removeRecord(`/nutrition/${id}`)} onAdd={() => openForm('meal')} search={mealSearch} setSearch={setMealSearch} mealType={mealType} setMealType={setMealType} />}
      {view === 'progress' && <ProgressView progress={progress} onEdit={(item) => openForm('progress', item)} onDelete={(id) => removeRecord(`/progress/${id}`)} onAdd={() => openForm('progress')} />}
      {view === 'reports' && <ReportsView onExportCsv={exportCsv} onExportPdf={exportPdf} totals={totals} />}
      {view === 'community' && <CommunityView feedback={feedback} notifications={notifications} reminders={reminders} onFeedback={submitFeedback} onReadNotification={markNotificationRead} onDeleteNotification={deleteNotification} onDeleteReminder={(id) => setReminders(reminders.filter((item) => item.id !== id))} onReminder={() => openForm('reminder')} />}
      {view === 'settings' && <SettingsView profile={profile || auth} onSave={saveProfile} />}

      {formType && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          {formType === 'workout' && <WorkoutForm initial={mappedWorkout} onCancel={closeForm} onSubmit={saveWorkout} />}
          {formType === 'meal' && <MealForm initial={mappedMeal} onCancel={closeForm} onSubmit={saveMeal} />}
          {formType === 'progress' && <ProgressForm initial={mappedProgress} onCancel={closeForm} onSubmit={saveProgress} />}
          {formType === 'reminder' && <ReminderForm onCancel={closeForm} onSubmit={(item) => { setReminders([item, ...reminders]); closeForm(); }} />}
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <svg className="nav-shape" viewBox="0 0 390 74" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="navFill" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="#11161c" />
              <stop offset=".34" stopColor="#080b0f" />
              <stop offset="1" stopColor="#080b0f" />
            </linearGradient>
          </defs>
          <path className="nav-fill" d="M36 0 H143 C158 0 161 22 177 25 C186 27 204 27 213 25 C229 22 232 0 247 0 H354 C374 0 390 16 390 37 V74 H0 V37 C0 16 16 0 36 0 Z" />
          <path className="nav-inner-highlight" d="M36 1 H143 C158 1 161 23 177 26 C186 28 204 28 213 26 C229 23 232 1 247 1 H354" />
        </svg>
        <div className="nav-items">
          <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><Icon name="home" size={24} /><span>Home</span></button>
          <button className={`nav-item ${view === 'workout' ? 'active' : ''}`} onClick={() => setView('workout')}><Icon name="dumbbell" size={23} /><span>Workout</span></button>
          <button className={`nav-item nav-center ${view === 'nutrition' ? 'active' : ''}`} onClick={() => setView('nutrition')}><span>Nutrition</span></button>
          <button className={`nav-item ${view === 'progress' ? 'active' : ''}`} onClick={() => setView('progress')}><Icon name="progress" size={23} /><span>Progress</span></button>
          <button className={`nav-item ${view === 'community' ? 'active' : ''}`} onClick={() => setView('community')}><Icon name="community" size={23} /><span>Community</span></button>
        </div>
        <button className="nav-add" aria-label="Add nutrition entry" onClick={() => openForm('meal')}><Icon name="plus" size={28} /></button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

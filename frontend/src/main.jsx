// ============================================================================
// Original author: Munawwar (base Fitness Tracker UI).
// Modified by: Abdullah — added the Live Feed (composer, posts, likes, comments),
// routines + live workout sessions, the food-table meal editor, and real
// per-user nutrition targets. Later wired up every backend endpoint that had
// no UI: Goals, follow/unfollow + Connections, reminder editing, the
// forgot/reset-password and email-verify flows, and a real server-side logout.
// See AUTHORS.md for details.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Icon from './components/Icon.jsx';
import MealWizard from './features/MealForm.jsx';
import { RoutineWizard, RoutinesView, SessionView } from './features/Routines.jsx';
import { GoalForm, GoalsView } from './features/Goals.jsx';
import { WizardHeader, ExerciseQuickAdd } from './features/Wizard.jsx';
import {
  API_BASE, AUTH_KEY, loadJson, saveJson, request, downloadReport, assetUrl,
  setAuthState, onAuthRefresh,
} from './lib/api.js';
import {
  num, mealTotals, totalsFor, macroSplit, workoutVolume, setCounts, latestWeight,
} from './lib/calc.js';

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


// Register/login share the credentials form; 'verify' is the interstitial shown
// right after registering (since there's no real mail sender, the raw token
// comes back on the response in dev — see EXPOSE_TOKENS in authController.js);
// 'forgot'/'reset' walk through the same dev-token pattern for password reset.
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ token: '', password: '' });
  const [notice, setNotice] = useState('');

  function finishAuth(user) {
    saveJson(AUTH_KEY, user);
    onAuth(user);
  }

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
      if (mode === 'register' && user.verificationToken) {
        // No mail sender in this app — offer to verify immediately with the
        // token the register response carries in dev, rather than stranding
        // the user on a link that was never actually emailed.
        setPendingUser(user);
        setMode('verify');
      } else {
        finishAuth(user);
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyNow() {
    setLoading(true);
    try {
      await request('/auth/verify-email', { method: 'POST', body: { token: pendingUser.verificationToken } });
      finishAuth({ ...pendingUser, isEmailVerified: true });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(event) {
    event.preventDefault();
    setStatus('');
    setNotice('');
    setLoading(true);
    try {
      const data = await request('/auth/forgot-password', { method: 'POST', body: { email: forgotEmail } });
      setResetForm({ token: data.resetToken || '', password: '' });
      setNotice(data.resetToken
        ? 'Reset token generated (shown below since this app has no mail sender configured).'
        : 'If that email exists, a reset link has been sent.');
      setMode('reset');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event) {
    event.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      await request('/auth/reset-password', {
        method: 'POST',
        body: { token: resetForm.token, password: resetForm.password },
      });
      setNotice('Password reset. Log in with your new password.');
      setForm({ ...form, email: forgotEmail, password: '' });
      setMode('login');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'verify') {
    return (
      <main className="auth-shell">
        <section className="auth-card glass">
          <div className="logo auth-logo">Fit<span>Track</span></div>
          <h1>Verify your email</h1>
          <p>We&rsquo;d normally email a verification link to <strong>{pendingUser?.email}</strong>. This app doesn&rsquo;t send real email, so you can verify right now instead.</p>
          {status && <p className="form-error">{status}</p>}
          <div className="form-actions">
            <button className="secondary-btn" type="button" onClick={() => finishAuth(pendingUser)}>Skip for now</button>
            <button className="primary-btn" type="button" disabled={loading} onClick={verifyNow}><Icon name="check" size={18} />{loading ? 'Verifying...' : 'Verify now'}</button>
          </div>
        </section>
      </main>
    );
  }

  if (mode === 'forgot') {
    return (
      <main className="auth-shell">
        <section className="auth-card glass">
          <div className="logo auth-logo">Fit<span>Track</span></div>
          <h1>Reset your password</h1>
          <p>Enter the email on your account and we&rsquo;ll start a password reset.</p>
          <form className="form-grid" onSubmit={submitForgot}>
            <label>Email<input type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required autoComplete="email" /></label>
            {status && <p className="form-error">{status}</p>}
            <button className="primary-btn" type="submit" disabled={loading}><Icon name="check" size={20} />{loading ? 'Sending...' : 'Send reset link'}</button>
          </form>
          <button className="link-btn" onClick={() => { setMode('login'); setStatus(''); }}>Back to log in</button>
        </section>
      </main>
    );
  }

  if (mode === 'reset') {
    return (
      <main className="auth-shell">
        <section className="auth-card glass">
          <div className="logo auth-logo">Fit<span>Track</span></div>
          <h1>Set a new password</h1>
          {notice && <p className="form-hint">{notice}</p>}
          <form className="form-grid" onSubmit={submitReset}>
            <label>Reset token<input value={resetForm.token} onChange={(event) => setResetForm({ ...resetForm, token: event.target.value })} required placeholder="Paste the token from your email" /></label>
            <label>New password<input type="password" value={resetForm.password} onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })} required minLength="6" autoComplete="new-password" /></label>
            {status && <p className="form-error">{status}</p>}
            <button className="primary-btn" type="submit" disabled={loading}><Icon name="check" size={20} />{loading ? 'Saving...' : 'Reset password'}</button>
          </form>
          <button className="link-btn" onClick={() => { setMode('login'); setStatus(''); setNotice(''); }}>Back to log in</button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card glass">
        <div className="logo auth-logo">Fit<span>Track</span></div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p>Connect to the fitness server to track workouts, meals, progress, reports, and reminders.</p>
        {notice && <p className="form-hint">{notice}</p>}
        <form className="form-grid" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Username
                <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} required minLength="3" maxLength="30" autoComplete="username" />
              </label>
              <label>
                Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoComplete="name" />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength="6" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {status && <p className="form-error">{status}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            <Icon name="check" size={20} />
            {loading ? 'Connecting...' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>
        {mode === 'login' && <button className="link-btn" onClick={() => { setMode('forgot'); setStatus(''); setNotice(''); }}>Forgot password?</button>}
        <button className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatus(''); setNotice(''); }}>
          {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
        </button>
      </section>
    </main>
  );
}

// Renders as a button when the card opens something (the nutrition breakdown),
// so it stays keyboard-reachable and announces itself as interactive.
function StatCard({ stat, onClick }) {
  const Tag = onClick ? 'button' : 'section';
  return (
    <Tag
      className={`glass stat-card${onClick ? ' stat-card-action' : ''}`}
      {...(onClick ? { type: 'button', onClick, 'aria-label': `${stat.label} — open today's nutrition breakdown` } : {})}
    >
      <div className={`icon-bubble ${stat.color}`}><Icon name={stat.icon} /></div>
      <div>
        <p>{stat.label}</p>
        <strong>{stat.value}</strong>
        <span>{stat.target}</span>
      </div>
      <div className="meter"><i className={stat.color} style={{ width: `${Math.min(100, stat.progress)}%` }} /></div>
    </Tag>
  );
}

// Today's consumed-vs-target breakdown. Opened from the Calories or Protein
// stat card rather than sitting permanently on the dashboard.
function NutritionSummaryModal({ summary, onClose, onLogMeal, onOpenSettings }) {
  const macros = ['calories', 'protein', 'carbs', 'fats'];

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Today's nutrition" onClick={onClose}>
      <section className="glass data-form nutrition-modal" onClick={(event) => event.stopPropagation()}>
        <div className="nutrition-modal-head">
          <h3>Today&rsquo;s Nutrition</h3>
          <button type="button" className="food-row-remove" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>

        <div className="macro-targets">
          {macros.map((macro) => {
            const consumed = Math.round(summary.consumed?.[macro] || 0);
            const target = Math.round(summary.targets?.[macro] || 0);
            const pct = target ? Math.min(100, (consumed / target) * 100) : 0;
            const over = target && consumed > target;
            return (
              <div className="macro-target" key={macro}>
                <p><span>{macro}</span><strong>{consumed}<small> / {target}{macro === 'calories' ? '' : 'g'}</small></strong></p>
                <div className="meter"><i className={over ? 'pink' : 'lime'} style={{ width: `${pct}%` }} /></div>
                <small className={over ? 'over' : ''}>
                  {over ? `${consumed - target} over` : `${target - consumed} left`}
                </small>
              </div>
            );
          })}
        </div>

        {/* Where the day's calories actually went. */}
        <div className="meal-breakdown">
          {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
            const row = summary.byMealType?.[type];
            return (
              <p key={type} className={row?.count ? '' : 'empty'}>
                <span>{type}</span>
                <strong>{Math.round(row?.calories || 0)} kcal</strong>
                <small>{row?.count ? `${row.count} logged` : 'nothing yet'}</small>
              </p>
            );
          })}
        </div>

        {summary.targets?.needsBodyStats && (
          <p className="target-hint">
            Using generic targets — add your height, date of birth and activity level in
            {' '}<button className="link-btn compact" onClick={onOpenSettings}>Settings</button>{' '}
            for figures based on you.
          </p>
        )}

        <div className="form-actions">
          <button className="secondary-btn" type="button" onClick={onClose}><Icon name="x" size={18} />Close</button>
          <button className="primary-btn" type="button" onClick={onLogMeal}><Icon name="plus" size={18} />Log meal</button>
        </div>
      </section>
    </div>
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

function Analytics({ workouts, nutrition }) {
  const categoryCounts = workouts.reduce((counts, workout) => {
    counts[workout.category] = (counts[workout.category] || 0) + 1;
    return counts;
  }, {});
  const maxCategory = Math.max(1, ...Object.values(categoryCounts));
  // Split is derived from the same resolved totals as the calorie figures, so
  // the donut and the calorie bars can no longer disagree.
  const split = macroSplit(totalsFor(nutrition));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const inDay = nutrition.filter((meal) => new Date(meal.date) >= date && new Date(meal.date) < next);
    const dayWorkouts = workouts.filter((workout) => new Date(workout.date) >= date && new Date(workout.date) < next);
    return {
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
      calories: totalsFor(inDay).calories,
      workoutCount: dayWorkouts.length,
      volume: dayWorkouts.reduce((sum, workout) => sum + workoutVolume(workout), 0),
    };
  });
  const maxCalories = Math.max(1, ...days.map((day) => day.calories));
  const maxWorkouts = Math.max(1, ...days.map((day) => day.workoutCount));
  const maxVolume = Math.max(1, ...days.map((day) => day.volume));
  const totalVolume = workouts.reduce((sum, workout) => sum + workoutVolume(workout), 0);

  return (
    <section className="analytics-grid">
      <article className="glass analytics-card">
        <div className="subheading"><h3>Workout frequency</h3><small>Last 7 days</small></div>
        <div className="vertical-bars" aria-label="Workout frequency chart">
          {days.map((day) => <div key={day.label}><span style={{ height: `${Math.max(6, (day.workoutCount / maxWorkouts) * 100)}%` }} title={`${day.workoutCount} workouts`} /><small>{day.label}</small></div>)}
        </div>
        <div className="category-bars">
          {Object.keys(categoryCounts).length ? Object.entries(categoryCounts).map(([category, count]) => (
            <p key={category}><span>{category}</span><i><b style={{ width: `${(count / maxCategory) * 100}%` }} /></i><strong>{count}</strong></p>
          )) : <p className="chart-empty">Log workouts to see category trends.</p>}
        </div>
      </article>
      <article className="glass analytics-card">
        <div className="subheading"><h3>Nutrition trend</h3><small>Last 7 days</small></div>
        <div className="vertical-bars nutrition-bars" aria-label="Daily calorie chart">
          {days.map((day) => <div key={day.label}><span style={{ height: `${Math.max(6, (day.calories / maxCalories) * 100)}%` }} title={`${day.calories} kcal`} /><small>{day.label}</small></div>)}
        </div>
        <div className="macro-split" aria-label="Macronutrient calorie distribution">
          {Object.entries(split).map(([macro, percent]) => (
            <p key={macro}><strong>{percent}%</strong><span>{macro}</span></p>
          ))}
        </div>
      </article>
      <article className="glass analytics-card">
        <div className="subheading"><h3>Training volume</h3><small>Last 7 days</small></div>
        <div className="vertical-bars" aria-label="Daily training volume chart">
          {days.map((day) => <div key={day.label}><span style={{ height: `${Math.max(6, (day.volume / maxVolume) * 100)}%` }} title={`${Math.round(day.volume)} kg`} /><small>{day.label}</small></div>)}
        </div>
        <p className="chart-empty">Lifetime volume: <strong>{Math.round(totalVolume).toLocaleString()} kg</strong></p>
      </article>
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

// Quick log for a workout that already happened. Routines cover the "plan it,
// then track it live" path; this is the after-the-fact entry, but unlike the
// original version it takes as many exercises as you actually did.
const WORKOUT_EXERCISE_FIELDS = [
  { key: 'sets', label: 'Sets', default: '', min: 0 },
  { key: 'reps', label: 'Reps', default: '', min: 0 },
  { key: 'weight', label: 'Weight kg', default: '', min: 0, step: 'any' },
];

// A 3-screen wizard, same shape as RoutineWizard: name & details, then add
// exercises one at a time (actual sets/reps/weight, since this logs a
// workout already done), then review before saving.
function WorkoutWizard({ initial, onCancel, onSubmit }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || 'strength');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [exercises, setExercises] = useState(() => (
    initial?.exercises?.length
      ? initial.exercises.map((exercise) => ({
        key: exercise._id || Math.random().toString(36).slice(2),
        name: exercise.name || '',
        sets: exercise.sets ?? '',
        reps: exercise.reps ?? '',
        weight: exercise.weight ?? '',
        notes: exercise.notes || '',
      }))
      : []
  ));

  const volume = exercises.reduce((sum, exercise) => (
    sum + num(exercise.sets) * num(exercise.reps) * num(exercise.weight)
  ), 0);

  function addExercise(entry) {
    setExercises((current) => [...current, { key: Math.random().toString(36).slice(2), ...entry }]);
  }

  function removeExercise(key) {
    setExercises((current) => current.filter((item) => item.key !== key));
  }

  function back() {
    if (step === 0) onCancel();
    else setStep((current) => current - 1);
  }

  function submit() {
    const cleaned = exercises.map((exercise, index) => ({
      name: exercise.name,
      sets: num(exercise.sets),
      reps: num(exercise.reps),
      weight: num(exercise.weight),
      notes: exercise.notes,
      order: index,
    }));
    onSubmit({
      name,
      category,
      exercises: cleaned,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  }

  const subtitles = ['Name it and set the basics', 'Add each exercise you did', 'Review before saving'];

  return (
    <section className="panel-view wizard">
      <WizardHeader
        title={initial?._id ? 'Edit workout' : 'Log workout'}
        subtitle={subtitles[step]}
        step={step}
        totalSteps={3}
        onBack={back}
      />

      {step === 0 && (
        <div className="wizard-body">
          <label className="wizard-name-label">
            Workout name
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="form-row">
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="push, chest" /></label>
          </div>
          <div className="wizard-footer">
            <button className="primary-btn wizard-next" type="button" disabled={!name.trim()} onClick={() => setStep(1)}>
              Next<Icon name="forward" size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-body">
          <div className="exercise-rows">
            {exercises.map((exercise, index) => (
              <div className="exercise-row" key={exercise.key}>
                <div className="exercise-row-head">
                  <span className="exercise-index">{index + 1}</span>
                  <span className="exercise-row-name">{exercise.name}</span>
                  <div className="exercise-row-tools">
                    <button type="button" onClick={() => removeExercise(exercise.key)} aria-label="Remove exercise"><Icon name="x" size={15} /></button>
                  </div>
                </div>
                <p className="exercise-row-meta">
                  {exercise.sets || 0} × {exercise.reps || 0}{num(exercise.weight) ? ` @ ${exercise.weight}kg` : ''}
                  {exercise.notes ? ` · ${exercise.notes}` : ''}
                </p>
              </div>
            ))}
            {!exercises.length && <p className="food-hint">No exercises added yet — add your first one below.</p>}
          </div>

          <ExerciseQuickAdd fields={WORKOUT_EXERCISE_FIELDS} notesField={{ key: 'notes', label: 'Notes' }} onAdd={addExercise} />

          <div className="wizard-footer">
            <button className="primary-btn wizard-next" type="button" disabled={!exercises.length} onClick={() => setStep(2)}>
              Next<Icon name="forward" size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-body">
          <div className="wizard-review glass">
            <h3>{name}</h3>
            <div className="record-heading">
              <span className="pill">{category}</span>
              {!!tags.trim() && <span className="pill cyan-fill">{tags}</span>}
            </div>
            <ul className="routine-exercises">
              {exercises.map((exercise) => (
                <li key={exercise.key}>
                  <span>{exercise.name}</span>
                  <small>{exercise.sets || 0} × {exercise.reps || 0}{num(exercise.weight) ? ` @ ${exercise.weight}kg` : ''}</small>
                </li>
              ))}
            </ul>
            <div className="meal-totals">
              <strong>{Math.round(volume).toLocaleString()} kg</strong>
              <span>total volume</span>
            </div>
          </div>

          <div className="wizard-footer">
            <button className="primary-btn wizard-next" type="button" onClick={submit}>
              <Icon name="save" size={18} />Save workout
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Weight is the one field that matters for a quick check-in — it's what the
// progress chart, goals, and derived targets all key off. Everything else
// (performance metrics, body measurements, notes) starts collapsed behind
// "Add measurements & notes" instead of six extra fields up front, and only
// opens by default when editing a record that already has some of that data.
function ProgressForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial || emptyProgress);
  const [showMore, setShowMore] = useState(() => Boolean(initial && (
    num(initial.runTime) || num(initial.liftingWeight) || num(initial.chest)
    || num(initial.waist) || num(initial.hips) || num(initial.arms) || num(initial.legs)
    || initial.notes
  )));

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
      <label className="wizard-name-label">
        Weight kg
        <input autoFocus type="number" min="0" step="any" placeholder="e.g. 78.5" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} required />
      </label>

      {showMore ? (
        <>
          <div className="form-row">
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
        </>
      ) : (
        <button type="button" className="link-btn compact add-row" onClick={() => setShowMore(true)}>
          <Icon name="plus" size={16} /> Add measurements & notes
        </button>
      )}

      <FormActions onCancel={onCancel} />
    </form>
  );
}

// Local datetime-input value (no timezone suffix) for the stored ISO time.
function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ReminderForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => (initial
    ? { title: initial.title, type: initial.type, time: toLocalDateTimeInput(initial.time) }
    : emptyReminder));

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit reminder' : 'Add reminder'}</h3>
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

function Dashboard({ stats, summary, workouts, nutrition, progress, reminders, goals, activeWorkout, openForm, openWizard, setView, onResume, onOpenSummary }) {
  const recent = [
    ...workouts.slice(0, 2).map((item) => ({
      id: `w-${item._id}`,
      title: item.name,
      detail: `${item.exercises?.map((exercise) => exercise.name).join(', ') || item.category}`
        + `${workoutVolume(item) ? ` · ${Math.round(workoutVolume(item)).toLocaleString()} kg` : ''}`,
      time: relativeTime(item.date || item.createdAt),
      icon: 'dumbbell',
      color: 'lime',
    })),
    ...nutrition.slice(0, 2).map((item) => ({
      id: `n-${item._id}`,
      title: `${item.mealType[0].toUpperCase()}${item.mealType.slice(1)} meal`,
      detail: `${Math.round(mealTotals(item).calories)} kcal · ${item.foods?.map((f) => f.name).join(', ') || ''}`,
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
      {activeWorkout && (
        <section className="glass active-banner">
          <div>
            <small>Workout in progress</small>
            <h3>{activeWorkout.name}</h3>
            <p>{activeWorkout.summary?.completedSets || 0}/{activeWorkout.summary?.plannedSets || 0} sets done</p>
          </div>
          <button className="primary-btn" onClick={onResume}><Icon name="play" size={18} />Resume</button>
        </section>
      )}
      <div className="stats">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            stat={stat}
            // Only the nutrition figures open the breakdown; Volume and Weight
            // have nothing extra to show here.
            onClick={summary && stat.opensSummary ? onOpenSummary : undefined}
          />
        ))}
      </div>

      <SectionTitle title="Today's Overview" action="View All" onAction={() => setView('workout')} />
      <section className="glass overview">
        <div className="overview-block workout-bg">
          <img src="/images/next-workout.png" alt="" />
          <small>Last Workout</small><h3>{nextWorkout?.name || 'Add a workout'}</h3><p><Icon name="clock" size={21} /> {nextWorkout ? formatDate(nextWorkout.date) : 'No schedule yet'}</p>
        </div>
        <div className="overview-block meal-bg">
          <img src="/images/next-meal.png" alt="" />
          <small>Last Meal</small><h3>{nextMeal?.mealType || 'Log a meal'}</h3><p><Icon name="clock" size={21} /> {nextMeal ? formatDate(nextMeal.date) : 'No meal yet'}</p>
        </div>
      </section>
      <SectionTitle title="Weekly Progress" action="This Week" />
      <ProgressChart entries={progress} />
      <SectionTitle title="Quick Actions" />
      <section className="actions">
        <button className="glass action" onClick={() => setView('routines')}><span className="lime featured-action"><Icon name="play" /></span><b>Start</b><b>Routine</b></button>
        <button className="glass action" onClick={() => openWizard('workout')}><span className="lime"><Icon name="dumbbell" /></span><b>Log</b><b>Workout</b></button>
        <button className="glass action" onClick={() => openWizard('meal')}><span className="pink"><Icon name="utensils" /></span><b>Log</b><b>Meal</b></button>
        <button className="glass action" onClick={() => openForm('progress')}><span className="cyan"><Icon name="scale" /></span><b>Update</b><b>Weight</b></button>
        <button className="glass action" onClick={() => setView('goals')}><span className="cyan"><Icon name="chartPie" /></span><b>Set</b><b>Goal</b></button>
        <button className="glass action" onClick={() => setView('feed')}><span className="amber"><Icon name="feed" /></span><b>View</b><b>Feed</b></button>
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
      {!!goals.length && (
        <>
          <SectionTitle title="Goals" action="View All" onAction={() => setView('goals')} />
          <section className="glass compact-list goals-widget">
            {goals.slice(0, 3).map((goal) => (
              <div className="goal-widget-row" key={goal._id}>
                <p><Icon name="chartPie" size={18} /><span>{goal.title}</span>{goal.achieved && <i className="nav-dot" aria-hidden="true" />}</p>
                <div className="meter"><i className={goal.achieved ? 'lime' : 'cyan'} style={{ width: `${goal.progressPercent ?? 0}%` }} /></div>
              </div>
            ))}
          </section>
        </>
      )}
      {!!reminders.length && (
        <>
          <SectionTitle title="Upcoming Reminders" />
          <section className="glass compact-list">
            {reminders.slice(0, 3).map((item) => <p key={item._id}><Icon name="bell" size={18} /><span>{item.title}</span><time>{formatDate(item.time)}</time></p>)}
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
        {workouts.length ? workouts.map((workout) => {
          const counts = setCounts(workout);
          return (
            <article className="record-card glass" key={workout._id}>
              <div className="record-heading">
                <span className="pill">{workout.category}</span>
                {workout.status === 'abandoned' && <span className="pill muted">abandoned</span>}
                <time>{formatDate(workout.date)}</time>
              </div>
              <h3>{workout.name}</h3>
              <div className="workout-summary">
                <span><Icon name="check" size={15} />{counts.completed}/{counts.planned} sets</span>
                <span><Icon name="chartPie" size={15} />{Math.round(workoutVolume(workout)).toLocaleString()} kg</span>
                {workout.durationSeconds > 0 && <span><Icon name="timer" size={15} />{Math.round(workout.durationSeconds / 60)} min</span>}
              </div>
              {(workout.exercises || []).map((exercise) => {
                const done = (exercise.setLog || []).filter((set) => set.completed);
                return (
                  <p key={exercise._id || exercise.name}>
                    {exercise.name}: {done.length || exercise.sets || 0} sets x {done[0]?.reps ?? exercise.reps ?? 0} reps
                    , {done[0]?.weight ?? exercise.weight ?? 0} kg
                  </p>
                );
              })}
              <div className="tag-row">{(workout.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <CardActions onEdit={() => onEdit(workout)} onDelete={() => onDelete(workout._id)} />
            </article>
          );
        }) : <EmptyState icon="dumbbell" title="No workouts found" text="Start a routine to track sets live, or log a finished workout here." />}
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
      <div className="record-grid meal-grid">
        {nutrition.length ? nutrition.map((meal) => {
          const totals = mealTotals(meal);
          return (
            <article className="record-card glass" key={meal._id}>
              <div className="record-heading"><span className="pill pink-fill">{meal.mealType}</span><time>{formatDate(meal.date)}</time></div>
              <div className="meal-card-title-row">
                <h3>{meal.foods?.map((food) => food.name).join(', ') || 'Meal'}</h3>
                <p className="meal-kcal">{Math.round(totals.calories)} kcal</p>
              </div>
              <ul className="meal-foods">
                {(meal.foods || []).map((food) => (
                  <li key={food._id || food.name}>
                    <span>{food.name}</span>
                    <small>{food.quantity}{food.unit === 'serving' ? ' serving' : food.unit} · {Math.round(food.calories || 0)} kcal</small>
                  </li>
                ))}
              </ul>
              <div className="macro-row">
                <span>Protein {Math.round(totals.protein)}g</span>
                <span>Carbs {Math.round(totals.carbs)}g</span>
                <span>Fats {Math.round(totals.fats)}g</span>
              </div>
              <CardActions onEdit={() => onEdit(meal)} onDelete={() => onDelete(meal._id)} />
            </article>
          );
        }) : <EmptyState icon="utensils" title="No meals found" text="Search the food table and log a portion — calories are worked out for you." />}
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

function ReportsView({ onExportCsv, onExportPdf, totals, workouts, nutrition }) {
  return (
    <Panel title="Reports">
      <section className="report-actions">
        <article className="glass report-card"><Icon name="file" /><h3>CSV export</h3><p>Download workouts, nutrition, and progress in spreadsheet-friendly format.</p><button className="primary-btn" onClick={onExportCsv}>Download CSV</button></article>
        <article className="glass report-card"><Icon name="chartPie" /><h3>PDF report</h3><p>Download a formatted fitness summary generated by the backend.</p><button className="secondary-btn" onClick={onExportPdf}>Download PDF</button></article>
      </section>
      <section className="glass report-summary">
        <p><strong>{totals.workouts}</strong><span>Workouts</span></p>
        <p><strong>{totals.meals}</strong><span>Meals</span></p>
        <p><strong>{totals.progress}</strong><span>Progress logs</span></p>
      </section>
      <SectionTitle title="Workout & nutrition analytics" />
      <Analytics workouts={workouts} nutrition={nutrition} />
    </Panel>
  );
}

function FollowButton({ user, followingIds, onToggleFollow }) {
  const following = followingIds.has(user._id);
  return (
    <button
      type="button"
      className={`follow-btn ${following ? 'following' : ''}`}
      onClick={() => onToggleFollow(user)}
    >
      <Icon name={following ? 'check' : 'plus'} size={14} />{following ? 'Following' : 'Follow'}
    </button>
  );
}

function CommunityView({
  feedback, notifications, reminders, currentUserId, followingIds, onFeedback,
  onReadNotification, onDeleteNotification, onDeleteReminder, onEditReminder,
  onReminder, onSearchUsers, onToggleFollow,
}) {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState([]);

  function submit(event) {
    event.preventDefault();
    onFeedback(form);
    setForm({ subject: '', message: '' });
  }

  async function searchUsers(event) {
    event.preventDefault();
    setUsers(await onSearchUsers(userQuery));
  }

  return (
    <Panel title="Community">
      <form className="glass user-search" onSubmit={searchUsers}>
        <label><Icon name="search" size={18} /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Find athletes by name or username" required /></label>
        <button className="secondary-btn" type="submit">Search</button>
      </form>
      {!!users.length && <section className="glass people-grid">
        {users.map((user) => <article key={user._id}>
          <div className="person-avatar">{user.profilePicture ? <img src={assetUrl(user.profilePicture)} alt="" /> : user.name?.slice(0, 1).toUpperCase()}</div>
          <p><strong>{user.name}</strong><small>@{user.username}</small></p>
          {user._id !== currentUserId && <FollowButton user={user} followingIds={followingIds} onToggleFollow={onToggleFollow} />}
        </article>)}
      </section>}
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
            <article key={item._id}>
              <p>{item.title}</p><small>{item.type} · {new Date(item.time).toLocaleString()}</small>
              <div className="mini-actions">
                <button onClick={() => onEditReminder(item)}><Icon name="edit" size={16} />Edit</button>
                <button onClick={() => onDeleteReminder(item._id)}><Icon name="trash" size={16} />Delete</button>
              </div>
            </article>
          )) : <EmptyState icon="clock" title="No reminders" text="Add a workout, meal, or goal reminder and keep it synced with your account." />}
        </div>
      </section>
      {!!feedback.length && (
        <section className="glass side-list">
          <div className="subheading"><h3>Your feedback</h3></div>
          {feedback.map((item) => (
            <article key={item._id}>
              <p>{item.subject}</p><small>{item.status} · {relativeTime(item.createdAt)}</small>
              {item.adminReply && <p className="admin-reply"><strong>Support:</strong> {item.adminReply}</p>}
            </article>
          ))}
        </section>
      )}
    </Panel>
  );
}

// Posts made here are never linked to a workout — a workout can only end up
// on the feed by actually being performed (see ShareWorkoutPrompt), never by
// picking one from a list after the fact.
function FeedComposer({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);

  function pickImage(event) {
    const file = event.target.files?.[0] || null;
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : '');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ title, body, tags, image });
      setTitle(''); setBody(''); setTags(''); setImage(null); setPreview('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="glass feed-composer" onSubmit={submit}>
      <h3>Share an update</h3>
      <input className="composer-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What's on your mind?" required maxLength={160} />
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add details — how it felt, PRs, tips..." required maxLength={5000} />
      {preview && (
        <div className="composer-preview">
          <img src={preview} alt="Selected workout" />
          <button type="button" className="preview-remove" onClick={() => { setImage(null); setPreview(''); }} aria-label="Remove image"><Icon name="x" size={16} /></button>
        </div>
      )}
      <div className="composer-row">
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags: chest, pr" />
      </div>
      <div className="composer-actions">
        <label className="secondary-btn image-picker">
          <Icon name="image" size={18} />{image ? 'Change photo' : 'Add photo'}
          <input type="file" accept="image/png,image/jpeg" onChange={pickImage} hidden />
        </label>
        <button className="primary-btn" type="submit" disabled={busy}><Icon name="plus" size={18} />{busy ? 'Posting...' : 'Post'}</button>
      </div>
    </form>
  );
}

// Shown right after a workout is actually completed (a live session finished,
// or a workout quick-logged as already done) — never reachable from the feed
// page itself. The workout attached is always the one just performed; there
// is no picker.
function ShareWorkoutPrompt({ workout, defaultBody, onSkip, onShare }) {
  const [title, setTitle] = useState(`Just finished ${workout.name}`);
  const [body, setBody] = useState(defaultBody);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onShare({ title, body });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Share workout to feed">
      <form className="glass data-form" onSubmit={submit}>
        <h3>Share this workout?</h3>
        <p className="food-hint">Posting to the feed here always attaches the workout you just completed — {workout.name}.</p>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} /></label>
        <label>Details<textarea value={body} onChange={(event) => setBody(event.target.value)} required maxLength={5000} /></label>
        <div className="form-actions">
          <button className="secondary-btn" type="button" onClick={onSkip}><Icon name="x" size={18} />Not now</button>
          <button className="primary-btn" type="submit" disabled={busy}><Icon name="feed" size={18} />{busy ? 'Sharing...' : 'Share to feed'}</button>
        </div>
      </form>
    </div>
  );
}

function FeedPost({ post, currentUser, onLike, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const author = post.user || {};
  const isMine = author._id === currentUser?._id;

  function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    onComment(post._id, comment.trim());
    setComment('');
    setShowComments(true);
  }

  return (
    <article className="glass feed-post">
      <header className="feed-head">
        <div className="person-avatar">{author.profilePicture ? <img src={assetUrl(author.profilePicture)} alt="" /> : (author.name || '?').slice(0, 1).toUpperCase()}</div>
        <div className="feed-meta">
          <strong>{author.name || 'Athlete'}</strong>
          <small>@{author.username || 'athlete'} · {relativeTime(post.createdAt)}</small>
        </div>
        {post.workoutSummary?.name && <span className="pill">{post.workoutSummary.name}</span>}
        {isMine && <button className="feed-delete" onClick={() => onDelete(post._id)} aria-label="Delete post"><Icon name="trash" size={16} /></button>}
      </header>
      <h3 className="feed-title">{post.title}</h3>
      <p className="feed-body">{post.body}</p>
      {post.image && <div className="feed-image"><img src={assetUrl(post.image)} alt={post.title} loading="lazy" /></div>}
      {!!(post.tags || []).length && <div className="tag-row">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
      <div className="feed-bar">
        <button className={`feed-action ${post.likedByMe ? 'liked' : ''}`} onClick={() => onLike(post)}>
          <Icon name="heart" size={20} /><span>{post.likeCount || 0}</span>
        </button>
        <button className="feed-action" onClick={() => setShowComments((open) => !open)}>
          <Icon name="comment" size={20} /><span>{post.replyCount ?? (post.replies?.length || 0)}</span>
        </button>
      </div>
      {showComments && (
        <div className="feed-comments">
          {(post.replies || []).map((reply) => (
            <div className="feed-comment" key={reply._id || `${reply.user?._id}-${reply.createdAt}`}>
              <div className="person-avatar small">{reply.user?.profilePicture ? <img src={assetUrl(reply.user.profilePicture)} alt="" /> : (reply.user?.name || '?').slice(0, 1).toUpperCase()}</div>
              <p><strong>{reply.user?.name || 'Athlete'}</strong> {reply.message}</p>
            </div>
          ))}
          <form className="feed-comment-form" onSubmit={submitComment}>
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" />
            <button className="secondary-btn" type="submit"><Icon name="save" size={16} /></button>
          </form>
        </div>
      )}
    </article>
  );
}

function FeedView({ posts, currentUser, loading, hasMore, onCreate, onLike, onComment, onDelete, onLoadMore }) {
  return (
    <Panel title="Live Feed">
      <FeedComposer onSubmit={onCreate} />
      {posts.length ? (
        <div className="feed-list">
          {posts.map((post) => (
            <FeedPost key={post._id} post={post} currentUser={currentUser} onLike={onLike} onComment={onComment} onDelete={onDelete} />
          ))}
          {hasMore && <button className="secondary-btn load-more" onClick={onLoadMore} disabled={loading}>{loading ? 'Loading...' : 'Load more'}</button>}
        </div>
      ) : (
        <EmptyState icon="feed" title="No posts yet" text="Be the first to share a workout with the community." />
      )}
    </Panel>
  );
}

function ConnectionsPanel({ followers, following, followingIds, onToggleFollow }) {
  const [tab, setTab] = useState('followers');
  const list = tab === 'followers' ? followers : following;

  return (
    <section className="glass connections-panel">
      <div className="subheading"><h3>Connections</h3></div>
      <div className="connections-tabs">
        <button type="button" className={tab === 'followers' ? 'active' : ''} onClick={() => setTab('followers')}>Followers <b>{followers.length}</b></button>
        <button type="button" className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following <b>{following.length}</b></button>
      </div>
      {list.length ? (
        <div className="people-grid">
          {list.map((user) => (
            <article key={user._id}>
              <div className="person-avatar">{user.profilePicture ? <img src={assetUrl(user.profilePicture)} alt="" /> : user.name?.slice(0, 1).toUpperCase()}</div>
              <p><strong>{user.name}</strong><small>@{user.username}</small></p>
              <FollowButton user={user} followingIds={followingIds} onToggleFollow={onToggleFollow} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon="user" title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'} text="Find athletes from the Community tab to connect with them." />
      )}
    </section>
  );
}

function SettingsView({ profile, summary, followers, following, followingIds, onToggleFollow, onSave, onSavePicture }) {
  const [form, setForm] = useState({
    username: profile?.username || '',
    name: profile?.name || '',
    email: profile?.email || '',
    password: '',
    units: profile?.preferences?.units || 'metric',
    theme: profile?.preferences?.theme || 'dark',
    notificationsEnabled: profile?.preferences?.notificationsEnabled ?? true,
    heightCm: profile?.bodyStats?.heightCm || '',
    birthDate: profile?.bodyStats?.birthDate ? String(profile.bodyStats.birthDate).slice(0, 10) : '',
    sex: profile?.bodyStats?.sex || 'unspecified',
    activityLevel: profile?.bodyStats?.activityLevel || 'moderate',
    goal: profile?.bodyStats?.goal || 'maintain',
    autoCalculate: profile?.nutritionTargets?.autoCalculate ?? true,
    calories: profile?.nutritionTargets?.calories || '',
    protein: profile?.nutritionTargets?.protein || '',
    carbs: profile?.nutritionTargets?.carbs || '',
    fats: profile?.nutritionTargets?.fats || '',
  });
  const [picture, setPicture] = useState(null);

  function submit(event) {
    event.preventDefault();
    onSave({
      username: form.username,
      name: form.name,
      email: form.email,
      ...(form.password ? { password: form.password } : {}),
      preferences: {
        units: form.units,
        theme: form.theme,
        notificationsEnabled: form.notificationsEnabled,
      },
      bodyStats: {
        ...(form.heightCm ? { heightCm: num(form.heightCm) } : {}),
        ...(form.birthDate ? { birthDate: form.birthDate } : {}),
        sex: form.sex,
        activityLevel: form.activityLevel,
        goal: form.goal,
      },
      nutritionTargets: {
        autoCalculate: form.autoCalculate,
        ...(form.autoCalculate ? {} : {
          calories: num(form.calories),
          protein: num(form.protein),
          carbs: num(form.carbs),
          fats: num(form.fats),
        }),
      },
    });
  }

  return (
    <Panel title="Settings">
      <ConnectionsPanel followers={followers} following={following} followingIds={followingIds} onToggleFollow={onToggleFollow} />
      <form className="glass data-form" onSubmit={submit}>
        <h3>Profile and preferences</h3>
        <div className="profile-editor">
          <div className="profile-preview">{profile?.profilePicture ? <img src={assetUrl(profile.profilePicture)} alt={`${profile.name}'s profile`} /> : profile?.name?.slice(0, 1).toUpperCase()}</div>
          <label>Profile picture<input type="file" accept="image/png,image/jpeg" onChange={(event) => setPicture(event.target.files?.[0] || null)} /></label>
          <button className="secondary-btn" type="button" disabled={!picture} onClick={() => onSavePicture(picture)}>Upload</button>
        </div>
        <label>Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} required minLength="3" maxLength="30" /></label>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>New password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to keep current" /></label>
        <div className="form-row">
          <label>Units<select value={form.units} onChange={(event) => setForm({ ...form, units: event.target.value })}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
          <label>Theme<select value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })}><option value="dark">Dark</option><option value="light">Light</option></select></label>
        </div>
        <label className="toggle-row"><input type="checkbox" checked={form.notificationsEnabled} onChange={(event) => setForm({ ...form, notificationsEnabled: event.target.checked })} />Notifications enabled</label>

        <div className="subheading"><h3>Body & targets</h3></div>
        <p className="food-hint">
          Used to work out your daily calorie and macro targets. Weight comes from your
          latest progress entry, so the targets follow it as you go.
        </p>
        <div className="form-row">
          <label>Height cm<input type="number" min="50" max="260" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} /></label>
          <label>Date of birth<input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
          <label>Sex
            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="unspecified">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>Activity level
            <select value={form.activityLevel} onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}>
              <option value="sedentary">Sedentary (desk job)</option>
              <option value="light">Light (1-3 days/wk)</option>
              <option value="moderate">Moderate (3-5 days/wk)</option>
              <option value="active">Active (6-7 days/wk)</option>
              <option value="very_active">Very active (physical job)</option>
            </select>
          </label>
          <label>Goal
            <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain weight</option>
            </select>
          </label>
        </div>

        <label className="toggle-row">
          <input type="checkbox" checked={form.autoCalculate} onChange={(e) => setForm({ ...form, autoCalculate: e.target.checked })} />
          Calculate my targets automatically
        </label>

        {form.autoCalculate ? (
          summary?.targets && (
            <div className="meal-totals">
              <strong>{summary.targets.calories} kcal</strong>
              <span>P {summary.targets.protein}g</span>
              <span>C {summary.targets.carbs}g</span>
              <span>F {summary.targets.fats}g</span>
              {summary.targets.basis && <small>TDEE {summary.targets.basis.tdee} kcal</small>}
            </div>
          )
        ) : (
          <div className="form-row">
            <label>Calories<input type="number" min="0" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></label>
            <label>Protein g<input type="number" min="0" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></label>
            <label>Carbs g<input type="number" min="0" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></label>
            <label>Fats g<input type="number" min="0" value={form.fats} onChange={(e) => setForm({ ...form, fats: e.target.value })} /></label>
          </div>
        )}

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
  const [reminders, setReminders] = useState([]);
  // { type: 'error' } is the default so every existing setStatus(message) call
  // (there are many, scattered across catch blocks) keeps rendering as an
  // error banner with no changes needed at those call sites — only mutate()'s
  // success path opts into the lime "success" styling via setStatusSuccess.
  const [status, setStatusState] = useState({ message: '', type: 'error' });
  function setStatus(message) {
    setStatusState({ message, type: 'error' });
  }
  function setStatusSuccess(message) {
    setStatusState({ message, type: 'success' });
  }
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addMenu, setAddMenu] = useState(false);
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [workoutCategory, setWorkoutCategory] = useState('');
  const [mealSearch, setMealSearch] = useState('');
  const [mealType, setMealType] = useState('');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  // Today's consumed-vs-target rollup, computed server-side.
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  // The just-performed workout a ShareWorkoutPrompt is offering to post —
  // never set from anywhere except finishing/logging a workout.
  const [shareCandidate, setShareCandidate] = useState(null);

  const token = auth?.token;
  const followingIds = useMemo(() => new Set(following.map((user) => user._id)), [following]);

  // Keeps lib/api.js's silent-refresh logic aware of the current refresh
  // token, and folds a rotation it performs back into React state so the next
  // render's closures pick up the new access token instead of retrying with a
  // stale one.
  useEffect(() => {
    setAuthState(auth);
  }, [auth]);
  useEffect(() => {
    onAuthRefresh((next) => {
      setAuth(next);
      setAuthState(next);
    });
  }, []);

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  useEffect(() => {
    if (token && view === 'feed' && feedPosts.length === 0) loadFeed(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view]);

  // The social graph is keyed off the profile's own id, which loadAll only
  // learns once its own fetch resolves — so this runs as a second phase.
  useEffect(() => {
    if (!token || !profile?._id) return;
    (async () => {
      try {
        const [followersData, followingData] = await Promise.all([
          request(`/users/${profile._id}/followers`, { token }),
          request(`/users/${profile._id}/following`, { token }),
        ]);
        setFollowers(followersData);
        setFollowing(followingData);
      } catch {
        // Non-fatal — the Community/Settings follow UI just stays empty.
      }
    })();
  }, [token, profile?._id]);

  async function loadAll() {
    setLoading(true);
    setStatus('');
    try {
      const [
        profileData, workoutData, nutritionData, progressData, notificationData,
        feedbackData, reminderData, routineData, goalData, activeData, summaryData,
      ] = await Promise.all([
        request('/users', { token }),
        request('/workouts', { token }),
        request('/nutrition', { token }),
        request('/progress', { token }),
        request('/notifications', { token }).catch(() => []),
        request('/feedback', { token }).catch(() => []),
        request('/reminders', { token }),
        request('/routines', { token }).catch(() => []),
        request('/goals', { token }).catch(() => []),
        // 204 when nothing is in flight; the request helper maps that to null.
        request('/workouts/active', { token }).catch(() => null),
        request('/nutrition/summary', { token }).catch(() => null),
      ]);
      setProfile(profileData);
      setWorkouts(workoutData);
      setNutrition(nutritionData);
      setProgress(progressData);
      setNotifications(notificationData);
      setFeedback(feedbackData);
      setReminders(reminderData);
      setRoutines(routineData);
      setGoals(goalData);
      setActiveWorkout(activeData);
      setSummary(summaryData);
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }
      setStatus(`${error.message}. Check that the backend is running at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const refreshToken = auth?.refreshToken;
    if (refreshToken) {
      // Best-effort: revoke this session's refresh token server-side so it
      // can't be replayed. Local logout proceeds either way.
      await request('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
    }
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
    setProfile(null);
  }

  function openForm(type, item = null) {
    setAddMenu(false);
    setEditing(item);
    setFormType(type);
  }

  function closeForm() {
    setEditing(null);
    setFormType(null);
  }

  const WIZARD_VIEWS = { routine: 'routine-wizard', workout: 'workout-wizard', meal: 'meal-wizard' };

  // Routine/workout/meal creation is a full-screen wizard (its own `view`),
  // not the quick modal popup progress/reminder/goal still use.
  function openWizard(type, item = null) {
    setAddMenu(false);
    setEditing(item);
    setView(WIZARD_VIEWS[type]);
  }

  async function mutate(action, successMessage = '') {
    setStatus('');
    try {
      await action();
      if (successMessage) setStatusSuccess(successMessage);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function saveWorkout(payload) {
    const isNewLog = !editing?._id;
    await mutate(async () => {
      const path = editing?._id ? `/workouts/${editing._id}` : '/workouts';
      const method = editing?._id ? 'PUT' : 'POST';
      const saved = await request(path, { method, body: payload, token });
      closeForm();
      setView('workout');
      await loadAll();
      // Only a freshly-logged (not edited) workout counts as "performed".
      if (isNewLog && saved.status === 'completed') setShareCandidate(saved);
    }, 'Workout saved.');
  }

  async function saveMeal(payload) {
    await mutate(async () => {
      const path = editing?._id ? `/nutrition/${editing._id}` : '/nutrition';
      const method = editing?._id ? 'PUT' : 'POST';
      await request(path, { method, body: payload, token });
      closeForm();
      setView('nutrition');
      await loadAll();
    }, 'Meal saved.');
  }

  async function saveRoutine(payload) {
    await mutate(async () => {
      const path = editing?._id ? `/routines/${editing._id}` : '/routines';
      const method = editing?._id ? 'PUT' : 'POST';
      await request(path, { method, body: payload, token });
      closeForm();
      setView('routines');
      await loadAll();
    }, 'Routine saved.');
  }

  async function startRoutine(routine) {
    await mutate(async () => {
      try {
        const workout = await request(`/routines/${routine._id}/start`, { method: 'POST', token });
        setActiveWorkout(workout);
        setView('session');
      } catch (error) {
        // The server refuses a second concurrent session and hands back the
        // one already running — resume that instead of erroring at the user.
        if (error.status === 409 && error.data?.workout) {
          setActiveWorkout(error.data.workout);
          setView('session');
          return;
        }
        throw error;
      }
    });
  }

  // Ticking a set is optimistic — the checkbox responds immediately and the
  // server's authoritative copy (with the recomputed summary) replaces it.
  async function logSet(exerciseId, setId, patch) {
    setActiveWorkout((current) => (current ? {
      ...current,
      exercises: current.exercises.map((exercise) => (exercise._id !== exerciseId ? exercise : {
        ...exercise,
        setLog: exercise.setLog.map((set) => (set._id === setId ? { ...set, ...patch } : set)),
      })),
    } : current));

    try {
      const updated = await request(
        `/workouts/${activeWorkout._id}/exercises/${exerciseId}/sets/${setId}`,
        { method: 'PUT', body: patch, token },
      );
      setActiveWorkout(updated);
    } catch (error) {
      setStatus(error.message);
      const fresh = await request('/workouts/active', { token }).catch(() => null);
      setActiveWorkout(fresh);
    }
  }

  async function addSet(exerciseId) {
    await mutate(async () => {
      const updated = await request(
        `/workouts/${activeWorkout._id}/exercises/${exerciseId}/sets`,
        { method: 'POST', body: {}, token },
      );
      setActiveWorkout(updated);
    });
  }

  async function finishWorkout(abandoned = false) {
    await mutate(async () => {
      const finished = await request(`/workouts/${activeWorkout._id}/complete`, {
        method: 'POST', body: { abandoned }, token,
      });
      setActiveWorkout(null);
      setView('workout');
      await loadAll();
      // An abandoned session was not actually performed to completion.
      if (!abandoned) setShareCandidate(finished);
    }, abandoned ? 'Workout abandoned.' : 'Workout complete — nice work.');
  }

  async function saveProgress(payload) {
    await mutate(async () => {
      const path = editing?._id ? `/progress/${editing._id}` : '/progress';
      const method = editing?._id ? 'PUT' : 'POST';
      await request(path, { method, body: payload, token });
      closeForm();
      await loadAll();
    }, 'Progress saved.');
  }

  async function removeRecord(path) {
    await mutate(async () => {
      await request(path, { method: 'DELETE', token });
      await loadAll();
    }, 'Record deleted.');
  }

  async function saveProfile(payload) {
    await mutate(async () => {
      const data = await request('/users', { method: 'PUT', body: payload, token });
      setProfile(data);
      // Body stats feed the derived targets, so refresh the day's rollup.
      setSummary(await request('/nutrition/summary', { token }).catch(() => null));
    }, 'Profile updated.');
  }

  async function saveProfilePicture(file) {
    if (!file) return;
    await mutate(async () => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const data = await request('/users/profile-picture', { method: 'PUT', body: formData, token });
      setProfile(data);
    }, 'Profile picture updated.');
  }

  async function submitFeedback(payload) {
    await mutate(async () => {
      await request('/feedback', { method: 'POST', body: payload, token });
      await loadAll();
    }, 'Feedback sent.');
  }

  async function markNotificationRead(id) {
    await mutate(async () => {
      await request(`/notifications/${id}/read`, { method: 'PUT', token });
      await loadAll();
    });
  }

  async function deleteNotification(id) {
    await mutate(async () => {
      await request(`/notifications/${id}`, { method: 'DELETE', token });
      await loadAll();
    });
  }

  async function exportCsv() {
    await mutate(() => downloadReport('/reports/csv', 'fitness-tracker-report.csv', token));
  }

  async function exportPdf() {
    await mutate(() => downloadReport('/reports/pdf', 'fitness-tracker-report.pdf', token));
  }

  async function saveReminder(payload) {
    await mutate(async () => {
      const path = editing?._id ? `/reminders/${editing._id}` : '/reminders';
      const method = editing?._id ? 'PUT' : 'POST';
      await request(path, { method, body: payload, token });
      closeForm();
      await loadAll();
    }, editing?._id ? 'Reminder updated.' : 'Reminder added.');
  }

  async function saveGoal(payload) {
    await mutate(async () => {
      const path = editing?._id ? `/goals/${editing._id}` : '/goals';
      const method = editing?._id ? 'PUT' : 'POST';
      await request(path, { method, body: payload, token });
      closeForm();
      await loadAll();
    }, 'Goal saved.');
  }

  // Optimistic: the button flips immediately, then reconciles with the
  // server. `user` only needs `_id`/`username`/`name`/`profilePicture` — the
  // same shape returned by search, followers, and following.
  async function toggleFollow(user) {
    const wasFollowing = followingIds.has(user._id);
    setFollowing((current) => (wasFollowing
      ? current.filter((item) => item._id !== user._id)
      : [...current, user]));
    try {
      await request(`/users/${user._id}/follow`, { method: wasFollowing ? 'DELETE' : 'POST', token });
    } catch (error) {
      setStatus(error.message);
      setFollowing((current) => (wasFollowing
        ? [...current, user]
        : current.filter((item) => item._id !== user._id)));
    }
  }

  async function deleteReminder(id) {
    await mutate(async () => {
      await request(`/reminders/${id}`, { method: 'DELETE', token });
      await loadAll();
    });
  }

  async function searchUsers(query) {
    try {
      return await request(`/users/search?search=${encodeURIComponent(query)}`, { token });
    } catch (error) {
      setStatus(error.message);
      return [];
    }
  }

  async function loadFeed(page = 1) {
    setFeedLoading(true);
    try {
      const data = await request(`/forum?page=${page}&limit=10`, { token });
      setFeedPosts((current) => (page === 1 ? data.items : [...current, ...data.items]));
      setFeedPage(data.meta.page);
      setFeedHasMore(data.meta.hasMore);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setFeedLoading(false);
    }
  }

  // Never attaches a workout — that only happens via shareWorkoutToFeed, right
  // after one is actually completed.
  async function createPost({ title, body, tags, image }) {
    await mutate(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body', body);
      if (tags) formData.append('tags', tags);
      if (image) formData.append('image', image);
      await request('/forum', { method: 'POST', body: formData, token });
      await loadFeed(1);
    }, 'Posted to the feed.');
  }

  // The only path that can post a workout to the feed. `shareCandidate` is set
  // right after a workout is actually finished (a completed live session, or a
  // workout logged as already done) — never user-selectable.
  async function shareWorkoutToFeed({ title, body }) {
    await mutate(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body', body);
      formData.append('workout', shareCandidate._id);
      await request('/forum', { method: 'POST', body: formData, token });
      setShareCandidate(null);
      await loadFeed(1);
    }, 'Shared to the feed.');
  }

  async function toggleLike(post) {
    // Optimistic update, then reconcile with the server's authoritative counts.
    setFeedPosts((current) => current.map((item) => item._id === post._id
      ? { ...item, likedByMe: !item.likedByMe, likeCount: (item.likeCount || 0) + (item.likedByMe ? -1 : 1) }
      : item));
    try {
      const data = await request(`/forum/${post._id}/like`, { method: 'POST', token });
      setFeedPosts((current) => current.map((item) => item._id === post._id
        ? { ...item, likedByMe: data.likedByMe, likeCount: data.likeCount }
        : item));
    } catch (error) {
      setStatus(error.message);
      await loadFeed(1);
    }
  }

  async function commentOnPost(postId, message) {
    try {
      const updated = await request(`/forum/${postId}/replies`, { method: 'POST', body: { message }, token });
      // Server returns the full post with populated replies; merge it in.
      setFeedPosts((current) => current.map((item) => item._id === postId
        ? { ...item, replies: updated.replies, replyCount: updated.replies.length }
        : item));
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function deletePost(postId) {
    await mutate(async () => {
      await request(`/forum/${postId}`, { method: 'DELETE', token });
      setFeedPosts((current) => current.filter((item) => item._id !== postId));
    }, 'Post deleted.');
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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayNutrition = nutrition.filter((meal) => new Date(meal.date) >= startOfToday);
    const today = totalsFor(todayNutrition);
    // Prefer the server's rollup (which knows the user's targets); fall back to
    // the local sum if the summary request failed.
    const calories = summary ? summary.consumed.calories : today.calories;
    const protein = summary ? summary.consumed.protein : today.protein;
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return {
      calories,
      protein,
      // Does not assume `progress` is sorted.
      latestWeight: latestWeight(progress),
      volume: workouts
        .filter((workout) => new Date(workout.date) >= weekAgo)
        .reduce((sum, workout) => sum + workoutVolume(workout), 0),
      workouts: workouts.length,
      meals: nutrition.length,
      progress: progress.length,
    };
  }, [nutrition, progress, workouts, summary]);

  const calorieTarget = summary?.targets?.calories || 0;
  const proteinTarget = summary?.targets?.protein || 0;

  const stats = [
    {
      label: 'Calories',
      value: Math.round(totals.calories).toLocaleString(),
      target: calorieTarget ? `/ ${calorieTarget.toLocaleString()} kcal` : 'kcal today',
      icon: 'flame',
      color: 'pink',
      progress: calorieTarget ? (totals.calories / calorieTarget) * 100 : 0,
      opensSummary: true,
    },
    {
      label: 'Protein',
      value: `${Math.round(totals.protein)}`,
      target: proteinTarget ? `/ ${proteinTarget} g` : 'g today',
      icon: 'utensils',
      color: 'amber',
      progress: proteinTarget ? (totals.protein / proteinTarget) * 100 : 0,
      opensSummary: true,
    },
    {
      label: 'Volume',
      value: Math.round(totals.volume).toLocaleString(),
      target: 'kg this week',
      icon: 'dumbbell',
      color: 'lime',
      // Relative to a 20,000 kg week — a rough but honest reference point
      // rather than the old `count * 15` placeholder.
      progress: Math.min(100, (totals.volume / 20000) * 100),
    },
    {
      label: 'Weight',
      value: totals.latestWeight ? String(totals.latestWeight) : '--',
      target: 'kg latest',
      icon: 'scale',
      color: 'cyan',
      progress: totals.latestWeight ? 100 : 0,
    },
  ];

  if (!auth) return <AuthScreen onAuth={setAuth} />;

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

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <main className={`phone theme-${profile?.preferences?.theme || 'dark'}`}>
      <header className="topbar">
        <button className="logo logo-button" onClick={() => setView('dashboard')}>Fit<span>Track</span></button>
        <nav className="top-icons" aria-label="Header actions">
          <button aria-label="Nutrition" onClick={() => setView('nutrition')}><Icon name="utensils" size={24} /></button>
          <button className="notif" aria-label="Notifications" onClick={() => setView('community')}><Icon name="bell" size={24} /></button>
          <button className="avatar" aria-label="Profile" onClick={() => setView('settings')}>
            {profile?.profilePicture ? <img src={assetUrl(profile.profilePicture)} alt="" /> : <Icon name="user" size={22} />}
          </button>
          <button aria-label="Log out" onClick={logout}><Icon name="logout" size={24} /></button>
        </nav>
      </header>

      <section className="hero">
        <h1>{greeting}, {profile?.name || auth.name || 'Athlete'}</h1>
        <p>Keep pushing your limits. Your dashboard is synced with the backend server.</p>
      </section>

      {status.message && <div className={`status-banner ${status.type}`}>{status.message}</div>}
      {loading && <div className="status-banner">Loading fitness data...</div>}

      {view === 'dashboard' && <Dashboard stats={stats} summary={summary} workouts={workouts} nutrition={nutrition} progress={progress} reminders={reminders} goals={goals} activeWorkout={activeWorkout} openForm={openForm} openWizard={openWizard} setView={setView} onResume={() => setView('session')} onOpenSummary={() => setShowSummary(true)} />}
      {view === 'routines' && (
        <Panel title="Routines" action="New routine" onAction={() => openWizard('routine')}>
          <RoutinesView
            routines={routines}
            activeWorkout={activeWorkout}
            onStart={startRoutine}
            onEdit={(routine) => openWizard('routine', routine)}
            onDelete={(id) => removeRecord(`/routines/${id}`)}
            onAdd={() => openWizard('routine')}
            onResume={() => setView('session')}
          />
        </Panel>
      )}
      {view === 'session' && (activeWorkout ? (
        <SessionView
          workout={activeWorkout}
          onLogSet={logSet}
          onAddSet={addSet}
          onComplete={() => finishWorkout(false)}
          onAbandon={() => finishWorkout(true)}
          onBack={() => setView('routines')}
        />
      ) : (
        <Panel title="No active workout">
          <EmptyState icon="play" title="Nothing in progress" text="Start a routine to track your sets as you go." />
        </Panel>
      ))}
      {view === 'workout' && <WorkoutView workouts={filteredWorkouts} onEdit={(item) => openWizard('workout', item)} onDelete={(id) => removeRecord(`/workouts/${id}`)} onAdd={() => openWizard('workout')} search={workoutSearch} setSearch={setWorkoutSearch} category={workoutCategory} setCategory={setWorkoutCategory} />}
      {view === 'nutrition' && <NutritionView nutrition={filteredNutrition} onEdit={(item) => openWizard('meal', item)} onDelete={(id) => removeRecord(`/nutrition/${id}`)} onAdd={() => openWizard('meal')} search={mealSearch} setSearch={setMealSearch} mealType={mealType} setMealType={setMealType} />}
      {view === 'routine-wizard' && <RoutineWizard initial={editing} onCancel={() => { closeForm(); setView('routines'); }} onSubmit={saveRoutine} />}
      {view === 'workout-wizard' && <WorkoutWizard initial={editing} onCancel={() => { closeForm(); setView('workout'); }} onSubmit={saveWorkout} />}
      {view === 'meal-wizard' && <MealWizard initial={editing} token={token} currentUserId={profile?._id} onCancel={() => { closeForm(); setView('nutrition'); }} onSubmit={saveMeal} />}
      {view === 'progress' && <ProgressView progress={progress} onEdit={(item) => openForm('progress', item)} onDelete={(id) => removeRecord(`/progress/${id}`)} onAdd={() => openForm('progress')} />}
      {view === 'reports' && <ReportsView onExportCsv={exportCsv} onExportPdf={exportPdf} totals={totals} workouts={workouts} nutrition={nutrition} />}
      {view === 'goals' && (
        <Panel title="Goals" action="New goal" onAction={() => openForm('goal')}>
          <GoalsView goals={goals} onEdit={(goal) => openForm('goal', goal)} onDelete={(id) => removeRecord(`/goals/${id}`)} onAdd={() => openForm('goal')} />
        </Panel>
      )}
      {view === 'community' && (
        <CommunityView
          feedback={feedback}
          notifications={notifications}
          reminders={reminders}
          currentUserId={profile?._id}
          followingIds={followingIds}
          onFeedback={submitFeedback}
          onReadNotification={markNotificationRead}
          onDeleteNotification={deleteNotification}
          onDeleteReminder={deleteReminder}
          onEditReminder={(item) => openForm('reminder', item)}
          onReminder={() => openForm('reminder')}
          onSearchUsers={searchUsers}
          onToggleFollow={toggleFollow}
        />
      )}
      {view === 'feed' && <FeedView posts={feedPosts} currentUser={profile || auth} loading={feedLoading} hasMore={feedHasMore} onCreate={createPost} onLike={toggleLike} onComment={commentOnPost} onDelete={deletePost} onLoadMore={() => loadFeed(feedPage + 1)} />}
      {view === 'settings' && (
        <SettingsView
          profile={profile || auth}
          summary={summary}
          followers={followers}
          following={following}
          followingIds={followingIds}
          onToggleFollow={toggleFollow}
          onSave={saveProfile}
          onSavePicture={saveProfilePicture}
        />
      )}

      {showSummary && summary && (
        <NutritionSummaryModal
          summary={summary}
          onClose={() => setShowSummary(false)}
          onLogMeal={() => { setShowSummary(false); openWizard('meal'); }}
          onOpenSettings={() => { setShowSummary(false); setView('settings'); }}
        />
      )}

      {shareCandidate && (
        <ShareWorkoutPrompt
          workout={shareCandidate}
          defaultBody={(() => {
            const counts = setCounts(shareCandidate);
            return `${counts.completed}/${counts.planned} sets · ${Math.round(workoutVolume(shareCandidate)).toLocaleString()} kg volume`;
          })()}
          onSkip={() => setShareCandidate(null)}
          onShare={shareWorkoutToFeed}
        />
      )}

      {formType && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          {formType === 'progress' && <ProgressForm initial={mappedProgress} onCancel={closeForm} onSubmit={saveProgress} />}
          {formType === 'reminder' && <ReminderForm initial={editing} onCancel={closeForm} onSubmit={saveReminder} />}
          {formType === 'goal' && <GoalForm initial={editing} onCancel={closeForm} onSubmit={saveGoal} />}
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <div className="nav-surface" aria-hidden="true" />
        <div className="nav-items">
          <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><Icon name="home" size={24} /><span>Home</span></button>
          <button className={`nav-item ${view === 'routines' || view === 'session' || view === 'routine-wizard' ? 'active' : ''}`} onClick={() => setView(activeWorkout ? 'session' : 'routines')}>
            <Icon name={activeWorkout ? 'play' : 'list'} size={23} />
            <span>{activeWorkout ? 'Live' : 'Routines'}</span>
            {activeWorkout && <i className="nav-dot" aria-hidden="true" />}
          </button>
          {/* Empty on purpose — reserves the grid's center column so the floating
              add button still sits in the bar's notch, dead center. */}
          <div className="nav-item nav-center" aria-hidden="true" />
          <button className={`nav-item ${view === 'nutrition' || view === 'meal-wizard' ? 'active' : ''}`} onClick={() => setView('nutrition')}><Icon name="utensils" size={23} /><span>Food</span></button>
          <button className={`nav-item ${view === 'progress' ? 'active' : ''}`} onClick={() => setView('progress')}><Icon name="progress" size={23} /><span>Progress</span></button>
        </div>
        <button className="nav-add" aria-label="Add new entry" aria-haspopup="true" aria-expanded={addMenu} onClick={() => setAddMenu((open) => !open)}><Icon name="plus" size={28} /></button>
      </nav>

      {addMenu && (
        <div className="add-menu-backdrop" role="dialog" aria-modal="true" aria-label="Add new entry" onClick={() => setAddMenu(false)}>
          <div className="add-menu glass" onClick={(event) => event.stopPropagation()}>
            <h3>What do you want to add?</h3>
            <div className="add-menu-grid">
              <button className="add-menu-item" onClick={() => openWizard('routine')}><span className="lime"><Icon name="list" size={26} /></span><b>Routine</b></button>
              <button className="add-menu-item" onClick={() => openWizard('workout')}><span className="lime"><Icon name="dumbbell" size={26} /></span><b>Workout</b></button>
              <button className="add-menu-item" onClick={() => openWizard('meal')}><span className="pink"><Icon name="utensils" size={26} /></span><b>Meal</b></button>
              <button className="add-menu-item" onClick={() => openForm('progress')}><span className="cyan"><Icon name="scale" size={26} /></span><b>Weight</b></button>
              <button className="add-menu-item" onClick={() => openForm('reminder')}><span className="amber"><Icon name="bell" size={26} /></span><b>Reminder</b></button>
              <button className="add-menu-item" onClick={() => openForm('goal')}><span className="cyan"><Icon name="chartPie" size={26} /></span><b>Goal</b></button>
            </div>
            <button className="secondary-btn add-menu-cancel" onClick={() => setAddMenu(false)}><Icon name="x" size={18} />Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

// ============================================================================
// Author: Abdullah — created this file to wire up /api/goals, which the
// backend has fully implemented (including auto-achievement on workout/meal/
// weight logging — see server/services/goalService.js) but which had no UI at
// all before this.
// ============================================================================

import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { num } from '../lib/calc.js';

const METRICS = [
  { value: 'workout', label: 'Workouts logged', unit: '' },
  { value: 'sessions', label: 'Sessions completed', unit: '' },
  { value: 'nutrition', label: 'Meals logged', unit: '' },
  { value: 'calories', label: 'Calories', unit: 'kcal' },
  { value: 'protein', label: 'Protein', unit: 'g' },
  { value: 'volume', label: 'Training volume', unit: 'kg' },
  { value: 'weight', label: 'Body weight', unit: 'kg' },
];

const PERIODS = [
  { value: 'total', label: 'All time' },
  { value: 'daily', label: 'Per day' },
  { value: 'weekly', label: 'Per week' },
  { value: 'monthly', label: 'Per month' },
];

function metricLabel(metric) {
  return METRICS.find((m) => m.value === metric)?.label || metric;
}

function metricUnit(metric) {
  return METRICS.find((m) => m.value === metric)?.unit || '';
}

export function GoalForm({ initial, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    metric: initial?.metric || 'workout',
    target: initial?.target ?? '',
    direction: initial?.direction || 'increase',
    period: initial?.period || 'total',
    deadline: initial?.deadline ? String(initial.deadline).slice(0, 10) : '',
  }));

  // Weight is the only metric where "less" is commonly the goal (a cut); every
  // other metric is a floor to reach, not a ceiling to stay under.
  const showsDirection = form.metric === 'weight' || form.metric === 'calories';

  function submit(event) {
    event.preventDefault();
    onSubmit({
      title: form.title,
      metric: form.metric,
      target: num(form.target),
      direction: showsDirection ? form.direction : 'increase',
      period: form.metric === 'weight' ? 'total' : form.period,
      ...(form.deadline ? { deadline: form.deadline } : {}),
    });
  }

  return (
    <form className="glass data-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit goal' : 'New goal'}</h3>
      <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Hit 150g protein a day" /></label>
      <div className="form-row">
        <label>Metric
          <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label>Target{metricUnit(form.metric) ? ` (${metricUnit(form.metric)})` : ''}
          <input type="number" min="0" step="any" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required />
        </label>
      </div>
      <div className="form-row">
        {form.metric !== 'weight' && (
          <label>Window
            <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        )}
        {showsDirection && (
          <label>Direction
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="increase">Reach at least the target</option>
              <option value="decrease">Stay at or under the target</option>
            </select>
          </label>
        )}
        <label>Deadline (optional)<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
      </div>
      <div className="form-actions">
        <button className="secondary-btn" type="button" onClick={onCancel}><Icon name="x" size={18} />Cancel</button>
        <button className="primary-btn" type="submit"><Icon name="save" size={18} />Save goal</button>
      </div>
    </form>
  );
}

export function GoalsView({ goals, onEdit, onDelete, onAdd }) {
  return (
    <div className="record-grid">
      {goals.length ? goals.map((goal) => (
        <article className="record-card glass" key={goal._id}>
          <div className="record-heading">
            <span className="pill cyan-fill">{metricLabel(goal.metric)}</span>
            {goal.achieved && <span className="pill">Achieved</span>}
          </div>
          <h3>{goal.title}</h3>
          <p>
            {Math.round(goal.current ?? 0).toLocaleString()}{metricUnit(goal.metric) ? ` ${metricUnit(goal.metric)}` : ''}
            {' '}of {goal.target.toLocaleString()}{metricUnit(goal.metric) ? ` ${metricUnit(goal.metric)}` : ''}
            {goal.period && goal.period !== 'total' ? ` this ${goal.period.replace('ly', '')}` : ''}
          </p>
          <div className="meter"><i className={goal.achieved ? 'lime' : 'cyan'} style={{ width: `${goal.progressPercent ?? 0}%` }} /></div>
          {goal.deadline && <small>Due {new Date(goal.deadline).toLocaleDateString()}</small>}
          <div className="card-actions">
            <button onClick={() => onEdit(goal)}><Icon name="edit" size={17} />Edit</button>
            <button onClick={() => onDelete(goal._id)}><Icon name="trash" size={17} />Delete</button>
          </div>
        </article>
      )) : (
        <div className="empty-state">
          <Icon name="chartPie" size={34} />
          <h3>No goals yet</h3>
          <p>Set a target for workouts, calories, protein, training volume, or body weight — it tracks itself as you log.</p>
          <button className="primary-btn" onClick={onAdd}><Icon name="plus" size={18} />Create a goal</button>
        </div>
      )}
    </div>
  );
}

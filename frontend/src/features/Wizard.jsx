// ============================================================================
// Author: Abdullah — created this file. Shared chrome for the step-by-step,
// full-screen creation flows (routine / workout / meal) — one focused screen
// per step instead of one long scrollable form, with a back button and a
// step progress bar at the top of every screen.
// ============================================================================

import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';

export function WizardHeader({ title, subtitle, step, totalSteps, onBack }) {
  const percent = totalSteps > 1 ? Math.round(((step + 1) / totalSteps) * 100) : 100;
  return (
    <div className="wizard-header">
      <div className="wizard-header-row">
        <button type="button" className="wizard-back" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} />
        </button>
        <div className="wizard-heading">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="wizard-progress">
        <div className="meter"><i className="lime" style={{ width: `${percent}%` }} /></div>
        <small>Step {step + 1} of {totalSteps}</small>
      </div>
    </div>
  );
}

// A curated starting point, not a database — tapping a chip just fills the
// name field, and typing a different one works exactly the same as before.
export const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-up', 'Lat Pulldown', 'Bicep Curl', 'Tricep Pushdown', 'Leg Press',
  'Lunges', 'Plank', 'Running', 'Cycling', 'Rowing', 'Jump Rope', 'Stretching',
];

// Shared "add one exercise" mini-form for the Routine and Workout wizards'
// exercises step. `fields` describes the numeric inputs each collects
// (routines: target sets/reps/weight/rest; logged workouts: actual
// sets/reps/weight); `notesField`, if given, is a full-width text field
// rendered below them (logged workouts have a Notes field, routines don't).
export function ExerciseQuickAdd({ fields, notesField, onAdd }) {
  const blankValues = () => ({
    ...Object.fromEntries(fields.map((field) => [field.key, field.default ?? ''])),
    ...(notesField ? { [notesField.key]: notesField.default ?? '' } : {}),
  });
  const [name, setName] = useState('');
  const [values, setValues] = useState(blankValues);

  function add() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), ...values });
    setName('');
    setValues(blankValues());
  }

  return (
    <div className="exercise-quick-add">
      <div className="exercise-chip-row">
        {COMMON_EXERCISES.map((label) => (
          <button
            type="button"
            key={label}
            className={`chip ${name === label ? 'selected' : ''}`}
            onClick={() => setName(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className="exercise-quick-add-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Or type an exercise name"
      />
      <div className="form-row">
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              min={field.min ?? 0}
              max={field.max}
              step={field.step ?? '1'}
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      {notesField && (
        <label>
          {notesField.label}
          <input
            value={values[notesField.key]}
            onChange={(event) => setValues((current) => ({ ...current, [notesField.key]: event.target.value }))}
          />
        </label>
      )}
      <button type="button" className="primary-btn add-exercise-btn" onClick={add}>
        <Icon name="plus" size={18} />Add exercise
      </button>
    </div>
  );
}

// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker frontend by Munawwar).
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { num, exerciseVolume, setCounts, formatDuration } from '../lib/calc.js';
import { WizardHeader, ExerciseQuickAdd } from './Wizard.jsx';

// The routine/session half of the fix: before this there was no way to save a
// reusable workout, start it, or tick off exercises as you did them — a
// "workout" could only be logged after the fact, one exercise at a time.

const ROUTINE_EXERCISE_FIELDS = [
  { key: 'targetSets', label: 'Sets', default: 3, min: 1, max: 50 },
  { key: 'targetReps', label: 'Reps', default: 10, min: 0 },
  { key: 'targetWeight', label: 'Weight kg', default: 0, min: 0, step: 'any' },
  { key: 'restSeconds', label: 'Rest s', default: 90, min: 0, max: 3600 },
];

// --- Routine builder ---------------------------------------------------------
// A 3-screen wizard instead of one long form: name & details, then add
// exercises one at a time (each appears in the list immediately), then
// review before saving. Editing an existing routine goes through the same
// flow, pre-filled.

export function RoutineWizard({ initial, onCancel, onSubmit }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || 'strength');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [exercises, setExercises] = useState(() => (
    initial?.exercises?.length
      ? initial.exercises.map((exercise) => ({ ...exercise, key: exercise._id || Math.random().toString(36).slice(2) }))
      : []
  ));

  const plannedVolume = useMemo(() => exercises.reduce((sum, exercise) => (
    sum + num(exercise.targetSets) * num(exercise.targetReps) * num(exercise.targetWeight)
  ), 0), [exercises]);

  function move(index, delta) {
    setExercises((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

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
      targetSets: num(exercise.targetSets),
      targetReps: num(exercise.targetReps),
      targetWeight: num(exercise.targetWeight),
      restSeconds: num(exercise.restSeconds),
      order: index,
    }));
    onSubmit({
      name,
      description,
      category,
      exercises: cleaned,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  }

  const subtitles = ['Name it and set the basics', "Add each exercise you'll do", 'Review before saving'];

  return (
    <section className="panel-view wizard">
      <WizardHeader
        title={initial?._id ? 'Edit routine' : 'New routine'}
        subtitle={subtitles[step]}
        step={step}
        totalSteps={3}
        onBack={back}
      />

      {step === 0 && (
        <div className="wizard-body">
          <label className="wizard-name-label">
            Routine name
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required placeholder="Push Day A" />
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
          <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></label>

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
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === exercises.length - 1} aria-label="Move down">↓</button>
                    <button type="button" onClick={() => removeExercise(exercise.key)} aria-label="Remove exercise"><Icon name="x" size={15} /></button>
                  </div>
                </div>
                <p className="exercise-row-meta">
                  {exercise.targetSets} × {exercise.targetReps}
                  {num(exercise.targetWeight) ? ` @ ${exercise.targetWeight}kg` : ''} · {exercise.restSeconds}s rest
                </p>
              </div>
            ))}
            {!exercises.length && <p className="food-hint">No exercises added yet — add your first one below.</p>}
          </div>

          <ExerciseQuickAdd fields={ROUTINE_EXERCISE_FIELDS} onAdd={addExercise} />

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
            {description && <p>{description}</p>}
            <ul className="routine-exercises">
              {exercises.map((exercise) => (
                <li key={exercise.key}>
                  <span>{exercise.name}</span>
                  <small>{exercise.targetSets} × {exercise.targetReps}{num(exercise.targetWeight) ? ` @ ${exercise.targetWeight}kg` : ''}</small>
                </li>
              ))}
            </ul>
            <div className="meal-totals">
              <strong>{Math.round(plannedVolume).toLocaleString()} kg</strong>
              <span>planned volume</span>
            </div>
          </div>

          <div className="wizard-footer">
            <button className="primary-btn wizard-next" type="button" onClick={submit}>
              <Icon name="save" size={18} />Save routine
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// --- Routine list ----------------------------------------------------------

export function RoutinesView({ routines, activeWorkout, onStart, onEdit, onDelete, onAdd, onResume }) {
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

      <div className="record-grid routine-grid">
        {routines.length ? routines.map((routine) => {
          const volume = routine.exercises.reduce((sum, ex) => (
            sum + num(ex.targetSets) * num(ex.targetReps) * num(ex.targetWeight)
          ), 0);
          return (
            <article className="record-card glass routine-card" key={routine._id}>
              <div className="record-heading">
                <span className="pill">{routine.category}</span>
                {routine.timesPerformed > 0 && <time>{routine.timesPerformed}x done</time>}
              </div>
              <h3>{routine.name}</h3>
              {routine.description && <p className="routine-desc">{routine.description}</p>}
              <ul className="routine-exercises">
                {routine.exercises.slice(0, 4).map((exercise) => (
                  <li key={exercise._id || exercise.name}>
                    <span>{exercise.name}</span>
                    <small>{exercise.targetSets} x {exercise.targetReps}{exercise.targetWeight ? ` @ ${exercise.targetWeight}kg` : ''}</small>
                  </li>
                ))}
                {routine.exercises.length > 4 && <li className="more">+{routine.exercises.length - 4} more</li>}
              </ul>
              <div className="routine-meta">
                <span><Icon name="dumbbell" size={15} />{routine.exercises.length} exercises</span>
                <span><Icon name="chartPie" size={15} />{Math.round(volume).toLocaleString()} kg</span>
              </div>
              <div className="card-actions">
                <button
                  className="start-btn"
                  onClick={() => onStart(routine)}
                  disabled={Boolean(activeWorkout)}
                  title={activeWorkout ? 'Finish your current workout first' : 'Start this routine'}
                >
                  <Icon name="play" size={16} />Start
                </button>
                <button onClick={() => onEdit(routine)}><Icon name="edit" size={17} />Edit</button>
                <button onClick={() => onDelete(routine._id)}><Icon name="trash" size={17} />Archive</button>
              </div>
            </article>
          );
        }) : (
          <div className="empty-state">
            <Icon name="list" size={34} />
            <h3>No routines yet</h3>
            <p>Build a reusable routine, then start it to track each set as you go.</p>
            <button className="primary-btn" onClick={onAdd}><Icon name="plus" size={18} />Create routine</button>
          </div>
        )}
      </div>
    </>
  );
}

// --- Live session ----------------------------------------------------------

// Counts up from the session's start so the elapsed time is derived from the
// server timestamp rather than from however long this component has been
// mounted (which would reset on refresh).
function useElapsed(startedAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!startedAt) return 0;
  return Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
}

// Rest countdown started when a set is ticked off.
function RestTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    const timer = setInterval(() => {
      setLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          onDone?.();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  return (
    <div className="rest-timer">
      <Icon name="timer" size={18} />
      <span>Rest {formatDuration(left)}</span>
      <button type="button" onClick={onDone}>Skip</button>
    </div>
  );
}

export function SessionView({ workout, onLogSet, onAddSet, onComplete, onAbandon, onBack }) {
  const [resting, setResting] = useState(null);
  const elapsed = useElapsed(workout.startedAt);
  const counts = setCounts(workout);
  const percent = counts.planned ? Math.round((counts.completed / counts.planned) * 100) : 0;
  const volume = (workout.exercises || []).reduce((sum, ex) => sum + exerciseVolume(ex), 0);

  return (
    <section className="panel-view session-view">
      <div className="section-title">
        <h2>{workout.name}</h2>
        <button className="link-btn compact" onClick={onBack}>Back</button>
      </div>

      <section className="glass session-header">
        <div className="session-stat"><small>Elapsed</small><strong>{formatDuration(elapsed)}</strong></div>
        <div className="session-stat"><small>Sets</small><strong>{counts.completed}/{counts.planned}</strong></div>
        <div className="session-stat"><small>Volume</small><strong>{Math.round(volume).toLocaleString()} kg</strong></div>
        <div className="meter session-meter"><i className="lime" style={{ width: `${percent}%` }} /></div>
      </section>

      {resting && <RestTimer seconds={resting} onDone={() => setResting(null)} />}

      <div className="session-exercises">
        {(workout.exercises || []).map((exercise) => {
          const done = (exercise.setLog || []).filter((set) => set.completed).length;
          const total = (exercise.setLog || []).length;
          return (
            <article className={`glass session-exercise ${done === total && total ? 'done' : ''}`} key={exercise._id}>
              <header>
                <h3>{exercise.name}</h3>
                <span className="pill">{done}/{total} sets</span>
              </header>
              {exercise.notes && <p className="exercise-note">{exercise.notes}</p>}

              <div className="set-list">
                <div className="set-head"><span>Set</span><span>Reps</span><span>kg</span><span>Done</span></div>
                {(exercise.setLog || []).map((set) => (
                  <div className={`set-row ${set.completed ? 'completed' : ''}`} key={set._id}>
                    <span className="set-number">{set.setNumber}</span>
                    <input
                      type="number" min="0" value={set.reps}
                      onChange={(e) => onLogSet(exercise._id, set._id, { reps: num(e.target.value) })}
                      aria-label={`Reps for set ${set.setNumber}`}
                    />
                    <input
                      type="number" min="0" step="any" value={set.weight}
                      onChange={(e) => onLogSet(exercise._id, set._id, { weight: num(e.target.value) })}
                      aria-label={`Weight for set ${set.setNumber}`}
                    />
                    <button
                      type="button"
                      className={`set-tick ${set.completed ? 'on' : ''}`}
                      onClick={() => {
                        const next = !set.completed;
                        onLogSet(exercise._id, set._id, { completed: next });
                        // Start the prescribed rest only when ticking a set on.
                        if (next && exercise.restSeconds) setResting(exercise.restSeconds);
                      }}
                      aria-label={set.completed ? `Mark set ${set.setNumber} incomplete` : `Mark set ${set.setNumber} complete`}
                    >
                      <Icon name="check" size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="link-btn compact" onClick={() => onAddSet(exercise._id)}>
                <Icon name="plus" size={15} /> Add set
              </button>
            </article>
          );
        })}
      </div>

      <div className="session-actions">
        <button className="secondary-btn" onClick={onAbandon}><Icon name="x" size={18} />Abandon</button>
        <button className="primary-btn" onClick={onComplete}><Icon name="stop" size={18} />Finish workout</button>
      </div>
    </section>
  );
}

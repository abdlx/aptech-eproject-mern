// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker frontend by Munawwar). Later extended so a user can create,
// edit, and delete their own food-table entries (POST/PUT/DELETE /api/foods)
// directly from the search dropdown, not just search the shipped table.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { request } from '../lib/api.js';
import { num, resolveEntry, sumMacros, UNIT_OPTIONS } from '../lib/calc.js';

// Replaces the old single-food form, which had no food list, ignored the
// quantity it collected, and made the user type calories from memory.
//
// A row is either:
//   - linked   — bound to a food-table entry; macros scale from its per-100
//                values as the quantity changes, and the fields are read-only
//   - custom   — free text with typed macros, for anything not in the table

const emptyRow = () => ({
  key: Math.random().toString(36).slice(2),
  food: null,          // resolved Food document when linked
  name: '',
  quantity: '',
  unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
});

const emptyFoodDraft = (name = '') => ({
  name,
  brand: '',
  category: 'other',
  basisUnit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  gramsPerServing: '',
  servingLabel: '',
});

const FOOD_CATEGORIES = ['protein', 'carb', 'vegetable', 'fruit', 'dairy', 'fat', 'drink', 'snack', 'meal', 'other'];

// Create/edit a row in the user's own food table (POST/PUT /api/foods — the
// server only lets an owner edit or delete their own entries; the shipped
// global table is read-only). Distinct from "add manually" below, which just
// types one-off macros onto this single meal instead of saving a reusable food.
function FoodEditForm({ initial, initialName, token, onCancel, onSaved }) {
  const [form, setForm] = useState(() => (initial ? {
    name: initial.name,
    brand: initial.brand || '',
    category: initial.category || 'other',
    basisUnit: initial.basisUnit || 'g',
    calories: initial.per100.calories,
    protein: initial.per100.protein || '',
    carbs: initial.per100.carbs || '',
    fats: initial.per100.fats || '',
    gramsPerServing: initial.gramsPerServing || '',
    servingLabel: initial.servingLabel || '',
  } : emptyFoodDraft(initialName)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      basisUnit: form.basisUnit,
      per100: {
        calories: num(form.calories),
        protein: num(form.protein),
        carbs: num(form.carbs),
        fats: num(form.fats),
      },
      ...(num(form.gramsPerServing) ? { gramsPerServing: num(form.gramsPerServing), servingLabel: form.servingLabel } : {}),
    };
    try {
      const saved = initial
        ? await request(`/foods/${initial._id}`, { method: 'PUT', body: payload, token })
        : await request('/foods', { method: 'POST', body: payload, token });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="food-edit-form" onSubmit={submit}>
      <h4>{initial ? 'Edit your food' : 'Create a food'}</h4>
      <div className="form-row">
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Brand<input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Basis
          <select value={form.basisUnit} onChange={(e) => setForm({ ...form, basisUnit: e.target.value })}>
            <option value="g">per 100 g</option>
            <option value="ml">per 100 ml</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Calories<input type="number" min="0" step="any" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} required /></label>
        <label>Protein<input type="number" min="0" step="any" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></label>
        <label>Carbs<input type="number" min="0" step="any" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></label>
        <label>Fats<input type="number" min="0" step="any" value={form.fats} onChange={(e) => setForm({ ...form, fats: e.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Grams/serving (optional)<input type="number" min="0" step="any" value={form.gramsPerServing} onChange={(e) => setForm({ ...form, gramsPerServing: e.target.value })} /></label>
        <label>Serving label<input value={form.servingLabel} onChange={(e) => setForm({ ...form, servingLabel: e.target.value })} placeholder="1 scoop" /></label>
      </div>
      {error && <p className="food-row-warn">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}><Icon name="x" size={16} />Cancel</button>
        <button type="submit" className="primary-btn" disabled={saving}><Icon name="save" size={16} />{saving ? 'Saving...' : 'Save food'}</button>
      </div>
    </form>
  );
}

// Type-ahead against /api/foods. Debounced so it does not fire per keystroke.
// Also the entry point for managing the user's own food-table entries: search
// results the user owns get inline edit/delete, and the dropdown offers to
// create a new one from the current query.
function FoodSearch({ token, currentUserId, onPick, onCustom }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingFood, setEditingFood] = useState(null); // null | 'new' | a Food doc
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await request(`/foods?search=${encodeURIComponent(query)}&limit=12`, { token });
        if (!cancelled) setResults(data.items || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, token]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onDocClick(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
        setEditingFood(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function deleteOwnFood(food, event) {
    event.stopPropagation();
    if (!window.confirm(`Remove "${food.name}" from your food table?`)) return;
    try {
      await request(`/foods/${food._id}`, { method: 'DELETE', token });
      setResults((current) => current.filter((item) => item._id !== food._id));
    } catch {
      // Leave it in the results; the user can retry the delete.
    }
  }

  if (editingFood) {
    return (
      <div className="food-search" ref={boxRef}>
        <FoodEditForm
          initial={editingFood === 'new' ? null : editingFood}
          initialName={query.trim()}
          token={token}
          onCancel={() => setEditingFood(null)}
          onSaved={(saved) => {
            setEditingFood(null);
            setOpen(false);
            setQuery('');
            onPick(saved);
          }}
        />
      </div>
    );
  }

  return (
    <div className="food-search" ref={boxRef}>
      <label>
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search foods — e.g. chicken, oats, banana"
        />
      </label>
      {open && (query.trim() || results.length) ? (
        <div className="food-results">
          {loading && <p className="food-hint">Searching…</p>}
          {!loading && !results.length && <p className="food-hint">No match in the food table.</p>}
          {results.map((food) => {
            const owned = currentUserId && String(food.owner) === String(currentUserId);
            return (
              <div className="food-result-row" key={food._id}>
                <button
                  type="button"
                  className="food-result"
                  onClick={() => { onPick(food); setQuery(''); setResults([]); setOpen(false); }}
                >
                  <span className="food-result-name">
                    {food.name}{food.brand ? <small> · {food.brand}</small> : null}
                  </span>
                  <span className="food-result-macros">
                    {Math.round(food.per100.calories)} kcal
                    <small> /100{food.basisUnit}</small>
                  </span>
                </button>
                {owned && (
                  <span className="food-result-owner-actions">
                    <button type="button" aria-label={`Edit ${food.name}`} onClick={(event) => { event.stopPropagation(); setEditingFood(food); }}><Icon name="edit" size={14} /></button>
                    <button type="button" aria-label={`Delete ${food.name}`} onClick={(event) => deleteOwnFood(food, event)}><Icon name="trash" size={14} /></button>
                  </span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="food-result food-result-custom"
            onClick={() => { onCustom(query.trim()); setQuery(''); setOpen(false); }}
          >
            <Icon name="plus" size={16} />
            <span>Add &ldquo;{query.trim() || 'custom food'}&rdquo; to this meal only</span>
          </button>
          <button
            type="button"
            className="food-result food-result-custom"
            onClick={() => setEditingFood('new')}
          >
            <Icon name="list" size={16} />
            <span>Create &ldquo;{query.trim() || 'a food'}&rdquo; in my food table</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

// One logged food. Linked rows show computed macros; custom rows collect them.
function FoodRow({ row, onChange, onRemove }) {
  const linked = Boolean(row.food);
  const resolved = useMemo(() => resolveEntry(row, row.food), [row]);

  // A label whose stated calories disagree with its own macros by more than
  // 15% is usually a typo — surface it rather than showing two silent numbers.
  const mismatch = !linked
    && num(row.calories) > 0
    && resolved.caloriesFromMacros > 0
    && Math.abs(num(row.calories) - resolved.caloriesFromMacros) / num(row.calories) > 0.15;

  const unitOptions = linked && row.food.gramsPerServing
    ? UNIT_OPTIONS
    : UNIT_OPTIONS.filter((unit) => unit !== 'serving');

  return (
    <div className={`food-row ${linked ? 'linked' : 'custom'}`}>
      <div className="food-row-head">
        {linked ? (
          <span className="food-row-name">
            <Icon name="check" size={15} />
            {row.food.name}
            {row.food.brand ? <small> · {row.food.brand}</small> : null}
          </span>
        ) : (
          <input
            className="food-row-name-input"
            value={row.name}
            onChange={(event) => onChange({ ...row, name: event.target.value })}
            placeholder="Food name"
            required
          />
        )}
        <button type="button" className="food-row-remove" onClick={onRemove} aria-label="Remove food">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="food-row-qty">
        <label>
          Qty
          <input
            type="number" min="0" step="any" required
            value={row.quantity}
            onChange={(event) => onChange({ ...row, quantity: event.target.value })}
          />
        </label>
        <label>
          Unit
          <select value={row.unit} onChange={(event) => onChange({ ...row, unit: event.target.value })}>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit === 'serving' && row.food?.servingLabel ? row.food.servingLabel : unit}
              </option>
            ))}
          </select>
        </label>
        {linked && <span className="food-row-grams">= {resolved.grams} {row.food.basisUnit}</span>}
      </div>

      {linked ? (
        // Computed from the food table — shown, not editable.
        <div className="food-row-computed">
          <span className="kcal">{resolved.calories} kcal</span>
          <span>P {resolved.protein}g</span>
          <span>C {resolved.carbs}g</span>
          <span>F {resolved.fats}g</span>
        </div>
      ) : (
        <>
          <div className="form-row">
            <label>Calories<input type="number" min="0" step="any" value={row.calories} onChange={(e) => onChange({ ...row, calories: e.target.value })} /></label>
            <label>Protein<input type="number" min="0" step="any" value={row.protein} onChange={(e) => onChange({ ...row, protein: e.target.value })} /></label>
            <label>Carbs<input type="number" min="0" step="any" value={row.carbs} onChange={(e) => onChange({ ...row, carbs: e.target.value })} /></label>
            <label>Fats<input type="number" min="0" step="any" value={row.fats} onChange={(e) => onChange({ ...row, fats: e.target.value })} /></label>
          </div>
          {mismatch && (
            <p className="food-row-warn">
              Macros work out to {resolved.caloriesFromMacros} kcal, not {num(row.calories)}. Check the numbers.
            </p>
          )}
          {!num(row.calories) && resolved.caloriesFromMacros > 0 && (
            <p className="food-hint">Calories will be derived from macros: {resolved.caloriesFromMacros} kcal.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function MealForm({ initial, token, currentUserId, onCancel, onSubmit }) {
  const [mealType, setMealType] = useState(initial?.mealType || 'breakfast');
  const [rows, setRows] = useState(() => {
    if (!initial?.foods?.length) return [emptyRow()];
    // Editing: rehydrate rows. A row that referenced the food table keeps its
    // link so quantity changes still rescale.
    return initial.foods.map((entry) => ({
      key: Math.random().toString(36).slice(2),
      food: entry.foodDoc || null,
      foodId: entry.food || null,
      name: entry.name || '',
      quantity: entry.quantity ?? '',
      unit: entry.unit || 'g',
      calories: entry.calories ?? '',
      protein: entry.protein ?? '',
      carbs: entry.carbs ?? '',
      fats: entry.fats ?? '',
    }));
  });

  // Rehydrate food documents for linked rows when editing, so their macros
  // rescale on quantity change instead of silently going stale.
  useEffect(() => {
    const needing = rows.filter((row) => row.foodId && !row.food);
    if (!needing.length) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(needing.map(async (row) => {
        try {
          return [row.key, await request(`/foods/${row.foodId}`, { token })];
        } catch {
          return [row.key, null];
        }
      }));
      if (cancelled) return;
      const byKey = new Map(fetched);
      setRows((current) => current.map((row) => (
        byKey.has(row.key) && byKey.get(row.key) ? { ...row, food: byKey.get(row.key) } : row
      )));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => sumMacros(rows.map((row) => resolveEntry(row, row.food))),
    [rows],
  );

  function updateRow(key, next) {
    setRows((current) => current.map((row) => (row.key === key ? next : row)));
  }

  function addLinked(food) {
    setRows((current) => {
      const rest = current.filter((row) => row.food || row.name || row.quantity);
      return [...rest, {
        ...emptyRow(),
        food,
        name: food.name,
        // Default to one serving when the food defines one, else 100 base units.
        quantity: food.gramsPerServing ? 1 : 100,
        unit: food.gramsPerServing ? 'serving' : food.basisUnit || 'g',
      }];
    });
  }

  function addCustom(name) {
    setRows((current) => [...current, { ...emptyRow(), name }]);
  }

  function submit(event) {
    event.preventDefault();
    const foods = rows
      .filter((row) => (row.food || row.name) && num(row.quantity) > 0)
      .map((row) => (row.food
        // Linked: send the reference and portion only. The server rescales from
        // the food table, so the client cannot post inconsistent macros.
        ? { food: row.food._id, name: row.food.name, quantity: num(row.quantity), unit: row.unit }
        : {
          name: row.name,
          quantity: num(row.quantity),
          unit: row.unit,
          calories: num(row.calories),
          protein: num(row.protein),
          carbs: num(row.carbs),
          fats: num(row.fats),
        }));

    if (!foods.length) return;
    onSubmit({ mealType, foods });
  }

  return (
    <form className="glass data-form meal-form" onSubmit={submit}>
      <h3>{initial?._id ? 'Edit meal' : 'Log meal'}</h3>

      <label>
        Meal type
        <select value={mealType} onChange={(event) => setMealType(event.target.value)}>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </label>

      <FoodSearch token={token} currentUserId={currentUserId} onPick={addLinked} onCustom={addCustom} />

      <div className="food-rows">
        {rows.map((row) => (
          <FoodRow
            key={row.key}
            row={row}
            onChange={(next) => updateRow(row.key, next)}
            onRemove={() => setRows((current) => (
              current.length > 1 ? current.filter((item) => item.key !== row.key) : [emptyRow()]
            ))}
          />
        ))}
      </div>

      <button type="button" className="link-btn compact add-row" onClick={() => addCustom('')}>
        <Icon name="plus" size={16} /> Add another food
      </button>

      <div className="meal-totals">
        <strong>{totals.calories} kcal</strong>
        <span>P {totals.protein}g</span>
        <span>C {totals.carbs}g</span>
        <span>F {totals.fats}g</span>
      </div>

      <div className="form-actions">
        <button className="secondary-btn" type="button" onClick={onCancel}><Icon name="x" size={18} />Cancel</button>
        <button className="primary-btn" type="submit"><Icon name="save" size={18} />Save meal</button>
      </div>
    </form>
  );
}

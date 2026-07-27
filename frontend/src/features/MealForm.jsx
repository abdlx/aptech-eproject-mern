// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker frontend by Munawwar).
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

// Type-ahead against /api/foods. Debounced so it does not fire per keystroke.
function FoodSearch({ token, onPick, onCustom }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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
          {results.map((food) => (
            <button
              type="button"
              key={food._id}
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
          ))}
          <button
            type="button"
            className="food-result food-result-custom"
            onClick={() => { onCustom(query.trim()); setQuery(''); setOpen(false); }}
          >
            <Icon name="plus" size={16} />
            <span>Add &ldquo;{query.trim() || 'custom food'}&rdquo; manually</span>
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

export default function MealForm({ initial, token, onCancel, onSubmit }) {
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

      <FoodSearch token={token} onPick={addLinked} onCustom={addCustom} />

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

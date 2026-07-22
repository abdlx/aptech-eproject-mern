// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

// Parses page/limit query params into safe, bounded values and a skip offset.
// Defaults: page 1, limit 20. Limit is capped at 100 to protect the server.
export function paginate(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Builds a metadata object describing the current page of a result set.
export function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}

export default { paginate, buildMeta };

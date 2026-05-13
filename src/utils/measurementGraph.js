// Vertex graph derived from measurement segments.
// Used to find closed polygons (triangles, quads) so we can show wall areas
// when the user chains measurement lines that meet at shared endpoints.

const DEFAULT_EPSILON = 0.02; // 2 cm — endpoints within this distance are treated as one vertex

function dist3(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function buildGraph(measurements, epsilon = DEFAULT_EPSILON) {
  const vertices = []; // [[x,y,z], ...]
  const edges = [];    // [{ a, b, measurementId }]

  function findOrAdd(pos) {
    for (let i = 0; i < vertices.length; i++) {
      if (dist3(vertices[i], pos) < epsilon) return i;
    }
    vertices.push([pos[0], pos[1], pos[2]]);
    return vertices.length - 1;
  }

  for (const m of measurements) {
    const a = findOrAdd(m.start);
    const b = findOrAdd(m.end);
    if (a === b) continue;
    edges.push({ a, b, measurementId: m.id });
  }

  const adjacency = vertices.map(() => new Set());
  for (const e of edges) {
    adjacency[e.a].add(e.b);
    adjacency[e.b].add(e.a);
  }

  return { vertices, edges, adjacency };
}

// Canonical form so the same cycle traversed differently dedups to one entry.
function canonical(cycle) {
  const n = cycle.length;
  let minIdx = 0;
  for (let i = 1; i < n; i++) if (cycle[i] < cycle[minIdx]) minIdx = i;
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  const rev = [rotated[0], ...rotated.slice(1).reverse()];
  return rotated[1] < rev[1] ? rotated.join(',') : rev.join(',');
}

// Enumerate simple cycles of length minLen..maxLen. Brute-force DFS — fine for
// the handful of measurements a user actually draws.
export function findCycles(graph, minLen = 3, maxLen = 4) {
  const seen = new Set();
  const result = [];
  const { adjacency } = graph;

  function dfs(start, current, path) {
    if (path.length > maxLen) return;
    for (const next of adjacency[current]) {
      if (next === start && path.length >= minLen) {
        const key = canonical(path);
        if (!seen.has(key)) {
          seen.add(key);
          result.push([...path]);
        }
      } else if (path.length < maxLen && next > start && !path.includes(next)) {
        // next > start to avoid finding the same cycle from every rotation
        path.push(next);
        dfs(start, next, path);
        path.pop();
      }
    }
  }

  for (let v = 0; v < graph.vertices.length; v++) {
    dfs(v, v, [v]);
  }
  return result;
}

// Area of a polygon in 3D via fan triangulation from vertex 0.
export function polygonArea(positions) {
  if (positions.length < 3) return 0;
  let area = 0;
  const p0 = positions[0];
  for (let i = 1; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  return area;
}

export function centroid(positions) {
  const c = [0, 0, 0];
  for (const p of positions) {
    c[0] += p[0]; c[1] += p[1]; c[2] += p[2];
  }
  const n = positions.length;
  return [c[0] / n, c[1] / n, c[2] / n];
}

// Convenience: derive polygons (with positions + area + centroid) from measurements.
export function derivePolygons(measurements, epsilon = DEFAULT_EPSILON) {
  if (!measurements || measurements.length < 3) return [];
  const graph = buildGraph(measurements, epsilon);
  const cycles = findCycles(graph, 3, 4);
  return cycles.map((cycle, idx) => {
    const positions = cycle.map((vId) => graph.vertices[vId]);
    return {
      id: `poly-${idx}-${cycle.join('-')}`,
      vertices: positions,
      area: polygonArea(positions),
      centroid: centroid(positions),
    };
  });
}

// Flat list of unique vertex positions across all measurements — used by the
// snap pass so a new line can lock onto an existing endpoint.
export function uniqueEndpoints(measurements, epsilon = DEFAULT_EPSILON) {
  const out = [];
  function has(p) {
    for (const q of out) if (dist3(p, q) < epsilon) return true;
    return false;
  }
  for (const m of measurements) {
    if (!has(m.start)) out.push([...m.start]);
    if (!has(m.end)) out.push([...m.end]);
  }
  return out;
}

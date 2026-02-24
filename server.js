import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'index.json'), 'utf8'));
const schoolMap = new Map(rawData.schools.map((s) => [s.id, s]));
const searchCache = new Map();
const snapshotCache = new Map();

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function scoreMatch(query, text) {
  if (!query) return 1;
  const q = normalize(query);
  const t = normalize(text);
  if (!q || !t) return 0;
  if (t.startsWith(q)) return 120 - (t.length - q.length);
  if (t.includes(q)) return 90 - (t.indexOf(q));
  const dist = editDistance(q, t.slice(0, Math.max(q.length + 2, q.length)));
  return dist <= 2 ? 65 - dist * 10 : 0;
}

function withCache(cache, key, ttlMs, calc) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.value;
  const value = calc();
  cache.set(key, { ts: Date.now(), value });
  return value;
}

app.get('/api/meta', (req, res) => {
  res.json({ schemaVersion: rawData.schemaVersion, updatedAt: rawData.updatedAt, sourcePriority: ['Official Program Page', 'Official Admissions Page', 'Published Ranking Dataset', 'Permitted Structured Scraper'] });
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '');
  const type = String(req.query.type || 'all');
  const schoolId = String(req.query.schoolId || '');
  const key = `${type}|${schoolId}|${q}`;

  const result = withCache(searchCache, key, 1000 * 60 * 10, () => {
    const schools = (type === 'all' || type === 'schools')
      ? rawData.schools
        .map((school) => ({ ...school, score: scoreMatch(q, `${school.name} ${school.descriptor} ${school.location}`) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
      : [];

    const programs = (type === 'all' || type === 'programs')
      ? rawData.programs
        .filter((p) => !schoolId || p.schoolId === schoolId)
        .map((program) => {
          const school = schoolMap.get(program.schoolId);
          const blob = `${program.name} ${program.credential} ${program.faculty} ${program.specializations.join(' ')} ${school?.name || ''}`;
          return { ...program, schoolName: school?.name, score: scoreMatch(q, blob) };
        })
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      : [];

    const normalizedQuery = normalize(q);
    let didYouMean = null;
    if (normalizedQuery && !schools.length && !programs.length) {
      const candidates = [...rawData.schools.map((s) => s.name), ...rawData.programs.map((p) => p.name)];
      const closest = candidates
        .map((name) => ({ name, d: editDistance(normalizedQuery, normalize(name)) }))
        .sort((a, b) => a.d - b.d)[0];
      if (closest && closest.d <= 4) didYouMean = closest.name;
    }

    return { schools, programs, didYouMean };
  });

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
  res.json(result);
});

app.get('/api/program-snapshot', (req, res) => {
  const programId = String(req.query.programId || '');
  const result = withCache(snapshotCache, programId, 1000 * 60 * 30, () => {
    const program = rawData.programs.find((p) => p.id === programId);
    if (!program) return null;
    return { program, school: schoolMap.get(program.schoolId) };
  });
  if (!result) return res.status(404).json({ message: 'Program not found' });
  res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
  res.json(result);
});

app.get('/api/courses', (req, res) => {
  const q = String(req.query.q || '');
  const items = rawData.gradeCourses
    .map((c) => ({ ...c, score: scoreMatch(q, `${c.code} ${c.name}`) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
  res.json({ items });
});

app.listen(PORT, () => {
  console.log(`ResumeForge app listening on http://localhost:${PORT}`);
});

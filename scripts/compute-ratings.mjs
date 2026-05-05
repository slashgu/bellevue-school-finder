/**
 * Fetches WA statewide OSPI 2018-19 assessment data, computes per-school
 * ELA+Math averages, ranks all schools statewide, and maps to a 1-10
 * decile score matching GreatSchools' Test Score Rating methodology.
 *
 * Output: data/ospi-ratings.json
 */

import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const API = "https://data.wa.gov/resource/5y3z-mgxd.json";
const BATCH = 5000;
const TOTAL = 23700;

async function fetchAll() {
  const records = [];
  for (let offset = 0; offset < TOTAL; offset += BATCH) {
    const url =
      `${API}?$where=studentgroup%3D'All%20Students'%20AND%20organizationlevel%3D'School'%20AND%20(testsubject%3D'ELA'%20OR%20testsubject%3D'Math')` +
      `&$select=schoolname,districtname,testsubject,percentmetstandard` +
      `&$limit=${BATCH}&$offset=${offset}`;
    process.stdout.write(`Fetching offset ${offset}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
    const batch = await res.json();
    records.push(...batch);
    console.log(` got ${batch.length}`);
    if (batch.length < BATCH) break;
  }
  return records;
}

function parsePercent(val) {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function computeSchoolAverages(records) {
  // schoolKey → { ela: number[], math: number[] }
  const map = new Map();

  for (const r of records) {
    const pct = parsePercent(r.percentmetstandard);
    if (pct === null) continue;

    const key = `${r.districtname}|||${r.schoolname}`;
    if (!map.has(key)) map.set(key, { schoolname: r.schoolname, districtname: r.districtname, ela: [], math: [] });

    const entry = map.get(key);
    if (r.testsubject === "ELA") entry.ela.push(pct);
    else if (r.testsubject === "Math") entry.math.push(pct);
  }

  const schools = [];
  for (const [, entry] of map) {
    const elaAvg = entry.ela.length ? entry.ela.reduce((a, b) => a + b, 0) / entry.ela.length : null;
    const mathAvg = entry.math.length ? entry.math.reduce((a, b) => a + b, 0) / entry.math.length : null;

    let overall = null;
    if (elaAvg !== null && mathAvg !== null) overall = (elaAvg + mathAvg) / 2;
    else if (elaAvg !== null) overall = elaAvg;
    else if (mathAvg !== null) overall = mathAvg;

    if (overall !== null) {
      schools.push({
        schoolname: entry.schoolname,
        districtname: entry.districtname,
        ela: elaAvg !== null ? Math.round(elaAvg) : null,
        math: mathAvg !== null ? Math.round(mathAvg) : null,
        overall,
      });
    }
  }
  return schools;
}

function assignRatings(schools) {
  // Sort by overall ascending
  schools.sort((a, b) => a.overall - b.overall);
  const n = schools.length;

  for (let i = 0; i < n; i++) {
    // Percentile rank: proportion of schools scoring <= this school
    const percentile = ((i + 1) / n) * 100;
    // Decile → 1-10 (top 10% = 10, next 10% = 9, …)
    const rating = Math.min(10, Math.ceil(percentile / 10));
    schools[i].rating = rating;
    schools[i].percentile = Math.round(percentile);
  }
  return schools;
}

function buildOutput(schools) {
  const meta = {
    _meta: {
      source: "Washington State OSPI Report Card Assessment Data 2018-19 (data.wa.gov dataset 5y3z-mgxd)",
      methodology: "Test Score Rating: average ELA+Math %MetStandard (All Students, all grades) → statewide percentile rank → 1-10 decile (matches GreatSchools Test Score Rating approach)",
      total_schools_ranked: schools.length,
      generated: new Date().toISOString(),
    },
  };

  const entries = {};
  for (const s of schools) {
    entries[s.schoolname] = {
      ela: s.ela,
      math: s.math,
      rating: s.rating,
      percentile: s.percentile,
    };
  }
  return { ...meta, ...entries };
}

async function main() {
  console.log("Fetching statewide WA assessment data…");
  const records = await fetchAll();
  console.log(`\nTotal records fetched: ${records.length}`);

  console.log("Computing per-school averages…");
  const schools = computeSchoolAverages(records);
  console.log(`Schools with valid data: ${schools.length}`);

  console.log("Assigning statewide percentile ratings…");
  assignRatings(schools);

  // Show BSD school ratings for verification
  const bsd = schools.filter((s) => s.districtname === "Bellevue School District");
  console.log("\nBellevue School District ratings:");
  bsd.sort((a, b) => b.rating - a.rating);
  for (const s of bsd) {
    console.log(`  ${s.schoolname.padEnd(40)} ELA:${String(s.ela ?? "N/A").padStart(4)}  Math:${String(s.math ?? "N/A").padStart(4)}  Rating:${s.rating}/10  (${s.percentile}th pct)`);
  }

  const output = buildOutput(schools);
  const outPath = join(ROOT, "data", "ospi-ratings.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${Object.keys(output) - 1} schools to ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });

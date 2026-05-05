/**
 * Computes GreatSchools-style 1-10 school ratings using three OSPI 2018-19 datasets:
 *
 *  Test Score Rating     — %MetStandard ELA+Math (dataset x73g-mrqp, 2023-24)
 *  Student Progress      — Median Student Growth Percentile (dataset cxts-amj6, 2023-24)
 *  College Readiness     — Graduation rate + AP enrollment (datasets 76iv-8ed4 + q9gf-prrp, 2023-24, HS only)
 *
 * Methodology (matches GreatSchools):
 *  1. For each sub-rating: compute school-level average → rank statewide → percentile → 1-10 decile
 *  2. Weight sub-ratings:
 *     - Dominant sub-rating (higher of TS or SP) gets 0.45
 *     - Other sub-rating gets 0.27
 *     - College Readiness (if available) gets 0.27
 *     - Normalize weights to sum to 1
 *  3. Overall = weighted sum of sub-ratings, rounded to nearest integer
 *
 * Output: data/ospi-ratings.json
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── helpers ───────────────────────────────────────���──────────────────────────

function parseNum(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function fetchBatched(baseUrl, total, batchSize = 5000) {
  const records = [];
  for (let offset = 0; offset < total + batchSize; offset += batchSize) {
    const url = `${baseUrl}&$limit=${batchSize}&$offset=${offset}`;
    process.stdout.write(`  offset ${offset}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const batch = await res.json();
    records.push(...batch);
    console.log(` ${batch.length}`);
    if (batch.length < batchSize) break;
  }
  return records;
}

/** Rank an array of schools by `scoreKey` ascending → assign percentile + 1-10 decile */
function assignDecile(schools, scoreKey, outputKey) {
  const valid = schools.filter((s) => s[scoreKey] != null);
  valid.sort((a, b) => a[scoreKey] - b[scoreKey]);
  const n = valid.length;
  valid.forEach((s, i) => {
    const pct = ((i + 1) / n) * 100;
    s[outputKey] = Math.min(10, Math.ceil(pct / 10));
    s[`${outputKey}Pct`] = Math.round(pct);
  });
}

function avg(arr) {
  const nums = arr.filter((x) => x != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// ── 1. Test Score Rating ─────────────────────────────────────────────────────

async function fetchTestScores() {
  console.log("\n[1/3] Fetching Test Score data (x73g-mrqp, 2023-24)…");
  const base =
    "https://data.wa.gov/resource/x73g-mrqp.json" +
    "?$where=studentgroup%3D'All%20Students'%20AND%20organizationlevel%3D'School'" +
    "%20AND%20(testsubject%3D'ELA'%20OR%20testsubject%3D'Math')" +
    "%20AND%20testadministration%3D'SBAC'" +
    "&$select=schoolname,districtname,testsubject,percent_consistent_grade_level_knowledge_and_above";
  const rows = await fetchBatched(base, 25000);

  const map = new Map();
  for (const r of rows) {
    const pct = parseNum(r.percent_consistent_grade_level_knowledge_and_above);
    if (pct === null) continue;
    const key = `${r.districtname}|||${r.schoolname}`;
    if (!map.has(key)) map.set(key, { schoolname: r.schoolname, districtname: r.districtname, ela: [], math: [] });
    const e = map.get(key);
    if (r.testsubject === "ELA") e.ela.push(pct);
    else if (r.testsubject === "Math") e.math.push(pct);
  }

  const schools = [];
  for (const [, e] of map) {
    const elaAvg = avg(e.ela);
    const mathAvg = avg(e.math);
    const overall = elaAvg != null && mathAvg != null ? (elaAvg + mathAvg) / 2
                  : elaAvg ?? mathAvg;
    if (overall != null) {
      schools.push({
        schoolname: e.schoolname,
        districtname: e.districtname,
        ela: elaAvg != null ? Math.round(elaAvg) : null,
        math: mathAvg != null ? Math.round(mathAvg) : null,
        tsScore: overall,
      });
    }
  }

  assignDecile(schools, "tsScore", "tsRating");
  console.log(`  → ${schools.length} schools with test score data`);
  return schools;
}

// ── 2. Student Progress Rating ───────────────────────────────────────────────

async function fetchStudentProgress() {
  console.log("\n[2/3] Fetching Student Growth data (cxts-amj6, 2023-24)…");
  const base =
    "https://data.wa.gov/resource/cxts-amj6.json" +
    "?$where=studentgroup%3D'All%20Students'%20AND%20organizationlevel%3D'School'" +
    "&$select=schoolname,districtname,subject,mediansgp";
  const rows = await fetchBatched(base, 13000);

  const map = new Map();
  for (const r of rows) {
    const sgp = parseNum(r.mediansgp);
    if (sgp === null) continue;
    const key = `${r.districtname}|||${r.schoolname}`;
    if (!map.has(key)) map.set(key, { schoolname: r.schoolname, districtname: r.districtname, sgps: [] });
    map.get(key).sgps.push(sgp);
  }

  const schools = [];
  for (const [, e] of map) {
    const spScore = avg(e.sgps);
    if (spScore != null) schools.push({ schoolname: e.schoolname, districtname: e.districtname, spScore });
  }

  assignDecile(schools, "spScore", "spRating");
  console.log(`  → ${schools.length} schools with growth data`);
  return schools;
}

// ── 3. College Readiness Rating (HS only) ───────────────────────────────��────

async function fetchCollegeReadiness() {
  console.log("\n[3/3] Fetching College Readiness data…");

  // 3a. Graduation rates (2023-24)
  const gradBase =
    "https://data.wa.gov/resource/76iv-8ed4.json" +
    "?$where=organizationlevel%3D'School'%20AND%20studentgroup%3D'All%20Students'" +
    "%20AND%20cohort%3D'Four%20Year'" +
    "&$select=schoolname,districtname,graduationrate";
  const gradRows = await fetchBatched(gradBase, 800);

  const gradMap = new Map();
  for (const r of gradRows) {
    const rate = parseNum(r.graduationrate);
    if (rate === null) continue;
    const key = `${r.districtname}|||${r.schoolname}`;
    if (!gradMap.has(key)) gradMap.set(key, { schoolname: r.schoolname, districtname: r.districtname, gradRates: [] });
    gradMap.get(key).gradRates.push(rate);
  }

  // 3b. AP enrollment (2023-24) — rate = apcoursenumber / denominator
  const apBase =
    "https://data.wa.gov/resource/q9gf-prrp.json" +
    "?$where=organizationlevel%3D'School'%20AND%20studentgroup%3D'All%20Students'" +
    "%20AND%20gradelevel%3D'All%20Grades'%20AND%20measure%3D'Dual%20Credit'" +
    "&$select=schoolname,districtname,apcoursenumber,ibcoursenumber,denominator";
  const apRows = await fetchBatched(apBase, 2400);

  const apMap = new Map();
  for (const r of apRows) {
    const ap = parseNum(r.apcoursenumber);
    const ib = parseNum(r.ibcoursenumber) ?? 0;
    const denom = parseNum(r.denominator);
    if (ap === null || denom === null || denom === 0) continue;
    const key = `${r.districtname}|||${r.schoolname}`;
    // Combined AP+IB rate, capped at 1
    apMap.set(key, { schoolname: r.schoolname, districtname: r.districtname, apRate: Math.min(1, (ap + ib) / denom) });
  }

  // Merge: only schools with both grad + AP data are true HS
  const schools = [];
  for (const [key, g] of gradMap) {
    const ap = apMap.get(key);
    if (!ap) continue;
    const gradRate = avg(g.gradRates);
    const apRate = ap.apRate;
    if (gradRate == null) continue;
    // Composite: equal weight grad (50%) + AP enrollment (50%)
    schools.push({
      schoolname: g.schoolname,
      districtname: g.districtname,
      crScore: (gradRate * 0.5 + apRate * 0.5) * 100, // scale to 0-100 for ranking
      gradRate: Math.round(gradRate * 100),
      apRate: Math.round(apRate * 100),
    });
  }

  assignDecile(schools, "crScore", "crRating");
  console.log(`  → ${schools.length} high schools with college readiness data`);
  return schools;
}

// ── 4. Combine & apply GreatSchools weighting ────────────────────────────────

function combineRatings(testScores, progressData, collegeReadiness) {
  // Build lookup maps by schoolname (district+name key)
  const spMap = new Map(progressData.map((s) => [`${s.districtname}|||${s.schoolname}`, s]));
  const crMap = new Map(collegeReadiness.map((s) => [`${s.districtname}|||${s.schoolname}`, s]));

  return testScores.map((s) => {
    const key = `${s.districtname}|||${s.schoolname}`;
    const sp = spMap.get(key);
    const cr = crMap.get(key);

    const ts = s.tsRating ?? null;
    const spR = sp?.spRating ?? null;
    const crR = cr?.crRating ?? null;

    let overall = null;

    if (ts !== null && spR !== null) {
      // Both TS + SP available: dominant=max, other=min, CR optional
      const dominant = Math.max(ts, spR);
      const other    = Math.min(ts, spR);
      const wCR = crR !== null ? 0.27 : 0;
      const total = 0.45 + 0.27 + wCR;
      overall = Math.round(dominant*(0.45/total) + other*(0.27/total) + (crR ?? 0)*(wCR/total));
    } else if (ts !== null && crR !== null) {
      // TS + CR only (HS without growth data): TS dominant + CR
      const total = 0.45 + 0.27;
      overall = Math.round(ts*(0.45/total) + crR*(0.27/total));
    } else if (spR !== null && crR !== null) {
      // SP + CR only: SP dominant + CR
      const total = 0.45 + 0.27;
      overall = Math.round(spR*(0.45/total) + crR*(0.27/total));
    } else if (ts !== null) {
      overall = ts;
    } else if (spR !== null) {
      overall = spR;
    }

    return {
      schoolname: s.schoolname,
      districtname: s.districtname,
      ela: s.ela,
      math: s.math,
      tsRating: ts,
      spRating: spR,
      crRating: crR,
      gradRate: cr?.gradRate ?? null,
      apRate: cr?.apRate ?? null,
      rating: overall,
      percentile: s.tsRatingPct ?? null,
    };
  });
}

// ── 5. Output ─────────────────────────────────────────────────────────────────

function buildOutput(schools) {
  const entries = {};
  for (const s of schools) {
    if (s.rating === null) continue;
    entries[s.schoolname] = {
      ela: s.ela,
      math: s.math,
      rating: s.rating,
      percentile: s.percentile,
      testScoreRating: s.tsRating,
      progressRating: s.spRating,
      collegeReadinessRating: s.crRating,
      gradRate: s.gradRate,
      apRate: s.apRate,
    };
  }
  return {
    _meta: {
      source: "OSPI 2023-24: assessment (x73g-mrqp), growth (cxts-amj6), graduation (76iv-8ed4), AP (q9gf-prrp)",
      methodology: "GreatSchools Test Score + Student Progress + College Readiness (HS) → statewide percentile decile → weighted composite 1-10",
      generated: new Date().toISOString(),
    },
    ...entries,
  };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [testScores, progressData, collegeReadiness] = await Promise.all([
    fetchTestScores(),
    fetchStudentProgress(),
    fetchCollegeReadiness(),
  ]);

  console.log("\nCombining sub-ratings with GreatSchools weighting…");
  const combined = combineRatings(testScores, progressData, collegeReadiness);

  // Print BSD schools for verification
  const bsd = combined.filter((s) => s.districtname === "Bellevue School District");
  bsd.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  console.log("\nBellevue School District final ratings:");
  for (const s of bsd) {
    const cr = s.crRating != null ? ` CR:${s.crRating}` : "";
    console.log(
      `  ${s.schoolname.padEnd(42)} TS:${String(s.tsRating ?? "-").padStart(2)}  SP:${String(s.spRating ?? "-").padStart(2)}${cr.padEnd(6)}  → ${s.rating ?? "?"}/10`
    );
  }

  const output = buildOutput(combined);
  const outPath = join(ROOT, "data", "ospi-ratings.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${Object.keys(output).length - 1} schools to ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });

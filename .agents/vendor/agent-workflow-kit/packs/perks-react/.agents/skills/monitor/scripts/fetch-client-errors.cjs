/**
 * Fetch recent client errors from Firestore (production).
 *
 * Usage: node .agents/skills/monitor/scripts/fetch-client-errors.cjs [--limit N] [--days N]
 *
 * Options:
 *   --limit N   Max documents to fetch (default: 30)
 *   --days N    Only fetch errors from the last N days (default: 7)
 *   --collection NAME  Firestore collection to query (default: clientErrors)
 *
 * Requires: firebase-admin (run from functions/ directory or project root)
 */

const path = require("path");
const projectRoot = path.resolve(__dirname, "../../../..");
const admin = require(path.join(projectRoot, "functions/node_modules/firebase-admin"));

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : defaultVal;
}

function getStringArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const LIMIT = getArg("limit", 30);
const DAYS = getArg("days", 7);
const COLLECTION = getStringArg("collection", "clientErrors");

// Initialize Firebase Admin (uses default credentials / gcloud auth)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "perks-react" });
}

const db = admin.firestore();

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("receivedAt", "desc")
    .where("receivedAt", ">=", admin.firestore.Timestamp.fromDate(cutoff))
    .limit(LIMIT)
    .get();

  if (snapshot.empty) {
    console.log(`No client signals found in ${COLLECTION} for the last ${DAYS} days.`);
    process.exit(0);
  }

  const errors = [];
  snapshot.forEach((doc) => {
    const d = doc.data();
    errors.push({
      id: doc.id,
      severity: d.severity || "error",
      type: d.type || "unknown",
      message: (d.message || "").substring(0, 200),
      url: d.url || "",
      environment: d.environment || "",
      component: d.component || null,
      trafficType: d.trafficType || "user",
      classification: d.classification || null,
      fingerprint: d.fingerprint || null,
      receivedAt: d.receivedAt?.toDate?.()?.toISOString?.() || null,
      appVersion: d.appVersion || null,
      uid: d.uid ? "[redacted]" : null,
    });
  });

  // Group by fingerprint for summary
  const groups = {};
  for (const err of errors) {
    const key = err.fingerprint || err.type + "|" + err.message;
    if (!groups[key]) {
      groups[key] = {
        fingerprint: err.fingerprint,
        severity: err.severity,
        type: err.type,
        message: err.message,
        component: err.component,
        trafficType: err.trafficType,
        classification: err.classification,
        count: 0,
        pages: new Set(),
        latest: err.receivedAt,
        earliest: err.receivedAt,
      };
    }
    groups[key].count++;
    if (err.url) groups[key].pages.add(err.url);
    if (err.receivedAt < groups[key].earliest) groups[key].earliest = err.receivedAt;
    if (err.receivedAt > groups[key].latest) groups[key].latest = err.receivedAt;
  }

  // Output summary
  console.log(`\n=== Client Signals Summary (${COLLECTION}, last ${DAYS} days, ${errors.length} total) ===\n`);

  const summary = Object.values(groups)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      fingerprint: g.fingerprint,
      severity: g.severity,
      type: g.type,
      message: g.message,
      component: g.component,
      trafficType: g.trafficType,
      classification: g.classification,
      count: g.count,
      pages: [...g.pages],
      latest: g.latest,
      earliest: g.earliest,
    }));

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error fetching client errors:", err.message);
    process.exit(1);
  });

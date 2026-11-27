// Read a lychee 0.24.2 JSON report (--format json) and fail only on HTTP
// status errors. Timeouts and network errors are warnings.
//
//   node scripts/lychee-gate.mjs lychee/out.json
//   node scripts/lychee-gate.mjs --self-test
//
// accept stays 200, 204, 206, 429. A 404, 410, 403, or 5xx still fails.
// Do not add 404 or 403 to accept. Lychee puts a rejected HTTP code in
// error_map as { "text": "...", "code": <n> }. A timeout is in timeout_map
// as { "text": "Timeout", "details": "Request timed out" }. A TLS failure
// or a connection reset is an error_map entry whose text starts with
// "Network error:" and has no code.

import { appendFileSync, readFileSync } from "node:fs";

const ACCEPTED = new Set([200, 204, 206, 429]);

const TRANSPORT_TEXT =
  /^(?:network error:|failed to read response body|failed to create http request client)/i;

function isTimeoutStatus(status) {
  const text = typeof status?.text === "string" ? status.text : "";
  const details = typeof status?.details === "string" ? status.details : "";
  return /^timeout\b/i.test(text) || /request timed out/i.test(details);
}

function linkUrl(entry) {
  if (typeof entry?.url === "string") return entry.url;
  if (typeof entry?.uri === "string") return entry.uri;
  if (typeof entry?.uri?.url === "string") return entry.uri.url;
  return "(missing url)";
}

function reasonText(status) {
  const text = typeof status?.text === "string" ? status.text : "";
  const details = typeof status?.details === "string" ? status.details : "";
  if (text && details && !text.includes(details)) return `${text} (${details})`;
  return text || details || "unclassified lychee error";
}

// "failure" fails the job. "warning" is a timeout or a transport error.
// "ok" is an accepted status that should not have been in the error map.
function classifyStatus(status) {
  if (isTimeoutStatus(status)) return "warning";
  if (typeof status?.code === "number" && Number.isInteger(status.code)) {
    return ACCEPTED.has(status.code) ? "ok" : "failure";
  }
  const text = typeof status?.text === "string" ? status.text : "";
  const details = typeof status?.details === "string" ? status.details : "";
  if (TRANSPORT_TEXT.test(text) || TRANSPORT_TEXT.test(details)) return "warning";
  return "failure";
}

function walk(map, bucket) {
  if (map == null) return { rows: [], problem: null };
  if (typeof map !== "object" || Array.isArray(map)) {
    return { rows: [], problem: `${bucket} is not an object` };
  }
  const rows = [];
  for (const [source, entries] of Object.entries(map)) {
    if (!Array.isArray(entries)) {
      return { rows: [], problem: `${bucket} entries for ${source} are not a list` };
    }
    for (const entry of entries) {
      rows.push({
        source,
        url: linkUrl(entry),
        status: entry?.status,
        span: entry?.span,
      });
    }
  }
  return { rows, problem: null };
}

function itemFrom(row) {
  return {
    source: row.source,
    url: row.url,
    reason: reasonText(row.status),
    code: typeof row.status?.code === "number" ? row.status.code : null,
    line: row.span?.line,
    column: row.span?.column,
  };
}

function classify(report) {
  const failures = [];
  const warnings = [];

  if (report == null || typeof report !== "object" || Array.isArray(report)) {
    return {
      ok: false,
      failures: [{ source: "", url: "", reason: "Lychee report is not a JSON object.", code: null }],
      warnings,
    };
  }

  if (report.total === 0) {
    failures.push({
      source: "",
      url: "",
      reason: "Lychee found no links. The inputs or the config are wrong.",
      code: null,
    });
  }

  if ((report.errors ?? 0) > 0 && (report.error_map == null || typeof report.error_map !== "object")) {
    failures.push({
      source: "",
      url: "",
      reason: "Lychee counted errors but error_map is missing.",
      code: null,
    });
  }

  if ((report.unknown ?? 0) > 0) {
    failures.push({
      source: "",
      url: "",
      reason: `Lychee reported ${report.unknown} unknown status code(s) outside error_map.`,
      code: null,
    });
  }

  const errors = walk(report.error_map, "error_map");
  if (errors.problem) {
    failures.push({ source: "", url: "", reason: errors.problem, code: null });
  }
  for (const row of errors.rows) {
    const kind = classifyStatus(row.status);
    const item = itemFrom(row);
    if (kind === "warning") warnings.push(item);
    else if (kind === "failure") failures.push(item);
  }

  if ((report.timeouts ?? 0) > 0 && (report.timeout_map == null || typeof report.timeout_map !== "object")) {
    warnings.push({
      source: "",
      url: "",
      reason: "Lychee counted timeouts but timeout_map is missing.",
      code: null,
    });
  }

  const timeouts = walk(report.timeout_map, "timeout_map");
  if (timeouts.problem) {
    failures.push({ source: "", url: "", reason: timeouts.problem, code: null });
  }
  for (const row of timeouts.rows) {
    const kind = classifyStatus(row.status);
    const item = itemFrom(row);
    // A rejected HTTP code still fails if it was filed under timeout_map.
    if (kind === "failure") failures.push(item);
    else warnings.push(item);
  }

  return { ok: failures.length === 0, failures, warnings };
}

function formatItem(item) {
  const where = item.source ? `${item.source}${item.line ? `:${item.line}` : ""} — ` : "";
  const url = item.url ? `${item.url} — ` : "";
  return `- ${where}${url}${item.reason}`;
}

function renderSummary(result) {
  const lines = [
    "## External links",
    "",
    "HTTP status codes outside accept (`200`, `204`, `206`, `429`) fail this job. Timeouts and network errors (TLS, connection reset) are warnings. `404` and `403` are not accepted.",
    "",
    "### HTTP errors",
    "",
  ];
  if (result.failures.length === 0) lines.push("None.");
  else for (const item of result.failures) lines.push(formatItem(item));
  lines.push("", "### Warnings", "");
  if (result.warnings.length === 0) lines.push("None.");
  else for (const item of result.warnings) lines.push(formatItem(item));
  lines.push("");
  return lines.join("\n");
}

function workflowCommand(kind, item) {
  const message = `${item.url ? `${item.url} — ` : ""}${item.reason}`
    .replaceAll("%", "%25")
    .replaceAll("\r", "")
    .replaceAll("\n", " ");
  const parts = [];
  if (item.source) {
    parts.push(
      `file=${item.source.replaceAll("%", "%25").replaceAll("\r", "").replaceAll("\n", "")}`,
    );
  }
  if (item.line) parts.push(`line=${item.line}`);
  if (item.column) parts.push(`col=${item.column}`);
  const loc = parts.length > 0 ? ` ${parts.join(",")}` : "";
  console.log(`::${kind}${loc}::${message}`);
}

function entry(url, status) {
  return { url, status, span: { line: 1, column: 1 } };
}

function report(parts) {
  return {
    total: parts.total ?? 4,
    errors: parts.errors ?? 0,
    timeouts: parts.timeouts ?? 0,
    unknown: parts.unknown ?? 0,
    error_map: parts.error_map ?? {},
    timeout_map: parts.timeout_map ?? {},
  };
}

function assertCase(name, result, expect) {
  const problems = [];
  if (result.ok !== expect.ok) problems.push(`ok ${result.ok}, expected ${expect.ok}`);
  if (result.failures.length !== expect.failures) {
    problems.push(`${result.failures.length} failures, expected ${expect.failures}`);
  }
  if (result.warnings.length !== expect.warnings) {
    problems.push(`${result.warnings.length} warnings, expected ${expect.warnings}`);
  }
  if (expect.failureCode != null && !result.failures.some((item) => item.code === expect.failureCode)) {
    problems.push(`failure codes missing ${expect.failureCode}`);
  }
  if (expect.warningIncludes) {
    const blob = result.warnings.map((item) => item.reason).join("\n");
    if (!blob.includes(expect.warningIncludes)) problems.push(`warnings missing ${expect.warningIncludes}`);
  }
  if (problems.length > 0) {
    console.error(`FAIL ${name}: ${problems.join("; ")}`);
    return false;
  }
  const extra = result.warnings.length > 0 ? `, ${result.warnings.length} warning(s)` : "";
  console.log(`${name}: exits ${expect.ok ? 0 : 1}${extra}`);
  return true;
}

function selfTest() {
  const http = (code, text) => ({ text, code });
  const checks = [
    assertCase(
      "404",
      classify(
        report({
          errors: 1,
          error_map: {
            "lib/data/texas-hab.ts": [
              entry("https://example.com/missing", http(404, "Rejected status code: 404 Not Found")),
            ],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 0, failureCode: 404 },
    ),
    assertCase(
      "410",
      classify(
        report({
          errors: 1,
          error_map: {
            "lib/layers.ts": [entry("https://example.com/gone", http(410, "Rejected status code: 410 Gone"))],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 0, failureCode: 410 },
    ),
    assertCase(
      "403",
      classify(
        report({
          errors: 1,
          error_map: {
            "lib/layers.ts": [
              entry("https://example.com/denied", http(403, "Rejected status code: 403 Forbidden")),
            ],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 0, failureCode: 403 },
    ),
    assertCase(
      "500",
      classify(
        report({
          errors: 1,
          error_map: {
            "README.md": [
              entry(
                "https://example.com/down",
                http(500, "Rejected status code: 500 Internal Server Error"),
              ),
            ],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 0, failureCode: 500 },
    ),
    assertCase(
      "429 stays accepted",
      classify(
        report({
          errors: 1,
          error_map: {
            "README.md": [entry("https://example.com/slow", http(429, "429 Too Many Requests"))],
          },
        }),
      ),
      { ok: true, failures: 0, warnings: 0 },
    ),
    assertCase(
      "timeout",
      classify(
        report({
          timeouts: 1,
          timeout_map: {
            "lib/layers.ts": [
              entry("https://example.com/slow-host", { text: "Timeout", details: "Request timed out" }),
            ],
          },
        }),
      ),
      { ok: true, failures: 0, warnings: 1, warningIncludes: "Timeout" },
    ),
    assertCase(
      "tls",
      classify(
        report({
          errors: 1,
          error_map: {
            "lib/data/texas-hab.ts": [
              entry("https://example.com/tls", {
                text: "Network error: received fatal alert: InternalError (received fatal alert: InternalError)",
                details: "received fatal alert: InternalError",
              }),
            ],
          },
        }),
      ),
      { ok: true, failures: 0, warnings: 1, warningIncludes: "InternalError" },
    ),
    assertCase(
      "connection reset",
      classify(
        report({
          errors: 1,
          error_map: {
            "lib/layers.ts": [
              entry("https://example.com/reset", {
                text: "Network error: connection reset by peer (connection reset)",
                details: "connection reset by peer",
              }),
            ],
          },
        }),
      ),
      { ok: true, failures: 0, warnings: 1, warningIncludes: "connection reset" },
    ),
    assertCase(
      "404 plus timeout",
      classify(
        report({
          errors: 1,
          timeouts: 1,
          error_map: {
            "lib/layers.ts": [
              entry("https://example.com/missing", http(404, "Rejected status code: 404 Not Found")),
            ],
          },
          timeout_map: {
            "lib/layers.ts": [
              entry("https://example.com/slow-host", { text: "Timeout", details: "Request timed out" }),
            ],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 1, failureCode: 404, warningIncludes: "Timeout" },
    ),
    assertCase(
      "fragment is not a network error",
      classify(
        report({
          errors: 1,
          error_map: {
            "README.md": [
              entry("https://example.com/page#missing", {
                text: "Cannot find fragment",
                details: "Cannot find fragment",
              }),
            ],
          },
        }),
      ),
      { ok: false, failures: 1, warnings: 0 },
    ),
    assertCase("no links", classify(report({ total: 0 })), { ok: false, failures: 1, warnings: 0 }),
  ];

  if (checks.some((ok) => !ok)) {
    console.error("self-test failed");
    process.exit(1);
  }
  console.log("self-test passed");
}

function main() {
  const arg = process.argv[2];
  if (arg === "--self-test") {
    selfTest();
    return;
  }
  if (!arg) {
    console.error("Usage: node scripts/lychee-gate.mjs <lychee.json> | --self-test");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(arg, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not read lychee JSON at ${arg}: ${message}`);
    process.exit(1);
  }

  const result = classify(parsed);
  const markdown = renderSummary(result);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
  for (const item of result.warnings) workflowCommand("warning", item);
  for (const item of result.failures) workflowCommand("error", item);
  process.exit(result.ok ? 0 : 1);
}

main();

// Dashboard served at /app. Plain HTML/CSS/JS so the Worker needs no build step.
// The JS below lives inside template literals: don't use backticks or "${" in it.
// All post content is rendered with textContent, never innerHTML.

export const APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Social OS Queue</title>
<link rel="stylesheet" href="/app.css">
<script src="/app.js" defer></script>
</head>
<body>
<header>
  <h1>Social OS</h1>
  <button id="lock" class="ghost" hidden>Lock</button>
</header>

<section id="unlock" hidden>
  <form id="unlock-form" class="card">
    <label for="key">API key</label>
    <input id="key" type="password" autocomplete="off" required>
    <label class="inline"><input id="remember" type="checkbox"> Remember on this device</label>
    <button type="submit">Unlock</button>
    <p id="unlock-error" class="error"></p>
  </form>
</section>

<main id="main" hidden>
  <nav id="tabs"></nav>
  <p id="notice" class="notice" hidden></p>
  <div id="list"></div>
  <section id="metrics" hidden>
    <h2>Add a metrics snapshot</h2>
    <form id="metric-form" class="card grid">
      <label>Post <select id="m-post" required></select></label>
      <label>Impressions <input type="number" min="0" step="1" name="impressions"></label>
      <label>Unique reach <input type="number" min="0" step="1" name="unique_reach"></label>
      <label>Engagement rate <input type="number" min="0" step="any" name="engagement_rate" placeholder="0.045"></label>
      <label>Saves <input type="number" min="0" step="1" name="saves"></label>
      <label>Shares <input type="number" min="0" step="1" name="shares"></label>
      <label>Clicks <input type="number" min="0" step="1" name="clicks"></label>
      <label>Comments <input type="number" min="0" step="1" name="comments"></label>
      <button type="submit">Save snapshot</button>
    </form>
    <h2>Paste CSV</h2>
    <form id="csv-form" class="card">
      <p class="muted">Header row required. Columns: post_id, impressions, unique_reach, engagement_rate, saves, shares, clicks, comments (any subset after post_id).</p>
      <textarea id="csv" rows="6" spellcheck="false"></textarea>
      <button type="submit">Import</button>
    </form>
    <h2>Latest snapshot per published post</h2>
    <div class="table-wrap"><table id="metrics-table"></table></div>
  </section>
</main>
</body>
</html>`;

export const APP_CSS = `:root {
  --bg: #f7f7f5; --surface: #ffffff; --text: #1d1d1b; --muted: #6b6b66; --border: #e2e2dd;
  --accent: #1f5fbf; --accent-text: #ffffff; --danger: #b42318; --ok: #1a7f37; --warn: #9a6700;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161615; --surface: #20201e; --text: #ececea; --muted: #a3a39d; --border: #34342f;
    --accent: #6ea8fe; --accent-text: #0b1b33; --danger: #ff8a80; --ok: #6fd28a; --warn: #e3b341;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
h1 { font-size: 18px; margin: 0; }
h2 { font-size: 15px; margin: 24px 0 8px; }
main, #unlock { max-width: 960px; margin: 0 auto; padding: 16px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
#unlock-form { max-width: 380px; margin: 40px auto; display: flex; flex-direction: column; gap: 8px; }
label { font-size: 13px; color: var(--muted); display: flex; flex-direction: column; gap: 4px; }
label.inline { flex-direction: row; align-items: center; gap: 6px; }
input, select, textarea { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; width: 100%; }
label.inline input { width: auto; }
textarea { font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
button { font: inherit; cursor: pointer; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-text); border-radius: 6px; padding: 6px 12px; }
button.ghost { background: transparent; color: var(--text); border-color: var(--border); }
button.danger { background: transparent; color: var(--danger); border-color: var(--danger); }
button:disabled { opacity: .5; cursor: default; }
nav { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; }
nav button { background: transparent; color: var(--text); border-color: var(--border); }
nav button[aria-selected="true"] { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
.post { margin-bottom: 10px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; color: var(--muted); }
.pill { border: 1px solid var(--border); border-radius: 999px; padding: 0 8px; }
.st-failed { color: var(--danger); border-color: var(--danger); }
.st-pending_manual { color: var(--warn); border-color: var(--warn); }
.st-published { color: var(--ok); border-color: var(--ok); }
.hook { font-weight: 600; margin: 6px 0; overflow-wrap: anywhere; }
details pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; background: var(--bg); border-radius: 6px; padding: 10px; margin: 8px 0; }
.error { color: var(--danger); font-size: 13px; overflow-wrap: anywhere; }
.muted { color: var(--muted); font-size: 13px; }
.notice { padding: 8px 12px; border-radius: 6px; background: var(--surface); border: 1px solid var(--border); }
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
.actions input { width: 220px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; align-items: end; }
.grid label:first-child { grid-column: 1 / -1; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 13px; background: var(--surface); }
th, td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: right; white-space: nowrap; }
th:first-child, td:first-child { text-align: left; white-space: normal; min-width: 200px; }
.empty { color: var(--muted); padding: 20px 0; }`;

export const APP_JS = `(function () {
  "use strict";
  var KEY_NAME = "social_os_api_key";
  var METRIC_FIELDS = ["impressions", "unique_reach", "engagement_rate", "saves", "shares", "clicks", "comments"];
  var TABS = [
    { id: "action", label: "Needs action", statuses: ["pending_manual", "failed"] },
    { id: "queued", label: "Queued", statuses: ["queued", "publishing"], ascending: true },
    { id: "published", label: "Published", statuses: ["published"] },
    { id: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
    { id: "metrics", label: "Metrics" }
  ];
  var posts = [];
  var current = "action";

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "onclick") node.addEventListener("click", attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
    return node;
  }

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function getKey() {
    var s = store("sessionStorage"), l = store("localStorage");
    try { return (s && s.getItem(KEY_NAME)) || (l && l.getItem(KEY_NAME)) || ""; } catch (e) { return ""; }
  }
  function setKey(key, remember) {
    try {
      var s = store("sessionStorage"), l = store("localStorage");
      if (s) s.setItem(KEY_NAME, key);
      if (l) { if (remember) l.setItem(KEY_NAME, key); else l.removeItem(KEY_NAME); }
    } catch (e) { /* storage blocked: key lives only for this page load */ }
    memoryKey = key;
  }
  function clearKey() {
    try { var s = store("sessionStorage"), l = store("localStorage"); if (s) s.removeItem(KEY_NAME); if (l) l.removeItem(KEY_NAME); } catch (e) {}
    memoryKey = "";
  }
  var memoryKey = "";

  function api(method, path, body) {
    var opts = { method: method, headers: { Authorization: "Bearer " + (memoryKey || getKey()) } };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) { clearKey(); showUnlock("That key was rejected."); throw new Error("Unauthorized"); }
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        return data;
      });
    });
  }

  function notice(msg, isError) {
    var n = $("notice");
    n.hidden = !msg; n.textContent = msg || ""; n.className = isError ? "notice error" : "notice";
  }

  function showUnlock(msg) {
    $("main").hidden = true; $("lock").hidden = true; $("unlock").hidden = false;
    $("unlock-error").textContent = msg || ""; $("key").focus();
  }

  function load() {
    return api("GET", "/api/posts").then(function (data) {
      posts = data.results || [];
      $("unlock").hidden = true; $("main").hidden = false; $("lock").hidden = false;
      if (posts.length >= data.limit) notice("Showing the newest " + data.limit + " posts only.");
      render();
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso.indexOf("T") === -1 ? iso.replace(" ", "T") + "Z" : iso);
    return isNaN(d) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function render() {
    var nav = $("tabs"); nav.textContent = "";
    TABS.forEach(function (t) {
      var count = t.statuses ? posts.filter(function (p) { return t.statuses.indexOf(p.status) !== -1; }).length : null;
      var b = el("button", { type: "button", role: "tab", "aria-selected": String(t.id === current),
        text: t.label + (count !== null ? " (" + count + ")" : ""),
        onclick: function () { current = t.id; notice(""); render(); } });
      nav.appendChild(b);
    });
    var tab = TABS.filter(function (t) { return t.id === current; })[0];
    $("metrics").hidden = tab.id !== "metrics";
    $("list").hidden = tab.id === "metrics";
    if (tab.id === "metrics") return renderMetrics();

    var list = $("list"); list.textContent = "";
    var rows = posts.filter(function (p) { return tab.statuses.indexOf(p.status) !== -1; });
    rows.sort(function (a, b) { return tab.ascending ? (a.scheduled_at < b.scheduled_at ? -1 : 1) : (a.scheduled_at < b.scheduled_at ? 1 : -1); });
    if (!rows.length) list.appendChild(el("p", { class: "empty", text: "Nothing here." }));
    rows.forEach(function (p) { list.appendChild(postCard(p)); });
  }

  function postCard(p) {
    var meta = el("div", { class: "meta" },
      el("span", { class: "pill st-" + p.status, text: p.status.replace("_", " ") }),
      el("span", { text: fmtDate(p.status === "published" && p.published_at ? p.published_at : p.scheduled_at) }),
      el("span", { class: "pill", text: p.platform + " · " + p.format }),
      el("span", { class: "pill", text: p.funnel_stage }),
      el("span", { class: "pill", text: "ICP " + p.icp_row_id }));
    var body = el("details", null, el("summary", { text: "Copy and details" }), el("pre", { text: p.post_copy }));
    if (p.visual_spec) body.appendChild(el("p", { class: "muted", text: "Visual spec: " + p.visual_spec }));
    if (p.media_r2_url) body.appendChild(el("p", { class: "muted", text: "Media: " + p.media_r2_url }));
    if (p.platform_post_id) body.appendChild(el("p", { class: "muted", text: "Platform post ID: " + p.platform_post_id }));
    body.appendChild(el("p", { class: "muted", text: "ID: " + p.id }));

    var card = el("article", { class: "card post" }, meta, el("p", { class: "hook", text: p.hook_text }));
    if (p.last_error && p.status !== "published") card.appendChild(el("p", { class: "error", text: p.last_error }));
    card.appendChild(body);
    card.appendChild(actions(p));
    return card;
  }

  function actions(p) {
    var row = el("div", { class: "actions" });
    row.appendChild(el("button", { type: "button", class: "ghost", text: "Copy text", onclick: function (e) {
      var btn = e.currentTarget;
      navigator.clipboard.writeText(p.post_copy).then(function () { btn.textContent = "Copied"; }, function () { btn.textContent = "Copy failed"; });
    } }));

    if (p.status === "pending_manual" || p.status === "failed") {
      var input = el("input", { type: "text", placeholder: "Platform post ID or URL (optional)" });
      row.appendChild(input);
      row.appendChild(el("button", { type: "button", text: "Mark published", onclick: function (e) {
        act(e.currentTarget, { status: "published", platform_post_id: input.value.trim() || undefined }, p.id, "Marked published.");
      } }));
    }
    if (p.status === "failed") {
      row.appendChild(el("button", { type: "button", class: "ghost", text: "Retry", onclick: function (e) {
        if (confirm("Re-queue this post? If it was stuck in publishing, check the platform first so it isn't posted twice.")) act(e.currentTarget, { status: "queued" }, p.id, "Re-queued.");
      } }));
    }
    if (p.status === "queued") {
      row.appendChild(el("button", { type: "button", class: "danger", text: "Cancel", onclick: function (e) {
        if (confirm("Cancel this post? It stays in the database as cancelled.")) act(e.currentTarget, { status: "cancelled" }, p.id, "Cancelled.");
      } }));
    }
    return row;
  }

  function act(btn, body, id, done) {
    btn.disabled = true;
    api("PATCH", "/api/posts/" + encodeURIComponent(id), body)
      .then(function () { return load(); })
      .then(function () { notice(done); })
      .catch(function (err) { btn.disabled = false; if (err.message !== "Unauthorized") notice(err.message, true); });
  }

  function renderMetrics() {
    var published = posts.filter(function (p) { return p.status === "published"; });
    var select = $("m-post"); select.textContent = "";
    select.appendChild(el("option", { value: "", text: published.length ? "Choose a published post" : "No published posts yet" }));
    published.forEach(function (p) {
      select.appendChild(el("option", { value: p.id, text: fmtDate(p.published_at) + " · " + p.platform + " · " + p.hook_text.slice(0, 60) }));
    });

    var table = $("metrics-table"); table.textContent = "";
    var head = el("tr", null, el("th", { text: "Post" }));
    METRIC_FIELDS.concat(["recorded_at"]).forEach(function (f) { head.appendChild(el("th", { text: f.replace("_", " ") })); });
    table.appendChild(el("thead", null, head));
    var tbody = el("tbody");
    published.forEach(function (p) {
      var tr = el("tr", null, el("td", { text: p.platform + ": " + p.hook_text }));
      METRIC_FIELDS.forEach(function (f) {
        var v = p[f];
        tr.appendChild(el("td", { text: v === null || v === undefined ? "–" : (f === "engagement_rate" ? (v * 100).toFixed(2) + "%" : String(v)) }));
      });
      tr.appendChild(el("td", { text: p.recorded_at ? fmtDate(p.recorded_at) : "–" }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  function submitMetrics(rows, form, done) {
    var btn = form.querySelector("button"); btn.disabled = true;
    api("POST", "/api/metrics", rows)
      .then(function (data) { form.reset(); return load().then(function () { notice(done.replace("{n}", data.inserted)); }); })
      .catch(function (err) { if (err.message !== "Unauthorized") notice(err.message, true); })
      .then(function () { btn.disabled = false; });
  }

  function parseCsv(text) {
    var lines = text.split(/\\r?\\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2) throw new Error("Paste a header row and at least one data row.");
    var cols = lines[0].split(",").map(function (c) { return c.trim().toLowerCase(); });
    if (cols[0] !== "post_id") throw new Error("The first column must be post_id.");
    cols.slice(1).forEach(function (c) { if (METRIC_FIELDS.indexOf(c) === -1) throw new Error("Unknown column: " + c); });
    return lines.slice(1).map(function (line, i) {
      var cells = line.split(",").map(function (c) { return c.trim(); });
      var row = { post_id: cells[0] };
      cols.slice(1).forEach(function (c, j) {
        var raw = cells[j + 1];
        if (raw === undefined || raw === "") return;
        var n = Number(raw.replace(/%$/, ""));
        if (isNaN(n)) throw new Error("Row " + (i + 2) + ": " + c + " is not a number.");
        row[c] = /%$/.test(raw) ? n / 100 : n;
      });
      return row;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("unlock-form").addEventListener("submit", function (e) {
      e.preventDefault();
      setKey($("key").value.trim(), $("remember").checked);
      $("key").value = "";
      load().catch(function (err) { if (err.message !== "Unauthorized") $("unlock-error").textContent = err.message; });
    });
    $("lock").addEventListener("click", function () { clearKey(); posts = []; showUnlock(""); });

    $("metric-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.currentTarget, row = { post_id: $("m-post").value };
      METRIC_FIELDS.forEach(function (f) { var v = form.elements[f].value; if (v !== "") row[f] = Number(v); });
      submitMetrics(row, form, "Saved snapshot.");
    });
    $("csv-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var rows;
      try { rows = parseCsv($("csv").value); } catch (err) { return notice(err.message, true); }
      submitMetrics(rows, e.currentTarget, "Imported {n} rows.");
    });

    memoryKey = getKey();
    if (memoryKey) load().catch(function (err) { if (err.message !== "Unauthorized") showUnlock(err.message); });
    else showUnlock("");
  });
})();`;

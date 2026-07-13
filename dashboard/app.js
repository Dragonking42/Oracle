const notesList = document.getElementById("notesList");
const output = document.getElementById("reindexOutput");
const refreshButton = document.getElementById("refreshNotes");
const reindexButton = document.getElementById("runReindex");
const semanticInput = document.getElementById("semanticQuery");
const semanticButton = document.getElementById("runSemanticSearch");
const semanticResults = document.getElementById("semanticResults");
const graphButton = document.getElementById("refreshGraph");
const graphOutput = document.getElementById("graphOutput");
const graphMap = document.getElementById("graphMap");
const exportGraphButton = document.getElementById("exportGraph");
const graphFilterPrefix = document.getElementById("graphFilterPrefix");
const graphFilterMinDegree = document.getElementById("graphFilterMinDegree");
const graphFilterMinWeight = document.getElementById("graphFilterMinWeight");
const graphFilterOrphansOnly = document.getElementById("graphFilterOrphansOnly");
const applyGraphFiltersButton = document.getElementById("applyGraphFilters");
const noteDetailOutput = document.getElementById("noteDetailOutput");
const clearSelectedNoteButton = document.getElementById("clearSelectedNote");
const graphDiffButton = document.getElementById("refreshGraphDiff");
const graphDiffOutput = document.getElementById("graphDiffOutput");
const systemMetricsButton = document.getElementById("refreshSystemMetrics");
const systemMetricsOutput = document.getElementById("systemMetricsOutput");
const gitHistoryButton = document.getElementById("refreshGitHistory");
const gitHistoryOutput = document.getElementById("gitHistoryOutput");
const oracleChatMessages = document.getElementById("oracleChatMessages");
const oracleChatInput = document.getElementById("oracleChatInput");
const oracleChatSend = document.getElementById("oracleChatSend");
const chatThemeSelect = document.getElementById("chatThemeSelect");
const chatVersionTag = document.getElementById("chatVersionTag");

const chatThemes = new Set(["classic", "rebirth", "animated"]);

let latestGraphSnapshot = null;
let selectedNotePath = null;

refreshButton?.addEventListener("click", loadNotes);
reindexButton?.addEventListener("click", runReindex);
semanticButton?.addEventListener("click", runSemanticSearch);
graphButton?.addEventListener("click", loadGraph);
applyGraphFiltersButton?.addEventListener("click", loadGraph);
exportGraphButton?.addEventListener("click", exportGraph);
clearSelectedNoteButton?.addEventListener("click", clearSelectedNote);
graphDiffButton?.addEventListener("click", loadGraphDiff);
systemMetricsButton?.addEventListener("click", loadSystemMetrics);
gitHistoryButton?.addEventListener("click", loadGitHistory);
oracleChatSend?.addEventListener("click", sendOracleChat);
chatThemeSelect?.addEventListener("change", () => {
  applyChatTheme(String(chatThemeSelect.value));
});

semanticInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runSemanticSearch();
  }
});

oracleChatInput?.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    sendOracleChat();
  }
});

initializeChatTheme();

async function loadNotes() {
  notesList.innerHTML = "<li>Loading...</li>";

  try {
    const response = await fetch("/api/vault/notes");
    const body = await response.json();
    const notes = Array.isArray(body.notes) ? body.notes : [];

    if (notes.length === 0) {
      notesList.innerHTML = "<li>No notes yet.</li>";
      return;
    }

    notesList.innerHTML = notes
      .map(
        (note) => `
        <li>
          <span class="note-title">${escapeHtml(note.title || note.id)}</span>
          <span class="note-path">${escapeHtml(note.relativePath || "")}</span>
        </li>
      `
      )
      .join("");
  } catch (error) {
    notesList.innerHTML = `<li>Failed to load notes: ${escapeHtml(String(error))}</li>`;
  }
}

async function runReindex() {
  output.textContent = "Running...";
  try {
    const response = await fetch("/api/curator/reindex");
    const body = await response.json();
    output.textContent = JSON.stringify(body.report ?? body, null, 2);
    await Promise.all([loadGraph(), loadGraphDiff(), loadSystemMetrics()]);
  } catch (error) {
    output.textContent = `Failed: ${String(error)}`;
  }
}

async function runSemanticSearch() {
  const query = String(semanticInput?.value ?? "").trim();
  if (!query) {
    semanticResults.innerHTML = "<li>Enter a query first.</li>";
    return;
  }

  semanticResults.innerHTML = "<li>Searching...</li>";

  try {
    const params = new URLSearchParams({ q: query, limit: "8" });
    const response = await fetch(`/api/semantic/query?${params.toString()}`);
    const body = await response.json();

    if (!response.ok) {
      semanticResults.innerHTML = `<li>Query failed: ${escapeHtml(body.error ?? "unknown error")}</li>`;
      return;
    }

    const matches = Array.isArray(body.matches) ? body.matches : [];
    if (matches.length === 0) {
      semanticResults.innerHTML = "<li>No semantic matches yet. Try reindex first.</li>";
      return;
    }

    semanticResults.innerHTML = matches
      .map(
        (match) => `
        <li>
          <span class="note-title">${escapeHtml(match.title || match.id || "Untitled")}</span>
          <span class="note-path">${escapeHtml(match.relativePath || "")}</span>
          <p>${escapeHtml(match.snippet || "")}</p>
        </li>
      `
      )
      .join("");
  } catch (error) {
    semanticResults.innerHTML = `<li>Search failed: ${escapeHtml(String(error))}</li>`;
  }
}

async function loadGraph() {
  graphOutput.textContent = "Loading graph...";
  try {
    const params = new URLSearchParams();
    const prefix = String(graphFilterPrefix?.value ?? "").trim();
    const minDegree = String(graphFilterMinDegree?.value ?? "0").trim();
    const minWeight = String(graphFilterMinWeight?.value ?? "1").trim();
    const orphansOnly = Boolean(graphFilterOrphansOnly?.checked);

    if (prefix) {
      params.set("pathPrefix", prefix);
    }
    params.set("minDegree", minDegree || "0");
    params.set("minEdgeWeight", minWeight || "1");
    params.set("orphansOnly", String(orphansOnly));

    const response = await fetch(`/api/curator/graph?${params.toString()}`);
    const body = await response.json();
    const snapshot = body.graph ?? body;
    latestGraphSnapshot = snapshot;
    graphOutput.textContent = JSON.stringify(snapshot, null, 2);
    renderGraph(snapshot);
  } catch (error) {
    graphOutput.textContent = `Graph load failed: ${String(error)}`;
    graphMap.innerHTML = '<p class="graph-empty">Unable to render graph.</p>';
  }
}

function renderGraph(snapshot) {
  const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  const edges = Array.isArray(snapshot?.edges) ? snapshot.edges : [];

  if (!nodes.length) {
    graphMap.innerHTML = '<p class="graph-empty">No nodes available yet. Run reindex first.</p>';
    return;
  }

  const width = 900;
  const height = 320;
  const radius = Math.min(16, Math.max(9, 20 - Math.floor(nodes.length / 5)));
  const nodePositions = computeForceLayout(nodes, edges, width, height);

  const byId = new Map(nodePositions.map((n) => [n.id, n]));

  const linkLines = edges
    .map((edge) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) {
        return "";
      }

      return `<line class="graph-link" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
    })
    .join("");

  const nodeCircles = nodePositions
    .map(
      (node) => `
      <g class="graph-node-group" data-node-id="${escapeHtml(node.id)}">
        <circle class="graph-node" cx="${node.x}" cy="${node.y}" r="${radius}" data-node-id="${escapeHtml(node.id)}" />
        <text class="graph-node-label" x="${node.x}" y="${node.y + radius + 13}" text-anchor="middle">
          ${escapeHtml(trimLabel(node.title, 18))}
        </text>
      </g>
    `
    )
    .join("");

  graphMap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Knowledge graph">
      ${linkLines}
      ${nodeCircles}
    </svg>
  `;

  graphMap.querySelectorAll(".graph-node-group").forEach((nodeEl) => {
    nodeEl.addEventListener("click", () => {
      const nodeId = nodeEl.getAttribute("data-node-id");
      if (nodeId) {
        loadNoteDetail(nodeId);
      }
    });
  });
}

function exportGraph() {
  if (!latestGraphSnapshot) {
    graphOutput.textContent = "Graph export unavailable: load graph first.";
    return;
  }

  const payload = JSON.stringify(latestGraphSnapshot, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `curator-graph-${timestamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

async function loadNoteDetail(notePath) {
  selectedNotePath = notePath;
  noteDetailOutput.textContent = "Loading selected note...";

  try {
    const noteResponse = await fetch(`/api/vault/note?path=${encodeURIComponent(notePath)}`);
    const noteBody = await noteResponse.json();

    if (!noteResponse.ok) {
      noteDetailOutput.textContent = JSON.stringify(noteBody, null, 2);
      return;
    }

    const timelineResponse = await fetch(
      `/api/vault/note/timeline?path=${encodeURIComponent(notePath)}`
    );
    const timelineBody = await timelineResponse.json();

    const payload = {
      selectedPath: notePath,
      note: noteBody.note,
      backlinks: noteBody.backlinks,
      related: noteBody.related,
      timeline: timelineBody.data ?? timelineBody
    };

    noteDetailOutput.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    noteDetailOutput.textContent = `Note detail failed: ${String(error)}`;
  }
}

function clearSelectedNote() {
  selectedNotePath = null;
  noteDetailOutput.textContent =
    "Click a graph node to inspect note content, backlinks, related notes, and git timeline.";
}

async function loadGraphDiff() {
  graphDiffOutput.textContent = "Loading graph diff...";
  try {
    const response = await fetch("/api/curator/graph/diff");
    const body = await response.json();
    graphDiffOutput.textContent = JSON.stringify(body.diff ?? body, null, 2);
  } catch (error) {
    graphDiffOutput.textContent = `Graph diff load failed: ${String(error)}`;
  }
}

async function loadSystemMetrics() {
  systemMetricsOutput.textContent = "Loading system metrics...";
  try {
    const response = await fetch("/api/system/metrics");
    const body = await response.json();
    updateVersionTag(body);
    systemMetricsOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    systemMetricsOutput.textContent = `System metrics failed: ${String(error)}`;
    updateVersionTag(null);
  }
}

function updateVersionTag(metrics) {
  if (!chatVersionTag) {
    return;
  }

  const version = metrics?.app?.version;
  chatVersionTag.textContent = typeof version === "string" && version ? `v${version}` : "vunknown";
}

function trimLabel(value, maxLen) {
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen - 3)}...`;
}

async function loadGitHistory() {
  gitHistoryOutput.textContent = "Loading git history...";
  try {
    const response = await fetch("/api/git/history?limit=12");
    const body = await response.json();
    gitHistoryOutput.textContent = JSON.stringify(body.data ?? body, null, 2);
  } catch (error) {
    gitHistoryOutput.textContent = `Git history load failed: ${String(error)}`;
  }
}

async function sendOracleChat() {
  if (!oracleChatInput || !oracleChatSend) {
    return;
  }

  const message = String(oracleChatInput?.value ?? "").trim();
  if (!message) {
    return;
  }

  appendOracleChat("user", message);
  oracleChatInput.value = "";
  oracleChatSend.disabled = true;

  try {
    const response = await fetch("/api/oracle/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    const body = await response.json();

    if (!response.ok || body.ok === false) {
      appendOracleChat("oracle", `Error: ${body.error ?? "chat unavailable"}`);
      return;
    }

    appendOracleChat("oracle", String(body.answer ?? "No response from Barbara."));
  } catch (error) {
    appendOracleChat("oracle", `Error: ${String(error)}`);
  } finally {
    oracleChatSend.disabled = false;
    oracleChatInput.focus();
  }
}

function appendOracleChat(role, message) {
  if (!oracleChatMessages) {
    return;
  }

  const row = document.createElement("div");
  row.className = `chat-msg ${role === "user" ? "chat-msg-user" : "chat-msg-oracle"}`;
  row.textContent = message;
  oracleChatMessages.appendChild(row);
  oracleChatMessages.scrollTop = oracleChatMessages.scrollHeight;
}

function initializeChatTheme() {
  const savedTheme = localStorage.getItem("oracle.chatTheme") ?? "rebirth";
  const theme = chatThemes.has(savedTheme) ? savedTheme : "rebirth";
  applyChatTheme(theme);
  if (chatThemeSelect) {
    chatThemeSelect.value = theme;
  }
}

function applyChatTheme(theme) {
  const nextTheme = chatThemes.has(theme) ? theme : "rebirth";
  document.body.setAttribute("data-chat-theme", nextTheme);
  localStorage.setItem("oracle.chatTheme", nextTheme);
}

function computeForceLayout(nodes, edges, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const byId = new Map();
  const points = nodes.map((node, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(1, nodes.length);
    const point = {
      id: node.id,
      title: node.title || node.id,
      x: centerX + Math.cos(angle) * 90,
      y: centerY + Math.sin(angle) * 90,
      vx: 0,
      vy: 0
    };
    byId.set(node.id, point);
    return point;
  });

  const linkedPairs = edges
    .map((edge) => ({ from: byId.get(edge.from), to: byId.get(edge.to), weight: edge.weight || 1 }))
    .filter((pair) => pair.from && pair.to);

  const iterations = Math.min(240, 80 + points.length * 8);
  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.001) {
          distSq = 0.001;
          dx = (Math.random() - 0.5) * 0.1;
          dy = (Math.random() - 0.5) * 0.1;
        }

        const repulsion = 900 / distSq;
        const invDist = 1 / Math.sqrt(distSq);
        a.vx -= dx * invDist * repulsion;
        a.vy -= dy * invDist * repulsion;
        b.vx += dx * invDist * repulsion;
        b.vy += dy * invDist * repulsion;
      }
    }

    for (const pair of linkedPairs) {
      const a = pair.from;
      const b = pair.to;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 120 - Math.min(40, pair.weight * 4);
      const spring = (distance - target) * 0.015;
      const ux = dx / distance;
      const uy = dy / distance;

      a.vx += ux * spring;
      a.vy += uy * spring;
      b.vx -= ux * spring;
      b.vy -= uy * spring;
    }

    for (const point of points) {
      point.vx *= 0.86;
      point.vy *= 0.86;

      point.x += point.vx;
      point.y += point.vy;

      point.x += (centerX - point.x) * 0.018;
      point.y += (centerY - point.y) * 0.018;

      point.x = Math.max(24, Math.min(width - 24, point.x));
      point.y = Math.max(24, Math.min(height - 24, point.y));
    }
  }

  return points;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadNotes();
loadGraph();
loadGraphDiff();
loadSystemMetrics();
loadGitHistory();

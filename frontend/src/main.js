import Chart from "chart.js/auto";
import cytoscape from "cytoscape";
import { createIcons, icons } from "lucide";
import { api } from "./api.js";
import { getRoute, navigate, subscribeRoute } from "./router.js";
import { appState, clearUnreadNotifications, markNotificationRead, pushToast, selectAlert, selectEntity, selectEvidence, selectTrend, setState } from "./state.js";
import { emptyState, escapeHtml, formatNumber, icon, initials, priorityBadge, sectionHeading, statusBadge } from "./ui.js";
import "./styles.css";

const chartInstances = new Map();
let networkInstance = null;
let searchDebounce = null;

let alerts = [], categories = [], entities = [], evidence = [], investigations = [], records = [], relationships = [], trends = [];
let dataLoaded = false;
let dataError = null;

async function loadData() {
  try {
    const [
      investigationsRes, entitiesRes, relationshipsRes, alertsRes,
      trendsRes, evidenceRes, recordsRes, categoriesRes,
    ] = await Promise.all([
      api.getInvestigations(), api.getEntities(), api.getRelationships(), api.getAlerts(),
      api.getTrends(), api.getEvidence(), api.getRecords(), api.getCategories(),
    ]);
    investigations = investigationsRes;
    entities = entitiesRes;
    relationships = relationshipsRes;
    alerts = alertsRes;
    trends = trendsRes;
    evidence = evidenceRes;
    records = recordsRes;
    categories = categoriesRes;
    dataLoaded = true;
    dataError = null;
  } catch (err) {
    console.error("Failed to load TRACE-X data", err);
    dataError = err;
  }
  renderApp();
}

function updateLocalAlert(updatedAlert) {
  if (!updatedAlert) return;
  const index = alerts.findIndex((a) => a.id === updatedAlert.id);
  if (index !== -1) alerts[index] = updatedAlert;
}

function updateLocalEvidence(updatedEvidence) {
  if (!updatedEvidence) return;
  const index = evidence.findIndex((e) => e.id === updatedEvidence.id);
  if (index !== -1) evidence[index] = updatedEvidence;
}

const routeLabels = {
  dashboard: "Command Center", investigations: "Investigations", entities: "Entities", entity: "Entity Profile",
  network: "Network Intelligence", timeline: "Activity Timeline", fusion: "Intelligence Fusion", trends: "Trend Radar",
  alerts: "Alert Center", evidence: "Evidence Vault", reports: "Reports", audit: "Audit Trail"
};

const navSections = [
  { label: "COMMAND", items: [{ route: "dashboard", label: "Command Center", icon: "layout-dashboard" }, { route: "investigations", label: "Investigations", icon: "briefcase-business" }] },
  { label: "INTELLIGENCE", items: [{ route: "entities", label: "Entities", icon: "scan-search" }, { route: "network", label: "Network Intelligence", icon: "share-2" }, { route: "timeline", label: "Activity Timeline", icon: "calendar-clock" }, { route: "fusion", label: "Intelligence Fusion", icon: "workflow" }, { route: "trends", label: "Trend Radar", icon: "radar" }] },
  { label: "REVIEW", items: [{ route: "alerts", label: "Alert Center", icon: "triangle-alert", count: 6 }, { route: "evidence", label: "Evidence Vault", icon: "folder-lock" }, { route: "reports", label: "Reports", icon: "file-check-2" }] },
  { label: "GOVERNANCE", items: [{ route: "audit", label: "Audit Trail", icon: "scroll-text" }] }
];

function renderApp() {
  const route = getRoute();
  appState.route = route;
  const root = document.querySelector("#app");
  if (!root) return;

  if (route === "login") {
    root.innerHTML = renderLogin();
    refreshIcons();
    return;
  }

  if (!dataLoaded) {
    root.innerHTML = dataError ? renderLoadError() : renderLoading();
    refreshIcons();
    return;
  }

  root.innerHTML = renderShell(route);
  refreshIcons();
  window.requestAnimationFrame(() => {
    renderRouteEnhancements(route);
    refreshIcons();
  });
}

function renderLoading() {
  return `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:#a6bac6;font-family:'IBM Plex Mono',monospace;">
    <div style="width:36px;height:36px;border:3px solid rgba(63,140,255,.25);border-top-color:#3f8cff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <p>Loading TRACE-X intelligence data…</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>`;
}

function renderLoadError() {
  return `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:#a6bac6;font-family:'IBM Plex Mono',monospace;text-align:center;padding:24px;">
    <p>Couldn't reach the TRACE-X backend.<br>Check that the server is running and the API URL is correct.</p>
    <button class="button button-primary" data-action="retry-load">Retry</button>
  </div>`;
}

function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.8 } });
}

function renderLogin() {
  return `<main class="login-screen">
    <div class="login-rail"></div>
    <section class="login-card">
      <div class="brand-lockup login-brand"><div class="brand-mark">${icon("orbit")}</div><div><strong>TRACE<span>-X</span></strong><small>INTELLIGENCE WORKSPACE</small></div></div>
      <div class="login-intro"><span class="eyebrow">SECURE ACCESS GATEWAY</span><h1>From fragmented signals<br><em>to actionable intelligence.</em></h1><p>Investigate relationships, patterns and evidence in one analyst-controlled workspace.</p></div>
      <form class="login-form" data-login-form>
        <label>Username<input name="username" value="analyst@trace-x.demo" autocomplete="username" /></label>
        <label>Password<div class="password-field"><input name="password" type="password" value="demo-orion" autocomplete="current-password" /><button type="button" class="icon-button" aria-label="Show password" data-action="toggle-password">${icon("eye")}</button></div></label>
        <label>Role<select name="role"><option>Investigator</option><option>Analyst</option><option>Viewer</option></select></label>
        <button class="button button-primary button-wide" type="submit">${icon("log-in")} SIGN IN</button>
      </form>
      <button class="button button-secondary button-wide" data-action="demo-mode">${icon("play-circle")} ENTER DEMO MODE</button>
      <div class="login-footer"><span>${icon("shield-check")} AUTHORIZED INTELLIGENCE ANALYSIS ENVIRONMENT</span><span>TRACE-X v0.9.4 · SYNTHETIC BUILD</span></div>
    </section>
    <aside class="login-side"><div class="side-kicker">OPERATION ORION</div><h2>One connected investigative story.</h2><div class="login-flow">${["Fragmented records", "Entity resolution", "Network discovery", "Evidence-backed action"].map((item, i) => `<div class="login-flow-item"><span>0${i + 1}</span><strong>${item}</strong></div>`).join("")}</div><p class="legal-copy">TRACE-X generates investigative signals for analyst review. Signals are not proof of criminal activity. This demonstration uses synthetic data.</p></aside>
  </main>`;
}

function renderShell(route) {
  const unread = appState.notifications.filter((item) => item.unread).length;
  const collapsedClass = appState.sidebarCollapsed ? " sidebar-collapsed" : "";
  return `<div class="app-shell${collapsedClass}">
    <aside class="sidebar">
      <div class="sidebar-brand"><div class="brand-mark">${icon("orbit")}</div><div class="brand-wordmark"><strong>TRACE<span>-X</span></strong><small>CYBER INTELLIGENCE</small></div><button class="icon-button sidebar-toggle" data-action="collapse-sidebar" aria-label="Collapse navigation">${icon("panel-left-close")}</button></div>
      <div class="sidebar-context"><span class="context-label">ACTIVE INVESTIGATION</span><button data-route="dashboard" class="context-button"><span><i class="active-pulse"></i>OPERATION ORION</span>${icon("chevron-down")}</button><span class="synthetic-label">${icon("flask-conical")} SYNTHETIC DEMONSTRATION DATA</span></div>
      <nav class="primary-nav" aria-label="Primary navigation">${navSections.map((section) => `<div class="nav-section"><div class="nav-label">${section.label}</div>${section.items.map((item) => `<button class="nav-item ${route === item.route ? "active" : ""}" data-route="${item.route}" title="${item.label}">${icon(item.icon)}<span>${item.label}</span>${item.count ? `<b>${item.count}</b>` : ""}</button>`).join("")}</div>`).join("")}</nav>
      <div class="sidebar-bottom"><div class="system-status"><span class="status-dot status-dot-live"></span><div><small>SYSTEM STATUS</small><strong>Operational</strong></div><span class="system-bars">▂▅▇</span></div><button class="nav-item" data-route="audit">${icon("settings-2")}<span>Workspace Settings</span></button></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="collapse-sidebar" aria-label="Open navigation">${icon("menu")}</button><div class="breadcrumb"><span>TRACE-X</span><i>/</i><strong>${routeLabels[route] ?? "Workspace"}</strong></div></div><div class="topbar-actions"><button class="search-trigger" data-action="open-search">${icon("search")}<span>Search intelligence</span><kbd>⌘ K</kbd></button><button class="icon-button notification-trigger" data-action="open-notifications" aria-label="Notifications">${icon("bell")}<span class="notification-dot ${unread ? "visible" : ""}"></span></button><span class="demo-pill"><i></i> DEMO MODE</span><button class="profile-trigger" data-action="open-profile"><span class="avatar">AP</span><span class="profile-copy"><strong>A. Patel</strong><small>INVESTIGATOR</small></span>${icon("chevron-down")}</button></div></header>
      <main class="content-area">${renderPage(route)}</main>
    </div>
  </div>
  <div id="overlay-root"></div>`;
}

function pageFrame(eyebrow, title, copy, actions = "") {
  return `<div class="page-frame"><div class="page-header"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div><div class="page-actions">${actions}</div></div><div class="data-ribbon"><span>${icon("flask-conical")} SYNTHETIC DEMONSTRATION DATA</span><span>${icon("shield-check")} AUDIT LOG ENABLED</span><span>${icon("fingerprint")} EVIDENCE INTEGRITY · SHA-256 ENABLED</span></div></div>`;
}

function metricCard(label, value, delta, iconName, route, tone = "blue") {
  return `<button class="metric-card metric-${tone}" data-route="${route}"><div class="metric-top"><span>${escapeHtml(label)}</span>${icon(iconName)}</div><strong>${escapeHtml(value)}</strong><div class="metric-bottom"><span class="metric-delta">${icon("arrow-up-right")} ${escapeHtml(delta)}</span><span>View detail ${icon("arrow-up-right")}</span></div></button>`;
}

function renderPage(route) {
  switch (route) {
    case "dashboard": return renderDashboard();
    case "investigations": return renderInvestigations();
    case "entities": return renderEntities();
    case "entity": return renderEntityProfile();
    case "network": return renderNetwork();
    case "timeline": return renderTimeline();
    case "fusion": return renderFusion();
    case "trends": return renderTrends();
    case "alerts": return renderAlerts();
    case "evidence": return renderEvidence();
    case "reports": return renderReports();
    case "audit": return renderAudit();
    default: return renderDashboard();
  }
}

function renderDashboard() {
  const highAlerts = alerts.filter((alert) => alert.severity === "HIGH").length;
  return `${pageFrame("COMMAND CENTER", "TRACE-X COMMAND CENTER", "A connected view of what changed, what matters, and what an investigator can verify next.", `<button class="button button-secondary" data-route="fusion">${icon("workflow")} View intelligence flow</button><button class="button button-primary" data-route="alerts">${icon("triangle-alert")} Review priority signals <span class="button-count">${highAlerts}</span></button>`)}
    <div class="page-content dashboard-content">
      <section class="metric-grid">${metricCard("ACTIVE INVESTIGATIONS", "05", "+2 this month", "briefcase-business", "investigations", "blue")}${metricCard("HIGH-PRIORITY SIGNALS", "10", "+4 in 24 hours", "scan-line", "alerts", "red")}${metricCard("INTELLIGENCE RECORDS", "150", "+18% vs baseline", "database", "timeline", "cyan")}${metricCard("EMERGING TRENDS", "04", "2 require review", "radar", "trends", "amber")}${metricCard("NETWORK ALERTS", "06", "3 unreviewed", "share-2", "network", "violet")}</section>
      <section class="dashboard-grid dashboard-top-grid"><div class="panel chart-panel"><div class="panel-header"><div><div class="eyebrow">SIGNAL VOLUME</div><h3>Threat activity timeline</h3></div><div class="segmented-control" data-range-control>${["7d", "30d", "90d"].map((range) => `<button class="${appState.filters.range === range ? "active" : ""}" data-range="${range}">${range.toUpperCase()}</button>`).join("")}</div></div><div class="chart-wrap activity-chart-wrap"><canvas id="activityChart" aria-label="Threat activity timeline chart"></canvas></div><div class="chart-legend"><span><i class="legend-dot blue"></i>Intelligence records</span><span><i class="legend-dot cyan"></i>Priority signals</span><span class="chart-note">Live synthetic baseline</span></div></div><div class="panel donut-panel"><div class="panel-header"><div><div class="eyebrow">FUSION COVERAGE</div><h3>Intelligence categories</h3></div>${icon("more-horizontal")}</div><div class="donut-wrap"><canvas id="categoryChart" aria-label="Intelligence category distribution chart"></canvas><div class="donut-center"><strong>150</strong><span>RECORDS</span></div></div><div class="category-list">${categories.slice(0, 4).map((category, i) => `<div><span class="category-swatch swatch-${i}"></span><span>${category}</span><b>${[38, 27, 22, 13][i]}%</b></div>`).join("")}</div></div></section>
      <section class="dashboard-grid dashboard-bottom-grid"><div class="panel priority-panel"><div class="panel-header"><div><div class="eyebrow">REVIEW QUEUE</div><h3>Priority signals</h3></div><button class="text-button" data-route="alerts">View all ${icon("arrow-up-right")}</button></div><div class="priority-list">${alerts.slice(0, 3).map((alert) => priorityRow(alert)).join("")}</div><div class="panel-footer"><span>${icon("circle-check")} Analyst queue synced 2 min ago</span><button class="text-button" data-route="alerts">Open alert center ${icon("arrow-right")}</button></div></div><div class="panel network-preview-panel"><div class="panel-header"><div><div class="eyebrow">RELATIONSHIP MAP</div><h3>Network preview</h3></div><button class="icon-button" data-route="network" aria-label="Open network intelligence">${icon("maximize-2")}</button></div><div class="mini-network" id="miniNetwork"></div><div class="network-preview-footer"><span><i class="legend-dot entity"></i>25 entities</span><span><i class="legend-dot source"></i>8 sources</span><span><i class="legend-dot relation"></i>60 relationships</span></div></div><div class="panel signals-panel"><div class="panel-header"><div><div class="eyebrow">PATTERN WATCH</div><h3>Emerging signals</h3></div><button class="text-button" data-route="trends">Explore radar ${icon("arrow-up-right")}</button></div>${trends.slice(0, 2).map((trend) => trendCompact(trend)).join("")}</div></section>
      <section class="judge-callout"><div class="callout-index">01</div><div><span class="eyebrow">THE TRACE-X DIFFERENCE</span><h2>Turn disconnected observations into a defensible investigative next step.</h2></div><div class="callout-flow"><span>RECORDS</span>${icon("arrow-right")}<span>CONNECTIONS</span>${icon("arrow-right")}<span>PRIORITY</span>${icon("arrow-right")}<span>EVIDENCE</span></div></section>
    </div>`;
}

function priorityRow(alert) {
  return `<button class="priority-row" data-open-alert="${alert.id}"><div class="priority-rank">${alert.id.replace("ALERT-", "")}</div><div class="priority-copy"><strong>${escapeHtml(alert.type)}</strong><span>${escapeHtml(alert.what)}</span></div><div class="priority-score"><b>${alert.priority}</b><span>${alert.severity}</span></div>${icon("chevron-right")}</button>`;
}

function trendCompact(trend) {
  return `<button class="trend-compact" data-open-trend="${trend.id}"><div class="trend-signal"><span class="trend-line trend-${trend.color}"></span><span><strong>${escapeHtml(trend.name)}</strong><small>EMERGING SIGNAL</small></span></div><div><b>+${trend.growth}%</b><span>${trend.confidence}% confidence</span></div>${icon("arrow-up-right")}</button>`;
}

function renderInvestigations() {
  return `${pageFrame("CASE MANAGEMENT", "Investigations", "Keep the investigative question, signal history and analyst decisions in one continuous workspace.", `<button class="button button-primary" data-action="new-investigation">${icon("plus")} New investigation</button>`)}<div class="page-content"><div class="investigation-hero"><div class="hero-orbit"><div class="orbit-ring orbit-ring-1"></div><div class="orbit-ring orbit-ring-2"></div><div class="orbit-core">${icon("orbit")}</div></div><div><span class="eyebrow">FLAGSHIP SYNTHETIC CASE</span><h2>OPERATION ORION</h2><p>Cross-source intelligence fusion for a fictional trafficking-network investigation scenario. Built to keep the analyst in control.</p><div class="hero-meta"><span>${icon("calendar")} Updated 13 Aug 2026</span><span>${icon("users-round")} 25 entities</span><span>${icon("shield-check")} Evidence lineage on</span></div></div><button class="button button-primary" data-route="fusion">Open investigation ${icon("arrow-up-right")}</button></div><div class="investigation-tabs">${["Overview", "Entities", "Network", "Timeline", "Intelligence", "Alerts", "Evidence", "Analyst Notes", "Reports"].map((tab, i) => `<button class="${i === 0 ? "active" : ""}" data-route="${["dashboard", "entities", "network", "timeline", "fusion", "alerts", "evidence", "audit", "reports"][i]}">${tab}</button>`).join("")}</div><div class="investigation-grid">${investigations.map((item) => `<article class="investigation-card ${item.id === "OPERATION-ORION" ? "featured" : ""}"><div class="card-topline"><span class="case-code">${item.id}</span>${statusBadge(item.status)}</div><h3>${item.name}</h3><p>${item.id === "OPERATION-ORION" ? "Synthetic intelligence fusion investigation" : "Synthetic investigation workspace"}</p><div class="case-stats"><span><b>${item.records}</b> records</span><span><b>${item.entities}</b> entities</span><span><b>${item.alerts}</b> alerts</span></div><button class="text-button" data-route="${item.id === "OPERATION-ORION" ? "dashboard" : "entities"}">Open workspace ${icon("arrow-right")}</button></article>`).join("")}</div></div>`;
}

function renderEntities() {
  const query = appState.filters.entityQuery.toLowerCase();
  const filtered = entities.filter((entity) => `${entity.id} ${entity.aliases.join(" ")} ${entity.type}`.toLowerCase().includes(query)).slice(0, 15);
  return `${pageFrame("ENTITY INTELLIGENCE", "Entities", "Resolve identity, inspect activity and carry a selected entity across the investigative workflow.", `<button class="button button-secondary" data-route="network">${icon("share-2")} Open network</button><button class="button button-primary" data-action="entity-resolution">${icon("git-compare-arrows")} Compare entities</button>`)}<div class="page-content"><div class="entity-searchbar">${icon("search")}<input id="entitySearch" placeholder="Search by entity ID, alias, type or source…" value="${escapeHtml(appState.filters.entityQuery)}" autocomplete="off" /><kbd>⌘ /</kbd></div><div class="entity-layout"><section class="panel entity-table-panel"><div class="panel-header"><div><div class="eyebrow">25 IDENTIFIED OBJECTS</div><h3>Entity registry</h3></div><span class="muted">Showing ${filtered.length} of 25</span></div><div class="entity-list">${filtered.map((entity) => entityListRow(entity)).join("")}</div></section><aside class="panel selected-entity-card">${renderSelectedEntitySummary()}</aside></div></div>`;
}

function entityListRow(entity) {
  return `<button class="entity-list-row ${appState.selectedEntity === entity.id ? "selected" : ""}" data-open-entity="${entity.id}"><span class="entity-avatar type-${entity.type.toLowerCase().replaceAll(" ", "-")}">${icon(entity.type === "Source" ? "radio-tower" : entity.type === "Topic" ? "tag" : entity.type === "Location" ? "map-pin" : "fingerprint")}</span><span class="entity-main"><strong>${escapeHtml(entity.id)}</strong><small>${escapeHtml(entity.type)} · ${escapeHtml(entity.aliases[0])}</small></span><span class="entity-sources">${entity.sources.length} sources</span><span class="entity-priority">${priorityBadge(entity.priority)}</span>${icon("chevron-right")}</button>`;
}

function renderSelectedEntitySummary() {
  const entity = entities.find((item) => item.id === appState.selectedEntity) ?? entities[0];
  return `<div class="selected-overline"><span class="eyebrow">SELECTED ENTITY</span>${priorityBadge(entity.priority)}</div><div class="profile-symbol">${icon("fingerprint")}</div><h3>${escapeHtml(entity.id)}</h3><span class="entity-type">${escapeHtml(entity.type)} · ${escapeHtml(entity.aliases.join(" · "))}</span><p>${escapeHtml(entity.description)}</p><div class="profile-metrics"><div><strong>${entity.activity}%</strong><span>activity index</span></div><div><strong>${relationships.filter((r) => r.source === entity.id || r.target === entity.id).length}</strong><span>relationships</span></div><div><strong>${entity.sources.length}</strong><span>sources</span></div></div><div class="profile-detail-list"><div><span>FIRST OBSERVED</span><b>${entity.firstObserved}</b></div><div><span>LAST OBSERVED</span><b>${entity.lastObserved}</b></div><div><span>COMMUNITY</span><b>${entity.community}</b></div></div><button class="button button-primary button-wide" data-route="entity">Open full profile ${icon("arrow-up-right")}</button><p class="legal-copy compact">${icon("info")} Analytical prioritization only. Not a determination of criminal activity.</p>`;
}

function renderEntityProfile() {
  const entity = entities.find((item) => item.id === appState.selectedEntity) ?? entities[0];
  const related = relationships.filter((r) => r.source === entity.id || r.target === entity.id).slice(0, 5);
  const entityRecords = records.filter((record) => record.entityId === entity.id).slice(0, 5);
  return `${pageFrame("ENTITY INTELLIGENCE / PROFILE", entity.id, "A single, explainable view of identity signals, relationships, activity and evidence.", `<button class="button button-secondary" data-route="entities">${icon("arrow-left")} Entity registry</button><button class="button button-primary" data-action="entity-resolution">${icon("git-compare-arrows")} Potential match</button>`)}<div class="page-content"><div class="profile-header panel"><div class="profile-symbol large">${icon("fingerprint")}</div><div class="profile-header-main"><div class="case-code">${entity.type.toUpperCase()} · ${entity.community}</div><h2>${escapeHtml(entity.id)}</h2><p>${escapeHtml(entity.description)}</p><div class="alias-row">${entity.aliases.map((alias) => `<span class="tag">${escapeHtml(alias)}</span>`).join("")}</div></div><div class="profile-header-priority"><span class="eyebrow">INVESTIGATIVE PRIORITY</span><strong>${entity.priority}<small>/100</small></strong>${priorityBadge(entity.priority)}<button class="text-button" data-action="show-score">Why this score? ${icon("arrow-up-right")}</button></div></div><div class="profile-kpis"><div><span>FIRST OBSERVED</span><b>${entity.firstObserved}</b></div><div><span>LAST OBSERVED</span><b>${entity.lastObserved}</b></div><div><span>SOURCES</span><b>${entity.sources.length}</b></div><div><span>RELATIONSHIPS</span><b>${related.length}</b></div><div><span>ALERTS</span><b>${alerts.filter((a) => a.entityIds.includes(entity.id)).length}</b></div></div><div class="profile-grid"><section class="panel"><div class="panel-header"><div><div class="eyebrow">CONNECTIONS</div><h3>Related intelligence</h3></div><button class="text-button" data-route="network">Open graph ${icon("arrow-up-right")}</button></div><div class="relation-list">${related.length ? related.map((relation) => `<button class="relation-row" data-open-entity="${relation.source === entity.id ? relation.target : relation.source}"><span class="relation-icon">${icon("link-2")}</span><span><strong>${escapeHtml(relation.source === entity.id ? relation.target : relation.source)}</strong><small>${escapeHtml(relation.type)} · ${relation.confidence}% confidence</small></span><time>${relation.timestamp.split(" ")[0]}</time>${icon("chevron-right")}</button>`).join("") : emptyState("NO RELATIONSHIPS", "Select another entity or expand the graph.")}</div></section><section class="panel"><div class="panel-header"><div><div class="eyebrow">RECENT ACTIVITY</div><h3>Intelligence records</h3></div><span class="muted">${records.filter((r) => r.entityId === entity.id).length} matched</span></div><div class="record-list">${entityRecords.map((record) => `<button class="record-row" data-open-record="${record.id}"><span class="record-time">${record.timestamp.slice(5, 16)}</span><span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.sourceId)} · ${record.confidence}% confidence</small></span>${icon("arrow-up-right")}</button>`).join("")}</div></section></div><div class="profile-grid"><section class="panel"><div class="panel-header"><div><div class="eyebrow">ENTITY RESOLUTION</div><h3>Potential entity match</h3></div><span class="confidence-pill">91% confidence</span></div><div class="match-compare"><div><span>ENTITY A</span><strong>ALPHA-17</strong><small>north-star · SOURCE-07</small></div><div class="match-score"><b>91%</b><span>potential match</span></div><div><span>ENTITY B</span><strong>BETA-04</strong><small>blue-orbit · SOURCE-03</small></div></div><div class="reason-chips"><span>Alias similarity</span><span>Shared source</span><span>Temporal overlap</span><span>Shared relationship</span></div><button class="button button-secondary" data-action="entity-resolution">Review comparison ${icon("arrow-up-right")}</button></section><section class="panel analyst-note-panel"><div class="panel-header"><div><div class="eyebrow">ANALYST CONTROL</div><h3>Open an evidence-backed action</h3></div>${icon("pen-line")}</div><p>AI signals stay provisional until an investigator reviews their supporting evidence and records a decision.</p><button class="button button-primary" data-open-alert="ALERT-009">Review ALERT-009 ${icon("arrow-up-right")}</button></section></div></div>`;
}

function renderNetwork() {
  return `${pageFrame("RELATIONSHIP ANALYSIS", "Network Intelligence", "Explore how synthetic entities, sources, topics and locations connect — then translate the graph into an investigative next step.", `<button class="button button-secondary" data-action="network-reset">${icon("rotate-ccw")} Reset graph</button><button class="button button-primary" data-action="network-fit">${icon("scan")} Fit graph</button>`)}<div class="page-content network-page"><div class="network-workspace"><div class="network-toolbar"><div class="network-search">${icon("search")}<input placeholder="Search nodes…" id="networkSearch" /><kbd>/</kbd></div><div class="network-actions"><button data-network-action="zoom-in" title="Zoom in">${icon("zoom-in")}</button><button data-network-action="zoom-out" title="Zoom out">${icon("zoom-out")}</button><button data-network-action="fit" title="Fit graph">${icon("scan")}</button><button data-network-action="highlight" title="Highlight selected connections">${icon("sparkles")}</button><button data-network-action="filter-sources">${icon("radio-tower")} Sources</button><button data-network-action="filter-topics">${icon("tag")} Topics</button></div></div><div class="graph-stage"><div id="networkGraph" class="network-graph" aria-label="Operation Orion relationship graph"></div><div class="graph-legend"><span><i class="graph-node-dot entity"></i>Entity</span><span><i class="graph-node-dot source"></i>Source</span><span><i class="graph-node-dot topic"></i>Topic</span><span><i class="graph-node-dot marketplace"></i>Marketplace</span><span><i class="graph-node-dot location"></i>Location</span></div><div class="graph-badge">${icon("flask-conical")} SYNTHETIC GRAPH · 25 NODES · 60 EDGES</div></div></div><aside class="analytics-panel"><div class="panel-header"><div><div class="eyebrow">GRAPH ANALYTICS</div><h3>Investigator lens</h3></div><button class="icon-button" data-action="toggle-analytics" aria-label="Collapse analytics">${icon("panel-right-close")}</button></div><div class="analytics-focus"><span class="focus-ring">63</span><div><b>${escapeHtml(appState.selectedEntity ?? "ALPHA-17")}</b><span>selected focal node</span></div></div><div class="analytics-metrics"><div><span>DEGREE CENTRALITY</span><strong>0.63</strong><small>Connects to 7 nearby nodes</small></div><div><span>BETWEENNESS CENTRALITY</span><strong>0.71</strong><small>Bridges separate clusters</small></div><div><span>CONNECTION DENSITY</span><strong>0.58</strong><small>Moderate local density</small></div><div><span>COMMUNITY</span><strong>Cluster 03</strong><small>6 related entities</small></div></div><div class="interpretation"><span>${icon("message-square-text")} ANALYST TRANSLATION</span><p>This entity connects multiple otherwise separate intelligence clusters. Graph metrics guide collection and review; they do not imply criminality.</p></div><div class="network-selected-actions"><button class="button button-primary button-wide" data-route="entity">Open entity profile ${icon("arrow-up-right")}</button><button class="button button-secondary button-wide" data-action="view-lineage">View supporting evidence ${icon("folder-search")}</button></div></aside></div></div>`;
}

function renderTimeline() {
  const topRecords = records.slice(0, 9);
  return `${pageFrame("TEMPORAL INTELLIGENCE", "Activity Timeline", "See activity spikes, recurring signals and relationship changes against a synthetic baseline.", `<div class="segmented-control large" data-range-control>${["7d", "30d", "90d"].map((range) => `<button class="${appState.filters.range === range ? "active" : ""}" data-range="${range}">${range.toUpperCase()}</button>`).join("")}</div>`)}<div class="page-content"><div class="panel timeline-chart-panel"><div class="panel-header"><div><div class="eyebrow">OPERATION ORION / ACTIVITY</div><h3>Signal chronology</h3></div><div class="timeline-summary"><span><b>+138%</b> peak growth</span><span><b>13 Aug</b> last event</span></div></div><div class="chart-wrap timeline-chart-wrap"><canvas id="timelineChart" aria-label="Activity timeline chart"></canvas></div><div class="timeline-event-tags"><span><i class="event-mark spike"></i>Activity spike</span><span><i class="event-mark relation"></i>New relationship</span><span><i class="event-mark trend"></i>Trend detected</span><span><i class="event-mark pause"></i>Inactivity period</span></div></div><div class="timeline-layout"><section class="panel"><div class="panel-header"><div><div class="eyebrow">EVENT STREAM</div><h3>Latest intelligence events</h3></div><span class="muted">Click an event to inspect the record</span></div><div class="timeline-list">${topRecords.map((record, i) => `<button class="timeline-event" data-open-record="${record.id}"><span class="event-marker ${i % 3 === 0 ? "spike" : i % 3 === 1 ? "relation" : "trend"}"></span><span class="timeline-event-copy"><time>${record.timestamp}</time><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.snippet)}</small></span><span class="confidence-pill">${record.confidence}%</span>${icon("chevron-right")}</button>`).join("")}</div></section><aside class="panel temporal-insight"><div class="eyebrow">PATTERN DETECTED</div><h3>Activity is accelerating around a connected relay cluster.</h3><p>The last 30-day window shows a sustained rise in records involving ORION-NODE-03 and SILVER-THREAD.</p><div class="insight-stat"><strong>+138%</strong><span>peak activity growth</span></div><button class="button button-secondary" data-open-trend="TREND-01">Open trend context ${icon("arrow-up-right")}</button></aside></div></div>`;
}

function renderFusion() {
  const stages = [
    ["01", "FRAGMENTED RECORDS", "150", "Intelligence records", "database", "150 source observations become a searchable corpus."],
    ["02", "ENTITY EXTRACTION", "25", "Identified entities", "scan-search", "Names, aliases, sources, topics and locations."],
    ["03", "RELATIONSHIP DISCOVERY", "60", "Relationships", "share-2", "Connections carry a timestamp, source and confidence."],
    ["04", "NETWORK GRAPH", "03", "Communities", "network", "The graph exposes bridges across clusters."],
    ["05", "TEMPORAL PATTERN", "+138%", "Peak growth", "activity", "Spikes and recurring activity become visible."],
    ["06", "TREND DETECTION", "04", "Emerging signals", "radar", "Growth is separated from interpretation."],
    ["07", "PRIORITY SIGNAL", "92", "Top priority", "scan-line", "A transparent triage signal ranks review order."],
    ["08", "EVIDENCE LINEAGE", "08", "Evidence items", "fingerprint", "Every finding points back to its source record."],
    ["09", "ANALYST VERIFICATION", "01", "Decision required", "user-check", "The investigator accepts, rejects or requests more evidence."]
  ];
  return `${pageFrame("SIGNATURE WORKFLOW", "Intelligence Fusion", "The TRACE-X signature: each analytical step preserves context until an investigator can make a defensible decision.", `<button class="button button-primary" data-route="alerts">${icon("scan-line")} Open review queue</button>`)}<div class="page-content fusion-page"><div class="fusion-intro"><div><span class="eyebrow">FRAGMENTED DATA → ACTION</span><h2>One connected investigative workflow.</h2><p>TRACE-X does not replace judgment. It makes the path from signal to evidence visible, explainable and fast to review.</p></div><div class="fusion-summary"><span><strong>150</strong> records</span><span><strong>25</strong> entities</span><span><strong>60</strong> relationships</span><span><strong>10</strong> alerts</span></div></div><div class="fusion-flow">${stages.map((stage, index) => `<button class="fusion-stage ${index === 6 ? "is-priority" : ""}" data-fusion-stage="${index}"><span class="stage-index">${stage[0]}</span><div class="stage-icon">${icon(stage[4])}</div><div class="stage-copy"><span>${stage[1]}</span><strong>${stage[2]}</strong><small>${stage[3]}</small></div><div class="stage-hover">${stage[5]}</div>${index < stages.length - 1 ? `<div class="stage-connector">${icon("arrow-down")}</div>` : ""}</button>`).join("")}</div><div class="fusion-bottom-grid"><div class="panel finding-panel"><div class="panel-header"><div><div class="eyebrow">EVIDENCE-BACKED FINDING</div><h3>ALPHA-17 ↔ BETA-04</h3></div><span class="confidence-pill high">91% confidence</span></div><p>Potential entity match based on alias similarity, shared source, temporal overlap and a shared relationship to ORION-NODE-03.</p><div class="finding-meta"><span>${icon("link-2")} 4 contributing signals</span><span>${icon("folder-search")} 2 supporting evidence items</span><span>${icon("user-check")} Analyst decision pending</span></div><div class="finding-actions"><button class="button button-primary" data-open-alert="ALERT-009">Review finding ${icon("arrow-up-right")}</button><button class="button button-secondary" data-action="view-lineage">View lineage ${icon("route")}</button></div></div><div class="panel philosophy-panel"><span class="eyebrow">DESIGNED FOR DEFENSIBLE REVIEW</span><h3>“Interesting” is not “actionable.”</h3><p>Each signal carries context, confidence and provenance so analysts can decide what deserves attention next.</p><div class="philosophy-rule"></div><span class="muted">Analyst control remains the final step.</span></div></div></div>`;
}

function renderTrends() {
  return `${pageFrame("PATTERN DETECTION", "Emerging Trend Radar", "Separate what is changing from what it means. Every radar signal is synthetic, contextual and reviewable.", `<button class="button button-secondary" data-route="timeline">${icon("calendar-clock")} View timeline</button>`)}<div class="page-content"><div class="trend-radar-layout"><section class="panel radar-panel"><div class="panel-header"><div><div class="eyebrow">OPERATION ORION / TREND FIELD</div><h3>Signal radar</h3></div><span class="radar-updated">UPDATED 13 AUG 2026</span></div><div class="radar-visual"><div class="radar-circle circle-one"></div><div class="radar-circle circle-two"></div><div class="radar-circle circle-three"></div><div class="radar-cross cross-x"></div><div class="radar-cross cross-y"></div><div class="radar-sweep"></div>${trends.map((trend, i) => `<button class="radar-point point-${i} ${appState.selectedTrend === trend.id ? "active" : ""}" data-open-trend="${trend.id}"><span></span><b>${trend.name.replace("Synthetic ", "").slice(0, 9)}</b></button>`).join("")}<div class="radar-origin">${icon("crosshair")}</div></div><div class="radar-footer"><span>${icon("target")} 4 signal clusters detected</span><span>${icon("info")} Distance indicates relative confidence</span></div></section><section class="trend-card-stack">${trends.map((trend) => trendCard(trend)).join("")}</section></div><div class="panel trend-detail-strip"><div><span class="eyebrow">SELECTED SIGNAL</span><h3>${escapeHtml(trends.find((trend) => trend.id === appState.selectedTrend)?.name ?? trends[0].name)}</h3></div><p>${escapeHtml(trends.find((trend) => trend.id === appState.selectedTrend)?.description ?? trends[0].description)}</p><button class="button button-secondary" data-action="view-lineage">View supporting evidence ${icon("folder-search")}</button></div><p class="legal-copy page-legal">${icon("info")} Trends are analytical leads for collection and review. They do not prove criminal activity.</p></div>`;
}

function trendCard(trend) {
  return `<button class="trend-card trend-border-${trend.color} ${appState.selectedTrend === trend.id ? "selected" : ""}" data-open-trend="${trend.id}"><div class="trend-card-top"><span class="trend-icon ${trend.color}">${icon("radar")}</span><span class="eyebrow">EMERGING SIGNAL</span>${icon("arrow-up-right")}</div><h3>${escapeHtml(trend.name)}</h3><p>${escapeHtml(trend.description)}</p><div class="trend-stat-grid"><div><span>GROWTH</span><strong>+${trend.growth}%</strong></div><div><span>CONFIDENCE</span><strong>${trend.confidence}%</strong></div><div><span>RELATED</span><strong>${trend.entities}</strong></div></div><div class="trend-progress"><span style="width:${trend.confidence}%"></span></div><div class="trend-card-footer"><span>${statusBadge(trend.status)}</span><span>Click to inspect</span></div></button>`;
}

function renderAlerts() {
  const severity = appState.filters.severity;
  const status = appState.filters.alertStatus;
  const filtered = alerts.filter((alert) => (severity === "ALL" || alert.severity === severity) && (status === "ALL" || alert.status === status));
  return `${pageFrame("ANALYST REVIEW", "Alert Center", "Prioritize what changed, why it matters and what evidence is available before taking action.", `<button class="button button-secondary" data-action="clear-alert-filters">${icon("list-filter")} Clear filters</button>`)}<div class="page-content"><div class="alert-summary-row"><div><span class="eyebrow">REVIEW QUEUE</span><h2>${filtered.length} signals need context, not assumptions.</h2></div><div class="alert-summary-metrics"><span><b>${alerts.filter((a) => a.severity === "HIGH").length}</b> high</span><span><b>${alerts.filter((a) => a.status === "UNREVIEWED").length}</b> unreviewed</span><span><b>${alerts.filter((a) => a.status === "VERIFIED").length}</b> verified</span></div></div><div class="filter-bar"><div class="filter-group"><span>SEVERITY</span>${["ALL", "HIGH", "MEDIUM", "LOW"].map((value) => `<button class="filter-chip ${severity === value ? "active" : ""}" data-alert-severity="${value}">${value}</button>`).join("")}</div><div class="filter-group"><span>STATUS</span>${["ALL", "UNREVIEWED", "ASSIGNED", "ACKNOWLEDGED", "VERIFIED"].map((value) => `<button class="filter-chip ${status === value ? "active" : ""}" data-alert-status="${value}">${value}</button>`).join("")}</div></div><div class="alert-grid">${filtered.map((alert) => alertCard(alert)).join("")}</div>${filtered.length ? "" : emptyState("NO SIGNALS MATCH", "Clear a filter to return to the full analyst queue.", `<button class="button button-secondary" data-action="clear-alert-filters">Clear filters</button>`)}</div>`;
}

function alertCard(alert) {
  return `<article class="alert-card severity-${alert.severity.toLowerCase()}"><div class="alert-card-top"><div><span class="alert-severity">${icon(alert.severity === "HIGH" ? "triangle-alert" : "info")} ${alert.severity}</span><span class="case-code">${alert.id}</span></div>${statusBadge(alert.status)}</div><h3>${escapeHtml(alert.type)}</h3><div class="alert-what"><span>WHAT HAPPENED</span><p>${escapeHtml(alert.what)}</p></div><div class="alert-why"><span>WHY IT MATTERS</span><p>${escapeHtml(alert.why)}</p></div><div class="alert-card-meta"><span>${icon("badge-check")} ${alert.confidence}% confidence</span><span>${icon("clock-3")} ${alert.timestamp}</span></div><div class="alert-related">${alert.entityIds.map((id) => `<button class="tag" data-open-entity="${id}">${escapeHtml(id)}</button>`).join("")}${alert.evidenceIds.map((id) => `<button class="tag evidence-tag" data-open-evidence="${id}">${escapeHtml(id)}</button>`).join("")}</div><div class="alert-card-actions"><button class="button button-secondary" data-open-alert="${alert.id}">View details</button>${alert.status === "UNREVIEWED" ? `<button class="button button-primary" data-review-alert="${alert.id}">${icon("user-check")} Review</button>` : `<button class="button button-ghost" data-action="acknowledge-alert" data-alert-id="${alert.id}">${icon("check")} Acknowledge</button>`}</div></article>`;
}

function renderEvidence() {
  const selected = evidence.find((item) => item.id === appState.selectedEvidence) ?? evidence[0];
  return `${pageFrame("PROVENANCE & INTEGRITY", "Evidence Vault", "Trace every finding back to a source record, analytical method and analyst decision.", `<button class="button button-secondary" data-action="export-evidence">${icon("download")} Export index</button><button class="button button-primary" data-action="view-lineage">${icon("route")} Open lineage</button>`)}<div class="page-content"><div class="evidence-layout"><section class="panel evidence-list-panel"><div class="panel-header"><div><div class="eyebrow">8 LINKED ITEMS</div><h3>Evidence index</h3></div><div class="evidence-integrity"><span class="status-dot status-dot-live"></span> SHA-256 enabled</div></div><div class="evidence-list">${evidence.map((item) => `<button class="evidence-row ${selected.id === item.id ? "selected" : ""}" data-open-evidence="${item.id}"><span class="evidence-file">${icon(item.type === "Network analysis" ? "share-2" : item.type === "Trend detection" ? "radar" : "file-lock-2")}</span><span class="evidence-row-main"><strong>${item.id}</strong><small>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</small></span><span class="evidence-confidence">${item.confidence}%</span><span>${statusBadge(item.status)}</span>${icon("chevron-right")}</button>`).join("")}</div></section><aside class="panel evidence-detail-panel"><div class="panel-header"><div><div class="eyebrow">SELECTED EVIDENCE</div><h3>${selected.id}</h3></div>${statusBadge(selected.status)}</div><div class="evidence-doc-icon">${icon("file-lock-2")}</div><h2>${escapeHtml(selected.type)}</h2><p>${escapeHtml(selected.finding)}</p><div class="evidence-fields"><div><span>SOURCE</span><b>${escapeHtml(selected.source)}</b></div><div><span>TIMESTAMP</span><b>${escapeHtml(selected.timestamp)}</b></div><div><span>CONFIDENCE</span><b>${selected.confidence}%</b></div><div><span>SHA-256</span><b class="mono">${escapeHtml(selected.fullHash)}</b></div></div><div class="lineage-mini"><div><span>01</span><b>Finding</b></div>${icon("arrow-down")}<div><span>02</span><b>Source record</b></div>${icon("arrow-down")}<div><span>03</span><b>Analyst decision</b></div></div><button class="button button-primary button-wide" data-action="view-lineage">View full evidence lineage ${icon("arrow-up-right")}</button><p class="legal-copy compact">${icon("info")} A hash supports integrity checking; it does not alone establish legal admissibility.</p></aside></div></div>`;
}

function renderReports() {
  return `${pageFrame("ANALYTICAL OUTPUT", "Reports", "Turn the current investigation state into a structured, evidence-referenced intelligence brief.", `<button class="button button-secondary" data-action="preview-report">${icon("eye")} Preview report</button><button class="button button-primary" data-action="generate-report">${icon("file-output")} Generate report</button>`)}<div class="page-content"><div class="report-layout"><section class="panel report-preview-card"><div class="report-cover"><span class="eyebrow">TRACE-X INTELLIGENCE REPORT</span><div class="report-logo">${icon("orbit")}</div><h2>Operation Orion</h2><p>Evidence-backed analytical brief</p><div class="report-cover-meta"><span>REPORT TYPE<br><b>Investigation summary</b></span><span>CLASSIFICATION<br><b>DEMO / SYNTHETIC</b></span><span>GENERATED<br><b>13 Aug 2026</b></span></div></div><div class="report-outline"><div class="panel-header"><div><div class="eyebrow">DOCUMENT OUTLINE</div><h3>12 report sections</h3></div><span class="muted">Ready to generate</span></div>${["Executive Summary", "Investigation Overview", "Key Findings", "Key Entities", "Network Analysis", "Timeline", "Emerging Trends", "Priority Signals", "Evidence References", "Analyst Verification", "Limitations", "Conclusion"].map((item, i) => `<div class="outline-row"><span>${String(i + 1).padStart(2, "0")}</span><b>${item}</b>${icon("check")}</div>`).join("")}</div></section><aside class="report-side"><div class="panel"><div class="eyebrow">CURRENT SCOPE</div><h3>Operation Orion</h3><p>The report will use current state and selected evidence. All claims remain labelled as synthetic analytical signals.</p><div class="report-scope-list"><span>${icon("database")} 150 records</span><span>${icon("users-round")} 25 entities</span><span>${icon("share-2")} 60 relationships</span><span>${icon("folder-lock")} 8 evidence items</span></div><button class="button button-primary button-wide" data-action="generate-report">Generate from current state ${icon("arrow-up-right")}</button></div><div class="panel limitations-card"><div class="eyebrow">LIMITATIONS INCLUDED</div><h3>Keep the output defensible.</h3><ul><li>Synthetic demonstration data only</li><li>Signals require analyst verification</li><li>Graph metrics are context, not proof</li><li>Hashing supports integrity, not admissibility</li></ul></div></aside></div></div>`;
}

function renderAudit() {
  const events = [
    ["13 Aug 2026 · 09:42", "A. Patel", "Opened ALERT-009", "Review queue"], ["13 Aug 2026 · 09:36", "TRACE-X", "Generated EVD-0087", "Entity resolution"], ["13 Aug 2026 · 09:21", "A. Patel", "Selected ALPHA-17", "Entity profile"], ["12 Aug 2026 · 18:15", "TRACE-X", "Created ALERT-004", "Activity spike"], ["12 Aug 2026 · 15:08", "TRACE-X", "Flagged potential entity match", "Resolution engine"], ["11 Aug 2026 · 11:22", "A. Patel", "Acknowledged ALERT-002", "Network cluster"]
  ];
  return `${pageFrame("GOVERNANCE", "Audit Trail", "A transparent record of analyst actions and automated signal generation in this demonstration workspace.", `<button class="button button-secondary" data-action="export-audit">${icon("download")} Export audit log</button>`)}<div class="page-content"><div class="audit-banner"><div class="audit-icon">${icon("scroll-text")}</div><div><span class="eyebrow">AUDIT LOG</span><h2>Every decision leaves a trace.</h2><p>Demo activity is deterministic and local. Production deployments should connect these events to an immutable server-side audit store.</p></div><div class="audit-status">${statusBadge("ENABLED")}</div></div><div class="audit-layout"><section class="panel audit-table"><div class="panel-header"><div><div class="eyebrow">ACTIVITY LOG</div><h3>Recent events</h3></div><span class="muted">Last 6 events</span></div>${events.map((event) => `<div class="audit-row"><span class="audit-time">${event[0]}</span><span class="audit-actor">${event[1] === "TRACE-X" ? icon("cpu") : icon("user-round")} ${event[1]}</span><span class="audit-event"><b>${event[2]}</b><small>${event[3]}</small></span><span class="audit-check">${icon("check-circle-2")}</span></div>`).join("")}</section><aside class="panel governance-panel"><div class="eyebrow">SYSTEM STATUS</div><div class="governance-status"><span class="status-dot status-dot-live"></span><strong>Operational</strong></div><div class="governance-list"><div><span>DATA SOURCE</span><b>Synthetic dataset</b></div><div><span>ACCESS</span><b>Investigator</b></div><div><span>SESSION</span><b>Demo / local</b></div><div><span>INTEGRITY</span><b>SHA-256 enabled</b></div></div><button class="button button-secondary button-wide" data-action="signout">${icon("log-out")} Return to access gateway</button></aside></div></div>`;
}

function renderRouteEnhancements(route) {
  destroyCharts();
  if (route === "dashboard") { createActivityChart("activityChart"); createCategoryChart("categoryChart"); createNetwork("miniNetwork", true); }
  if (route === "network") createNetwork("networkGraph", false);
  if (route === "timeline") createTimelineChart("timelineChart");
}

function destroyCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.clear();
  if (networkInstance) { networkInstance.destroy(); networkInstance = null; }
}

function chartOptions(options = {}) {
  return { responsive: true, maintainAspectRatio: false, animation: { duration: 420 }, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111f2d", borderColor: "#2b4053", borderWidth: 1, titleColor: "#ecf5fa", bodyColor: "#a6bac6", padding: 12, displayColors: false } }, scales: { x: { grid: { color: "rgba(137, 167, 184, .08)" }, ticks: { color: "#6f8797", font: { family: "IBM Plex Mono", size: 10 }, maxTicksLimit: 8 } }, y: { grid: { color: "rgba(137, 167, 184, .08)" }, ticks: { color: "#6f8797", font: { family: "IBM Plex Mono", size: 10 } }, beginAtZero: true } }, ...options };
}

function createActivityChart(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const range = appState.filters.range;
  const count = range === "7d" ? 7 : range === "90d" ? 12 : 10;
  const labels = Array.from({ length: count }, (_, i) => range === "90d" ? `W${i + 1}` : `${String(i + 4).padStart(2, "0")} AUG`);
  const recordsData = range === "7d" ? [42, 56, 49, 73, 61, 88, 96] : range === "90d" ? [32, 44, 39, 52, 48, 61, 57, 79, 72, 91, 86, 112] : [42, 49, 56, 51, 67, 73, 62, 88, 81, 104];
  const signalData = recordsData.map((value, i) => Math.max(7, Math.round(value * (0.24 + (i % 3) * 0.03))));
  const chart = new Chart(canvas, { type: "line", data: { labels, datasets: [{ label: "Intelligence records", data: recordsData, borderColor: "#3f8cff", backgroundColor: "rgba(63,140,255,.12)", fill: true, tension: .38, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: "#3f8cff", borderWidth: 2 }, { label: "Priority signals", data: signalData, borderColor: "#5dd9db", backgroundColor: "transparent", tension: .38, pointRadius: 2, pointBackgroundColor: "#5dd9db", borderWidth: 2 }] }, options: chartOptions() });
  chartInstances.set(id, chart);
}

function createCategoryChart(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const chart = new Chart(canvas, { type: "doughnut", data: { labels: categories.slice(0, 4), datasets: [{ data: [38, 27, 22, 13], backgroundColor: ["#3f8cff", "#5dd9db", "#e7b86b", "#906ff0"], borderColor: "#111f2d", borderWidth: 4, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "76%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111f2d", borderColor: "#2b4053", borderWidth: 1, padding: 12 } } } });
  chartInstances.set(id, chart);
}

function createTimelineChart(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const labels = Array.from({ length: 14 }, (_, i) => `${String(i + 1).padStart(2, "0")} AUG`);
  const values = [12, 18, 14, 21, 19, 28, 34, 31, 44, 39, 52, 65, 71, 86];
  const chart = new Chart(canvas, { type: "bar", data: { labels, datasets: [{ label: "Records", data: values, backgroundColor: values.map((_, i) => i > 10 ? "#5dd9db" : "rgba(63,140,255,.62)"), borderRadius: 4, borderSkipped: false, barPercentage: .68 }] }, options: chartOptions({ plugins: { tooltip: { callbacks: { afterLabel: (context) => context.dataIndex > 10 ? "Activity spike detected" : "Synthetic baseline" } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: "#6f8797", font: { family: "IBM Plex Mono", size: 10 } } }, y: { grid: { color: "rgba(137, 167, 184, .08)" }, ticks: { color: "#6f8797", font: { family: "IBM Plex Mono", size: 10 } }, beginAtZero: true } } }) });
  chartInstances.set(id, chart);
}

function createNetwork(id, mini = false) {
  const container = document.getElementById(id);
  if (!container) return;
  const visibleEntities = mini ? entities.slice(0, 12) : entities.slice(0, 18);
  const ids = new Set(visibleEntities.map((entity) => entity.id));
  const nodes = visibleEntities.map((entity) => ({ data: { id: entity.id, label: entity.id, type: entity.type, priority: entity.priority } }));
  const edges = relationships.filter((relation) => ids.has(relation.source) && ids.has(relation.target)).slice(0, mini ? 22 : 42).map((relation) => ({ data: { id: relation.id, source: relation.source, target: relation.target, label: relation.type } }));
  networkInstance = cytoscape({ container, elements: { nodes, edges }, layout: { name: "cose", animate: false, padding: mini ? 18 : 44, randomize: true }, userZoomingEnabled: !mini, userPanningEnabled: !mini, boxSelectionEnabled: false, style: [{ selector: "node", style: { "background-color": (node) => node.data("type") === "Source" ? "#5dd9db" : node.data("type") === "Topic" ? "#e7b86b" : node.data("type") === "Marketplace" ? "#906ff0" : node.data("type") === "Location" ? "#d87b97" : "#3f8cff", label: mini ? "" : "data(label)", color: "#d8e5ec", "font-size": mini ? 0 : 10, "font-family": "IBM Plex Mono", "text-valign": "bottom", "text-margin-y": 8, width: (node) => mini ? (node.data("priority") > 80 ? 18 : 12) : (node.data("priority") > 80 ? 34 : 24), height: (node) => mini ? (node.data("priority") > 80 ? 18 : 12) : (node.data("priority") > 80 ? 34 : 24), "border-width": (node) => node.data("id") === appState.selectedEntity ? 3 : 1, "border-color": (node) => node.data("id") === appState.selectedEntity ? "#ffffff" : "rgba(255,255,255,.22)" } }, { selector: "edge", style: { width: mini ? 1 : 1.4, "line-color": "rgba(107,145,165,.38)", "target-arrow-color": "rgba(107,145,165,.38)", "target-arrow-shape": "triangle", "curve-style": "bezier", opacity: .8 } }, { selector: ".faded", style: { opacity: .12 } }, { selector: ".highlighted", style: { "border-color": "#ffffff", "border-width": 4, opacity: 1 } }] });
  networkInstance.on("tap", "node", (event) => {
    const node = event.target;
    selectEntity(node.id());
    if (!mini) openIntelligenceDrawer(node.id()); else pushToast(`${node.id()} selected · open Network Intelligence for full context`, "info");
  });
}

function openOverlay(content, className = "") {
  const root = document.getElementById("overlay-root");
  if (!root) return;
  root.innerHTML = `<div class="overlay-backdrop" data-action="close-overlay"><div class="overlay-card ${className}" role="dialog" aria-modal="true" data-overlay-card>${content}</div></div>`;
  refreshIcons();
  window.requestAnimationFrame(() => document.querySelector(".overlay-card")?.classList.add("is-open"));
}

function closeOverlay() {
  const root = document.getElementById("overlay-root");
  if (root) root.innerHTML = "";
}

function openIntelligenceDrawer(entityId = appState.selectedEntity) {
  const entity = entities.find((item) => item.id === entityId) ?? entities[0];
  const related = relationships.filter((r) => r.source === entity.id || r.target === entity.id).slice(0, 4);
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">INTELLIGENCE PANEL</span><h2>${escapeHtml(entity.id)}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close panel">${icon("x")}</button></div><div class="drawer-badge-row">${statusBadge("SELECTED")} ${priorityBadge(entity.priority)}</div><div class="drawer-entity-intro"><div class="profile-symbol">${icon("fingerprint")}</div><p>${escapeHtml(entity.description)}</p></div><div class="drawer-section"><span class="eyebrow">ENTITY DETAILS</span><div class="drawer-fields"><span><small>TYPE</small><b>${entity.type}</b></span><span><small>COMMUNITY</small><b>${entity.community}</b></span><span><small>LAST ACTIVITY</small><b>${entity.lastObserved}</b></span><span><small>SOURCES</small><b>${entity.sources.length}</b></span></div></div><div class="drawer-section"><div class="drawer-section-heading"><span class="eyebrow">RELATIONSHIPS</span><span>${related.length} nearby</span></div>${related.map((relation) => `<div class="drawer-relation"><span class="relation-icon">${icon("link-2")}</span><span><b>${relation.source === entity.id ? relation.target : relation.source}</b><small>${relation.type} · ${relation.confidence}%</small></span></div>`).join("")}</div><div class="drawer-section"><span class="eyebrow">LATEST ACTIVITY</span><p class="drawer-activity">${escapeHtml(records.find((record) => record.entityId === entity.id)?.snippet ?? "No recent record selected.")}</p></div><div class="drawer-actions"><button class="button button-primary button-wide" data-action="drawer-open-entity">Open entity profile ${icon("arrow-up-right")}</button><button class="button button-secondary button-wide" data-action="view-lineage">View evidence ${icon("folder-search")}</button></div>`, "drawer-overlay");
}

function openScoreDrawer() {
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">EXPLAINABILITY</span><h2>Why this score?</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close explanation">${icon("x")}</button></div><div class="score-drawer-hero"><strong>82<small>/100</small></strong><div>${priorityBadge(82)}<p>High priority for analyst review</p></div></div><p class="drawer-copy">This is an analytical prioritization signal, not a determination of criminal activity. The score helps order limited review time.</p><div class="score-breakdown">${[["Cross-source relationship", "+18", "EVD-0088", "13 Aug · 09:39", 88], ["Activity anomaly", "+20", "EVD-0084", "12 Aug · 18:11", 84], ["Network centrality", "+15", "EVD-0085", "11 Aug · 11:18", 79], ["Entity similarity", "+14", "EVD-0087", "13 Aug · 09:36", 91], ["Emerging trend association", "+15", "EVD-0086", "10 Aug · 21:27", 84]].map((item) => `<div class="score-factor"><div class="score-factor-top"><span>${icon("plus")} ${item[0]}</span><b>${item[1]}</b></div><div class="score-factor-meta"><span>${item[2]} · ${item[3]}</span><span>${item[4]}% confidence</span></div><div class="factor-bar"><span style="width:${item[4]}%"></span></div></div>`).join("")}</div><div class="drawer-actions"><button class="button button-primary button-wide" data-open-alert="ALERT-009">Review contributing signal ${icon("arrow-up-right")}</button></div>`, "drawer-overlay");
}

function openLineageDrawer(evidenceId = appState.selectedEvidence) {
  const selected = evidence.find((item) => item.id === evidenceId) ?? evidence[0];
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">PROVENANCE CHAIN</span><h2>Evidence lineage</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close lineage">${icon("x")}</button></div><div class="lineage-hero"><span class="evidence-file large">${icon("route")}</span><div><strong>${selected.id}</strong><span>${escapeHtml(selected.type)} · ${selected.confidence}% confidence</span></div></div><div class="lineage-steps"><div class="lineage-step"><span class="lineage-number">01</span><div><span class="eyebrow">FINDING</span><h3>${escapeHtml(selected.finding)}</h3><small>Generated by TRACE-X analytical method</small></div></div><div class="lineage-line"></div><div class="lineage-step"><span class="lineage-number">02</span><div><span class="eyebrow">SOURCE RECORD</span><h3>${escapeHtml(selected.source)}</h3><small>${escapeHtml(selected.timestamp)} · original synthetic observation</small></div></div><div class="lineage-line"></div><div class="lineage-step"><span class="lineage-number">03</span><div><span class="eyebrow">INTEGRITY CHECK</span><h3 class="mono">${escapeHtml(selected.fullHash)}</h3><small>SHA-256 fingerprint · ${statusBadge(selected.status)}</small></div></div><div class="lineage-line"></div><div class="lineage-step"><span class="lineage-number">04</span><div><span class="eyebrow">ANALYST DECISION</span><h3>${selected.status === "VERIFIED" ? "Verified for this demonstration" : "Awaiting analyst review"}</h3><small>Decision remains editable and is preserved in audit trail.</small></div></div></div><p class="legal-copy">${icon("info")} Hashing supports integrity verification; it does not alone establish legal admissibility.</p><div class="drawer-actions"><button class="button button-primary button-wide" data-action="close-overlay">Close lineage ${icon("check")}</button></div>`, "drawer-overlay");
}

function openAlertDrawer(alertId = appState.selectedAlert) {
  const alert = alerts.find((item) => item.id === alertId) ?? alerts[0];
  selectAlert(alert.id);
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">SIGNAL REVIEW</span><h2>${alert.id}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close alert">${icon("x")}</button></div><div class="alert-drawer-title"><span class="alert-severity">${icon("triangle-alert")} ${alert.severity}</span><h3>${escapeHtml(alert.type)}</h3>${statusBadge(alert.status)}</div><div class="drawer-review-block"><span class="eyebrow">WHAT HAPPENED</span><p>${escapeHtml(alert.what)}</p><span class="eyebrow">WHY IT MATTERS</span><p>${escapeHtml(alert.why)}</p></div><div class="drawer-review-grid"><div><span>CONFIDENCE</span><strong>${alert.confidence}%</strong></div><div><span>PRIORITY</span><strong>${alert.priority}/100</strong></div><div><span>TIMESTAMP</span><strong>${alert.timestamp}</strong></div></div><div class="drawer-section"><div class="drawer-section-heading"><span class="eyebrow">RELATED ENTITIES</span><span>${alert.entityIds.length} linked</span></div><div class="drawer-tags">${alert.entityIds.map((id) => `<button class="tag" data-open-entity="${id}">${id}</button>`).join("")}</div></div><div class="drawer-section"><div class="drawer-section-heading"><span class="eyebrow">SUPPORTING EVIDENCE</span><span>${alert.evidenceIds.length} items</span></div><div class="drawer-tags">${alert.evidenceIds.map((id) => `<button class="tag evidence-tag" data-open-evidence="${id}">${id}</button>`).join("")}</div></div><div class="analyst-review-note">${icon("user-check")} AI signal → evidence → confidence → analyst decision</div><div class="drawer-actions review-actions"><button class="button button-primary" data-review-alert="${alert.id}">${icon("check")} Review signal</button><button class="button button-secondary" data-action="view-lineage">${icon("route")} Lineage</button></div>`, "drawer-overlay wide-drawer");
}

function openTrendDrawer(trendId = appState.selectedTrend) {
  const trend = trends.find((item) => item.id === trendId) ?? trends[0];
  selectTrend(trend.id);
  const related = entities.filter((entity) => entity.id === "SILVER-THREAD" || entity.id === "TOPIC-CASCADE" || entity.id === "ORION-NODE-03").slice(0, 3);
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">RADAR SIGNAL</span><h2>${escapeHtml(trend.name)}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close trend">${icon("x")}</button></div><div class="trend-drawer-score"><div class="trend-icon ${trend.color}">${icon("radar")}</div><div><strong>+${trend.growth}%</strong><span>growth against synthetic baseline</span></div><div><strong>${trend.confidence}%</strong><span>confidence</span></div></div><p class="drawer-copy">${escapeHtml(trend.description)} This is an analytical lead for collection and review, not a conclusion about conduct.</p><div class="drawer-section"><span class="eyebrow">RELATED ENTITIES</span><div class="drawer-related-list">${related.map((entity) => `<button class="drawer-related-row" data-open-entity="${entity.id}"><span>${icon("fingerprint")}</span><b>${entity.id}</b><small>${entity.activity}% activity</small>${icon("chevron-right")}</button>`).join("")}</div></div><div class="trend-mini-chart"><div class="trend-mini-line"></div><span>activity trend · 30 day window</span></div><div class="drawer-actions"><button class="button button-primary button-wide" data-action="view-lineage">View supporting evidence ${icon("folder-search")}</button></div>`, "drawer-overlay");
}

function openResolutionModal() {
  openOverlay(`<div class="modal-header"><div><span class="eyebrow">ENTITY RESOLUTION</span><h2>Potential entity match</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close comparison">${icon("x")}</button></div><div class="resolution-compare"><div class="resolution-entity"><span>ENTITY A</span><div class="profile-symbol">${icon("fingerprint")}</div><strong>ALPHA-17</strong><small>north-star · A17</small><div class="resolution-source">SOURCE-07 · SOURCE-02</div></div><div class="resolution-center"><span>Potential match</span><strong>91%</strong><small>HIGH CONFIDENCE</small></div><div class="resolution-entity"><span>ENTITY B</span><div class="profile-symbol">${icon("fingerprint")}</div><strong>BETA-04</strong><small>blue-orbit · B4</small><div class="resolution-source">SOURCE-07 · SOURCE-03</div></div></div><div class="resolution-reasons"><div><span>${icon("fingerprint")} Identifier similarity</span><b>94%</b></div><div><span>${icon("tag")} Alias similarity</span><b>89%</b></div><div><span>${icon("clock-3")} Temporal overlap</span><b>92%</b></div><div><span>${icon("share-2")} Shared relationships</span><b>87%</b></div><div><span>${icon("radio-tower")} Source overlap</span><b>96%</b></div></div><div class="resolution-warning">${icon("shield-alert")} Never automatically merge uncertain entities. Analyst verification is required.</div><div class="modal-actions"><button class="button button-secondary" data-action="reject-match">Reject</button><button class="button button-secondary" data-action="view-lineage">Review evidence</button><button class="button button-primary" data-action="verify-match">Verify match ${icon("check")}</button></div>`, "modal-overlay");
}

function openSearch() {
  openOverlay(`<div class="search-modal"><div class="search-modal-top"><div class="search-modal-input">${icon("search")}<input id="globalSearch" autofocus placeholder="Search entities, investigations, alerts, evidence…" /><kbd>ESC</kbd></div><button class="icon-button" data-action="close-overlay" aria-label="Close search">${icon("x")}</button></div><div id="searchResults" class="search-results">${renderSearchResults("")}</div><div class="search-footer"><span>${icon("corner-down-left")} Open result</span><span>${icon("arrow-up-down")} Navigate</span><span>${icon("command")} K to reopen</span></div></div>`, "search-overlay");
  const input = document.getElementById("globalSearch");
  input?.focus();
}

function renderSearchResults(query) {
  const q = query.toLowerCase().trim();
  if (!q) return `<div class="search-empty">${icon("scan-search")}<strong>Search the full intelligence corpus</strong><span>Try “ALPHA-17”, “ALERT-009” or “EVD-0087”</span></div>`;
  const entityMatches = entities.filter((entity) => `${entity.id} ${entity.aliases.join(" ")} ${entity.type}`.toLowerCase().includes(q)).slice(0, 4);
  const alertMatches = alerts.filter((alert) => `${alert.id} ${alert.type} ${alert.what}`.toLowerCase().includes(q)).slice(0, 3);
  const evidenceMatches = evidence.filter((item) => `${item.id} ${item.type} ${item.finding}`.toLowerCase().includes(q)).slice(0, 3);
  const sections = [];
  if (entityMatches.length) sections.push(`<section><span class="search-group-label">ENTITIES</span>${entityMatches.map((entity) => `<button class="search-result" data-open-entity="${entity.id}">${icon("fingerprint")}<span><b>${entity.id}</b><small>${entity.type} · ${entity.aliases[0]}</small></span>${icon("arrow-up-right")}</button>`).join("")}</section>`);
  if (alertMatches.length) sections.push(`<section><span class="search-group-label">ALERTS</span>${alertMatches.map((alert) => `<button class="search-result" data-open-alert="${alert.id}">${icon("triangle-alert")}<span><b>${alert.id}</b><small>${alert.type} · ${alert.severity}</small></span>${icon("arrow-up-right")}</button>`).join("")}</section>`);
  if (evidenceMatches.length) sections.push(`<section><span class="search-group-label">EVIDENCE</span>${evidenceMatches.map((item) => `<button class="search-result" data-open-evidence="${item.id}">${icon("file-lock-2")}<span><b>${item.id}</b><small>${item.type} · ${item.source}</small></span>${icon("arrow-up-right")}</button>`).join("")}</section>`);
  return sections.length ? sections.join("") : emptyState("NO MATCHES", "Try an entity ID, alert number, source or evidence ID.");
}

function openNotifications() {
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">WORKSPACE UPDATES</span><h2>Notifications</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close notifications">${icon("x")}</button></div><div class="notification-drawer-list">${appState.notifications.map((notification) => `<button class="notification-row ${notification.unread ? "unread" : ""}" data-open-notification="${notification.id}">${icon(notification.route === "alerts" ? "triangle-alert" : notification.route === "trends" ? "radar" : "share-2")}<span><b>${notification.title}</b><small>${notification.detail}</small><time>${notification.time}</time></span>${notification.unread ? `<i class="notification-unread"></i>` : ""}</button>`).join("")}</div><button class="text-button notification-clear" data-action="clear-notifications">Mark all as read ${icon("check")}</button>`, "drawer-overlay");
}

function openProfile() {
  openOverlay(`<div class="profile-menu"><div class="profile-menu-header"><span class="avatar large">AP</span><div><strong>A. Patel</strong><small>INVESTIGATOR · DEMO SESSION</small></div></div><div class="profile-menu-list"><button data-route="audit">${icon("scroll-text")} Audit trail</button><button data-action="workspace-status">${icon("shield-check")} System status <span class="status-live-text">Operational</span></button><button data-action="signout">${icon("log-out")} Return to access gateway</button></div></div>`, "profile-overlay");
}

async function handleAction(action, element) {
  switch (action) {
    case "demo-mode": setState({ demoMode: true, user: { name: "A. Patel", role: "INVESTIGATOR", initials: "AP" } }); navigate("dashboard"); pushToast("Operation Orion loaded · synthetic demo mode active", "success"); break;
    case "toggle-password": { const input = element.parentElement.querySelector("input"); if (input) input.type = input.type === "password" ? "text" : "password"; break; }
    case "collapse-sidebar": setState({ sidebarCollapsed: !appState.sidebarCollapsed }); renderApp(); break;
    case "open-search": openSearch(); break;
    case "open-notifications": openNotifications(); break;
    case "open-profile": openProfile(); break;
    case "close-overlay": if (!element.closest("[data-overlay-card]") || element.classList.contains("overlay-backdrop")) closeOverlay(); else closeOverlay(); break;
    case "show-score": openScoreDrawer(); break;
    case "view-lineage": openLineageDrawer(); break;
    case "entity-resolution": openResolutionModal(); break;
    case "network-reset": if (networkInstance) { networkInstance.elements().removeClass("faded highlighted"); networkInstance.layout({ name: "cose", animate: true, padding: 44 }).run(); } pushToast("Graph reset to full Operation Orion view", "info"); break;
    case "network-fit": networkInstance?.fit(undefined, 44); break;
    case "toggle-analytics": document.querySelector(".analytics-panel")?.classList.toggle("collapsed"); break;
    case "clear-alert-filters": setState({ filters: { ...appState.filters, severity: "ALL", alertStatus: "ALL" } }); renderApp(); break;
    case "acknowledge-alert": { const updated = await api.acknowledgeAlert(element.dataset.alertId); updateLocalAlert(updated); pushToast(`${element.dataset.alertId} acknowledged`, "success"); renderApp(); break; }
    case "generate-report": { const report = await api.generateReport(); openReportPreview(report, true); pushToast(`${report.id} generated from current state`, "success"); break; }
    case "preview-report": openReportPreview({ id: "REPORT-PREVIEW", generatedAt: new Date().toISOString() }, false); break;
    case "download-report": { const reportText = `TRACE-X INTELLIGENCE REPORT\\n\\nOperation Orion\\nGenerated: ${new Date().toISOString()}\\n\\nSynthetic demonstration data only. All signals require analyst review.`; const blob = new Blob([reportText], { type: "text/plain" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "trace-x-operation-orion-report.txt"; link.click(); URL.revokeObjectURL(url); pushToast("Demo report downloaded", "success"); break; }
    case "export-evidence": pushToast("Evidence index prepared for export · demo only", "success"); break;
    case "export-audit": pushToast("Audit log prepared for export · demo only", "success"); break;
    case "new-investigation": pushToast("New investigations are disabled in this synthetic build", "info"); break;
    case "verify-match": closeOverlay(); pushToast("Potential match marked for analyst verification", "success"); break;
    case "reject-match": closeOverlay(); pushToast("Potential match rejected and preserved in audit trail", "info"); break;
    case "clear-notifications": clearUnreadNotifications(); openNotifications(); break;
    case "workspace-status": pushToast("All local demo services operational", "success"); break;
    case "signout": closeOverlay(); navigate("login"); break;
    case "drawer-open-entity": closeOverlay(); navigate("entity"); break;
    case "retry-load": dataLoaded = false; dataError = null; renderApp(); loadData(); break;
    default: break;
  }
}

function openReportPreview(report, generated) {
  openOverlay(`<div class="modal-header"><div><span class="eyebrow">${generated ? "REPORT GENERATED" : "REPORT PREVIEW"}</span><h2>Operation Orion</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close report">${icon("x")}</button></div><div class="report-modal-cover"><span class="eyebrow">TRACE-X INTELLIGENCE REPORT</span><h3>Evidence-backed analytical brief</h3><p>Operation Orion · ${generated ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : "Preview from current workspace state"}</p></div><div class="report-modal-stats"><div><strong>12</strong><span>sections</span></div><div><strong>25</strong><span>entities</span></div><div><strong>08</strong><span>evidence refs</span></div><div><strong>100%</strong><span>synthetic</span></div></div><div class="report-modal-note">${icon("shield-check")} Limitations, provenance and analyst verification state are included in the output.</div><div class="modal-actions"><button class="button button-secondary" data-action="close-overlay">Close</button><button class="button button-primary" data-action="download-report">${icon("download")} Download demo report</button></div>`, "modal-overlay report-modal");
}

function handleGlobalClick(event) {
  const target = event.target.closest("button, [data-route]");
  if (!target) return;
  if (target.dataset.route) { event.preventDefault(); closeOverlay(); navigate(target.dataset.route); return; }
  if (target.dataset.action) { event.preventDefault(); handleAction(target.dataset.action, target); return; }
  if (target.dataset.openEntity) { event.preventDefault(); selectEntity(target.dataset.openEntity); closeOverlay(); navigate("entity"); return; }
  if (target.dataset.openAlert) { event.preventDefault(); openAlertDrawer(target.dataset.openAlert); return; }
  if (target.dataset.openEvidence) { event.preventDefault(); selectEvidence(target.dataset.openEvidence); closeOverlay(); navigate("evidence"); return; }
  if (target.dataset.openTrend) { event.preventDefault(); openTrendDrawer(target.dataset.openTrend); return; }
  if (target.dataset.reviewAlert) { event.preventDefault(); openReviewModal(target.dataset.reviewAlert); return; }
  if (target.dataset.openRecord) { event.preventDefault(); const record = records.find((item) => item.id === target.dataset.openRecord); if (record) openRecordDrawer(record); return; }
  if (target.dataset.fusionStage) { event.preventDefault(); openFusionStage(Number(target.dataset.fusionStage)); return; }
  if (target.dataset.range) { setState({ filters: { ...appState.filters, range: target.dataset.range } }); renderApp(); return; }
  if (target.dataset.alertSeverity) { setState({ filters: { ...appState.filters, severity: target.dataset.alertSeverity } }); renderApp(); return; }
  if (target.dataset.alertStatus) { setState({ filters: { ...appState.filters, alertStatus: target.dataset.alertStatus } }); renderApp(); return; }
  if (target.dataset.openNotification) { const notification = appState.notifications.find((item) => item.id === target.dataset.openNotification); if (notification) { markNotificationRead(notification.id); closeOverlay(); if (notification.entityId) { selectEntity(notification.entityId); navigate("entity"); } else if (notification.alertId) { navigate("alerts"); openAlertDrawer(notification.alertId); } else if (notification.trendId) openTrendDrawer(notification.trendId); } return; }
  if (target.dataset.networkAction) { handleNetworkAction(target.dataset.networkAction); return; }
}

function openReviewModal(alertId) {
  const alert = alerts.find((item) => item.id === alertId) ?? alerts[0];
  openOverlay(`<div class="modal-header"><div><span class="eyebrow">ANALYST VERIFICATION</span><h2>Review ${alert.id}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close review">${icon("x")}</button></div><div class="review-stepper"><span class="active">01 <b>Signal</b></span><i></i><span class="active">02 <b>Evidence</b></span><i></i><span class="active">03 <b>Decision</b></span></div><div class="review-finding"><span class="eyebrow">FINDING</span><h3>${escapeHtml(alert.what)}</h3><p>${escapeHtml(alert.why)}</p></div><div class="review-fields"><label>Analyst<select id="reviewAnalyst"><option>A. Patel · Investigator</option><option>J. Chen · Analyst</option></select></label><label>Decision<select id="reviewDecision"><option>VERIFY</option><option>REJECT</option><option>NEEDS MORE EVIDENCE</option></select></label><label class="full">Notes<textarea id="reviewNotes" placeholder="Record why this decision is appropriate…">Signal is supported by linked synthetic evidence and remains limited to analyst prioritization.</textarea></label></div><div class="review-disclaimer">${icon("shield-alert")} The decision updates demo state immediately and is recorded in the local audit trail.</div><div class="modal-actions"><button class="button button-secondary" data-action="close-overlay">Cancel</button><button class="button button-primary" data-action="submit-review" data-alert-id="${alert.id}">${icon("check")} Save analyst decision</button></div>`, "modal-overlay review-modal");
}

function openRecordDrawer(record) {
  openOverlay(`<div class="drawer-header"><div><span class="eyebrow">ORIGINAL INTELLIGENCE RECORD</span><h2>${record.id}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close record">${icon("x")}</button></div><div class="record-drawer-card"><span class="record-type">${escapeHtml(record.type)}</span><h3>${escapeHtml(record.title)}</h3><p>${escapeHtml(record.snippet)}</p><div><span>${icon("radio-tower")} ${record.sourceId}</span><span>${icon("clock-3")} ${record.timestamp}</span><span>${icon("badge-check")} ${record.confidence}% confidence</span></div></div><div class="drawer-section"><span class="eyebrow">ANALYTICAL CONTEXT</span><div class="drawer-fields"><span><small>TOPIC</small><b>${record.topic}</b></span><span><small>ENTITY</small><b>${record.entityId}</b></span><span><small>METHOD</small><b>Entity extraction</b></span><span><small>STATUS</small><b>Indexed</b></span></div></div><div class="drawer-actions"><button class="button button-primary button-wide" data-open-entity="${record.entityId}">Open entity context ${icon("arrow-up-right")}</button></div>`, "drawer-overlay");
}

function openFusionStage(index) {
  const copy = [
    ["150 source observations", "Start with fragmented, heterogeneous records. Search remains grounded in the original observation."],
    ["25 identified entities", "Entity extraction surfaces aliases, topics, sources, locations and investigations without collapsing uncertainty."],
    ["60 timestamped relationships", "Relationships carry source and confidence so the graph stays traceable."],
    ["3 synthetic communities", "Community detection helps the analyst see bridges and clusters that manual review may miss."],
    ["+138% peak growth", "Temporal analysis separates recurring patterns from one-off noise."],
    ["4 emerging signals", "Trend detection turns activity changes into reviewable leads."],
    ["92 / 100 top priority", "A weighted triage signal ranks review order. It is not a criminal score."],
    ["8 evidence references", "Every finding points to source, timestamp, method and confidence."],
    ["1 analyst decision", "Verification, rejection or a request for more evidence closes the loop."]
  ][index];
  openOverlay(`<div class="modal-header"><div><span class="eyebrow">FUSION STAGE ${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(copy[0])}</h2></div><button class="icon-button" data-action="close-overlay" aria-label="Close stage">${icon("x")}</button></div><div class="stage-detail-icon">${icon(["database", "scan-search", "share-2", "network", "activity", "radar", "scan-line", "fingerprint", "user-check"][index])}</div><p class="stage-detail-copy">${escapeHtml(copy[1])}</p><div class="stage-detail-data"><span>Operation Orion</span><span>Synthetic data</span><span>Analyst controlled</span></div><div class="modal-actions"><button class="button button-primary" data-action="close-overlay">Continue exploring ${icon("arrow-right")}</button></div>`, "modal-overlay stage-modal");
}

function handleNetworkAction(action) {
  if (!networkInstance) return;
  if (action === "zoom-in") networkInstance.zoom({ level: networkInstance.zoom() * 1.2, renderedPosition: { x: networkInstance.width() / 2, y: networkInstance.height() / 2 } });
  if (action === "zoom-out") networkInstance.zoom({ level: networkInstance.zoom() * .84, renderedPosition: { x: networkInstance.width() / 2, y: networkInstance.height() / 2 } });
  if (action === "fit") networkInstance.fit(undefined, 44);
  if (action === "highlight") { networkInstance.elements().removeClass("highlighted faded"); const node = networkInstance.getElementById(appState.selectedEntity); if (node.length) { networkInstance.elements().addClass("faded"); node.removeClass("faded").addClass("highlighted"); node.connectedEdges().removeClass("faded"); node.connectedNodes().removeClass("faded"); pushToast(`Highlighted connections for ${appState.selectedEntity}`, "success"); } }
  if (action === "filter-sources") toggleNetworkType("Source");
  if (action === "filter-topics") toggleNetworkType("Topic");
}

function toggleNetworkType(type) {
  const nodes = networkInstance.nodes().filter((node) => node.data("type") === type);
  if (nodes.length && nodes[0].style("display") !== "none") { nodes.style("display", "none"); nodes.connectedEdges().style("display", "none"); pushToast(`${type} nodes hidden`, "info"); }
  else { nodes.style("display", "element"); nodes.connectedEdges().style("display", "element"); pushToast(`${type} nodes shown`, "info"); }
}

async function submitReview(alertId) {
  const decision = document.getElementById("reviewDecision")?.value ?? "VERIFY";
  let result;
  if (decision === "VERIFY") result = await api.verifySignal(alertId);
  if (decision === "REJECT") result = await api.rejectSignal(alertId);
  if (decision === "NEEDS MORE EVIDENCE") result = await api.requestMoreEvidence(alertId);
  updateLocalAlert(result?.alert ?? result);
  updateLocalEvidence(result?.evidence);
  closeOverlay(); renderApp(); pushToast(`${alertId} marked ${decision.toLowerCase()}`, decision === "VERIFY" ? "success" : "info");
}

function handleInput(event) {
  if (event.target.id === "globalSearch") { window.clearTimeout(searchDebounce); searchDebounce = window.setTimeout(() => { const result = document.getElementById("searchResults"); if (result) { result.innerHTML = renderSearchResults(event.target.value); refreshIcons(); } }, 120); }
  if (event.target.id === "entitySearch") { window.clearTimeout(searchDebounce); searchDebounce = window.setTimeout(() => { setState({ filters: { ...appState.filters, entityQuery: event.target.value } }); renderApp(); const input = document.getElementById("entitySearch"); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }, 180); }
  if (event.target.id === "networkSearch" && networkInstance) { const query = event.target.value.toLowerCase(); networkInstance.nodes().forEach((node) => { const match = node.id().toLowerCase().includes(query); node.toggleClass("highlighted", Boolean(query && match)); node.toggleClass("faded", Boolean(query && !match)); }); }
}

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
  if (event.key === "Escape") closeOverlay();
  if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { const input = document.getElementById("entitySearch") ?? document.getElementById("networkSearch"); if (input) { event.preventDefault(); input.focus(); } }
}

document.addEventListener("click", handleGlobalClick);
window.addEventListener("trace-toast", (event) => {
  const detail = event.detail;
  if (!detail) return;
  let stack = document.querySelector(".toast-stack");
  if (!stack) { document.body.insertAdjacentHTML("beforeend", `<div class="toast-stack" aria-live="polite"></div>`); stack = document.querySelector(".toast-stack"); }
  const toast = document.createElement("div");
  toast.className = `toast toast-${detail.tone ?? "info"}`;
  toast.innerHTML = `${icon(detail.tone === "success" ? "check-circle-2" : detail.tone === "info" ? "info" : "triangle-alert")}<span>${escapeHtml(detail.message)}</span>`;
  stack.appendChild(toast);
  refreshIcons();
  window.setTimeout(() => toast.remove(), 3300);
});
document.addEventListener("input", handleInput);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("submit", (event) => { if (event.target.matches("[data-login-form]")) { event.preventDefault(); const username = new FormData(event.target).get("username"); setState({ user: { name: String(username || "A. Patel").split("@")[0], role: "INVESTIGATOR", initials: initials(String(username || "A. Patel")) }, demoMode: true }); navigate("dashboard"); pushToast("Signed in to Operation Orion demo workspace", "success"); } });
document.addEventListener("click", (event) => { const target = event.target.closest("[data-action=submit-review]"); if (target) submitReview(target.dataset.alertId); });

subscribeRoute(() => renderApp());
if (!window.location.hash) window.location.hash = "dashboard";
loadData();
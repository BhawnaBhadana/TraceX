const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("tracex_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("tracex_token");
    localStorage.removeItem("tracex_user");
    window.location.hash = "login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  getInvestigations: () => request("/investigations"),
  getEntities: () => request("/entities"),
  getEntity: (id) => request(`/entities/${id}`),
  getEntityScore: (id) => request(`/entities/${id}/score`),
  getEntityMatches: (id) => request(`/entities/${id}/matches`),
  getEntityNetworkMetrics: (id) => request(`/entities/${id}/network-metrics`),
  getRelationships: () => request("/relationships"),
  getAlerts: () => request("/alerts"),
  getTrends: () => request("/trends"),
  getEvidence: () => request("/evidence"),
  getRecords: () => request("/records"),
  getCategories: () => request("/categories"),
  getNotifications: () => request("/notifications"),

  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  verifySignal: (id) => request(`/alerts/${id}/verify`, { method: "POST" }),
  rejectSignal: (id) => request(`/alerts/${id}/reject`, { method: "POST" }),
  requestMoreEvidence: (id) => request(`/alerts/${id}/request-evidence`, { method: "POST" }),
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: "POST" }),

  generateReport: () => request("/reports/generate", { method: "POST" }),
};
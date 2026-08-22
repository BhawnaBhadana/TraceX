import { alerts, categories, entities, evidence, investigations, records, relationships, trends } from "./demo-data.js";
import { getState } from "./state.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (value) => Promise.resolve(clone(value));

export const api = {
  getInvestigations: () => wait(investigations),
  getEntities: () => wait(entities),
  getEntity: (id) => wait(entities.find((entity) => entity.id === id) ?? null),
  getRelationships: () => wait(relationships),
  getAlerts: () => wait(alerts),
  getTrends: () => wait(trends),
  getEvidence: () => wait(evidence),
  getRecords: () => wait(records),
  getCategories: () => wait(categories),
  verifySignal: (id) => {
    const alert = alerts.find((item) => item.id === id);
    if (alert) alert.status = "VERIFIED";
    const item = evidence.find((entry) => alert?.evidenceIds.includes(entry.id));
    if (item) item.status = "VERIFIED";
    return wait({ alert, evidence: item, actor: getState().user.name });
  },
  rejectSignal: (id) => {
    const alert = alerts.find((item) => item.id === id);
    if (alert) alert.status = "REJECTED";
    return wait({ alert, actor: getState().user.name });
  },
  requestMoreEvidence: (id) => {
    const alert = alerts.find((item) => item.id === id);
    if (alert) alert.status = "NEEDS MORE EVIDENCE";
    return wait({ alert, actor: getState().user.name });
  },
  acknowledgeAlert: (id) => {
    const alert = alerts.find((item) => item.id === id);
    if (alert) alert.status = "ACKNOWLEDGED";
    return wait(alert);
  },
  generateReport: () => wait({
    id: `REPORT-${Date.now().toString().slice(-6)}`,
    title: "Operation Orion Intelligence Report",
    generatedAt: new Date().toISOString(),
    investigation: getState().currentInvestigation,
    sections: 12
  })
};

"use strict";

/**
 * Master Canon 0006 §20 — platform architecture principles.
 */

const ARCHITECTURE_PRINCIPLE = Object.freeze({
  MODULARITY: "modularity",
  SINGLE_RESPONSIBILITY: "single_responsibility",
  EVENT_DRIVEN: "event_driven",
  EXTENSIBILITY: "extensibility",
  AUDITABILITY: "auditability",
  TESTABILITY: "testability",
  CONFIGURABILITY: "configurability",
  DATA_LOGIC_SEPARATION: "data_logic_separation",
  LOGIC_PRESENTATION_SEPARATION: "logic_presentation_separation",
  BACKWARD_COMPATIBILITY: "backward_compatibility"
});

const ARCHITECTURE_PRINCIPLE_LABELS = Object.freeze({
  [ARCHITECTURE_PRINCIPLE.MODULARITY]: "Modularita",
  [ARCHITECTURE_PRINCIPLE.SINGLE_RESPONSIBILITY]: "Jedna odpovědnost na komponentu",
  [ARCHITECTURE_PRINCIPLE.EVENT_DRIVEN]: "Event-Driven Architecture",
  [ARCHITECTURE_PRINCIPLE.EXTENSIBILITY]: "Rozšiřitelnost",
  [ARCHITECTURE_PRINCIPLE.AUDITABILITY]: "Auditovatelnost",
  [ARCHITECTURE_PRINCIPLE.TESTABILITY]: "Testovatelnost",
  [ARCHITECTURE_PRINCIPLE.CONFIGURABILITY]: "Konfigurovatelnost",
  [ARCHITECTURE_PRINCIPLE.DATA_LOGIC_SEPARATION]: "Oddělení dat od logiky",
  [ARCHITECTURE_PRINCIPLE.LOGIC_PRESENTATION_SEPARATION]: "Oddělení logiky od prezentace",
  [ARCHITECTURE_PRINCIPLE.BACKWARD_COMPATIBILITY]: "Zpětná kompatibilita rozhraní"
});

function listArchitecturePrinciples() {
  return Object.values(ARCHITECTURE_PRINCIPLE).map((id) => ({
    id,
    label: ARCHITECTURE_PRINCIPLE_LABELS[id]
  }));
}

module.exports = {
  ARCHITECTURE_PRINCIPLE,
  ARCHITECTURE_PRINCIPLE_LABELS,
  listArchitecturePrinciples
};

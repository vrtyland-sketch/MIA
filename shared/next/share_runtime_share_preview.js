"use strict";

/**
 * shared/next/share_runtime_share_preview.js
 *
 * Preview bridge pro novou SHARE architekturu.
 * Po novém:
 * - vrací decision
 * - vrací action_result v oficiálním MIA_NEXT kontraktu
 * - vrací validační info
 *
 * Pořád:
 * - není to napojené do starého runtime
 * - nic to nerozbíjí
 */

const { createShareDecision } = require("../next_decision/share_decision_engine");
const { createShareAction } = require("../next_action/share_action_builder");

const {
  validateActionResult
} = require("../platform_runtime_contracts/core_contracts_action_result");

const {
  validateOverlayPayload
} = require("../platform_runtime_contracts/core_contracts_overlay_payload");

function buildSharePreview(input = {}) {
  const event = input.event || {};
  const streamState = input.streamState || {};
  const kojnozoutState = input.kojnozoutState || {};

  const decision = createShareDecision(event, streamState, kojnozoutState);
  const action = createShareAction(decision);

  const overlayValidation = validateOverlayPayload(action.overlayPayload);
  const actionValidation = validateActionResult(action);

  return {
    ok: overlayValidation.ok && actionValidation.ok,
    decision,
    action,
    validation: {
      overlayPayload: overlayValidation,
      actionResult: actionValidation
    }
  };
}

module.exports = {
  buildSharePreview
};
"use strict";

const { phaseSession } = require("./phase_session");
const { phaseObserve } = require("./phase_observe");
const { phaseEnrich } = require("./phase_enrich");
const { phaseCommandGate } = require("./phase_command_gate");
const { phaseDecide } = require("./phase_decide");
const { phasePresent } = require("./phase_present");
const { phaseExecute } = require("./phase_execute");
const { phasePost } = require("./phase_post");

const DEFAULT_PHASES = [
  phaseSession,
  phaseObserve,
  phaseEnrich,
  phaseCommandGate,
  phaseDecide,
  phasePresent,
  phaseExecute,
  phasePost
];

async function runEventPipeline(ctx, deps, phases = DEFAULT_PHASES) {
  for (const phase of phases) {
    if (ctx.meta.halted) break;
    await phase(ctx, deps);
  }

  ctx.commit(deps);

  if (ctx.meta.halted) {
    return { status: 200, body: ctx.meta.haltBody };
  }

  return ctx.buildOkResponse();
}

module.exports = {
  runEventPipeline,
  DEFAULT_PHASES,
  phaseSession,
  phaseObserve,
  phaseEnrich,
  phaseCommandGate,
  phaseDecide,
  phasePresent,
  phaseExecute,
  phasePost
};

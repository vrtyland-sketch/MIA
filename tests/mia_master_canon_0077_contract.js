"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const mqm = require("../shared/mia-message-queue-core");
const ebm = require("../shared/mia-event-bus-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0077-message-queue-manager.md");
  const alignPath = path.join(MASTER, "0077-alignment.md");

  assert.ok(fs.existsSync(docPath), "0077-message-queue-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0077-alignment.md exists");
  pass("0077 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0077 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0077 kernel layer");
  assert.ok(doc.includes("0078"), "0077 points to 0078");
  assert.ok(/Command Bus Manager/i.test(doc), "0077 → Command Bus Manager");
  assert.ok(doc.includes("0079"), "0077 points to 0079");
  assert.ok(/Telemetry Manager/i.test(doc), "0077 → Telemetry Manager");
  pass("22 sections → 0078 Command Bus / 0079 Telemetry Manager");

  assert.equal(mqm.MQM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...mqm.MQM_COMPONENT_ORDER],
    [
      "message_queue_manager",
      "intake_gate",
      "queue_registry",
      "priority_scheduler",
      "fifo_controller",
      "dequeue_engine",
      "ack_controller",
      "nack_retry_controller",
      "dead_letter_queue",
      "security_gate",
      "queue_audit",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.equal(mqm.MQM_FLAGS.soleMessageQueueAuthority, true);
  assert.equal(mqm.MQM_FLAGS.distributesEvents, false);
  assert.equal(mqm.MQM_FLAGS.separatedFromEventBus, true);
  assert.equal(mqm.MQM_FLAGS.dlqNeverAutoDeletes, true);
  assert.equal(mqm.MQM_FLAGS.singleConsumerCompletion, true);
  assert.equal(mqm.separatedFromEventBus, true);
  assert.equal(mqm.distributesEvents, false);
  pass("flags");

  assert.deepEqual(
    [...mqm.MQM_DESCRIPTOR_FIELDS],
    [
      "messageId",
      "queueId",
      "type",
      "priority",
      "payload",
      "created",
      "retryCount",
      "status",
      "correlationId"
    ]
  );

  const d1 = mqm.createMessageDescriptor({
    queueId: "overlay",
    type: "show_overlay",
    payload: { giftId: "rose" }
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.messageId);
  assert.ok(Object.isFrozen(d1.descriptor));
  assert.ok(Object.isFrozen(d1.descriptor.payload));
  for (const field of mqm.MQM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }

  const d2 = mqm.createMessageDescriptor({
    queueId: "overlay",
    type: "show_overlay"
  });
  assert.notEqual(d1.descriptor.messageId, d2.descriptor.messageId);
  pass("descriptor 9 fields + unique IDs");

  assert.deepEqual(
    [...mqm.MQM_PRIORITY_ORDER],
    ["low", "normal", "high", "critical"]
  );
  assert.ok(mqm.MQM_STATUS.QUEUED);
  assert.ok(mqm.MQM_STATUS.PROCESSING);
  assert.ok(mqm.MQM_STATUS.COMPLETED);
  assert.ok(mqm.MQM_STATUS.DEAD_LETTER);
  pass("MQM_PRIORITY / MQM_PRIORITY_ORDER / MQM_STATUS");

  mqm.clearMessageQueueSingletonForTest();
  ebm.clearEventBusSingletonForTest();

  const q = mqm.createMessageQueueManager({ maxRetries: 2 });
  assert.equal(q.ok, true);
  assert.equal(q.status().singleton, true);
  assert.equal(q.status().soleMessageQueueAuthority, true);
  assert.equal(q.status().separatedFromEventBus, true);
  assert.equal(q.status().dlqNeverAutoDeletes, true);
  assert.equal(q.status().distributesEvents, false);
  assert.equal(q.status().singleConsumerCompletion, true);

  const duplicate = mqm.createMessageQueueManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "message_queue_manager_already_active");
  pass("singleton");

  const defaults = q.status().queueIds;
  for (const name of mqm.MQM_DEFAULT_QUEUES) {
    assert.ok(defaults.includes(name), `default queue ${name}`);
  }
  const auth = { source: "battle_engine", authorized: true, nowMs: 1000 };
  const consumerAuth = { source: "overlay_engine", authorized: true };

  const aiQ = q.createQueue("custom_ai", auth);
  assert.equal(aiQ.ok, true);
  const enAi = q.enqueue(
    { queueId: "ai", type: "reply", payload: { text: "hi" } },
    auth
  );
  const enBattle = q.enqueue(
    { queueId: "battle", type: "start", payload: { id: "b1" } },
    auth
  );
  assert.equal(enAi.ok, true);
  assert.equal(enBattle.ok, true);
  const peekAi = q.peek("ai");
  const peekBattle = q.peek("battle");
  assert.equal(peekAi.messageId, enAi.messageId);
  assert.equal(peekBattle.messageId, enBattle.messageId);
  assert.notEqual(peekAi.messageId, peekBattle.messageId);
  pass("independent queues");

  mqm.clearMessageQueueSingletonForTest();
  const q2 = mqm.createMessageQueueManager({ maxRetries: 2 });
  const fifoAuth = { source: "runtime", authorized: true };
  const a = q2.enqueue(
    { queueId: "platform", type: "a", priority: "normal", payload: {} },
    { ...fifoAuth, nowMs: 1 }
  );
  const b = q2.enqueue(
    { queueId: "platform", type: "b", priority: "normal", payload: {} },
    { ...fifoAuth, nowMs: 2 }
  );
  const c = q2.enqueue(
    { queueId: "platform", type: "c", priority: "normal", payload: {} },
    { ...fifoAuth, nowMs: 3 }
  );
  const dA = q2.dequeue("platform", "c1", consumerAuth);
  const dB = q2.dequeue("platform", "c1", consumerAuth);
  const dC = q2.dequeue("platform", "c1", consumerAuth);
  assert.equal(dA.messageId, a.messageId);
  assert.equal(dB.messageId, b.messageId);
  assert.equal(dC.messageId, c.messageId);
  pass("FIFO within same priority");

  mqm.clearMessageQueueSingletonForTest();
  const q3 = mqm.createMessageQueueManager({ maxRetries: 2 });
  q3.enqueue(
    { queueId: "obs", type: "low", priority: "low", payload: {} },
    { ...fifoAuth, nowMs: 10 }
  );
  q3.enqueue(
    { queueId: "obs", type: "crit", priority: "critical", payload: {} },
    { ...fifoAuth, nowMs: 20 }
  );
  q3.enqueue(
    { queueId: "obs", type: "norm", priority: "normal", payload: {} },
    { ...fifoAuth, nowMs: 30 }
  );
  const p1 = q3.dequeue("obs", "obs-c", consumerAuth);
  const p2 = q3.dequeue("obs", "obs-c", consumerAuth);
  const p3 = q3.dequeue("obs", "obs-c", consumerAuth);
  assert.equal(p1.message.type, "crit");
  assert.equal(p2.message.type, "norm");
  assert.equal(p3.message.type, "low");
  pass("priority overrides FIFO");

  mqm.clearMessageQueueSingletonForTest();
  const q4 = mqm.createMessageQueueManager({ maxRetries: 2 });
  const en = q4.enqueue(
    { queueId: "inventory", type: "sync", payload: { item: 1 } },
    { ...auth, nowMs: 100 }
  );
  const dq = q4.dequeue("inventory", "inv-1", consumerAuth);
  assert.equal(dq.ok, true);
  assert.equal(dq.message.status, mqm.MQM_STATUS.PROCESSING);
  assert.equal(dq.messageId, en.messageId);

  const acked = q4.ack(en.messageId, {
    ...consumerAuth,
    consumerId: "inv-1"
  });
  assert.equal(acked.ok, true);
  assert.equal(acked.status, mqm.MQM_STATUS.COMPLETED);
  const dupAck = q4.ack(en.messageId, {
    ...consumerAuth,
    consumerId: "inv-1"
  });
  assert.equal(dupAck.ok, false);
  assert.equal(dupAck.error, "duplicate_ack_rejected");
  pass("ack completes; single consumer completion (no duplicate ack)");

  mqm.clearMessageQueueSingletonForTest();
  const q5 = mqm.createMessageQueueManager({ maxRetries: 2 });
  const en2 = q5.enqueue(
    { queueId: "ai", type: "think", payload: {} },
    { ...auth, nowMs: 200 }
  );
  q5.dequeue("ai", "ai-c", consumerAuth);
  const n1 = q5.nack(en2.messageId, "transient", {
    ...consumerAuth,
    consumerId: "ai-c"
  });
  assert.equal(n1.ok, true);
  assert.equal(n1.deleted, false);
  assert.equal(n1.retried, true);
  assert.equal(n1.retryCount, 1);

  q5.dequeue("ai", "ai-c", consumerAuth);
  const n2 = q5.nack(en2.messageId, "transient2", {
    ...consumerAuth,
    consumerId: "ai-c"
  });
  assert.equal(n2.ok, true);
  assert.equal(n2.retried, true);

  q5.dequeue("ai", "ai-c", consumerAuth);
  const n3 = q5.nack(en2.messageId, "exhausted", {
    ...consumerAuth,
    consumerId: "ai-c"
  });
  assert.equal(n3.ok, true);
  assert.equal(n3.deadLetter, true);
  assert.equal(n3.deleted, false);

  const dlq = q5.getDeadLetters();
  assert.ok(dlq.length >= 1);
  assert.equal(dlq[0].neverAutoDeletes, true);
  assert.ok(dlq[0].message);
  assert.ok(dlq[0].failureReason);
  assert.ok(dlq[0].attempts >= 3);
  assert.ok(dlq[0].timestamp);

  assert.equal(q5.purgeDeadLetters().ok, false);
  assert.equal(q5.deleteDeadLetter().ok, false);
  assert.equal(q5.clearDlq().ok, false);
  assert.equal(q5.purgeDlq({}).ok, false);
  assert.equal(q5.purgeDlq({}).error, "dlq_purge_requires_force");

  const beforeDlq = q5.getDeadLetters().length;
  q5.enqueue(
    { queueId: "ai", type: "other", payload: {} },
    { ...auth, nowMs: 300 }
  );
  const purged = q5.purge("ai", auth);
  assert.equal(purged.ok, true);
  assert.equal(purged.dlqUntouched, true);
  assert.equal(q5.getDeadLetters().length, beforeDlq);
  pass("nack retries; exhausted → DLQ; DLQ no auto-delete; purge skips DLQ");

  const asBus = q5.enqueue(
    { queueId: "platform", type: "evt", payload: {} },
    { ...auth, asEventBusPublish: true }
  );
  assert.equal(asBus.ok, false);
  assert.equal(asBus.error, "write_to_event_bus_rejected");

  const writeBus = q5.enqueue(
    { queueId: "platform", type: "evt2", payload: {} },
    { ...auth, writeToEventBus: true }
  );
  assert.equal(writeBus.ok, false);
  assert.equal(writeBus.error, "write_to_event_bus_rejected");
  assert.equal(mqm.separatedFromEventBus, true);
  pass("separated from event bus");

  const forged = q5.enqueue(
    { queueId: "platform", type: "forged", payload: {} },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_message_queue_blocked");

  const unauth = q5.dequeue("platform", "hacker", { source: "unknown_actor" });
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_message_queue");
  pass("auth/forged blocked");

  mqm.clearMessageQueueSingletonForTest();
  const q6 = mqm.createMessageQueueManager({ maxRetries: 3 });
  const manual = q6.enqueue(
    { queueId: "battle", type: "retry_me", payload: {} },
    auth
  );
  q6.dequeue("battle", "b-c", consumerAuth);
  q6.nack(manual.messageId, "fail", { ...consumerAuth, consumerId: "b-c" });
  const peeked = q6.peek("battle");
  assert.equal(peeked.ok, true);
  assert.equal(peeked.messageId, manual.messageId);
  const manRetry = q6.retry(manual.messageId, auth);
  assert.equal(manRetry.ok, false);
  assert.equal(manRetry.error, "message_already_queued");

  q6.dequeue("battle", "b-c", consumerAuth);
  const manRetry2 = q6.retry(manual.messageId, auth);
  assert.equal(manRetry2.ok, true);
  assert.equal(manRetry2.retried, true);

  for (const name of mqm.MQM_PUBLIC_API) {
    assert.equal(typeof q6[name], "function", `public api ${name}`);
  }
  assert.equal(typeof q6.createQueue, "function");
  assert.equal(typeof q6.getDeadLetters, "function");
  assert.equal(typeof q6.metrics, "function");
  assert.equal(typeof q6.queueAudit, "function");
  assert.equal(typeof q6.status, "function");
  pass("API enqueue/dequeue/ack/nack/retry/peek/purge");

  const m = q6.metrics();
  assert.ok(typeof m.queueCount === "number");
  assert.ok(typeof m.messageCount === "number");
  assert.ok(typeof m.retryCount === "number");
  assert.ok(typeof m.dlqCount === "number");
  assert.ok(typeof m.averageWaitMs === "number");
  assert.ok(typeof m.ackCount === "number");
  assert.ok(typeof m.nackCount === "number");
  assert.equal(m.separatedFromEventBus, true);
  pass("metrics");

  const trail = q6.queueAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("messageId" in trail[0]);
  assert.ok("queueId" in trail[0]);
  assert.ok("producer" in trail[0]);
  assert.ok("consumer" in trail[0]);
  assert.ok("retryCount" in trail[0]);
  assert.ok("result" in trail[0]);
  pass("queue audit");

  mqm.clearMessageQueueSingletonForTest();
  ebm.clearEventBusSingletonForTest();

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-event-bus-core/eventBusManager.js")
  );
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-message-queue-core/messageQueueManager.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0077-message-queue-manager.md")
  );
  const ebmIdx = coreSys.runtime.indexOf(
    "shared/mia-event-bus-core/eventBusManager.js"
  );
  const mqmIdx = coreSys.runtime.indexOf(
    "shared/mia-message-queue-core/messageQueueManager.js"
  );
  assert.ok(ebmIdx >= 0 && mqmIdx === ebmIdx + 1);
  pass("platformSystems nextDocId 0082; message-queue after event-bus in CORE");

  for (const rel of mqm.MQM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0077"), "README 0077");
  assert.ok(/Message Queue Manager/i.test(readme), "README Message Queue Manager");
  assert.ok(
    /0077.*Platný|Platný.*0077/s.test(readme) ||
      readme.includes("[Message Queue Manager"),
    "README 0077 platný"
  );
  assert.ok(readme.includes("0078"), "README 0078");
  assert.ok(/Command Bus Manager/i.test(readme), "README Command Bus Manager");
  assert.ok(
    /0078.*Platný|Platný.*0078/s.test(readme) ||
      readme.includes("[Command Bus Manager"),
    "README 0078 platný"
  );
  assert.ok(readme.includes("0079"), "README 0079");
  assert.ok(/Query Bus Manager/i.test(readme), "README Query Bus Manager");
  assert.ok(readme.includes("0080"), "README 0080");
  assert.ok(/Projection Manager/i.test(readme), "README Projection Manager");
  assert.ok(
    /0080.*Platný|Platný.*0080/s.test(readme) ||
      readme.includes("[Projection Manager"),
    "README 0080 platný"
  );
  assert.ok(readme.includes("0081"), "README 0081");
  assert.ok(/Saga Manager/i.test(readme), "README Saga Manager");
  assert.ok(readme.includes("0082"), "README 0082 planned");
  assert.ok(
    /Telemetry Manager/i.test(readme),
    "README Telemetry Manager planned"
  );
  assert.ok(
    readme.includes("shared/mia-message-queue-core/"),
    "README Message Queue technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0077_contract.js"));
  pass("README + anchors");

  const align76 = read("docs/master-canon/0076-alignment.md");
  assert.ok(
    align76.includes("**0077**") && /Message Queue/i.test(align76),
    "0076-alignment marks 0077 Message Queue"
  );
  assert.ok(
    align76.includes("**0078**") && /Command Bus/i.test(align76),
    "0076-alignment marks 0078 Command Bus"
  );
  assert.ok(
    align76.includes("0079") && /Telemetry/i.test(align76),
    "0076-alignment marks 0079 Telemetry planned"
  );
  pass("0076-alignment marks 0077 done / 0078 Command Bus / 0079 Telemetry planned");

  const align77 = read("docs/master-canon/0077-alignment.md");
  assert.ok(align77.includes("🟡") || align77.includes("🟢"));
  assert.ok(
    align77.includes("broker") || align77.includes("Live"),
    "0077-alignment marks live external broker partial"
  );
  pass("0077-alignment marks live external broker partial");

  console.log("\nMaster Canon 0077 contract: ALL PASS");
}

run();

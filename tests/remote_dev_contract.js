"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const remoteDev = require("../scripts/MIA_REMOTE_DEV");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("classifies test and cursor tasks", () => {
    assert.equal(remoteDev.classifyCommand("Spusť testy gift mapy").kind, "run_tests");
    assert.equal(remoteDev.classifyCommand("Spusť rychlý preflight").kind, "run_tests");
    assert.equal(remoteDev.classifyCommand("Otestuj paint").kind, "run_tests");
    assert.equal(remoteDev.classifyCommand("Otestuj paint").script, "test:mia-paint");
    assert.equal(remoteDev.classifyCommand("Jaký je stav gift mapy?").kind, "status");
    assert.equal(remoteDev.classifyCommand("Jaký je stav paint?").kind, "status");
    assert.equal(
      remoteDev.classifyCommand("Přidej nový gift do katalogu").kind,
      "cursor_task"
    );
  });

  await test("enqueue writes latest prompt file", async () => {
    const result = await remoteDev.enqueueAndMaybeRun(
      { text: "Přidej alias pro nový gift do gift mapy", source: "test" },
      { autoRun: false }
    );
    assert.equal(result.ok, true);
    assert.equal(result.job.kind, "cursor_task");
    assert.ok(fs.existsSync(remoteDev.LATEST_PROMPT_PATH));
    const prompt = fs.readFileSync(remoteDev.LATEST_PROMPT_PATH, "utf8");
    assert.match(prompt, /Remote Dev/);
    assert.match(prompt, /gift mapy|gift map/i);
    assert.ok(path.normalize(remoteDev.DATA_DIR).includes("remote-dev"));
  });

  await test("status lists jobs", () => {
    const st = remoteDev.getStatus();
    assert.equal(st.ok, true);
    assert.ok(Array.isArray(st.jobs));
    assert.ok(st.latest);
  });

  await test("watcher notifies awaiting cursor jobs once", () => {
    const tmpDir = path.join(ROOT, "data", "remote-dev", "_contract_watcher");
    const prev = process.env.MIA_REMOTE_DEV_DATA_DIR;
    process.env.MIA_REMOTE_DEV_DATA_DIR = tmpDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });

    delete require.cache[require.resolve("../scripts/MIA_REMOTE_DEV")];
    delete require.cache[require.resolve("../scripts/mia_remote_dev_watcher")];

    const remoteDevIsolated = require("../scripts/MIA_REMOTE_DEV");
    const watcher = require("../scripts/mia_remote_dev_watcher");

    try {
      const created = remoteDevIsolated.createJob({
        text: "Watcher notifikace — jen cursor fronta",
        source: "test"
      });
      assert.equal(created.ok, true);

      const updated = remoteDevIsolated.updateJob(created.job.id, {
        status: "awaiting_cursor",
        notifiedAt: null,
        kind: "cursor_task"
      });
      assert.ok(updated);

      const pendingBefore = watcher.listAwaitingCursorJobs();
      assert.ok(pendingBefore.some((j) => j.id === created.job.id));

      const first = watcher.tick();
      assert.ok(first.notified >= 1);

      const job = remoteDevIsolated.getJob(created.job.id);
      assert.ok(job.notifiedAt);
      assert.equal(job.status, "awaiting_cursor");

      const second = watcher.tick();
      const stillPending = watcher.listAwaitingCursorJobs().some((j) => j.id === created.job.id);
      assert.equal(stillPending, false);
      assert.equal(second.notified, 0);
    } finally {
      if (prev == null) delete process.env.MIA_REMOTE_DEV_DATA_DIR;
      else process.env.MIA_REMOTE_DEV_DATA_DIR = prev;
      delete require.cache[require.resolve("../scripts/MIA_REMOTE_DEV")];
      delete require.cache[require.resolve("../scripts/mia_remote_dev_watcher")];
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  console.log("remote_dev_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

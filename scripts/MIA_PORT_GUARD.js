"use strict";

const net = require("net");
const { execSync } = require("child_process");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();

    server.once("error", (err) => {
      resolve({
        available: false,
        code: err && err.code ? err.code : "error"
      });
    });

    server.listen(port, () => {
      server.close(() => {
        resolve({ available: true });
      });
    });
  });
}

function findWindowsListenPid(port) {
  try {
    const raw = execSync("netstat -ano -p tcp", {
      encoding: "utf8",
      timeout: 5000
    });

    const target = `:${Number(port)}`;
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      if (!/LISTENING/i.test(line)) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) {
        continue;
      }

      const localAddress = parts[1] || "";
      const pid = Number(parts[parts.length - 1]);

      if (!localAddress.endsWith(target) || !Number.isFinite(pid) || pid <= 0) {
        continue;
      }

      return pid;
    }
  } catch (_err) {
    // ignore
  }

  return 0;
}

function describeWindowsProcess(pid) {
  let processName = "";
  let commandLine = "";

  try {
    const raw = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: "utf8",
      timeout: 3000
    }).trim();

    const match = raw.match(/^"([^"]+)"/);
    if (match) {
      processName = match[1];
    }
  } catch (_err) {
    // ignore
  }

  try {
    const raw = execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
      { encoding: "utf8", timeout: 3000 }
    ).trim();

    if (raw && raw.toLowerCase() !== "commandline") {
      commandLine = raw;
    }
  } catch (_err) {
    // ignore
  }

  return { processName, commandLine };
}

function describeWindowsListener(port) {
  const pid = findWindowsListenPid(port);
  if (!pid) {
    return null;
  }

  const details = describeWindowsProcess(pid);

  return {
    pid,
    processName: details.processName,
    commandLine: details.commandLine
  };
}

function describeUnixListener(port) {
  try {
    const raw = execSync(`lsof -nP -iTCP:${Number(port)} -sTCP:LISTEN 2>/dev/null | tail -n +2`, {
      encoding: "utf8",
      timeout: 8000
    }).trim();

    if (!raw) {
      return null;
    }

    const line = raw.split("\n")[0] || "";
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[1]);
    const commandLine = parts.slice(8).join(" ");

    if (!Number.isFinite(pid) || pid <= 0) {
      return null;
    }

    return {
      pid,
      processName: safeString(parts[0], "process"),
      commandLine
    };
  } catch (_err) {
    return null;
  }
}

function describePortListener(port) {
  if (process.platform === "win32") {
    return describeWindowsListener(port);
  }

  return describeUnixListener(port);
}

function looksLikeMiaProcess(listener = {}) {
  const commandLine = safeString(listener.commandLine).toLowerCase();
  const processName = safeString(listener.processName).toLowerCase();
  const isNode = processName === "node.exe" || processName === "node";

  if (processName && !isNode) {
    return false;
  }

  // Windows často nevrátí CommandLine — node na MIA portu = MIA.
  if (!commandLine) {
    return isNode || !processName;
  }

  return (
    /index\.js/.test(commandLine) ||
    /[\\/]mia[\\/]/.test(commandLine) ||
    /mia[\\/._-]/.test(commandLine) ||
    /mia_(restart|stop|health)/.test(commandLine) ||
    /engine_shadow_runtime/.test(commandLine)
  );
}

function buildPortInUseMessage(port, listener = null) {
  const lines = [
    "",
    `[MIA] Port ${port} is already in use — another server is probably already running.`,
    ""
  ];

  if (listener && listener.pid) {
    lines.push(`  PID:         ${listener.pid}`);
    if (listener.processName) {
      lines.push(`  Process:     ${listener.processName}`);
    }
    if (listener.commandLine) {
      lines.push(`  Command:     ${listener.commandLine}`);
    }
    lines.push("");
  } else {
    lines.push("  Could not detect which process holds the port.");
    lines.push("");
  }

  lines.push("  Stop the existing instance, then start again:");
  lines.push("    npm run stop");
  lines.push("    npm start");
  lines.push("");
  lines.push("  Or restart in one step:");
  lines.push("    npm run restart");
  lines.push("");

  return lines.join("\n");
}

function printPortInUseHelp(port) {
  const listener = describePortListener(port);
  console.error(buildPortInUseMessage(port, listener));
}

async function assertPortAvailableOrExit(port) {
  const probe = await isPortAvailable(port);

  if (probe.available) {
    return true;
  }

  printPortInUseHelp(port);
  process.exit(1);
}

async function waitForPortFree(port, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const listener = describePortListener(port);
    if (!listener?.pid) {
      return { ok: true, waitedMs: Date.now() - started };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, waitedMs: Date.now() - started };
}

module.exports = {
  isPortAvailable,
  describePortListener,
  looksLikeMiaProcess,
  buildPortInUseMessage,
  printPortInUseHelp,
  assertPortAvailableOrExit,
  waitForPortFree
};

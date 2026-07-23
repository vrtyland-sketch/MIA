"use strict";

const { MAX_UNDO } = require("./constants");

function createHistoryStack(maxDepth = MAX_UNDO) {
  const undo = [];
  const redo = [];
  let max = Math.max(1, Number(maxDepth) || MAX_UNDO);

  function execute(command, doc) {
    if (!command || typeof command.apply !== "function") {
      throw new Error("history: command must implement apply()");
    }
    const snapshot = command.apply(doc);
    undo.push({ command, snapshot });
    if (undo.length > max) undo.shift();
    redo.length = 0;
    return doc;
  }

  function undoOnce(doc) {
    const entry = undo.pop();
    if (!entry) return { doc, changed: false };
    if (typeof entry.command.revert === "function") {
      entry.command.revert(doc, entry.snapshot);
    }
    redo.push(entry);
    return { doc, changed: true };
  }

  function redoOnce(doc) {
    const entry = redo.pop();
    if (!entry) return { doc, changed: false };
    const snapshot = entry.command.apply(doc);
    entry.snapshot = snapshot;
    undo.push(entry);
    return { doc, changed: true };
  }

  function canUndo() {
    return undo.length > 0;
  }

  function canRedo() {
    return redo.length > 0;
  }

  function clear() {
    undo.length = 0;
    redo.length = 0;
  }

  return {
    execute,
    undo: undoOnce,
    redo: redoOnce,
    canUndo,
    canRedo,
    clear,
    get depth() {
      return undo.length;
    }
  };
}

module.exports = { createHistoryStack };

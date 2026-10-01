"use strict";

const memory = require("./memorySystem");
const workingMemory = require("./workingMemory");
const shortTermMemory = require("./shortTermMemory");
const longTermMemory = require("./longTermMemory");
const episodicMemory = require("./episodicMemory");
const semanticMemory = require("./semanticMemory");
const proceduralMemory = require("./proceduralMemory");
const emotionalMemory = require("./emotionalMemory");
const knowledgeGraphManager = require("./knowledgeGraphManager");

module.exports = {
  ...memory,
  ...workingMemory,
  ...shortTermMemory,
  ...longTermMemory,
  ...episodicMemory,
  ...semanticMemory,
  ...proceduralMemory,
  ...emotionalMemory,
  ...knowledgeGraphManager
};

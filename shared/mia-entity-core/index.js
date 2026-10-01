"use strict";

const lifecycle = require("./entityLifecycle");
const categories = require("./entityCategories");
const schema = require("./entitySchema");
const relations = require("./entityRelations");
const system = require("./systemEntities");

module.exports = {
  ...lifecycle,
  ...categories,
  ...schema,
  ...relations,
  ...system
};

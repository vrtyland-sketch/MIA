"use strict";

const lifecycle = require("./eventLifecycle");
const categories = require("./eventCategories");
const priority = require("./eventPriority");
const queues = require("./eventQueues");
const schema = require("./eventSchema");
const bus = require("./eventBus");
const infrastructure = require("./eventBusInfrastructure");
const gateway = require("./eventGateway");
const validator = require("./eventValidator");
const registry = require("./eventRegistry");
const router = require("./eventRouter");
const priorityManager = require("./priorityManager");
const queueManager = require("./queueManager");
const dispatcher = require("./eventDispatcher");

module.exports = {
  ...lifecycle,
  ...categories,
  ...priority,
  ...queues,
  ...schema,
  ...bus,
  ...infrastructure,
  ...gateway,
  ...validator,
  ...registry,
  ...router,
  ...priorityManager,
  ...queueManager,
  ...dispatcher
};

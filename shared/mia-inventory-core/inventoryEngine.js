"use strict";

/**
 * Master Canon 0040 — Inventory Engine: item and inventory management for MIA.
 */

const crypto = require("crypto");

const IE_COMPONENT = Object.freeze({
  INVENTORY_MANAGER: "inventory_manager",
  ITEM_REGISTRY: "item_registry",
  EQUIPMENT_MANAGER: "equipment_manager",
  STACK_MANAGER: "stack_manager",
  CRAFTING_MANAGER: "crafting_manager",
  LOOT_MANAGER: "loot_manager",
  TRADE_MANAGER: "trade_manager",
  INVENTORY_VALIDATOR: "inventory_validator",
  INVENTORY_ANALYTICS: "inventory_analytics",
  INVENTORY_HISTORY: "inventory_history",
  INVENTORY_PERSISTENCE: "inventory_persistence",
  INVENTORY_API: "inventory_api"
});

const IE_COMPONENT_ORDER = Object.freeze(Object.values(IE_COMPONENT));

const IE_INVENTORY_TYPE = Object.freeze({
  PLAYER: "player_inventory",
  BATTLE: "battle_inventory",
  KOJNOZROUT: "kojnozout_inventory",
  GUILD: "guild_inventory",
  EVENT: "event_inventory",
  TEMPORARY: "temporary_inventory"
});

const IE_ITEM_TYPE = Object.freeze({
  WEAPON: "weapon",
  ARMOR: "armor",
  FOOD: "food",
  POTION: "potion",
  SKILL: "skill",
  BUFF: "buff",
  QUEST: "quest",
  COSMETIC: "cosmetic",
  KEY_ITEM: "key_item",
  CURRENCY: "currency"
});

const IE_RARITY = Object.freeze({
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
  MYTHIC: "mythic",
  UNIQUE: "unique"
});

const IE_RARITY_ORDER = Object.freeze(Object.values(IE_RARITY));

const IE_LOOT_SOURCE = Object.freeze({
  CHAT: "active_chat",
  GIFT: "gift",
  BATTLE: "battle",
  EVENT: "event",
  ACHIEVEMENT: "achievement",
  CRAFTING: "crafting"
});

const IE_HISTORY_EVENT = Object.freeze({
  ACQUIRED: "acquired",
  MOVED: "moved",
  USED: "used",
  CONSUMED: "consumed",
  EQUIPPED: "equipped",
  TRADED: "traded",
  ARCHIVED: "archived"
});

const IE_ITEM_LIFECYCLE = Object.freeze([
  "created",
  "loot",
  "inventory",
  "use",
  "cooldown",
  "consume_or_equip",
  "archive"
]);

const IE_EQUIP_SLOT = Object.freeze({
  HEAD: "head",
  BODY: "body",
  HANDS: "hands",
  ACCESSORY: "accessory",
  SPECIAL: "special"
});

const IE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "decide_battle",
  "mutate_economy",
  "mutate_personality",
  "create_item_outside_loot",
  "bypass_decision_engine"
]);

const IE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-inventory-core/inventoryEngine.js",
  "scripts/MIA_KOJNOZROUT_BACKPACK.js",
  "scripts/MIA_KOJNOZROUT_ITEM_META.js",
  "scripts/MIA_CHAT_REWARD_ENGINE.js",
  "shared/mia-battle-core/battleEngine.js",
  "shared/mia-decision-core/decisionEngine.js"
]);

function registerItemDefinition(input = {}, registry = {}) {
  const def = Object.freeze({
    itemId: input.itemId || `def-${crypto.randomUUID()}`,
    name: input.name || "Item",
    description: input.description || "",
    icon: input.icon || null,
    type: input.type || IE_ITEM_TYPE.FOOD,
    rarity: input.rarity || IE_RARITY.COMMON,
    effect: input.effect || "buff",
    maxStack: input.maxStack != null ? Number(input.maxStack) : 1,
    metadata: Object.freeze(input.metadata || {})
  });

  const next = { ...registry, [def.itemId]: def };
  return Object.freeze({
    ok: true,
    definition: def,
    registry: Object.freeze(next),
    component: IE_COMPONENT.ITEM_REGISTRY
  });
}

function getItemDefinition(itemId, registry = {}) {
  const def = registry[itemId] || null;
  return Object.freeze({
    ok: Boolean(def),
    definition: def,
    component: IE_COMPONENT.ITEM_REGISTRY
  });
}

function createInventory(input = {}) {
  return Object.freeze({
    ok: true,
    inventoryId: input.inventoryId || `inv-${crypto.randomUUID()}`,
    ownerId: input.ownerId || "system",
    type: input.type || IE_INVENTORY_TYPE.PLAYER,
    capacity: input.capacity != null ? Number(input.capacity) : 64,
    itemRefs: Object.freeze(input.itemRefs || []),
    history: Object.freeze(input.history || []),
    component: IE_COMPONENT.INVENTORY_MANAGER
  });
}

function createItemInstance(definition = {}, ownerId = "system") {
  return Object.freeze({
    instanceId: `item-${crypto.randomUUID()}`,
    itemId: definition.itemId,
    ownerId,
    state: "available",
    rarity: definition.rarity || IE_RARITY.COMMON,
    metadata: Object.freeze({ ...(definition.metadata || {}) }),
    unique: true
  });
}

function stackItems(inventory = {}, instances = [], definition = {}) {
  const maxStack = definition.maxStack != null ? Number(definition.maxStack) : 1;
  if (maxStack <= 1) {
    return Object.freeze({
      ok: true,
      stacks: Object.freeze(instances.map((i) => Object.freeze({ instanceId: i.instanceId, quantity: 1 }))),
      component: IE_COMPONENT.STACK_MANAGER
    });
  }

  const quantity = instances.length;
  return Object.freeze({
    ok: true,
    stacks: Object.freeze([
      Object.freeze({
        itemId: definition.itemId,
        quantity,
        label: `${definition.name || definition.itemId} ×${quantity}`
      })
    ]),
    component: IE_COMPONENT.STACK_MANAGER
  });
}

function equipItem(inventory = {}, instance = {}, slot = IE_EQUIP_SLOT.HANDS) {
  return Object.freeze({
    ok: Boolean(instance.instanceId),
    inventoryId: inventory.inventoryId,
    instanceId: instance.instanceId,
    slot,
    component: IE_COMPONENT.EQUIPMENT_MANAGER
  });
}

function rollLoot(source = IE_LOOT_SOURCE.CHAT, table = {}, rng = Math.random) {
  const entries = Array.isArray(table.entries) ? table.entries : [];
  const roll = rng();
  let cumulative = 0;
  let picked = entries[0] || null;

  for (const entry of entries) {
    cumulative += entry.weight != null ? Number(entry.weight) : 0;
    if (roll <= cumulative) {
      picked = entry;
      break;
    }
  }

  return Object.freeze({
    ok: Boolean(picked),
    source,
    itemId: picked?.itemId || null,
    rarity: picked?.rarity || IE_RARITY.COMMON,
    component: IE_COMPONENT.LOOT_MANAGER
  });
}

function craftItem(recipe = {}, registry = {}, inventory = {}) {
  const inputs = Array.isArray(recipe.inputs) ? recipe.inputs : [];
  const outputId = recipe.outputItemId;
  const hasInputs = inputs.every((id) => inventory.itemRefs?.some((ref) => ref.itemId === id));

  return Object.freeze({
    ok: Boolean(outputId) && hasInputs,
    recipeId: recipe.recipeId || `recipe-${outputId}`,
    outputItemId: outputId,
    dataDriven: true,
    component: IE_COMPONENT.CRAFTING_MANAGER
  });
}

function executeTrade(fromInventory = {}, toInventory = {}, instance = {}, audit = {}) {
  return Object.freeze({
    ok: Boolean(instance.instanceId),
    tradeId: `trade-${crypto.randomUUID()}`,
    from: fromInventory.inventoryId,
    to: toInventory.inventoryId,
    instanceId: instance.instanceId,
    audited: audit.audited !== false,
    component: IE_COMPONENT.TRADE_MANAGER
  });
}

function validateInventory(inventory = {}, registry = {}, instances = {}) {
  const errors = [];
  const refs = inventory.itemRefs || [];

  if (refs.length > (inventory.capacity || 0)) errors.push("capacity_exceeded");

  for (const ref of refs) {
    if (!registry[ref.itemId]) errors.push(`unknown_item:${ref.itemId}`);
    if (!instances[ref.instanceId]) errors.push(`missing_instance:${ref.instanceId}`);
  }

  const instanceIds = refs.map((r) => r.instanceId);
  if (new Set(instanceIds).size !== instanceIds.length) errors.push("duplicate_instance_ref");

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: IE_COMPONENT.INVENTORY_VALIDATOR
  });
}

function recordInventoryHistory(event = IE_HISTORY_EVENT.ACQUIRED, payload = {}) {
  return Object.freeze({
    ok: true,
    event,
    historyId: `hist-${crypto.randomUUID()}`,
    immutable: true,
    payload: Object.freeze(payload),
    recordedAt: Date.now(),
    component: IE_COMPONENT.INVENTORY_HISTORY
  });
}

function collectInventoryAnalytics(run = {}) {
  return Object.freeze({
    topItems: Object.freeze(run.topItems || []),
    usageCount: run.usageCount || 0,
    tradeCount: run.tradeCount || 0,
    craftCount: run.craftCount || 0,
    consumeCount: run.consumeCount || 0,
    component: IE_COMPONENT.INVENTORY_ANALYTICS
  });
}

function persistInventorySnapshot(inventory = {}, store = {}) {
  const key = inventory.inventoryId;
  const next = { ...store, [key]: { ...inventory, persistedAt: Date.now() } };
  return Object.freeze({
    ok: true,
    key,
    store: Object.freeze(next),
    component: IE_COMPONENT.INVENTORY_PERSISTENCE
  });
}

function lendItemsToBattle(inventory = {}, battleId = "") {
  return Object.freeze({
    ok: true,
    battleId,
    references: Object.freeze(
      (inventory.itemRefs || []).map((ref) =>
        Object.freeze({
          instanceId: ref.instanceId,
          itemId: ref.itemId,
          borrowed: true,
          battleManaged: false
        })
      )
    ),
    component: IE_COMPONENT.INVENTORY_API
  });
}

function validateInventoryInput(input = {}) {
  const errors = [];
  if (input.decidesBattle === true) errors.push("battle_decision_forbidden");
  if (input.mutatesEconomy === true) errors.push("economy_mutation_forbidden");
  if (input.createOutsideLoot === true) errors.push("loot_manager_required");
  if (input.bypassDecisionEngine === true) errors.push("decision_engine_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: IE_COMPONENT.INVENTORY_API
  });
}

function assertInventoryForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !IE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createInventoryEngine(options = {}) {
  const registry = { ...(options.registry || {}) };
  const instances = {};
  const inventories = {};
  const store = {};
  const history = [];

  return {
    registerDefinition(input = {}) {
      const result = registerItemDefinition(input, registry);
      Object.assign(registry, result.registry);
      return result;
    },
    grantLoot(input = {}) {
      const validation = validateInventoryInput({
        mutatesEconomy: input.mutatesEconomy,
        createOutsideLoot: input.createOutsideLoot === true && !input.viaLootManager,
        bypassDecisionEngine: input.bypassDecisionEngine
      });
      if (!validation.ok) {
        return Object.freeze({ ok: false, validation, component: IE_COMPONENT.INVENTORY_API });
      }

      const loot = rollLoot(input.source || IE_LOOT_SOURCE.CHAT, input.table || {}, input.rng);
      if (!loot.ok) return Object.freeze({ ok: false, error: "loot_miss", loot });

      const defResult = getItemDefinition(loot.itemId, registry);
      if (!defResult.ok) return Object.freeze({ ok: false, error: "unknown_item_definition" });

      const instance = createItemInstance(defResult.definition, input.ownerId || "player");
      instances[instance.instanceId] = instance;

      const inventory =
        inventories[input.inventoryId] ||
        createInventory({
          inventoryId: input.inventoryId,
          ownerId: input.ownerId,
          type: input.inventoryType || IE_INVENTORY_TYPE.PLAYER
        });

      const itemRefs = [...(inventory.itemRefs || []), { instanceId: instance.instanceId, itemId: instance.itemId }];
      const nextInventory = createInventory({ ...inventory, itemRefs });
      inventories[nextInventory.inventoryId] = nextInventory;

      const hist = recordInventoryHistory(IE_HISTORY_EVENT.ACQUIRED, {
        inventoryId: nextInventory.inventoryId,
        instanceId: instance.instanceId,
        source: loot.source
      });
      history.push(hist);

      const persisted = persistInventorySnapshot(nextInventory, store);
      Object.assign(store, persisted.store);

      return Object.freeze({
        ok: true,
        loot,
        instance,
        inventory: nextInventory,
        history: hist,
        decides: false,
        component: IE_COMPONENT.INVENTORY_API
      });
    },
    useInBattle(input = {}) {
      const inventory = inventories[input.inventoryId];
      if (!inventory) return Object.freeze({ ok: false, error: "inventory_not_found" });

      const lend = lendItemsToBattle(inventory, input.battleId);
      const ref = lend.references.find((r) => r.instanceId === input.instanceId);
      if (!ref) return Object.freeze({ ok: false, error: "item_not_in_inventory" });

      const hist = recordInventoryHistory(IE_HISTORY_EVENT.USED, {
        battleId: input.battleId,
        instanceId: input.instanceId,
        cooldownMs: input.cooldownMs || 0
      });
      history.push(hist);

      return Object.freeze({
        ok: true,
        reference: ref,
        battleManaged: false,
        history: hist,
        decides: false,
        component: IE_COMPONENT.INVENTORY_API
      });
    },
    craft(recipe = {}, inventoryId = "") {
      const inventory = inventories[inventoryId];
      if (!inventory) return Object.freeze({ ok: false, error: "inventory_not_found" });

      const crafted = craftItem(recipe, registry, inventory);
      if (!crafted.ok) return crafted;

      const defResult = getItemDefinition(crafted.outputItemId, registry);
      const instance = createItemInstance(defResult.definition, inventory.ownerId);
      instances[instance.instanceId] = instance;

      const nextInventory = createInventory({
        ...inventory,
        itemRefs: [...inventory.itemRefs, { instanceId: instance.instanceId, itemId: instance.itemId }]
      });
      inventories[nextInventory.inventoryId] = nextInventory;

      const hist = recordInventoryHistory(IE_HISTORY_EVENT.ACQUIRED, {
        inventoryId,
        instanceId: instance.instanceId,
        source: IE_LOOT_SOURCE.CRAFTING
      });
      history.push(hist);

      return Object.freeze({
        ok: true,
        crafted,
        instance,
        inventory: nextInventory,
        component: IE_COMPONENT.CRAFTING_MANAGER
      });
    },
    validate(inventoryId = "") {
      const inventory = inventories[inventoryId];
      if (!inventory) return Object.freeze({ ok: false, error: "inventory_not_found" });
      return validateInventory(inventory, registry, instances);
    },
    analytics() {
      return collectInventoryAnalytics({
        usageCount: history.filter((h) => h.event === IE_HISTORY_EVENT.USED).length,
        tradeCount: history.filter((h) => h.event === IE_HISTORY_EVENT.TRADED).length,
        craftCount: history.filter((h) => h.payload?.source === IE_LOOT_SOURCE.CRAFTING).length
      });
    },
    history() {
      return Object.freeze([...history]);
    },
    registry() {
      return Object.freeze({ ...registry });
    }
  };
}

function createInventoryApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: IE_COMPONENT.INVENTORY_API
  });
}

module.exports = {
  IE_COMPONENT,
  IE_COMPONENT_ORDER,
  IE_INVENTORY_TYPE,
  IE_ITEM_TYPE,
  IE_RARITY,
  IE_RARITY_ORDER,
  IE_LOOT_SOURCE,
  IE_HISTORY_EVENT,
  IE_ITEM_LIFECYCLE,
  IE_EQUIP_SLOT,
  IE_FORBIDDEN_ACTIVITIES,
  IE_RUNTIME_ANCHORS,
  registerItemDefinition,
  getItemDefinition,
  createInventory,
  createItemInstance,
  stackItems,
  equipItem,
  rollLoot,
  craftItem,
  executeTrade,
  validateInventory,
  recordInventoryHistory,
  collectInventoryAnalytics,
  persistInventorySnapshot,
  lendItemsToBattle,
  validateInventoryInput,
  createInventoryEngine,
  createInventoryApiResponse,
  assertInventoryForbiddenActivity
};

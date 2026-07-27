"use strict";

/**
 * Route context boot — collect/init/runtime wrappers extracted from index.js (E5b).
 */

function createRouteContextBoot({
  routeContextModule,
  routeContextHostModule,
  routeContextCtxModule,
  routeContextDepsModule,
  collectBindings
}) {
  let api = null;

  function collectHost() {
    const buildHost =
      typeof routeContextHostModule.buildRouteContextHost === "function"
        ? routeContextHostModule.buildRouteContextHost
        : (bindings) => bindings;
    return buildHost(collectBindings());
  }

  function init() {
    if (api) return api;
    if (typeof routeContextModule.createRouteContextRuntime !== "function") {
      api = {
        buildMiaRouteContext: () => ({}),
        resetOverlayState: () => {}
      };
      return api;
    }

    const buildCtx =
      typeof routeContextCtxModule.buildRouteContextCtx === "function"
        ? routeContextCtxModule.buildRouteContextCtx
        : (host) => host;

    const buildDeps =
      typeof routeContextDepsModule.buildRouteContextDeps === "function"
        ? routeContextDepsModule.buildRouteContextDeps
        : (ctx) => ctx;

    api = routeContextModule.createRouteContextRuntime(
      buildDeps(buildCtx(collectHost()))
    );
    return api;
  }

  function getRuntime() {
    return init();
  }

  function resetOverlayState() {
    return getRuntime().resetOverlayState();
  }

  function buildMiaRouteContext() {
    return getRuntime().buildMiaRouteContext();
  }

  return { collectHost, init, getRuntime, resetOverlayState, buildMiaRouteContext };
}

module.exports = { createRouteContextBoot };

"use strict";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function computeBoneChainWorld(rig, sampleAngleFn, timeMs = 0) {
  if (!rig?.bones?.length) return [];
  const pivotX = Number(rig.pivotX) || 0;
  const pivotY = Number(rig.pivotY) || 0;
  let x = pivotX;
  let y = pivotY;
  let cumulative = 0;
  const chain = [];

  for (const bone of rig.bones) {
    const local = sampleAngleFn(rig, bone.id, timeMs);
    cumulative += local;
    const rad = degToRad(cumulative);
    const len = Math.max(1, Number(bone.length) || 32);
    const endX = x + Math.cos(rad) * len;
    const endY = y + Math.sin(rad) * len;
    chain.push({
      id: bone.id,
      parentId: bone.parentId,
      x,
      y,
      endX,
      endY,
      localAngle: local,
      worldAngle: cumulative,
      length: len
    });
    x = endX;
    y = endY;
  }
  return chain;
}

function solveTwoBoneIK(rootX, rootY, targetX, targetY, lenA, lenB) {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  let dist = Math.hypot(dx, dy);
  const maxReach = lenA + lenB - 0.001;
  const minReach = Math.abs(lenA - lenB) + 0.001;
  dist = clamp(dist, minReach, maxReach);

  const base = Math.atan2(dy, dx);
  const cosA = (lenA * lenA + dist * dist - lenB * lenB) / (2 * lenA * dist);
  const angleA = Math.acos(clamp(cosA, -1, 1));
  const cosB = (lenA * lenA + lenB * lenB - dist * dist) / (2 * lenA * lenB);
  const elbow = Math.acos(clamp(cosB, -1, 1));

  const rootWorld = base - angleA;
  const midWorld = base + angleA;

  return {
    ok: true,
    rootWorld: radToDeg(rootWorld),
    midLocal: radToDeg(midWorld - rootWorld),
    reachable: Math.hypot(dx, dy) <= maxReach + 0.01,
    targetX,
    targetY,
    dist
  };
}

function solveRigIK(rig, targetX, targetY, timeMs = 0, sampleAngleFn) {
  if (!rig?.bones || rig.bones.length < 2) {
    return { ok: false, error: "need_two_bones" };
  }
  const chain = computeBoneChainWorld(rig, sampleAngleFn, timeMs);
  const root = chain[0];
  if (!root) return { ok: false, error: "no_root" };

  const b0 = rig.bones[0];
  const b1 = rig.bones[1];
  const solved = solveTwoBoneIK(root.x, root.y, targetX, targetY, b0.length, b1.length);

  const angles = {};
  angles[b0.id] = solved.rootWorld - (b0.angle || 0);
  angles[b1.id] = solved.midLocal;
  if (rig.bones[2]) {
    angles[rig.bones[2].id] = 0;
  }

  return {
    ok: true,
    angles,
    solved,
    chain
  };
}

function boneOverlayPaths(chain, docWidth, docHeight) {
  if (!chain?.length) return [];
  const cx = docWidth / 2;
  const cy = docHeight / 2;
  return chain.map((bone) => ({
    id: bone.id,
    x1: cx + bone.x,
    y1: cy + bone.y,
    x2: cx + bone.endX,
    y2: cy + bone.endY,
    jointX: cx + bone.endX,
    jointY: cy + bone.endY
  }));
}

module.exports = {
  computeBoneChainWorld,
  solveTwoBoneIK,
  solveRigIK,
  boneOverlayPaths
};

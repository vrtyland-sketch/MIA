function resolveCommunityImpact(event) {
  const text = (event.meta?.message || '').toLowerCase();

  let moodDelta = 0;
  let engagementDelta = 0;
  let kojnozrouteFeedDelta = 0;

  if (text.length > 0) {
    engagementDelta += 1;
    kojnozrouteFeedDelta += 1;
  }

  if (
    text.includes('haha') ||
    text.includes('lol') ||
    text.includes('😂') ||
    text.includes('🔥') ||
    text.includes('top') ||
    text.includes('dobrý') ||
    text.includes('nice')
  ) {
    moodDelta += 2;
    kojnozrouteFeedDelta += 2;
  }

  if (
    text === text.toUpperCase() && text.length > 3 ||
    text.includes('!!!') ||
    text.includes('jedem') ||
    text.includes('boom')
  ) {
    moodDelta += 3;
    engagementDelta += 2;
    kojnozrouteFeedDelta += 3;
  }

  if (
    text.includes('debil') ||
    text.includes('kokot') ||
    text.includes('shit')
  ) {
    moodDelta -= 3;
  }

  return {
    moodDelta,
    engagementDelta,
    kojnozrouteFeedDelta
  };
}

module.exports = {
  resolveCommunityImpact
};
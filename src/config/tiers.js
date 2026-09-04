/**
 * Central feature-gating config.
 * Add new features here and they're automatically enforced everywhere
 * that calls hasAccess() — no need to hunt through handler code.
 */

const TIERS = {
  FREE: 'free',
  PRO: 'pro',
};

// Which tier unlocks which feature. Anything not listed defaults to PRO-only.
const FEATURE_REQUIREMENTS = {
  viewMessages: TIERS.FREE,   // read/log incoming messages
  reactToMessage: TIERS.FREE, // send emoji reactions
  viewStatus: TIERS.PRO,      // auto-view/save contacts' statuses
  autoReply: TIERS.PRO,       // keyword-based auto responses
  antiDelete: TIERS.PRO,      // resurface deleted messages (future feature)
  broadcast: TIERS.PRO,       // bulk send (future feature)
};

const TIER_RANK = {
  [TIERS.FREE]: 0,
  [TIERS.PRO]: 1,
};

function hasAccess(userTier, featureName) {
  const required = FEATURE_REQUIREMENTS[featureName] ?? TIERS.PRO;
  const userRank = TIER_RANK[userTier] ?? 0;
  const requiredRank = TIER_RANK[required] ?? 1;
  return userRank >= requiredRank;
}

module.exports = { TIERS, FEATURE_REQUIREMENTS, hasAccess };

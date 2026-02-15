import {
  canTriggerEmailForRole,
  markEmailTriggered,
  scheduleSensitiveTopicEmailEvents,
  consumeDueSensitiveTopicEmailEvents
} from '../js/events-system.js';

const gameState = {
  round: 3,
  syncRate: 70,
  connectionMode: 'STANDARD',
  missionState: { route: 'CORPORATE' },
  deviations: { corporate: 80, resistance: 75, mystery: 70 },
  emailTriggerState: null,
  save() {}
};

const a1 = canTriggerEmailForRole(gameState, 'corporate', { respectPerRound: true });
const scheduled = scheduleSensitiveTopicEmailEvents(gameState, '\u76d1\u542c \u62b5\u6297', 3);

gameState.round = 6;
const dueBeforeMark = consumeDueSensitiveTopicEmailEvents(gameState);
markEmailTriggered(gameState, 'corporate');
const a2 = canTriggerEmailForRole(gameState, 'corporate', { respectPerRound: true });

console.log(JSON.stringify({
  firstCheck: a1,
  secondCheckAfterMark: a2,
  scheduledCount: scheduled.length,
  scheduledRules: scheduled.map(x => x.ruleId),
  dueCount: dueBeforeMark.length,
  dueRoles: dueBeforeMark.map(x => x.roleId)
}, null, 2));

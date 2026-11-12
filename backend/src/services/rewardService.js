import { randomBytes, randomInt } from 'node:crypto';
import { getTicketEligibility } from './ticketEligibilityService.js';

export const REWARDS = Object.freeze([
  { id: 'discount-5', label: '5% off', discount_percent: 5, weight: 500 },
  { id: 'discount-10', label: '10% off', discount_percent: 10, weight: 280 },
  { id: 'discount-15', label: '15% off', discount_percent: 15, weight: 150 },
  { id: 'discount-20', label: '20% off', discount_percent: 20, weight: 60 },
  { id: 'discount-30', label: '30% off', discount_percent: 30, weight: 9 },
  { id: 'discount-100', label: '100% off', discount_percent: 100, weight: 1 },
]);
export const TOTAL_WEIGHT = 1000;

export function selectReward(draw) {
  if (!Number.isInteger(draw) || draw < 0 || draw >= TOTAL_WEIGHT) throw new Error('Invalid reward draw.');
  let boundary = 0;
  for (const reward of REWARDS) {
    boundary += reward.weight;
    if (draw < boundary) return reward;
  }
  throw new Error('Invalid reward configuration.');
}

export function rewardCatalog() {
  return REWARDS.map(({ weight, ...reward }) => ({ ...reward, chance: weight / TOTAL_WEIGHT }));
}

function savedReward(row) {
  if (!row.REWARD_ID) return null;
  const definition = REWARDS.find(reward => reward.id === row.REWARD_ID);
  if (!definition || !row.REWARD_CODE || !row.REWARD_SPUN_AT) throw new Error('Invalid saved reward.');
  return {
    id: definition.id, label: definition.label, discount_percent: definition.discount_percent,
    code: row.REWARD_CODE, spun_at: row.REWARD_SPUN_AT,
  };
}

export function createRewardService(runQuery, { draw = () => randomInt(TOTAL_WEIGHT), code = () => `FAN-${randomBytes(8).toString('hex').toUpperCase()}` } = {}) {
  async function readTicketReward(ticket) {
    const rows = await runQuery(`
      SELECT REWARD_ID, REWARD_CODE, REWARD_SPUN_AT
      FROM PUBLIC_APP.TICKETS WHERE ID = ? AND BARCODE = ?
    `, [ticket.TICKET_ID, ticket.BARCODE]);
    if (rows.length !== 1) throw new Error('Ticket reward record is missing or ambiguous.');
    return savedReward(rows[0]);
  }

  async function state(ticketCode) {
    const eligibility = await getTicketEligibility(ticketCode, runQuery);
    if (!eligibility.ticket) throw Object.assign(new Error('Ticket not found.'), { status: 404 });
    const reward = await readTicketReward(eligibility.ticket);
    return { eligibility, reward };
  }

  return {
    async getStatus(ticketCode) {
      const { eligibility, reward } = await state(ticketCode);
      return {
        can_spin: eligibility.review_used && !reward,
        review_used: eligibility.review_used,
        reward,
        prizes: rewardCatalog(),
      };
    },
    async spin(ticketCode) {
      const { eligibility, reward } = await state(ticketCode);
      if (reward) return { reward, already_spun: true };
      if (!eligibility.review_used) {
        throw Object.assign(new Error('Submit your ticket review before spinning.'), { status: 409 });
      }
      const selected = selectReward(draw());
      const reference = code();
      // One conditional UPDATE claims the existing ticket row. No INSERT race or
      // unenforced UNIQUE constraint: competing requests cannot replace a prize.
      await runQuery(`
        UPDATE PUBLIC_APP.TICKETS
        SET REWARD_ID = ?, REWARD_CODE = ?, REWARD_SPUN_AT = CURRENT_TIMESTAMP()
        WHERE ID = ? AND BARCODE = ? AND REWARD_ID IS NULL
      `, [selected.id, reference, eligibility.ticket.TICKET_ID, eligibility.ticket.BARCODE]);
      const persisted = await readTicketReward(eligibility.ticket);
      if (!persisted) throw new Error('Unable to confirm the saved reward.');
      return { reward: persisted, already_spun: persisted.code !== reference };
    },
  };
}

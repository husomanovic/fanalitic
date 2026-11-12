import express from 'express';
import { query } from '../config/snowflake.js';
import { getTicketEligibility } from '../services/ticketEligibilityService.js';

export function createTicketRouter(runQuery = query) {
  const router = express.Router();
  const lookup = (legacy = false) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const result = await getTicketEligibility(req.params.barcode, runQuery);
      if (!result.ticket) return res.status(404).json({ ...result, message: 'Ticket not found' });
      if (result.review_used) result.message = 'Ticket already used for review.';
      return res.json(legacy ? {
        ...result.ticket, review_used: result.review_used, can_review: result.can_review
      } : result);
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ can_review: false, message: error.message });
      console.error('Ticket eligibility lookup failed', { code: error.code });
      return res.status(500).json({ can_review: false, message: 'Unable to check ticket eligibility. Please try again.' });
    }
  };

  router.get('/:barcode/eligibility', lookup());
  // Keep the original flat response available to existing frontend consumers.
  router.get('/:barcode', lookup(true));
  return router;
}

export default createTicketRouter();

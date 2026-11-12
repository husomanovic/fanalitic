import express from 'express';
import { query } from '../config/snowflake.js';
import { getTicketEligibility, normalizeTicketCode } from '../services/ticketEligibilityService.js';

export function createReviewRouter(runQuery = query) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const review = req.body || {};

      const ratingFields = [
        'overall_score',
        'security_score',
        'organization_score',
        'family_friendly_score',
        'experience_score',
        'comfort_score',
        'game_score'
      ];

      if (
        typeof review.ticket_code !== 'string' ||
        !review.ticket_code.trim()
      ) {
        return res.status(400).json({
          message: 'Valid ticket code is required'
        });
      }

      for (const field of ratingFields) {
        if (
          !Number.isInteger(review[field]) ||
          review[field] < 1 ||
          review[field] > 5
        ) {
          return res.status(400).json({
            message: `${field} must be an integer from 1 to 5`
          });
        }
      }

      if (
        review.feedback_text != null &&
        (typeof review.feedback_text !== 'string' ||
         review.feedback_text.length > 5000)
      ) {
        return res.status(400).json({
          message: 'Invalid feedback text'
        });
      }


      const ticketCode = normalizeTicketCode(review.ticket_code);
      const eligibility = await getTicketEligibility(ticketCode, runQuery);
      if (!eligibility.ticket) {
        return res.status(404).json({ can_review: false, message: 'Invalid ticket code' });
      }
      if (!eligibility.can_review) {
        return res.status(409).json({
          can_review: false, review_used: true, reason: 'ALREADY_REVIEWED', message: 'Ticket already used for review.'
        });
      }

      await runQuery(`
        INSERT INTO INGESTION.REVIEWS_IN (RAW_DATA)
        SELECT PARSE_JSON(?)
      `, [JSON.stringify({
        ticket_code: ticketCode,
        ...Object.fromEntries(
          ratingFields.map(f => [f, review[f]])
        ),
        feedback_text: review.feedback_text || ''
      })]);

      return res.status(202).json({
        message: 'Review accepted for processing'
      });

    } catch (error) {
      if (error.status === 400) return res.status(400).json({ message: error.message });
      console.error('Review submission failed', { code: error.code });
      res.status(500).json({
        message: 'Failed to submit review'
      });
    }
  });

  return router;
}

export default createReviewRouter();

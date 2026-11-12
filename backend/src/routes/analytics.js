import { query } from '../config/snowflake.js';
import { createAnalyticsRouter } from './analyticsRouter.js';

// Explicit GET routes are listed in ./analyticsRouter.js.
// SQL queries live in ../repositories/analyticsRepository.js.
export default createAnalyticsRouter(query);

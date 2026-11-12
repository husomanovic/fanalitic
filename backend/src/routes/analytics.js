import { query } from '../config/snowflake.js';
import { createAnalyticsRouter } from './analyticsRouter.js';


// All 18 explicit GET routes are listed in ./analyticsRouter.js.
// SQL queries live in ../repositories/analyticsRepository.js.
export default createAnalyticsRouter(query);

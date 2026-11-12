-- Keep each reward on its existing ticket row, so one guarded UPDATE claims it.
-- Existing tickets and reviews are preserved. These columns also support trial accounts.
ALTER TABLE PUBLIC_APP.TICKETS ADD COLUMN IF NOT EXISTS REWARD_ID VARCHAR(32);
ALTER TABLE PUBLIC_APP.TICKETS ADD COLUMN IF NOT EXISTS REWARD_CODE VARCHAR(32);
ALTER TABLE PUBLIC_APP.TICKETS ADD COLUMN IF NOT EXISTS REWARD_SPUN_AT TIMESTAMP_TZ;

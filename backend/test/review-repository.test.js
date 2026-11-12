import test from 'node:test';
import assert from 'node:assert/strict';
import { insertReviewFact } from '../src/repositories/reviewRepository.js';

const review = { overall_score:1, security_score:2, organization_score:3,
  family_friendly_score:4, experience_score:5, comfort_score:2, game_score:4,
  feedback_text:"Fan's feedback ?", GAME_ID:999, HOME_TEAM:'Forged name' };

test('direct insert binds every score and comment and derives all dimensions from reference tables', async () => {
  await insertReviewFact(review,'00123',async(sql,binds)=>{
    assert.match(sql,/INSERT INTO READ_READY.REVIEWS_FACT/);
    assert.doesNotMatch(sql,/INGESTION|PARSE_JSON|Forged name|Fan's feedback/);
    assert.match(sql,/G.GAME_DATE/);
    assert.match(sql,/S.ID, S.NAME, S.CITY/);
    assert.match(sql,/CURRENT_TIMESTAMP\(\)::TIMESTAMP_NTZ/);
    assert.equal((sql.match(/\?/g)||[]).length,binds.length);
    assert.deepEqual(binds,[1,2,3,4,5,2,4,"Fan's feedback ?",'00123']);
    return [{'number of rows inserted':1}];
  });
});

test('zero rows and database failures cannot be reported as saved', async () => {
  await assert.rejects(insertReviewFact(review,'00123',async()=>[{'number of rows inserted':0}]),/did not confirm/);
  await assert.rejects(insertReviewFact(review,'00123',async()=>{throw new Error('warehouse unavailable');}),/warehouse unavailable/);
});

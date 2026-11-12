import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/utils/analytics.js', import.meta.url), 'utf8');
const { fetchAnalytics } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('normalizes legacy arrays and sends encoded nonempty filters', async () => {
  const original = global.fetch;
  try {
    global.fetch = async url => {
      assert.match(url, /team=A%26B/);
      assert.ok(!url.includes('section='));
      return {ok:true,json:async()=>[{GAME_ID:1}]};
    };
    assert.deepEqual((await fetchAnalytics('games',{team:'A&B',section:''})).data,[{GAME_ID:1}]);
  } finally { global.fetch = original; }
});

test('loads all envelope pages for charts and preserves review pagination', async () => {
  const original = global.fetch;
  const urls=[];
  try {
    global.fetch = async url => {urls.push(url);return {ok:true,json:async()=>({data:[{value:urls.length}],meta:{hasMore:urls.length === 1}})};};
    const result = await fetchAnalytics('stadiums',{},undefined,true);
    assert.equal(result.data.length,2);
    assert.match(urls[1],/offset=500/);
    urls.length=0;
    const page = await fetchAnalytics('reviews',{limit:10,offset:10});
    assert.equal(urls.length,1);
    assert.equal(page.meta.hasMore,true);
  } finally {global.fetch=original;}
});

test('rejects failed and malformed responses instead of fabricating data', async () => {
  const original=global.fetch;
  try {
    global.fetch=async()=>({ok:false,status:503});
    await assert.rejects(fetchAnalytics('summary'),/503/);
    global.fetch=async()=>({ok:true,json:async()=>({message:'bad'})});
    await assert.rejects(fetchAnalytics('summary'),/Unexpected/);
  } finally {global.fetch=original;}
});

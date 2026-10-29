import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestUrl,chatBatch,encoderArgs} from '../core.mjs';
test('rejects invalid ingest schemes and preserves stream key as a single argument',()=>{
 assert.throws(()=>ingestUrl('file:///tmp','key'));
 assert.throws(()=>ingestUrl('rtmps://example.com/live','bad key'));
 const target=ingestUrl('rtmps://example.com/live/','abcd-1234');
 assert.equal(encoderArgs(target).at(-1),target);
 assert.throws(()=>encoderArgs(target,'arbitrary-code'));
 const signedKey='test-key?expire=123&sign=abc%2F123';
 assert.equal(ingestUrl('rtmps://example.com/live/',signedKey),'rtmps://example.com/live/'+signedKey);
 assert.throws(()=>ingestUrl('rtmps://example.com/live?token=secret','key'));
});
test('deduplicates comments across pages, excludes events and honors platform polling interval',()=>{
 const seen=new Set();const x={id:'1',snippet:{type:'textMessageEvent',displayMessage:'Hello'},authorDetails:{displayName:'Viewer'}};
 const a=chatBatch({items:[x,{id:'2',snippet:{type:'chatEndedEvent'}}],pollingIntervalMillis:12000,nextPageToken:'next'},seen);
 assert.equal(a.rows.length,1);assert.equal(a.wait,12000);assert.equal(a.next,'next');
 assert.equal(chatBatch({items:[x]},seen).rows.length,0);
});

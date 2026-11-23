// CRITICAL: continuity checkpoint; compare frozen pre/post-cutover snapshots.
// Capture only while games are open; do not expect live snapshots to match.
const crypto = require('node:crypto');
function digest(cursor) { const h = crypto.createHash('sha256'); for (const doc of cursor) h.update(EJSON.stringify(doc, {relaxed:false}) + '\n'); return h.digest('hex'); }
print(JSON.stringify({users:db.user4.countDocuments({}),games:db.game5.countDocuments({}),puzzles:db.puzzle2_puzzle.countDocuments({}),rounds:db.puzzle2_round.countDocuments({}),active:db.game5.countDocuments({s:{$lte:20},so:{$ne:7}}),accountIdentityAndCountsSha256:digest(db.user4.find({}, {_id:1,username:1,count:1}).sort({_id:1})),ratingsSha256:digest(db.user_perf.find({}).sort({_id:1})),accountClaimsSha256:digest(db.user4.find({}, {_id:1,nostr:1,nameKeys:1,"profile.displayName":1}).sort({_id:1})),secondFactorStateSha256:digest(db.user4.find({}, {_id:1,totp:1,nosweatRecovery:1,nosweatTotpStep:1}).sort({_id:1}))}))

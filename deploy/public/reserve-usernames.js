// Feature-specific #217 backfill. Run once while the native app is STOPPED;
// bot/game admissions must remain paused. No names or identities are changed.
if (!['nosweat', 'nosweat_lila_dev'].includes(db.getName())) throw new Error('Unexpected database');
if (db.getName() === 'nosweat' && db.nosweat_activity.findOne({ _id: 'public' })?.paused !== true)
  throw new Error('Pause admissions before reserving usernames');

// Match PublicNameKeys: Java NFKC, String.trim(), Locale.ROOT lowercase.
const normalize = name => name.normalize('NFKC').replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '').toLowerCase();
const accounts = db.user4.find({}, { _id: 1, 'profile.displayName': 1 }).toArray();
const owners = new Map();
const writes = accounts.map(account => {
  if (typeof account._id !== 'string') throw new Error('Unexpected account ID');
  const display = account.profile?.displayName;
  if (display !== undefined && typeof display !== 'string') throw new Error('Unexpected display name');
  const keys = [...new Set([normalize(account._id), ...(display ? [normalize(display)].filter(Boolean) : [])])];
  for (const key of keys) {
    if (owners.has(key) && owners.get(key) !== account._id) throw new Error('Existing username collision; no changes made');
    owners.set(key, account._id);
  }
  return { updateOne: {
    filter: { _id: account._id, 'profile.displayName': display === undefined ? { $exists: false } : display },
    update: { $set: { nameKeys: keys } },
  } };
});
if (!accounts.length) throw new Error('Expected existing accounts');
const result = db.user4.bulkWrite(writes, { ordered: true });
if (result.matchedCount !== accounts.length) throw new Error('Account changed during reservation; keep app stopped');
db.user4.createIndex({ nameKeys: 1 }, { name: 'public_name_keys_unique', unique: true, sparse: true });
print(JSON.stringify({ accounts: accounts.length, reservedKeys: owners.size, index: 'public_name_keys_unique' }));

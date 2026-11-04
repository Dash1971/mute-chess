// One-time, owner-requested Test1 ID correction. Run only with app/WS/adapter stopped.
(() => {
  if (db.getName() !== 'nosweat') throw new Error('Expected the isolated public database');
  const oldId = 'test1', newId = 'n2f2b537576f0256497f';
  const old = db.user4.findOne({ _id: oldId });
  const current = db.user4.findOne({ _id: newId });
  const remaining = () => db.security.countDocuments({ user: oldId }) +
    db.challenge.countDocuments({ 'challenger.id': oldId }) +
    db.nosweat_donation.countDocuments({ userId: oldId }) + db.plan_patron.countDocuments({ _id: oldId });
  if (!old) {
    if (!current || current.nostrPreviousId !== oldId || remaining()) throw new Error('Unexpected partial migration');
    print(JSON.stringify({ migrated: true, alreadyApplied: true, id: newId }));
    return;
  }
  if (current || !/^[0-9a-f]{64}$/.test(old.nostr) || 'n' + old.nostr.slice(0, 19) !== newId || old.title === 'BOT')
    throw new Error('Account identity or destination conflict');
  if ((old.count?.game || 0) !== 0 || db.game5.countDocuments({ us: oldId })) throw new Error('Unexpected game history');
  if (db.plan_patron.findOne({ _id: newId })) throw new Error('Destination patron record exists');
  // Recheck every persisted reference while writers are stopped; do not rewrite arbitrary user text.
  const allowed = {
    user4: new Set(['_id', 'username', 'nameKeys[]', 'profile.displayName']),
    security: new Set(['user']), challenge: new Set(['challenger.id']),
    nosweat_donation: new Set(['userId']), plan_patron: new Set(['_id']), cache: new Set(['_id']),
  };
  const matches = value => typeof value === 'string' && /(^|[^a-z0-9])test1($|[^a-z0-9])/i.test(value);
  function check(value, path, collection) {
    if (typeof value === 'string') {
      if (matches(value) && !allowed[collection]?.has(path)) throw new Error('Unexpected Test1 reference: ' + collection + '.' + path);
    } else if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
      if (Array.isArray(value)) value.forEach(item => check(item, path + '[]', collection));
      else for (const [key, item] of Object.entries(value)) {
        if (matches(key)) throw new Error('Unexpected Test1 document key');
        check(item, path ? path + '.' + key : key, collection);
      }
    }
  }
  for (const collection of db.getCollectionNames()) db.getCollection(collection).find({}).forEach(doc => check(doc, '', collection));
  const selectors = {
    user4: { _id: oldId }, security: { user: oldId }, challenge: { 'challenger.id': oldId },
    nosweat_donation: { userId: oldId }, plan_patron: { _id: oldId },
    cache: { _id: /(^|[^a-z0-9])test1($|[^a-z0-9])/i },
  };
  const snapshots = Object.fromEntries(Object.entries(selectors).map(([name, q]) => [name, db.getCollection(name).find(q).toArray()]));
  const migrated = { ...old, _id: newId, username: newId, len: newId.length, nostrPreviousId: oldId,
    nameKeys: [...new Set([newId, ...(old.nameKeys || [oldId])])] };
  try {
    if (db.user4.deleteOne({ _id: oldId, nostr: old.nostr }).deletedCount !== 1) throw new Error('Source account changed');
    db.user4.insertOne(migrated);
    db.security.updateMany({ user: oldId }, { $set: { user: newId } });
    db.challenge.updateMany({ 'challenger.id': oldId }, { $set: { 'challenger.id': newId } });
    db.nosweat_donation.updateMany({ userId: oldId }, { $set: { userId: newId } });
    for (const doc of snapshots.plan_patron) {
      db.plan_patron.deleteOne({ _id: oldId });
      db.plan_patron.insertOne({ ...doc, _id: newId });
    }
    for (const doc of snapshots.cache) db.cache.deleteOne({ _id: doc._id }); // Derived cache, rebuilt normally.
    if (remaining() || db.user4.countDocuments({ nostr: old.nostr }) !== 1) throw new Error('Reference verification failed');
    const result = db.user4.findOne({ _id: newId });
    if (EJSON.stringify(result.profile) !== EJSON.stringify(old.profile) || EJSON.stringify(result.count) !== EJSON.stringify(old.count))
      throw new Error('Account data changed');
    print(JSON.stringify({ migrated: true, id: newId, previousId: oldId,
      preservedRecords: Object.fromEntries(Object.entries(snapshots).filter(([name]) => name !== 'cache').map(([name, docs]) => [name, docs.length])) }));
  } catch (error) {
    // Minimum recovery: restore only this account's captured documents, then fail the release.
    db.user4.deleteOne({ _id: newId, nostr: old.nostr });
    db.plan_patron.deleteOne({ _id: newId });
    for (const [name, docs] of Object.entries(snapshots))
      for (const doc of docs) db.getCollection(name).replaceOne({ _id: doc._id }, doc, { upsert: true });
    throw error;
  }
})();

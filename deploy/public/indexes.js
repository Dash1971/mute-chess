if (db.getName() !== 'nosweat') throw new Error('Expected the isolated public Mute Chess database');
db.user4.createIndex({ nostr: 1 }, { unique: true, partialFilterExpression: { nostr: { $type: 'string' } } });
db.security.createIndex({ date: 1 }, { expireAfterSeconds: 604800, name: 'nosweat_session_idle_expiry' });
db.nosweat_game.createIndex({ state: 1, human: 1 });

db.nosweat_donation.createIndex({ userId: 1, paid: 1, expiresAt: 1 });

if (db.getName() !== 'nosweat') throw new Error('Expected the isolated public No Sweat Chess database');
db.user4.createIndex({ nostr: 1 }, { unique: true, partialFilterExpression: { nostr: { $type: 'string' } } });
db.security.createIndex({ date: 1 }, { expireAfterSeconds: 604800, name: 'nosweat_session_idle_expiry' });
db.nosweat_game.createIndex({ state: 1, human: 1 });

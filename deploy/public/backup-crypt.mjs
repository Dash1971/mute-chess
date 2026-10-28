// Authenticated off-host backup transport; keys never appear in arguments/output.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, createReadStream, createWriteStream, appendFileSync, renameSync, unlinkSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
const [mode, input, output] = process.argv.slice(2);
if (!['encrypt', 'decrypt'].includes(mode) || !input || !output) throw Error('encrypt|decrypt INPUT OUTPUT');
const key = readFileSync('/etc/nosweatchess/backup.key');
if (key.length !== 32) throw Error('Expected a 32-byte backup key');
const magic = Buffer.from('NSCBK001');
const temporary = output + '.partial';
try {
  if (mode === 'encrypt') {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    writeFileSync(temporary, Buffer.concat([magic, iv]), { mode: 0o600, flag: 'wx' });
    await pipeline(createReadStream(input), cipher, createWriteStream(temporary, { flags: 'a' }));
    appendFileSync(temporary, cipher.getAuthTag());
  } else {
    const bytes = readFileSync(input);
    if (bytes.length < 36 || !bytes.subarray(0, 8).equals(magic)) throw Error('Invalid backup header');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(8, 20));
    decipher.setAuthTag(bytes.subarray(-16));
    // Verify authentication before writing any plaintext for mongorestore.
    const plain = Buffer.concat([decipher.update(bytes.subarray(20, -16)), decipher.final()]);
    writeFileSync(temporary, plain, { mode: 0o600, flag: 'wx' });
  }
  renameSync(temporary, output);
  console.log(JSON.stringify({ operation: mode, bytes: statSync(output).size }));
} catch (error) {
  try { unlinkSync(temporary); } catch {}
  throw error;
}

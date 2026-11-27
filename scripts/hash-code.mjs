// Prints the hash to paste into a template category's `lock.codes`.
// Usage: npm run hash-code -- KAWANRUPA-2026 [2026-12-31]   (optional last valid day)
import { createHash } from 'node:crypto';
const [code, until] = process.argv.slice(2);
if (!code) { console.error('Usage: npm run hash-code -- <CODE> [YYYY-MM-DD]'); process.exit(1); }
const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
const h = createHash('sha256').update('jepret-booth:v1:' + norm).digest('hex');
console.log(JSON.stringify(until ? { h, until } : { h }));

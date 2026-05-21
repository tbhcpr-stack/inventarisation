import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || process.env.VITE_SUPABASE_BUCKET || '',
  SUPABASE_AUTO_BACKUP: process.env.SUPABASE_AUTO_BACKUP || process.env.NEXT_PUBLIC_SUPABASE_AUTO_BACKUP || process.env.VITE_SUPABASE_AUTO_BACKUP || ''
};

const content = `window.env = ${JSON.stringify(env, null, 2)};\n`;

const targetDir = path.resolve(__dirname, '../src/assets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(path.join(targetDir, 'env.js'), content, 'utf8');
console.log('Successfully generated src/assets/env.js');

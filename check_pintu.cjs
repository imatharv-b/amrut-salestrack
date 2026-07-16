const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if(k && v) acc[k.trim()] = v.replace(/"/g, '').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: users } = await supabase.from('users').select('*').ilike('name', '%Pintu%');
  console.log('Users:', users);
  
  const { data: routes } = await supabase.from('routes').select('*').ilike('name', '%Pintu%');
  console.log('Routes:', routes);
  
  const { data: stores } = await supabase.from('stores').select('*').ilike('name', '%Pintu%');
  console.log('Stores:', stores);
}
test();

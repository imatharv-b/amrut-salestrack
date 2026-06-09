const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if(k && v) acc[k.trim()] = v.replace(/"/g, '').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: visits } = await supabase.from('visits').select('*').order('visited_date', { ascending: false }).limit(10);
  const { data: assignments } = await supabase.from('daily_route_assignments').select('*').order('assigned_date', { ascending: false }).limit(10);
  console.log('LATEST VISITS:');
  console.table(visits);
  console.log('LATEST ASSIGNMENTS:');
  console.table(assignments);
}
run();

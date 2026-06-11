const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if(k && v) acc[k.trim()] = v.replace(/"/g, '').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Get a manager
  const { data: managers } = await supabase.from('users').select('id').eq('role', 'manager').limit(1);
  if (!managers || managers.length === 0) return console.log('No managers found');
  
  const managerId = managers[0].id;
  
  // Insert a broadcast
  const { data, error } = await supabase.from('chat_messages').insert({
    sender_id: managerId,
    receiver_id: null,
    message: 'This is a test broadcast from the system to check if it works!',
    created_at: new Date().toISOString()
  });
  
  console.log('Insert Result:', { data, error });
  
  // Check again
  const { data: b } = await supabase.from('chat_messages').select('*').is('receiver_id', null);
  console.log('Broadcasts after insert:', b);
}
test();

const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
let URL = '', KEY = '';
for(let line of envText.split('\n')) {
  if(line.startsWith('VITE_SUPABASE_URL=')) URL = line.split('=')[1].replace(/"/g, '').trim();
  if(line.startsWith('VITE_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const vRes = await fetch(`${URL}/rest/v1/visits?select=*`, { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } });
  const visits = await vRes.json();
  
  const aRes = await fetch(`${URL}/rest/v1/daily_route_assignments?select=*`, { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } });
  const assignments = await aRes.json();

  console.log('TOTAL VISITS:', visits.length);
  const todaysVisits = visits.filter(v => v.visited_date === '2026-06-09');
  console.log('VISITS TODAY (2026-06-09):', todaysVisits.length);

  console.log('TOTAL ASSIGNMENTS:', assignments.length);
  const todaysAssignments = assignments.filter(a => a.assigned_date === '2026-06-09');
  console.log('ASSIGNMENTS TODAY (2026-06-09):', todaysAssignments.length);
  
  if (todaysAssignments.length > 0) {
     console.log('Todays Assignments:', todaysAssignments);
  }
}
run();

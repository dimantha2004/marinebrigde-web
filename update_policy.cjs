const { Client } = require('pg');
const client = new Client('postgresql://postgres:88g98rr8u_D@db.gedvhtaiobzczdypdvkl.supabase.co:6543/postgres');
client.connect()
  .then(() => client.query(`
    DELETE FROM public.chat_permissions WHERE sender_role IN ('captain', 'charter_party', 'supplier', 'ship_agent');
    INSERT INTO public.chat_permissions (sender_role, receiver_role) VALUES 
      ('captain', 'charter_party'), 
      ('captain', 'ship_agent'), 
      ('charter_party', 'captain'), 
      ('charter_party', 'ship_agent'), 
      ('supplier', 'ship_agent'), 
      ('ship_agent', 'captain'), 
      ('ship_agent', 'charter_party'), 
      ('ship_agent', 'supplier'), 
      ('ship_agent', 'admin');
  `))
  .then(() => { console.log('Success updating chat permissions'); client.end(); })
  .catch(e => { console.error(e); client.end(); });

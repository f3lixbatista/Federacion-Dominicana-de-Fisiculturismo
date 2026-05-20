// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Usamos SERVICE_ROLE_KEY para que el servidor tenga permisos totales
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: {
            websocket: WebSocket,
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

module.exports = supabase;

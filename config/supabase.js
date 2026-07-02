const { createClient } = require('@supabase/supabase-js');

// Cliente estándar (sujeto a RLS — para operaciones del usuario autenticado)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

// Cliente Administrativo (ignora RLS — solo para operaciones de servidor)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase, supabaseAdmin };

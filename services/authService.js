const supabase = require('../supabaseClient');

const SESSION_COOKIE_NAME = process.env.SUPABASE_SESSION_COOKIE_NAME || 'supabase-token';

const getSessionCookieName = () => SESSION_COOKIE_NAME;

const normalizeCookieToken = (cookieValue) => {
    if (!cookieValue) return null;
    if (typeof cookieValue === 'string' && cookieValue.startsWith('{')) {
        try {
            const sessionData = JSON.parse(cookieValue);
            return sessionData.access_token || sessionData.refresh_token || null;
        } catch (err) {
            return null;
        }
    }
    return cookieValue;
};

const getTokenFromRequest = (req) => {
    if (!req || !req.cookies) return null;
    const rawValue = req.cookies[SESSION_COOKIE_NAME] || req.cookies['sb-access-token'] || req.cookies['sb-refresh-token'];
    return normalizeCookieToken(rawValue);
};

const getUserProfileFromId = async (userId) => {
    if (!userId) return null;
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, nombre, email')
        .eq('id', userId)
        .single();

    if (error) return null;
    return profile;
};

const getAuthenticatedUser = async (req) => {
    const token = getTokenFromRequest(req);
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    const profile = await getUserProfileFromId(data.user.id);
    return {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'general',
        nombre: profile?.nombre || data.user.email
    };
};

module.exports = {
    getSessionCookieName,
    getTokenFromRequest,
    getAuthenticatedUser
};

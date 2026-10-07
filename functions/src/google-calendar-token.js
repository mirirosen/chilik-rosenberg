'use strict';
const fail = () => Object.assign(new Error('provider-token-unavailable'), { blocked: true });
const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned.readonly';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned';
const EXISTING_WRITE_SCOPES = [WRITE_SCOPE, 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar'];
const EXISTING_READ_SCOPES = [...EXISTING_WRITE_SCOPES, READ_SCOPE, 'https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.readonly'];
const SECRET_NAMES = Object.freeze({ clientId: 'CHILIK_GOOGLE_CALENDAR_CLIENT_ID', clientSecret: 'CHILIK_GOOGLE_CALENDAR_CLIENT_SECRET', refreshToken: 'CHILIK_GOOGLE_CALENDAR_REFRESH_TOKEN' });
function tokenConfigurationReady(config, writes = false) {
  return config?.enabled === true && config.existingGrantVerified === true && Array.isArray(config.grantedScopes)
    && (writes ? EXISTING_WRITE_SCOPES : EXISTING_READ_SCOPES).some(scope => config.grantedScopes.includes(scope));
}
// Refresh an ALREADY approved server grant. No authorization URL, consent/code
// exchange, grant creation or token persistence. Secret reads stay lazy and errors
// never retain credential values or SDK/provider bodies.
function createGoogleCalendarTokenProvider({ config = {}, writes = false, readSecret, OAuth2ClientFactory = () => require('google-auth-library').OAuth2Client }) {
  let clientPromise;
  async function client() {
    try {
      const values = await Promise.all(Object.values(SECRET_NAMES).map(name => readSecret(name)));
      if (!values.every(v => typeof v === 'string' && v && !/[\r\n]/.test(v))) throw fail();
      const OAuth2Client = OAuth2ClientFactory();
      const auth = new OAuth2Client(values[0], values[1]);
      auth.setCredentials({ refresh_token: values[2] });
      return auth;
    } catch { throw fail(); }
  }
  return async service => {
    if (service !== 'google-calendar' || !tokenConfigurationReady(config, writes) || typeof readSecret !== 'function') throw fail();
    try {
      clientPromise ||= client().catch(error => { clientPromise = undefined; throw error; });
      const result = await (await clientPromise).getAccessToken();
      if (typeof result?.token !== 'string' || !result.token || /[\r\n]/.test(result.token)) throw fail();
      return result.token;
    } catch { throw fail(); }
  };
}
module.exports = { createGoogleCalendarTokenProvider, tokenConfigurationReady, SECRET_NAMES, READ_SCOPE, WRITE_SCOPE };

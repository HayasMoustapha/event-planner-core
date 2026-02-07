const axios = require('axios');
const authApiService = require('../../services/auth-api-service');

const DEFAULT_GUEST_PASSWORD = process.env.GUEST_DEFAULT_PASSWORD || 'Guest123!';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

const createAuthClient = () => {
  return axios.create({
    baseURL: AUTH_SERVICE_URL,
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 10000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'event-planner-core/guest-auth'
    }
  });
};

const authClient = createAuthClient();

const safeLower = (value) => (value ? String(value).trim().toLowerCase() : null);

async function findAuthUserByEmail(email) {
  try {
    const response = await authApiService.getUserByEmail(email);
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    const message = error.message || '';
    if (message.includes('Utilisateur') || message.includes('not found') || message.includes('404')) {
      return null;
    }
    throw error;
  }
}

async function tryLoginForToken(email, password) {
  try {
    const response = await authClient.post('/api/auth/login', {
      email,
      password
    });

    const data = response.data;
    if (data && data.success && data.data && data.data.token) {
      return data.data.token;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function registerGuestAccount(guest) {
  const safeEmail = safeLower(guest.email);
  const username = safeEmail ? safeEmail.split('@')[0] : 'guest';
  const payload = {
    first_name: guest.first_name || 'Invité',
    last_name: guest.last_name || '',
    email: safeEmail,
    phone: guest.phone || null,
    password: DEFAULT_GUEST_PASSWORD,
    username: username
  };

  const response = await authClient.post('/api/auth/register', payload);
  return response.data;
}

async function verifyGuestEmail(email, otpCode) {
  const response = await authClient.post('/api/auth/verify-email', {
    email,
    otpCode
  });

  return response.data;
}

async function ensureGuestAuthAccount(guest) {
  const email = safeLower(guest.email);
  if (!email) {
    return { success: false, reason: 'missing_email' };
  }

  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    const loginToken = await tryLoginForToken(email, DEFAULT_GUEST_PASSWORD);
    return {
      success: true,
      created: false,
      email,
      loginToken: loginToken || null,
      loginUrl: loginToken ? `${AUTH_SERVICE_URL}/api/auth/login/${loginToken}` : null,
      defaultPassword: loginToken ? null : DEFAULT_GUEST_PASSWORD
    };
  }

  const registerResult = await registerGuestAccount({
    ...guest,
    email
  });

  let loginToken = null;
  let loginUrl = null;

  const otpCode = registerResult?.data?.otp?.code;
  if (otpCode) {
    try {
      const verifyResult = await verifyGuestEmail(email, otpCode);
      loginToken = verifyResult?.data?.loginToken || null;
      if (loginToken) {
        loginUrl = `${AUTH_SERVICE_URL}/api/auth/login/${loginToken}`;
      }
    } catch (error) {
      // Si la vérification échoue, on ne bloque pas la création de l'invité
    }
  }

  if (!loginToken) {
    const tokenFromLogin = await tryLoginForToken(email, DEFAULT_GUEST_PASSWORD);
    if (tokenFromLogin) {
      loginToken = tokenFromLogin;
      loginUrl = `${AUTH_SERVICE_URL}/api/auth/login/${loginToken}`;
    }
  }

  return {
    success: true,
    created: true,
    email,
    loginToken,
    loginUrl,
    defaultPassword: loginToken ? null : DEFAULT_GUEST_PASSWORD,
    otpGenerated: !!otpCode
  };
}

module.exports = {
  ensureGuestAuthAccount,
  DEFAULT_GUEST_PASSWORD,
  AUTH_SERVICE_URL
};

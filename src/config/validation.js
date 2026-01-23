/**
 * Configuration validation for Event Planner Core
 * Validates all required environment variables and configuration
 */

const requiredEnvVars = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'AUTH_SERVICE_URL',
  'JWT_SECRET'
];

const optionalEnvVars = {
  'NODE_ENV': 'development',
  'CORS_ORIGIN': 'http://localhost:3000',
  'LOG_LEVEL': 'info',
  'LOG_FILE_PATH': 'logs',
  'RATE_LIMIT_WINDOW_MS': '900000',
  'RATE_LIMIT_MAX_REQUESTS': '100'
};

/**
 * Validates the configuration
 * @throws {Error} If configuration is invalid
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate specific values
  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    errors.push('PORT must be a valid number');
  }

  if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
    errors.push('DB_PORT must be a valid number');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET === 'your_jwt_secret_for_validation') {
    warnings.push('JWT_SECRET is using default value - please change in production');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'your_jwt_secret_for_validation') {
      errors.push('Default JWT_SECRET not allowed in production');
    }

    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < 16) {
      warnings.push('Database password should be strong in production');
    }
  }

  // Validate URLs
  if (process.env.AUTH_SERVICE_URL) {
    try {
      new URL(process.env.AUTH_SERVICE_URL);
    } catch (error) {
      errors.push('AUTH_SERVICE_URL must be a valid URL');
    }
  }

  // Validate log levels
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Set default values for optional environment variables
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  // Report results
  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
    console.error('❌ ' + errorMessage);
    throw new Error(errorMessage);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:\n' + warnings.join('\n'));
  }

  console.log('✅ Configuration validation passed');
  
  // Log configuration summary (without sensitive data)
  console.log('📋 Configuration summary:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS
  });
}

/**
 * Validates database connection parameters
 */
function validateDatabaseConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS) : 20,
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : 30000,
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT) : 2000,
  };

  // Validate database name format
  if (!/^[a-zA-Z0-9_]+$/.test(config.database)) {
    throw new Error('Database name can only contain letters, numbers, and underscores');
  }

  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Database port must be between 1 and 65535');
  }

  return config;
}

/**
 * Validates rate limiting configuration
 */
function validateRateLimitConfig() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

  if (windowMs < 1000) {
    throw new Error('Rate limit window must be at least 1000ms');
  }

  if (maxRequests < 1) {
    throw new Error('Rate limit max requests must be at least 1');
  }

  if (maxRequests > 10000) {
    console.warn('Rate limit max requests is very high (>10000). Consider reducing for better security.');
  }

  return { windowMs, maxRequests };
}

/**
 * Validates CORS configuration
 */
function validateCorsConfig() {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  
  // Allow multiple origins separated by commas
  const origins = origin.split(',').map(o => o.trim());
  
  for (const o of origins) {
    if (o !== '*' && !o.startsWith('http')) {
      throw new Error('CORS origins must start with http:// or https:// or be *');
    }
  }

  return origins.length === 1 ? origins[0] : origins;
}

/**
 * Validates JWT configuration
 */
function validateJWTConfig() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Check if secret is strong enough
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /\d/.test(secret);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars) {
    console.warn('JWT_SECRET should contain uppercase, lowercase, numbers, and special characters for better security');
  }

  return secret;
}

module.exports = {
  validateConfig,
  validateDatabaseConfig,
  validateRateLimitConfig,
  validateCorsConfig,
  validateJWTConfig,
  requiredEnvVars,
  optionalEnvVars
};

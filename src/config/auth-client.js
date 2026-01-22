const axios = require('axios');
require('dotenv').config();

class AuthClient {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    this.token = process.env.AUTH_SERVICE_TOKEN;
  }

  async validateToken(token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/auth/validate-token`,
        { token },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Auth service error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || 'Authentication failed'
      };
    }
  }

  async getUserById(userId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Auth service error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || 'User not found'
      };
    }
  }

  async checkPermission(userId, permission) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/authorizations/check`,
        { user_id: userId, permission },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Auth service error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || 'Permission check failed'
      };
    }
  }
}

module.exports = new AuthClient();

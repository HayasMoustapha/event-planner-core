const axios = require('axios');

/**
 * Service de communication avec l'Auth Service (event-planner-auth)
 * Fournit des méthodes pour récupérer les données utilisateur via API
 * NOTE: Pour la communication inter-services, nous utilisons un token de service dédié
 * SEULEMENT les méthodes de lecture sont autorisées pour respecter l'isolation des services
 */
class AuthApiService {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    this.timeout = parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 10000;
    
    // Token de service pour la communication inter-services
    this.serviceToken = process.env.SHARED_SERVICE_TOKEN || 'shared-service-token-abcdef12345678901234567890';
    
    // Configuration Axios pour les appels inter-services
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'event-planner-core/1.0.0',
        'X-Service-Token': this.serviceToken
      }
    });
    
    // Intercepteur pour gérer les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Auth API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * Helper method pour faire des requêtes avec authentification
   * @param {string} method - Méthode HTTP
   * @param {string} url - URL de la requête
   * @param {Object} options - Options de la requête
   * @param {string} token - Token JWT
   * @returns {Promise} Response Axios
   */
  async makeAuthenticatedRequest(method, url, options = {}, token) {
    if (!token) {
      throw new Error('Token is required for API calls');
    }
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (method.toLowerCase() === 'get' && options.params) {
      config.params = options.params;
    } else if (options.data) {
      config.data = options.data;
    }
    
    return this.client.request(config);
  }

  /**
   * Récupère tous les utilisateurs avec pagination et filtres
   * @param {Object} options - Options de pagination et filtres
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getAllUsers(options = {}, token) {
    try {
      const response = await this.client.get('/api/internal/auth/users', {
        params: options
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son ID
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getUserById(userId, token) {
    try {
      const response = await this.client.get(`/api/internal/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user ${userId}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son email
   * @param {string} email - Email de l'utilisateur
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getUserByEmail(email, token) {
    try {
      const response = await this.client.get(`/api/internal/auth/users/email/${email}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user by email ${email}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son username
   * @param {string} username - Username de l'utilisateur
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getUserByUsername(username, token) {
    try {
      const response = await this.client.get(`/api/internal/auth/users/username/${username}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user by username ${username}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Recherche des utilisateurs
   * @param {Object} searchParams - Paramètres de recherche
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async searchUsers(searchParams, token) {
    try {
      const response = await this.client.get('/api/internal/auth/users/search', {
        params: searchParams
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search users: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère les statistiques des utilisateurs
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getUsersStats(token) {
    try {
      const response = await this.client.get('/api/internal/auth/users/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users stats: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Vérifie l'existence d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async checkUserExists(userId, token) {
    try {
      const response = await this.client.get(`/api/internal/auth/users/${userId}/exists`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère plusieurs utilisateurs par leurs IDs (batch)
   * @param {Array<number>} userIds - Liste des IDs d'utilisateurs
   * @param {string} token - Token JWT d'authentification (non utilisé pour inter-services)
   */
  async getUsersBatch(userIds, token) {
    try {
      const response = await this.client.get('/api/internal/auth/users/search', {
        params: {
          ids: userIds.join(','),
          limit: userIds.length
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users batch: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Vérifie la disponibilité d'un username
   * @param {string} username - Username à vérifier
   */
  async checkUsernameAvailability(username) {
    try {
      const response = await this.client.get(`/api/users/check/username/${username}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check username availability: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Vérifie la disponibilité d'un email
   * @param {string} email - Email à vérifier
   */
  async checkEmailAvailability(email) {
    try {
      const response = await this.client.get(`/api/users/check/email/${email}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check email availability: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur
   * @param {Object} resetData - Données de réinitialisation
   * @param {string} token - Token JWT d'authentification
   */
  async resetPassword(resetData, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.post('/api/users/reset-password', resetData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new AuthApiService();

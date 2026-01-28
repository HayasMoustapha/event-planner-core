const axios = require('axios');

/**
 * Service de communication avec l'Auth Service (event-planner-auth)
 * Fournit des méthodes pour récupérer les données utilisateur via API
 * Utilise le token JWT fourni par le middleware commun pour l'authentification
 */
class AuthApiService {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    this.timeout = parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 10000;
    
    // Configuration Axios pour les appels inter-services
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'event-planner-core/1.0.0'
      }
    });
    
    // Intercepteur pour ajouter le token JWT
    this.client.interceptors.request.use(
      (config) => {
        // Le token sera ajouté via les méthodes qui l'appellent
        return config;
      },
      (error) => Promise.reject(error)
    );
    
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
   * Configure le token JWT pour les requêtes
   * @param {string} token - Token JWT récupéré du middleware
   */
  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Récupère tous les utilisateurs avec pagination et filtres
   * @param {Object} options - Options de pagination et filtres
   * @param {string} token - Token JWT d'authentification
   */
  async getAllUsers(options = {}, token) {
    this.setAuthToken(token);
    
    const { page = 1, limit = 20, search, status, role } = options;
    
    try {
      const response = await this.client.get('/api/users', {
        params: { page, limit, search, status, role }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son ID
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async getUserById(userId, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user ${userId}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son email
   * @param {string} email - Email de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async getUserByEmail(email, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get(`/api/users/email/${email}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user by email ${email}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère un utilisateur par son username
   * @param {string} username - Username de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async getUserByUsername(username, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get(`/api/users/username/${username}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user by username ${username}: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Met à jour le statut d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} status - Nouveau statut
   * @param {string} token - Token JWT d'authentification
   */
  async updateUserStatus(userId, status, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.patch(`/api/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update user status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Met à jour les informations d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} updateData - Données à mettre à jour
   * @param {string} token - Token JWT d'authentification
   */
  async updateUser(userId, updateData, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.put(`/api/users/${userId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Crée un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async createUser(userData, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.post('/api/users', userData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Supprime un utilisateur (soft delete)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async deleteUser(userId, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.delete(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Recherche des utilisateurs
   * @param {Object} searchParams - Paramètres de recherche
   * @param {string} token - Token JWT d'authentification
   */
  async searchUsers(searchParams, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get('/api/users/search', {
        params: searchParams
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search users: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère les statistiques des utilisateurs
   * @param {string} token - Token JWT d'authentification
   */
  async getUserStats(token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get('/api/users/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user stats: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Vérifie si un utilisateur existe
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Token JWT d'authentification
   */
  async userExists(userId, token) {
    this.setAuthToken(token);
    
    try {
      const response = await this.client.get(`/api/users/${userId}/exists`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Récupère plusieurs utilisateurs par leurs IDs (batch)
   * @param {Array<number>} userIds - Liste des IDs d'utilisateurs
   * @param {string} token - Token JWT d'authentification
   */
  async getUsersBatch(userIds, token) {
    this.setAuthToken(token);
    
    try {
      // Utiliser search avec des IDs pour récupérer en batch
      const response = await this.client.get('/api/users/search', {
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

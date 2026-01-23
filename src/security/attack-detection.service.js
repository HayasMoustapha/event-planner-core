const crypto = require('crypto');
const config = require('../config');

/**
 * Service de détection d'attaques pour Event Planner Core
 * Analyse les requêtes pour détecter les menaces de sécurité
 */
class AttackDetectionService {
  constructor() {
    this.blacklistedIPs = new Set();
    this.suspiciousPatterns = new Map();
    this.bruteForceAttempts = new Map();
    this.attackThresholds = {
      maxSuspiciousRequests: 10,
      maxFailedAttempts: 5,
      timeWindowMs: 900000, // 15 minutes
      lockoutDurationMs: 1800000 // 30 minutes
    };
  }

  /**
   * Analyse une requête pour détecter des attaques
   * @param {Object} req - Requête Express
   * @returns {Object} Résultat de l'analyse
   */
  async analyzeRequest(req) {
    const analysis = {
      isAttack: false,
      attackTypes: [],
      riskLevel: 'low',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      timestamp: new Date().toISOString(),
      details: {}
    };

    // Vérifier les patterns d'attaques connus
    this.checkSQLInjection(req, analysis);
    this.checkXSS(req, analysis);
    this.checkCommandInjection(req, analysis);
    this.checkPathTraversal(req, analysis);
    this.checkLDAPInjection(req, analysis);

    // Vérifier l'IP blacklistée
    if (await this.isIPBlacklisted(analysis.ip)) {
      analysis.isAttack = true;
      analysis.attackTypes.push('blacklisted_ip');
      analysis.riskLevel = 'critical';
    }

    // Calculer le niveau de risque
    this.calculateRiskLevel(analysis);

    return analysis;
  }

  /**
   * Détecte les tentatives de SQL injection
   */
  checkSQLInjection(req, analysis) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/gi,
      /(\bOR\b.*\b1\s*=\s*1\b|\bAND\b.*\b1\s*=\s*1\b)/gi,
      /(\bUNION\b.*\bSELECT\b)/gi,
      /(\bEXEC\b.*\(|\bEXECUTE\b.*\()/gi
    ];

    const checkData = { ...req.body, ...req.query, ...req.params };
    
    for (const [key, value] of Object.entries(checkData)) {
      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            analysis.isAttack = true;
            analysis.attackTypes.push('sql_injection');
            analysis.details.sql_injection = { field: key, pattern: pattern.toString() };
            return;
          }
        }
      }
    }
  }

  /**
   * Détecte les tentatives XSS
   */
  checkXSS(req, analysis) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi
    ];

    const checkData = { ...req.body, ...req.query, ...req.params };
    
    for (const [key, value] of Object.entries(checkData)) {
      if (typeof value === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            analysis.isAttack = true;
            analysis.attackTypes.push('xss');
            analysis.details.xss = { field: key, pattern: pattern.toString() };
            return;
          }
        }
      }
    }
  }

  /**
   * Détecte les tentatives d'injection de commandes
   */
  checkCommandInjection(req, analysis) {
    const commandPatterns = [
      /(\||&|;|\$\(|\`|>|<)/gi,
      /(\/bin\/|\/usr\/|\/etc\/|\/var\/)/gi,
      /(wget|curl|nc|netcat|ssh|ftp)/gi,
      /(rm|mv|cp|chmod|chown)/gi,
      /(ps|kill|killall)/gi
    ];

    const checkData = { ...req.body, ...req.query, ...req.params };
    
    for (const [key, value] of Object.entries(checkData)) {
      if (typeof value === 'string') {
        for (const pattern of commandPatterns) {
          if (pattern.test(value)) {
            analysis.isAttack = true;
            analysis.attackTypes.push('command_injection');
            analysis.details.command_injection = { field: key, pattern: pattern.toString() };
            return;
          }
        }
      }
    }
  }

  /**
   * Détecte les tentatives de path traversal
   */
  checkPathTraversal(req, analysis) {
    const pathPatterns = [
      /\.\.\//gi,
      /\.\.\\/gi,
      /\/etc\//gi,
      /\/proc\//gi,
      /\/sys\//gi,
      /\/root\//gi,
      /\/home\//gi
    ];

    const checkData = { ...req.body, ...req.query, ...req.params };
    
    for (const [key, value] of Object.entries(checkData)) {
      if (typeof value === 'string') {
        for (const pattern of pathPatterns) {
          if (pattern.test(value)) {
            analysis.isAttack = true;
            analysis.attackTypes.push('path_traversal');
            analysis.details.path_traversal = { field: key, pattern: pattern.toString() };
            return;
          }
        }
      }
    }
  }

  /**
   * Détecte les tentatives d'injection LDAP
   */
  checkLDAPInjection(req, analysis) {
    const ldapPatterns = [
      /\(/gi,
      /\)/gi,
      /\*/gi,
      /\|/gi,
      /&/gi,
      /!/gi,
      /=/gi
    ];

    const checkData = { ...req.body, ...req.query, ...req.params };
    
    for (const [key, value] of Object.entries(checkData)) {
      if (typeof value === 'string' && (key.includes('user') || key.includes('login') || key.includes('auth'))) {
        for (const pattern of ldapPatterns) {
          if (pattern.test(value)) {
            analysis.isAttack = true;
            analysis.attackTypes.push('ldap_injection');
            analysis.details.ldap_injection = { field: key, pattern: pattern.toString() };
            return;
          }
        }
      }
    }
  }

  /**
   * Calcule le niveau de risque basé sur les types d'attaques
   */
  calculateRiskLevel(analysis) {
    const riskScores = {
      sql_injection: 10,
      xss: 8,
      command_injection: 10,
      path_traversal: 7,
      ldap_injection: 6,
      blacklisted_ip: 10
    };

    let totalScore = 0;
    for (const attackType of analysis.attackTypes) {
      totalScore += riskScores[attackType] || 5;
    }

    if (totalScore >= 10) {
      analysis.riskLevel = 'critical';
    } else if (totalScore >= 7) {
      analysis.riskLevel = 'high';
    } else if (totalScore >= 4) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }
  }

  /**
   * Vérifie si une IP est blacklistée
   */
  async isIPBlacklisted(ip) {
    return this.blacklistedIPs.has(ip);
  }

  /**
   * Ajoute une IP à la blacklist
   */
  blacklistIP(ip) {
    this.blacklistedIPs.add(ip);
    console.warn('IP blacklisted:', { ip, timestamp: new Date().toISOString() });
  }

  /**
   * Détecte les tentatives de brute force
   */
  async detectBruteForce(identifier, context) {
    const now = Date.now();
    const windowStart = now - this.attackThresholds.timeWindowMs;

    if (!this.bruteForceAttempts.has(identifier)) {
      this.bruteForceAttempts.set(identifier, []);
    }

    const attempts = this.bruteForceAttempts.get(identifier);
    
    // Nettoyer les anciennes tentatives
    const recentAttempts = attempts.filter(attempt => attempt.timestamp > windowStart);
    this.bruteForceAttempts.set(identifier, recentAttempts);

    // Ajouter la tentative actuelle
    recentAttempts.push({
      timestamp: now,
      ip: context.ip,
      userAgent: context.userAgent,
      method: context.method,
      url: context.url
    });

    // Vérifier si on dépasse le seuil
    const isBruteForce = recentAttempts.length >= this.attackThresholds.maxFailedAttempts;
    const remainingAttempts = Math.max(0, this.attackThresholds.maxFailedAttempts - recentAttempts.length);

    return {
      isBruteForce,
      attempts: recentAttempts.length,
      remainingAttempts,
      timeWindow: this.attackThresholds.timeWindowMs,
      lockoutDuration: this.attackThresholds.lockoutDurationMs
    };
  }

  /**
   * Vérifie si un identifiant est bloqué
   */
  async isIdentifierBlocked(identifier) {
    const attempts = this.bruteForceAttempts.get(identifier);
    if (!attempts || attempts.length === 0) {
      return false;
    }

    const lastAttempt = attempts[attempts.length - 1];
    const lockoutEnd = lastAttempt.timestamp + this.attackThresholds.lockoutDurationMs;
    
    return Date.now() < lockoutEnd;
  }

  /**
   * Nettoie les anciennes données de détection
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.attackThresholds.timeWindowMs;

    // Nettoyer les tentatives de brute force
    for (const [identifier, attempts] of this.bruteForceAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoffTime);
      if (recentAttempts.length === 0) {
        this.bruteForceAttempts.delete(identifier);
      } else {
        this.bruteForceAttempts.set(identifier, recentAttempts);
      }
    }
  }
}

module.exports = new AttackDetectionService();

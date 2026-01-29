/**
 * ========================================
 * MESSAGES D'ERREUR EN FRANÇAIS
 * ========================================
 * Centralisation de tous les messages d'erreur en français
 * Messages utilisateur-friendly et techniques
 */

// ========================================
// CODES D'ERREUR STANDARDISÉS
// ========================================
const ERROR_CODES = {
  // Erreurs de validation
  VALIDATION_ERROR: 'ERREUR_VALIDATION',
  MISSING_REQUIRED_FIELD: 'CHAMP_REQUIS_MANQUANT',
  INVALID_FORMAT: 'FORMAT_INVALIDE',
  INVALID_LENGTH: 'LONGUEUR_INVALIDE',
  INVALID_VALUE: 'VALEUR_INVALIDE',
  
  // Erreurs d'authentification
  AUTHENTICATION_FAILED: 'AUTHENTIFICATION_ECHOUEE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRE',
  TOKEN_INVALID: 'TOKEN_INVALIDE',
  UNAUTHORIZED: 'NON_AUTORISE',
  FORBIDDEN: 'ACCES_REFUSE',
  
  // Erreurs d'autorisation
  INSUFFICIENT_PERMISSIONS: 'PERMISSIONS_INSUFFISANTES',
  ROLE_REQUIRED: 'ROLE_REQUIS',
  ACCESS_DENIED: 'ACCES_REFUSE',
  
  // Erreurs de ressources
  NOT_FOUND: 'RESSOURCE_NON_TROUVEE',
  RESOURCE_NOT_FOUND: 'RESSOURCE_NON_TROUVEE',
  EVENT_NOT_FOUND: 'EVENEMENT_NON_TROUVE',
  USER_NOT_FOUND: 'UTILISATEUR_NON_TROUVE',
  GUEST_NOT_FOUND: 'INVITE_NON_TROUVE',
  TICKET_NOT_FOUND: 'TICKET_NON_TROUVE',
  
  // Erreurs de conflit
  DUPLICATE_RESOURCE: 'RESSOURCE_EN_DOUBLE',
  ALREADY_EXISTS: 'EXISTE_DEJA',
  CONFLICT: 'CONFLIT',
  
  // Erreurs métier
  BUSINESS_RULE_VIOLATION: 'VIOLATION_REGLE_METIER',
  INVALID_OPERATION: 'OPERATION_INVALIDE',
  INSUFFICIENT_CAPACITY: 'CAPACITE_INSUFFISANTE',
  EVENT_DATE_PAST: 'DATE_EVENEMENT_PASSEE',
  
  // Erreurs techniques
  DATABASE_ERROR: 'ERREUR_BASE_DONNEES',
  EXTERNAL_SERVICE_ERROR: 'ERREUR_SERVICE_EXTERNE',
  INTERNAL_SERVER_ERROR: 'ERREUR_SERVEUR_INTERNE',
  NETWORK_ERROR: 'ERREUR_RESEAU',
  TIMEOUT_ERROR: 'ERREUR_DELAI_EXPIRE',
  
  // Erreurs de système
  SERVICE_UNAVAILABLE: 'SERVICE_INDISPONIBLE',
  MAINTENANCE_MODE: 'MODE_MAINTENANCE',
  RATE_LIMIT_EXCEEDED: 'LIMITE_DEPASSEE',
  
  // Erreurs de fichiers
  FILE_NOT_FOUND: 'FICHIER_NON_TROUVE',
  FILE_TOO_LARGE: 'FICHIER_TROP_GRAND',
  INVALID_FILE_TYPE: 'TYPE_FICHIER_INVALIDE',
  UPLOAD_FAILED: 'TELECHARGEMENT_ECHOUE',
  
  // Erreurs de validation spécifiques
  INVALID_EMAIL: 'EMAIL_INVALIDE',
  INVALID_PHONE: 'TELEPHONE_INVALIDE',
  INVALID_DATE: 'DATE_INVALIDE',
  INVALID_UUID: 'UUID_INVALIDE',
  INVALID_STATUS: 'STATUT_INVALIDE',
  
  // Erreurs de queue
  QUEUE_FULL: 'FILE_D_ATTENTE_PLEINE',
  JOB_FAILED: 'TACHE_ECHOUEE',
  WORKER_TIMEOUT: 'WORKER_TIMEOUT',
  
  // Erreurs de sécurité
  SECURITY_VIOLATION: 'VIOLATION_SECURITE',
  SUSPICIOUS_ACTIVITY: 'ACTIVITE_SUSPECTE',
  MALICIOUS_REQUEST: 'DEMANDE_MALICIEUSE'
};

// ========================================
// MESSAGES D'ERREUR UTILISATEURS
// ========================================
const ERROR_MESSAGES = {
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'Les données fournies ne sont pas valides',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Le champ {field} est obligatoire',
  [ERROR_CODES.INVALID_FORMAT]: 'Le format du champ {field} est invalide',
  [ERROR_CODES.INVALID_LENGTH]: 'La longueur du champ {field} est invalide',
  [ERROR_CODES.INVALID_VALUE]: 'La valeur du champ {field} est invalide',
  
  // Authentification
  [ERROR_CODES.AUTHENTICATION_FAILED]: 'L\'authentification a échoué',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Votre session a expiré, veuillez vous reconnecter',
  [ERROR_CODES.TOKEN_INVALID]: 'Le token d\'authentification est invalide',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentification requise pour accéder à cette ressource',
  [ERROR_CODES.FORBIDDEN]: 'Vous n\'avez pas les permissions nécessaires pour cette action',
  
  // Autorisation
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Permissions insuffisantes pour effectuer cette action',
  [ERROR_CODES.ROLE_REQUIRED]: 'Le rôle {role} est requis pour cette opération',
  [ERROR_CODES.ACCESS_DENIED]: 'Accès refusé',
  
  // Ressources
  [ERROR_CODES.NOT_FOUND]: 'Ressource non trouvée',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'La ressource demandée n\'existe pas',
  [ERROR_CODES.EVENT_NOT_FOUND]: 'L\'événement demandé n\'existe pas',
  [ERROR_CODES.USER_NOT_FOUND]: 'L\'utilisateur demandé n\'existe pas',
  [ERROR_CODES.GUEST_NOT_FOUND]: 'L\'invité demandé n\'existe pas',
  [ERROR_CODES.TICKET_NOT_FOUND]: 'Le ticket demandé n\'existe pas',
  
  // Conflits
  [ERROR_CODES.DUPLICATE_RESOURCE]: 'Cette ressource existe déjà',
  [ERROR_CODES.ALREADY_EXISTS]: 'Cet élément existe déjà',
  [ERROR_CODES.CONFLICT]: 'Conflit de données détecté',
  
  // Métier
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Cette opération viole les règles métier',
  [ERROR_CODES.INVALID_OPERATION]: 'Opération non autorisée dans ce contexte',
  [ERROR_CODES.INSUFFICIENT_CAPACITY]: 'Capacité insuffisante pour cette opération',
  [ERROR_CODES.EVENT_DATE_PAST]: 'La date de l\'événement doit être dans le futur',
  
  // Technique
  [ERROR_CODES.DATABASE_ERROR]: 'Une erreur base de données est survenue',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'Le service externe est temporairement indisponible',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Une erreur interne est survenue',
  [ERROR_CODES.NETWORK_ERROR]: 'Erreur de connexion réseau',
  [ERROR_CODES.TIMEOUT_ERROR]: 'L\'opération a pris trop de temps',
  
  // Système
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Le service est temporairement indisponible',
  [ERROR_CODES.MAINTENANCE_MODE]: 'Le service est en mode maintenance',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Trop de requêtes, veuillez réessayer plus tard',
  
  // Fichiers
  [ERROR_CODES.FILE_NOT_FOUND]: 'Le fichier demandé n\'existe pas',
  [ERROR_CODES.FILE_TOO_LARGE]: 'Le fichier est trop volumineux',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Le type de fichier n\'est pas autorisé',
  [ERROR_CODES.UPLOAD_FAILED]: 'Le téléchargement du fichier a échoué',
  
  // Validation spécifique
  [ERROR_CODES.INVALID_EMAIL]: 'L\'adresse email fournie n\'est pas valide',
  [ERROR_CODES.INVALID_PHONE]: 'Le numéro de téléphone fourni n\'est pas valide',
  [ERROR_CODES.INVALID_DATE]: 'La date fournie n\'est pas valide',
  [ERROR_CODES.INVALID_UUID]: 'L\'identifiant UUID fourni n\'est pas valide',
  [ERROR_CODES.INVALID_STATUS]: 'Le statut fourni n\'est pas valide',
  
  // Queue
  [ERROR_CODES.QUEUE_FULL]: 'La file d\'attente est pleine, veuillez réessayer plus tard',
  [ERROR_CODES.JOB_FAILED]: 'La tâche a échoué',
  [ERROR_CODES.WORKER_TIMEOUT]: 'Le traitement a expiré',
  
  // Sécurité
  [ERROR_CODES.SECURITY_VIOLATION]: 'Violation de sécurité détectée',
  [ERROR_CODES.SUSPICIOUS_ACTIVITY]: 'Activité suspecte détectée',
  [ERROR_CODES.MALICIOUS_REQUEST]: 'Demande malveillante détectée'
};

// ========================================
// MESSAGES D'ERREUR DÉTAILLÉS
// ========================================
const DETAILED_ERROR_MESSAGES = {
  // Validation avec détails de champ
  fieldValidation: {
    email: {
      required: 'L\'adresse email est obligatoire',
      invalid: 'L\'adresse email doit être au format exemple@domaine.com',
      duplicate: 'Cette adresse email est déjà utilisée'
    },
    password: {
      required: 'Le mot de passe est obligatoire',
      too_short: 'Le mot de passe doit contenir au moins 8 caractères',
      too_weak: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    },
    phone: {
      invalid: 'Le numéro de téléphone doit être au format international (+33 6 12 34 56 78)'
    },
    date: {
      past: 'La date ne peut pas être dans le passé',
      invalid: 'La date doit être au format ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)'
    }
  },
  
  // Métier événements
  events: {
    not_found: 'Aucun événement trouvé avec cet identifiant',
    not_organizer: 'Vous n\'êtes pas l\'organisateur de cet événement',
    cannot_delete_published: 'Impossible de supprimer un événement publié. Archivez-le plutôt.',
    cannot_publish_draft: 'L\'événement doit être complet avant d\'être publié',
    date_in_past: 'La date de l\'événement doit être dans le futur',
    capacity_exceeded: 'La capacité maximale de cet événement est atteinte'
  },
  
  // Métier tickets
  tickets: {
    not_found: 'Aucun ticket trouvé avec ce code',
    already_validated: 'Ce ticket a déjà été validé',
    expired: 'Ce ticket a expiré',
    invalid_qr: 'Le code QR fourni est invalide',
    generation_failed: 'La génération du ticket a échoué'
  },
  
  // Métier invités
  guests: {
    not_found: 'Aucun invité trouvé avec cet identifiant',
    already_registered: 'Cet invité est déjà enregistré à cet événement',
    max_capacity: 'Le nombre maximal d\'invités est atteint'
  },
  
  // Base de données
  database: {
    connection_failed: 'Impossible de se connecter à la base de données',
    query_failed: 'La requête base de données a échoué',
    constraint_violation: 'Violation d\'une contrainte de base de données',
    timeout: 'La requête a expiré'
  },
  
  // Services externes
  external: {
    auth_service_unavailable: 'Le service d\'authentification est indisponible',
    notification_service_failed: 'L\'envoi de notification a échoué',
    payment_service_error: 'Une erreur est survenue lors du traitement du paiement',
    ticket_generator_error: 'La génération du ticket a échoué'
  }
};

// ========================================
// MESSAGES DE SUCCÈS
// ========================================
const SUCCESS_MESSAGES = {
  // CRUD générique
  created: '{resource} créé avec succès',
  updated: '{resource} mis à jour avec succès',
  deleted: '{resource} supprimé avec succès',
  retrieved: '{resource} récupéré avec succès',
  
  // Événements
  event_created: 'L\'événement a été créé avec succès',
  event_published: 'L\'événement a été publié avec succès',
  event_archived: 'L\'événement a été archivé avec succès',
  event_duplicated: 'L\'événement a été dupliqué avec succès',
  
  // Invités
  guest_registered: 'L\'invité a été enregistré avec succès',
  guest_confirmed: 'L\'invité a confirmé sa participation',
  guest_cancelled: 'L\'invité a annulé sa participation',
  
  // Tickets
  ticket_generated: 'Le ticket a été généré avec succès',
  ticket_validated: 'Le ticket a été validé avec succès',
  tickets_generated: 'Les tickets ont été générés avec succès',
  
  // Fichiers
  file_uploaded: 'Le fichier a été téléchargé avec succès',
  file_deleted: 'Le fichier a été supprimé avec succès',
  
  // Opérations en lot
  batch_operation_completed: 'L\'opération en lot a été complétée avec succès',
  bulk_operation_successful: 'L\'opération de masse a réussi',
  
  // Système
  operation_successful: 'Opération effectuée avec succès',
  data_saved: 'Données enregistrées avec succès',
  process_completed: 'Processus terminé avec succès'
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * ========================================
 * OBTENIR UN MESSAGE D'ERREUR
 * ========================================
function getErrorMessage(errorCode, details = {}) {
  // Message principal
  let message = ERROR_MESSAGES[errorCode] || 'Une erreur est survenue';
  
  // Remplacer les placeholders si présents
  if (details.field) {
    message = message.replace('{field}', details.field);
  }
  if (details.role) {
    message = message.replace('{role}', details.role);
  }
  if (details.resource) {
    message = message.replace('{resource}', details.resource);
  }
  
  // Ajouter des détails spécifiques si disponibles
  if (details.type && DETAILED_ERROR_MESSAGES[details.type]) {
    const detailedMessages = DETAILED_ERROR_MESSAGES[details.type];
    
    if (details.field && detailedMessages.fieldValidation[details.field]) {
      const fieldMessages = detailedMessages.fieldValidation[details.field];
      
      if (details.reason && fieldMessages[details.reason]) {
        message = fieldMessages[details.reason];
      } else if (fieldMessages.invalid) {
        message = fieldMessages.invalid;
      } else if (fieldMessages.required) {
        message = fieldMessages.required;
      }
    }
  }
  
  return message;
}

/**
 * ========================================
 * OBTENIR UN MESSAGE DE SUCCÈS
 * ========================================
function getSuccessMessage(operation, resource = null) {
  const message = SUCCESS_MESSAGES[operation];
  
  if (message && resource) {
    return message.replace('{resource}', resource);
  }
  
  return message || 'Opération réussie';
}

/**
 * ========================================
 * FORMATER UNE ERREUR POUR LA RÉPONSE API
 * ========================================
function formatApiError(errorCode, details = {}, errorId = null) {
  return {
    success: false,
    error: getErrorMessage(errorCode, details),
    code: errorCode,
    errorId: errorId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    details: details,
    timestamp: new Date().toISOString()
  };
}

/**
 * ========================================
 * FORMATER UNE RÉPONSE DE SUCCÈS
 * ========================================
function formatApiSuccess(data = null, message = null, operation = null, resource = null) {
  const response = {
    success: true,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  } else if (operation) {
    response.message = getSuccessMessage(operation, resource);
  }
  
  return response;
}

/**
 * ========================================
// VALIDATION DES CHAMPS EN FRANÇAIS
// ========================================
const VALIDATION_MESSAGES = {
  required: 'Ce champ est obligatoire',
  email: 'Veuillez entrer une adresse email valide',
  email_format: 'L\'email doit être au format nom@domaine.com',
  email_unique: 'Cette adresse email est déjà utilisée',
  phone: 'Veuillez entrer un numéro de téléphone valide',
  phone_format: 'Le téléphone doit être au format international (+33 6 12 34 56 78)',
  password: 'Le mot de passe est obligatoire',
  password_min_length: 'Le mot de passe doit contenir au moins {min} caractères',
  password_max_length: 'Le mot de passe ne peut pas dépasser {max} caractères',
  password_strong: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  password_confirmation: 'La confirmation du mot de passe ne correspond pas',
  title: 'Le titre est obligatoire',
  title_min_length: 'Le titre doit contenir au moins {min} caractères',
  title_max_length: 'Le titre ne peut pas dépasser {max} caractères',
  description: 'La description ne peut pas dépasser {max} caractères',
  location: 'Le lieu est obligatoire',
  date: 'La date est obligatoire',
  date_future: 'La date doit être dans le futur',
  date_format: 'La date doit être au format YYYY-MM-DDTHH:MM:SSZ',
  status: 'Le statut doit être l\'une des valeurs suivantes: {values}',
  uuid: 'L\'identifiant UUID fourni n\'est pas valide',
  url: 'L\'URL fournie n\'est pas valide',
  number: 'Veuillez entrer un nombre valide',
  number_min: 'Le nombre doit être supérieur ou égal à {min}',
  number_max: 'Le nombre doit être inférieur ou égal à {max}',
  boolean: 'Ce champ doit être vrai ou faux',
  array: 'Ce champ doit être un tableau',
  object: 'Ce champ doit être un objet'
};

/**
 * ========================================
// MESSAGES D'ERREUR VALIDATION JOI EN FRANÇAIS
// ========================================
const JOI_ERROR_MESSAGES = {
  'string.base': 'Ce champ doit être une chaîne de caractères',
  'string.empty': 'Ce champ ne peut pas être vide',
  'string.min': 'Ce champ doit contenir au moins {limit} caractères',
  'string.max': 'Ce champ ne peut pas dépasser {limit} caractères',
  'string.email': 'Veuillez entrer une adresse email valide',
  'string.uri': 'Veuillez entrer une URL valide',
  'number.base': 'Ce champ doit être un nombre',
  'number.min': 'Ce champ doit être supérieur ou égal à {limit}',
  'number.max': 'Ce champ doit être inférieur ou égal à {limit}',
  'number.integer': 'Ce champ doit être un entier',
  'boolean.base': 'Ce champ doit être vrai ou faux',
  'array.base': 'Ce champ doit être un tableau',
  'object.base': 'Ce champ doit être un objet',
  'any.required': 'Ce champ est obligatoire',
  'any.unknown': 'Ce champ n\'est pas autorisé',
  'date.base': 'Ce champ doit être une date',
  'date.format': 'La date doit être au format YYYY-MM-DDTHH:MM:SSZ',
  'date.min': 'La date doit être supérieure ou égale à {limit}',
  'date.max': 'La date doit être inférieure ou égale à {limit}',
  'alternatives.match': 'La valeur doit correspondre à l\'une des options suivantes: {labels}',
  'enum.base': 'La valeur doit être l\'une des suivantes: {valids}',
  'uuid.base': 'Ce champ doit être un UUID valide'
};

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  DETAILED_ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
  JOI_ERROR_MESSAGES,
  
  // Fonctions utilitaires
  getErrorMessage,
  getSuccessMessage,
  formatApiError,
  formatApiSuccess
};

const csv = require('csv-parser');
const fs = require('fs');

/**
 * Parser pour les fichiers CSV d'import d'invités
 * Transforme un fichier CSV en array d'objets avec validation des headers
 */
class CSVParser {
  /**
   * Parse un fichier CSV et retourne les données validées
   * @param {string} filePath - Chemin vers le fichier CSV
   * @returns {Promise<Object>} - Résultat du parsing avec données et erreurs
   */
  static async parseFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowIndex = 0;
      let headersValidated = false;

      // Headers obligatoires pour l'import des invités
      const requiredHeaders = ['first_name', 'last_name', 'email'];
      const optionalHeaders = ['phone'];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
          rowIndex++;
          
          // Validation des headers
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          
          if (missingHeaders.length > 0) {
            errors.push({
              row: 0,
              field: 'headers',
              error: `Missing required headers: ${missingHeaders.join(', ')}`,
              data: { headers, missing: missingHeaders }
            });
            return reject(new Error(`Missing required headers: ${missingHeaders.join(', ')}`));
          }

          headersValidated = true;
        })
        .on('data', (data) => {
          rowIndex++;
          
          if (!headersValidated) {
            return;
          }

          // Nettoyage et validation des données
          const cleanedData = this.cleanRowData(data, rowIndex);
          
          if (cleanedData.valid) {
            results.push(cleanedData.data);
          } else {
            errors.push(...cleanedData.errors);
          }
        })
        .on('end', () => {
          resolve({
            success: true,
            data: results,
            errors: errors,
            metadata: {
              totalRows: rowIndex - 1, // Exclure la ligne d'headers
              validRows: results.length,
              errorRows: errors.length
            }
          });
        })
        .on('error', (error) => {
          reject({
            success: false,
            error: `CSV parsing error: ${error.message}`,
            details: error
          });
        });
    });
  }

  /**
   * Nettoie et valide une ligne de données
   * @param {Object} rowData - Données brutes de la ligne
   * @param {number} rowIndex - Index de la ligne (pour les erreurs)
   * @returns {Object} - Données nettoyées avec validation
   */
  static cleanRowData(rowData, rowIndex) {
    const errors = [];
    const cleaned = {};

    // Nettoyage des espaces et conversion
    Object.keys(rowData).forEach(key => {
      cleaned[key] = rowData[key] ? rowData[key].toString().trim() : '';
    });

    // Validation first_name
    if (!cleaned.first_name) {
      errors.push({
        row: rowIndex,
        field: 'first_name',
        error: 'First name is required',
        data: { first_name: cleaned.first_name }
      });
    }

    // Validation last_name
    if (!cleaned.last_name) {
      errors.push({
        row: rowIndex,
        field: 'last_name',
        error: 'Last name is required',
        data: { last_name: cleaned.last_name }
      });
    }

    // Validation email
    if (!cleaned.email) {
      errors.push({
        row: rowIndex,
        field: 'email',
        error: 'Email is required',
        data: { email: cleaned.email }
      });
    } else if (!this.isValidEmail(cleaned.email)) {
      errors.push({
        row: rowIndex,
        field: 'email',
        error: 'Invalid email format',
        data: { email: cleaned.email }
      });
    }

    // Validation phone (optionnel)
    if (cleaned.phone && !this.isValidPhone(cleaned.phone)) {
      errors.push({
        row: rowIndex,
        field: 'phone',
        error: 'Invalid phone format',
        data: { phone: cleaned.phone }
      });
    }

    return {
      valid: errors.length === 0,
      data: {
        first_name: cleaned.first_name,
        last_name: cleaned.last_name,
        email: cleaned.email.toLowerCase(),
        phone: cleaned.phone || null
      },
      errors: errors
    };
  }

  /**
   * Valide le format d'un email
   * @param {string} email - Email à valider
   * @returns {boolean} - True si l'email est valide
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide le format d'un numéro de téléphone
   * @param {string} phone - Téléphone à valider
   * @returns {boolean} - True si le téléphone est valide
   */
  static isValidPhone(phone) {
    // Accepte les formats internationaux avec +, espaces, tirets, points
    const phoneRegex = /^\+?[\d\s\-\.\(\)]{7,}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = CSVParser;

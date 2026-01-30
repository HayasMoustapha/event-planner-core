const XLSX = require('xlsx');

/**
 * Parser pour les fichiers Excel (XLS/XLSX) d'import d'invités
 * Transforme un fichier Excel en array d'objets avec validation des headers
 */
class ExcelParser {
  /**
   * Parse un fichier Excel et retourne les données validées
   * @param {string} filePath - Chemin vers le fichier Excel
   * @returns {Promise<Object>} - Résultat du parsing avec données et erreurs
   */
  static async parseFile(filePath) {
    try {
      // Lecture du fichier Excel
      const workbook = XLSX.readFile(filePath);
      
      // Récupération de la première feuille de calcul
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No worksheet found in Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      
      // Conversion en JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        throw new Error('Excel file must contain headers and at least one data row');
      }

      // Extraction des headers et validation
      const headers = rawData[0].map(header => header ? header.toString().trim().toLowerCase() : '');
      const requiredHeaders = ['first_name', 'last_name', 'email'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Traitement des données
      const results = [];
      const errors = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (row.every(cell => !cell)) continue; // Ignorer les lignes vides

        // Construction de l'objet avec les headers
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Nettoyage et validation des données
        const cleanedData = this.cleanRowData(rowData, i + 1);
        
        if (cleanedData.valid) {
          results.push(cleanedData.data);
        } else {
          errors.push(...cleanedData.errors);
        }
      }

      return {
        success: true,
        data: results,
        errors: errors,
        metadata: {
          totalRows: rawData.length - 1, // Exclure la ligne d'headers
          validRows: results.length,
          errorRows: errors.length,
          sheetName: sheetName
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Excel parsing error: ${error.message}`,
        details: error
      };
    }
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

  /**
   * Vérifie si un fichier est un fichier Excel valide
   * @param {string} filePath - Chemin vers le fichier
   * @returns {boolean} - True si c'est un fichier Excel
   */
  static isExcelFile(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    return ['xls', 'xlsx'].includes(ext);
  }
}

module.exports = ExcelParser;

const CSVParser = require('../../utils/parsers/csv.parser');
const ExcelParser = require('../../utils/parsers/excel.parser');
const fs = require('fs');
const path = require('path');

/**
 * Service d'import des invités pour les fichiers CSV et Excel
 * Gère l'import en lot avec validation, déduplication et transactions SQL
 */
class GuestImportService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Importe des invités depuis un fichier (CSV ou Excel)
   * @param {string} eventId - ID de l'événement
   * @param {string} filePath - Chemin vers le fichier
   * @param {string} userId - ID de l'utilisateur (optionnel)
   * @returns {Promise<Object>} - Résultat de l'import
   */
  async importGuestsFromFile(eventId, filePath, userId = null) {
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Parser le fichier selon son extension
      const fileExt = path.extname(filePath).toLowerCase();
      let parseResult;

      if (fileExt === '.csv') {
        parseResult = await CSVParser.parseFile(filePath);
      } else if (['.xls', '.xlsx'].includes(fileExt)) {
        parseResult = await ExcelParser.parseFile(filePath);
      } else {
        throw new Error('Unsupported file format. Only CSV, XLS and XLSX are allowed');
      }

      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      // Importer les invités valides
      const importResult = await this.importGuestsToEvent(eventId, parseResult.data, userId);

      // Nettoyer le fichier temporaire
      this.cleanupFile(filePath);

      return {
        success: true,
        message: 'Guest import completed',
        data: {
          summary: {
            total_rows: parseResult.metadata.totalRows,
            imported: importResult.imported,
            ignored: parseResult.metadata.errorRows + importResult.duplicates,
            duplicates: importResult.duplicates,
            errors: parseResult.errors.length + importResult.errors.length
          },
          details: {
            imported_guests: importResult.importedGuests,
            parsing_errors: parseResult.errors,
            import_errors: importResult.errors,
            duplicate_guests: importResult.duplicateGuests
          },
          metadata: parseResult.metadata
        }
      };

    } catch (error) {
      // Nettoyer le fichier en cas d'erreur
      if (filePath && fs.existsSync(filePath)) {
        this.cleanupFile(filePath);
      }

      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Importe les invités dans un événement avec validation et déduplication
   * @param {string} eventId - ID de l'événement
   * @param {Array} guests - Liste des invités à importer
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} - Résultat de l'import
   */
  async importGuestsToEvent(eventId, guests, userId = null) {
    const transaction = await this.db.beginTransaction();
    
    try {
      const imported = [];
      const duplicates = [];
      const errors = [];
      const duplicateGuests = [];

      // Récupérer les emails existants pour cet événement
      const existingEmails = await this.getExistingGuestEmails(eventId, transaction);
      const existingEmailSet = new Set(existingEmails.map(email => email.toLowerCase()));

      // Traiter les invités par lots
      const batchSize = 100;
      for (let i = 0; i < guests.length; i += batchSize) {
        const batch = guests.slice(i, i + batchSize);
        
        for (const guest of batch) {
          try {
            // Vérifier les doublons
            if (existingEmailSet.has(guest.email.toLowerCase())) {
              duplicates.push(guest.email);
              duplicateGuests.push({
                email: guest.email,
                reason: 'Email already exists for this event',
                data: guest
              });
              continue;
            }

            // Créer l'invité
            const guestResult = await this.createGuest(guest, userId, transaction);
            
            if (guestResult.success) {
              // Associer l'invité à l'événement
              const eventGuestResult = await this.addGuestToEvent(
                eventId, 
                guestResult.guestId, 
                userId, 
                transaction
              );

              if (eventGuestResult.success) {
                imported.push({
                  id: guestResult.guestId,
                  ...guest,
                  status: 'pending'
                });
                existingEmailSet.add(guest.email.toLowerCase()); // Ajouter au set des existants
              } else {
                errors.push({
                  email: guest.email,
                  error: eventGuestResult.error,
                  data: guest
                });
              }
            } else {
              errors.push({
                email: guest.email,
                error: guestResult.error,
                data: guest
              });
            }
          } catch (error) {
            errors.push({
              email: guest.email,
              error: error.message,
              data: guest
            });
          }
        }
      }

      // Commit de la transaction
      await transaction.commit();

      return {
        success: true,
        imported: imported.length,
        duplicates: duplicates.length,
        errors: errors.length,
        importedGuests: imported,
        duplicateGuests: duplicateGuests,
        errors: errors
      };

    } catch (error) {
      // Rollback en cas d'erreur
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Récupère les emails des invités existants pour un événement
   * @param {string} eventId - ID de l'événement
   * @param {Object} transaction - Transaction SQL
   * @returns {Promise<Array>} - Liste des emails
   */
  async getExistingGuestEmails(eventId, transaction) {
    const query = `
      SELECT DISTINCT g.email 
      FROM guests g
      INNER JOIN event_guests eg ON g.id = eg.guest_id
      WHERE eg.event_id = $1 AND g.email IS NOT NULL
    `;
    
    const result = await transaction.query(query, [eventId]);
    return result.rows.map(row => row.email);
  }

  /**
   * Crée un nouvel invité
   * @param {Object} guestData - Données de l'invité
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} transaction - Transaction SQL
   * @returns {Promise<Object>} - Résultat de la création
   */
  async createGuest(guestData, userId, transaction) {
    const query = `
      INSERT INTO guests (first_name, last_name, email, phone, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const values = [
      guestData.first_name,
      guestData.last_name,
      guestData.email.toLowerCase(),
      guestData.phone || null,
      userId || 1 // Valeur par défaut si pas d'auth
    ];

    try {
      const result = await transaction.query(query, values);
      return {
        success: true,
        guestId: result.rows[0].id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Associe un invité à un événement
   * @param {string} eventId - ID de l'événement
   * @param {string} guestId - ID de l'invité
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} transaction - Transaction SQL
   * @returns {Promise<Object>} - Résultat de l'association
   */
  async addGuestToEvent(eventId, guestId, userId, transaction) {
    const query = `
      INSERT INTO event_guests (event_id, guest_id, status, user_id, created_at, updated_at)
      VALUES ($1, $2, 'pending', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const values = [eventId, guestId, userId || 1];

    try {
      const result = await transaction.query(query, values);
      return {
        success: true,
        eventGuestId: result.rows[0].id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Nettoie un fichier temporaire
   * @param {string} filePath - Chemin du fichier
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not cleanup file ${filePath}:`, error.message);
    }
  }
}

module.exports = GuestImportService;

/**
 * ========================================
 * TEARDOWN GLOBAL POUR TESTS DE SCHÉMA
 * ========================================
 * Nettoyage global après tous les tests
 * @version 1.0.0
 */

module.exports = async () => {
  console.log('🧹 Teardown global des tests de schéma...');
  
  try {
    // Fermer la connexion à la base de données
    if (global.testDb) {
      await global.testDb.end();
      console.log('✅ Connexion base de données fermée');
    }
    
    // Nettoyer les caches
    if (global.schemaExtractor) {
      await global.schemaExtractor.close();
    }
    
    if (global.schemaFactory) {
      global.schemaFactory.clearCache();
    }
    
    if (global.schemaValidator) {
      global.schemaValidator.clearCache();
    }
    
    console.log('✅ Teardown global terminé');
    
  } catch (error) {
    console.error('❌ Erreur teardown global:', error.message);
  }
};

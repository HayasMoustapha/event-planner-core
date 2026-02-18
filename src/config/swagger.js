'use strict';

const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Charge la spec générée depuis les collections Postman
// Régénérer avec : cd shared/docs && npm run generate
function loadSpec() {
  const specPath = path.join(__dirname, '../../../shared/docs/specs/core-service.yaml');
  if (!fs.existsSync(specPath)) {
    console.warn('[Swagger] Spec non trouvée :', specPath);
    console.warn('[Swagger] Exécuter : cd shared/docs && npm run generate');
    return { openapi: '3.0.0', info: { title: 'Core Service API', version: '1.0.0' }, paths: {} };
  }
  return yaml.load(fs.readFileSync(specPath, 'utf8'));
}

const specs = loadSpec();

const swaggerUiOptions = {
  explorer: false,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 1
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .opblock.opblock-post   { border-color: #28a745; background: rgba(40,167,69,0.05); }
    .swagger-ui .opblock.opblock-get    { border-color: #007bff; background: rgba(0,123,255,0.05); }
    .swagger-ui .opblock.opblock-put    { border-color: #ffc107; background: rgba(255,193,7,0.05); }
    .swagger-ui .opblock.opblock-delete { border-color: #dc3545; background: rgba(220,53,69,0.05); }
    .swagger-ui .opblock.opblock-patch  { border-color: #17a2b8; background: rgba(23,162,184,0.05); }
  `,
  customSiteTitle: 'Core Service API — Event Planner'
};

module.exports = { specs, swaggerUi, swaggerUiOptions };

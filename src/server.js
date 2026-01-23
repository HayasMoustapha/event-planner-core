require('dotenv').config();
const app = require('./app');
const { port } = require('./config');
const migrator = require('./database/migrator');

// Start server with automatic migration
async function startServer() {
  try {
    // Run database migrations first
    console.log('🔄 Running database migrations...');
    const migrationResult = await migrator.migrate();
    
    if (migrationResult.executed > 0) {
      console.log(`✅ ${migrationResult.executed} migrations executed successfully`);
    } else {
      console.log('✅ Database is up to date');
    }
    
    // Start the server
    const server = app.listen(port, () => {
      console.log(`🚀 Event Planner Core API running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Migrations completed`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    // Get the MONGO_URI
    let mongoUri = process.env.DB_MONGODB_URL;
    
    // FORCE disable transactions in connection string
    if (mongoUri.includes('mongodb+srv://')) {
      // For MongoDB Atlas
      if (!mongoUri.includes('retryWrites=')) {
        mongoUri += (mongoUri.includes('?') ? '&' : '?') + 'retryWrites=false';
      }
      if (!mongoUri.includes('w=')) {
        mongoUri += '&w=majority';
      }
    } else {
      // For local MongoDB
      if (!mongoUri.includes('?')) {
        mongoUri += '?retryWrites=false&w=majority';
      } else if (!mongoUri.includes('retryWrites=')) {
        mongoUri += '&retryWrites=false&w=majority';
      }
    }
    
    console.log('📡 Connecting with transactions disabled...');
    
    // Simple connection with minimal options
    const conn = await mongoose.connect(mongoUri, {
      // Remove deprecated options
      // useNewUrlParser and useUnifiedTopology are no longer needed in newer versions
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Verify connection
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
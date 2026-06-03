// server.js - COMPLETE CORRECTED VERSION
require('dotenv').config();
console.log('🚀 Starting server with audio call system...');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const UAParser = require('ua-parser-js');

const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const { startCreditDeductionJob, startFreeSessionTimerJob, startCallCleanupJob } = require('./jobs/creditDeductionJob');
const timerSocket = require('./socket/timerSocket');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Visitor tracking middleware
app.use(async (req, res, next) => {
  const parser = new UAParser();
  const ua = req.headers['user-agent'];
  const result = parser.setUA(ua).getResult();

  let sessionId = req.cookies.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  if (req.path.startsWith('/images') || req.path === '/favicon.ico') {
    return next();
  }

  try {
    const Visitor = require('./models/Visitor');
    const recentVisit = await Visitor.findOne({
      sessionId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (!recentVisit) {
      const visitorData = {
        sessionId,
        browser: result.browser.name || 'Unknown',
        browserVersion: result.browser.version || 'Unknown',
        os: result.os.name || 'Unknown',
        osVersion: result.os.version || 'Unknown',
        device: result.device.type || 'desktop',
        ip: req.ip,
        path: req.path,
        timestamp: new Date(),
      };
      await Visitor.create(visitorData);
    }
  } catch (err) {
    console.error('Error in visitor tracking middleware:', err);
  }

  next();
});
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ FIXED: Import TwilioService from the module

const TwilioService = require('./services/twilioService');
let twilioService = null;
let isTwilioReady = false;

// Check if Twilio credentials are available
const shouldInitializeTwilio = 
  process.env.TWILIO_ACCOUNT_SID && 
  process.env.TWILIO_AUTH_TOKEN && 
  process.env.TWILIO_API_KEY && 
  process.env.TWILIO_API_SECRET;

if (shouldInitializeTwilio) {
  try {
    console.log('\n🔄 Initializing Twilio service from module...');
    
    // TwilioService is already initialized in its constructor
    twilioService = TwilioService;
    isTwilioReady = twilioService.isInitialized;
    
    if (isTwilioReady) {
      console.log('✅ Twilio service initialized successfully');
      
      // Store in global for easy access
      global.twilioService = twilioService;
    } else {
      console.error('❌ Twilio service failed to initialize');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize Twilio service:', error.message);
    isTwilioReady = false;
  }
} else {
  console.log('⚠️  Twilio not configured - audio calls disabled');
  isTwilioReady = false;
}

// Import and use routes BEFORE Socket.IO
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const videothumnail = require('./routes/videoThumbnailRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const timerRoutes = require('./routes/timerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const psychicRoutes = require('./routes/HumanChatbot/psychicRoutes');
const chatRoute = require('./routes/HumanChatbot/chatRoutes');
const psychicChatRoutes = require('./routes/HumanChatbot/psychicChatRoutes');
const ChatRequestRoutes = require('./routes/PaidTimer/chatRequestRoutes');
const timerService = require('./services/timerService');
const ratingRoutes = require('./routes/HumanChatbot/ratingRoutes');
const admindataRoutes = require('./routes/HumanChatbot/admindataRoutes');
const callRoutes = require('./routes/CallSession/callRoutes');
const twilioVoiceRoutes = require('./routes/CallSession/twilioVoice');
const statsRoutes = require('./routes/statsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const feedback = require('./routes/feedbackRoutes');
const userSessionRoutes = require('./routes/CallSession/userSessionRoutes');
const psychicPaymentRoutes = require("./routes/CallSession/psychicPaymentRoutes");
const PsychicPaidRoutes = require("./routes/CallSession/PsychicPaidRoutes")
const blogRoutes = require("./routes/blogRoutes");
const commentRoutes = require("./routes/commentRoutes");
const homeRoutes = require ('./routes/Pages/homeRoutes')
const aboutRoutes = require ('./routes/Pages/aboutRoutes')
const contactRoutes = require ('./routes/Pages/contactRoutes')
const termsRoutes = require ('./routes/Pages/termsRoutes')
const footer = require ('./routes/Pages/footerRoutes')
const psychicsPageRoutes = require('./routes/Pages/psychicsPageRoutes');

// API Routes (always included)
app.use('/api/human-psychics', psychicRoutes);
app.use("/api/humanchat", chatRoute);
app.use('/api/psychic', psychicChatRoutes);
app.use('/api/chatrequest', ChatRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/twilio', twilioVoiceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/thumbnails', videothumnail);
app.use('/api', timerRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', feedback);
app.use('/api/psychics-page', psychicsPageRoutes);

app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use('/api/admin/payments', psychicPaymentRoutes);
app.use('/api/psychic/payments', PsychicPaidRoutes);
app.use('/api/usersession', userSessionRoutes);
app.use('/api/home', homeRoutes)
app.use('/api/admindata', admindataRoutes);
app.use('/api/about',aboutRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/terms', termsRoutes);
app.use('/api/footer', footer)
// Call routes (only if Twilio is ready)
if (isTwilioReady) {
  app.use('/api/calls', callRoutes);
  console.log('✅ Call routes enabled');
}

// NOW initialize Socket.IO AFTER routes
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'] // Add this for better compatibility
});
timerSocket(io);

console.log('✅ Socket.IO server initialized');

// Add this to test socket connections
io.on('connection', (socket) => {
  console.log(`📡 Main namespace connection: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`📡 Main namespace disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`📡 Socket error: ${error}`);
  });
});

// Initialize timer socket
timerSocket(io);

// Import controllers and set Socket.IO instance
const messageController = require('./controllers/HumanChatbot/messageController');
const chatSessionController = require('./controllers/HumanChatbot/chatSessionController');
const callController = require('./controllers/CallSession/callController');

if (messageController.setSocketIO) {
  messageController.setSocketIO(io);
}
if (chatSessionController.setSocketIO) {
  chatSessionController.setSocketIO(io);
}
if (callController.setSocketIO) {
  callController.setSocketIO(io);
}

// ✅ FIXED: Set Twilio service in call controller if available
if (isTwilioReady && twilioService && callController.setTwilioService) {
  callController.setTwilioService(twilioService);
  console.log('✅ Twilio service set in call controller');
}

// Import Socket.IO handlers
const socketHandler = require('./socket/socketHandler');
socketHandler(io);

// ✅ FIXED: Initialize audio call socket handler if Twilio is ready
if (isTwilioReady && twilioService) {
  try {
    const audioSocketHandler = require('./socket/audioSocketHandler');
    audioSocketHandler(io, twilioService);
    console.log('✅ Audio call socket handler initialized');
  } catch (error) {
    console.error('❌ Failed to initialize audio socket handler:', error.message);
  }
}

// NOW attach io to req for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ ADD: Debug endpoint for token testing
app.get('/api/debug/token-test/:userId/:psychicId', async (req, res) => {
  try {
    const { userId, psychicId } = req.params;
    
    if (!isTwilioReady || !twilioService) {
      return res.status(503).json({
        success: false,
        message: 'Twilio service not ready'
      });
    }
    
    // Generate a test room name
    const roomName = `test-room-${Date.now()}`;
    
    let tokens;
    let methodUsed = '';
    
    // Try different methods
    if (twilioService.generateAudioCallTokens) {
      methodUsed = 'generateAudioCallTokens';
      tokens = twilioService.generateAudioCallTokens(userId, psychicId, roomName);
    } 
    else if (twilioService.generateVideoTokenForAudio) {
      methodUsed = 'generateVideoTokenForAudio';
      tokens = {
        userToken: twilioService.generateVideoTokenForAudio(`user_${userId}`, roomName),
        psychicToken: twilioService.generateVideoTokenForAudio(`psychic_${psychicId}`, roomName)
      };
    }
    else {
      return res.status(500).json({
        success: false,
        message: 'No valid token generation method found'
      });
    }
    
    // Decode tokens
    const jwt = require('jsonwebtoken');
    const decodedUser = jwt.decode(tokens.userToken);
    const decodedPsychic = jwt.decode(tokens.psychicToken);
    
    res.json({
      success: true,
      methodUsed,
      roomName,
      tokens: {
        user: {
          token: tokens.userToken,
          length: tokens.userToken?.length || 0,
          decoded: decodedUser,
          isValid: !!decodedUser
        },
        psychic: {
          token: tokens.psychicToken,
          length: tokens.psychicToken?.length || 0,
          decoded: decodedPsychic,
          isValid: !!decodedPsychic
        }
      },
      twilioStatus: {
        initialized: isTwilioReady,
        hasService: !!twilioService,
        methods: Object.keys(twilioService).filter(key => typeof twilioService[key] === 'function')
      }
    });
    
  } catch (error) {
    console.error('❌ Error in token test:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoints
app.get('/api/debug/audio-sockets', (req, res) => {
  try {
    const audioNamespace = io.of('/audio-calls');
    const connectedSockets = Array.from(audioNamespace.sockets.values());
    
    const psychicConnections = [];
    const userConnections = [];
    
    connectedSockets.forEach(socket => {
      if (socket.psychicId) {
        psychicConnections.push({
          psychicId: socket.psychicId,
          socketId: socket.id,
          connectedAt: socket.handshake.issued
        });
      }
      if (socket.userId) {
        userConnections.push({
          userId: socket.userId,
          socketId: socket.id,
          connectedAt: socket.handshake.issued
        });
      }
    });
    
    res.json({
      success: true,
      audioNamespace: {
        connected: audioNamespace.connected.size,
        sockets: connectedSockets.length,
        psychicConnections,
        userConnections
      },
      io: {
        connected: io.engine.clientsCount,
        readyState: io.engine.clientsCount > 0 ? 'open' : 'closed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/debug/socket-test', (req, res) => {
  res.json({
    success: true,
    message: 'Socket test endpoint',
    socketIO: {
      version: require('socket.io/package.json').version,
      clientCompatible: 'v2, v3, v4'
    }
  });
});

// Twilio webhook endpoint
if (isTwilioReady) {
  app.post('/api/calls/webhook/twilio', express.raw({ type: 'application/x-www-form-urlencoded' }), (req, res) => {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body;
    
    // For development, accept all requests
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Webhook validation would be enabled in production');
    }
    
    req.body = params;
    req.io = io;
    
    if (callController.twilioWebhook) {
      callController.twilioWebhook(req, res);
    } else {
      res.status(500).json({ success: false, message: 'Webhook handler not available' });
    }
  });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    services: {
      database: 'connected',
      twilio: {
        ready: isTwilioReady,
        configured: !!shouldInitializeTwilio,
        serviceType: twilioService?.getStatus ? twilioService.getStatus().service : 'unknown'
      },
      socketIO: {
        connected: io.engine.clientsCount,
        audioNamespace: io.of('/audio-calls').sockets.size
      }
    }
  };
  
  if (isTwilioReady && twilioService && twilioService.testConnection) {
    try {
      const twilioTest = await twilioService.testConnection();
      health.services.twilio.testResult = twilioTest;
    } catch (error) {
      health.services.twilio.testError = error.message;
    }
  }
  
  res.json(health);
});

// Twilio diagnostics endpoint
app.get('/api/debug/twilio', async (req, res) => {
  try {
    if (!isTwilioReady || !twilioService) {
      return res.status(503).json({
        success: false,
        message: 'Twilio service not initialized or not configured'
      });
    }
    
    const connectionTest = await twilioService.testConnection();
    
    res.json({
      success: true,
      timestamp: new Date(),
      diagnostics: {
        connectionTest,
        status: twilioService.getStatus ? twilioService.getStatus() : 'Status not available',
        methods: Object.keys(twilioService).filter(key => typeof twilioService[key] === 'function')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to run diagnostics',
      error: error.message
    });
  }
});

// Audio call test endpoint
app.get('/api/audio-test', async (req, res) => {
  try {
    const audioNamespace = io.of('/audio-calls');
    const connectedSockets = Array.from(audioNamespace.sockets.values());
    
    res.json({
      success: true,
      audioSystem: {
        enabled: isTwilioReady,
        connectedClients: connectedSockets.length,
        twilioReady: isTwilioReady,
        namespace: '/audio-calls',
        sockets: connectedSockets.map(s => ({
          id: s.id,
          psychicId: s.psychicId,
          userId: s.userId,
          rooms: Array.from(s.rooms)
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Audio system test failed',
      error: error.message
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running',
    services: {
      audioCalls: isTwilioReady ? 'Enabled' : 'Disabled (Twilio not configured)',
      socketIO: 'Enabled',
      database: 'Connected',
      twilioService: twilioService ? 'Loaded' : 'Not loaded'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// CONNECT TO DATABASE AND START SERVER
connectDB().then(() => {
  console.log('✅ MongoDB connected successfully');
  
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Socket.IO server running on /audio-calls namespace`);
    console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    
    // Test Socket.IO connection
    console.log('\n=== SOCKET.IO TEST ===');
    console.log(`Main namespace: ${io.sockets.sockets.size} sockets`);
    console.log(`Audio namespace: ${io.of('/audio-calls').sockets.size} sockets`);
    
    // Log Twilio status
    console.log('\n=== TWILIO STATUS ===');
    console.log(`Twilio Ready: ${isTwilioReady ? '✅' : '❌'}`);
    console.log(`Twilio Service: ${twilioService ? '✅ Loaded' : '❌ Not loaded'}`);
    
    if (twilioService && twilioService.getStatus) {
      const status = twilioService.getStatus();
      console.log(`Service Type: ${status.service || 'unknown'}`);
      console.log(`Initialized: ${status.initialized ? '✅' : '❌'}`);
    }
    
    // Start timer service
    setTimeout(async () => {
      try {
        await timerService.initialize();
        
        // Start background jobs
        startCreditDeductionJob(io);
        startFreeSessionTimerJob(io);
        
        // Start call cleanup job only if Twilio is ready
        if (isTwilioReady && twilioService) {
          startCallCleanupJob(io);
          console.log('✅ Call cleanup job started');
        }
        
        console.log('✅ All background jobs started successfully');
        
        // Test Twilio connection
        if (isTwilioReady && twilioService && twilioService.testConnection) {
          const connectionTest = await twilioService.testConnection();
          
          if (connectionTest.success) {
            console.log('✅ Twilio connection successful');
            console.log(`✅ Audio call system is fully operational`);
          } else {
            console.log('❌ Twilio connection failed:', connectionTest.message);
          }
        }
        
        // Log audio system status
        console.log('\n=== AUDIO CALL SYSTEM STATUS ===');
        console.log(`Twilio Ready: ${isTwilioReady ? '✅' : '❌'}`);
        console.log(`Audio Socket Handler: ${isTwilioReady ? '✅' : '❌ (Twilio not configured)'}`);
        console.log(`Call Routes: ${isTwilioReady ? '✅' : '❌ (Twilio not configured)'}`);
        console.log(`Webhook Endpoint: ${isTwilioReady ? '✅' : '❌ (Twilio not configured)'}`);
        console.log(`================================\n`);
        
        // Test debug endpoint
        console.log('📡 Debug endpoints available:');
        console.log(`  - http://localhost:${PORT}/api/debug/token-test/123/456`);
        console.log(`  - http://localhost:${PORT}/api/debug/audio-sockets`);
        console.log(`  - http://localhost:${PORT}/api/debug/socket-test`);
        console.log(`  - http://localhost:${PORT}/api/audio-test`);
        console.log(`  - http://localhost:${PORT}/api/health`);
        
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    }, 1000);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});
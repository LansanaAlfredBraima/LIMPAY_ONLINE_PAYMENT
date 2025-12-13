const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const feeRoutes = require('./routes/fees');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com"],
            frameSrc: ["https://js.stripe.com"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files (HTML, CSS, JS) from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Error Handling
app.use(errorHandler);

// Start Server with HTTPS
const sslDir = path.join(__dirname, 'ssl');
const keyPath = path.join(sslDir, 'cert.key');
const certPath = path.join(sslDir, 'cert.crt');

if (process.env.NODE_ENV !== 'production' && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    // Create HTTPS server
    https.createServer(options, app).listen(PORT, () => {
        console.log(`🔒 Secure Server running on https://localhost:${PORT}`);
        console.log(`   SSL certificates loaded from ${sslDir}`);
    });

    // Optional: Redirect HTTP to HTTPS
    const http = require('http');
    http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(80, () => {
        console.log('   HTTP redirect server running on port 80');
    });
} else {
    console.warn('⚠️  SSL certificates not found. Running in HTTP mode.');
    console.warn(`   Expected certificates at: ${sslDir}`);
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

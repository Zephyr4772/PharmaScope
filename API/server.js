const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const { loadData } = require('./utils/dataLoader');
const searchRouter = require('./routes/search');
const aiRouter = require('./routes/ai');

const errorHandler = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Load Data on Startup
try {
    loadData();
} catch (e) {
    console.error("CRITICAL: Failed to load data, server might not function correctly.", e);
    process.exit(1); // Exit if data cannot load
}

// Serve built React frontend as static files (MUST be before routes so index.html is served at /)
const FRONTEND_DIST = path.join(__dirname, '..', 'pharmasynapse-ui', 'pharmasynapse-ui', 'dist');
app.use(express.static(FRONTEND_DIST));

// API Routes
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);
app.use('/api/trends', require('./routes/trends'));

app.get('/api/db-status', (req, res) => {
    try {
        const metaPath = path.join(__dirname, 'JSON', 'current_build.json');
        if (require('fs').existsSync(metaPath)) {
            const meta = require(metaPath);
            // Convert 'YYYYMMDD_HHMMSS' to ISO string or just return the string if conversion fails
            let formattedDate = meta.built_at;
            if (typeof meta.built_at === 'string' && meta.built_at.length === 15) {
                const year = meta.built_at.substring(0, 4);
                const month = meta.built_at.substring(4, 6);
                const day = meta.built_at.substring(6, 8);
                const hour = meta.built_at.substring(9, 11);
                const min = meta.built_at.substring(11, 13);
                const sec = meta.built_at.substring(13, 15);
                formattedDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
            }

            res.json({
                success: true,
                last_updated: formattedDate,
                record_count: meta.record_count,
                scraper_sources: Object.keys(meta.enrichment_sources || {}).filter(k => meta.enrichment_sources[k] === true)
            });
        } else {
            res.json({ success: false, message: 'Metadata not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SPA catch-all: send index.html for any non-API route (handles React Router paths)
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(FRONTEND_DIST, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) res.status(404).json({ success: false, message: 'Frontend not built yet. Run npm run build in pharmasynapse-ui.' });
    });
});

// 404 Handler for unknown API routes
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Central Error Handler Middleware
app.use(errorHandler);

// Handle Uncaught Exceptions (Synchronous)
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

// Handle Unhandled Rejections (Asynchronous)
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Graceful Shutdown on Ctrl+C
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT (Ctrl+C). Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

// Start Server exposed to Network
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running locally on http://localhost:${PORT}`);
    console.log(`Network access enabled. Access via your IP address on port ${PORT}`);
});


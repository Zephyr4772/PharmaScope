const errorHandler = (err, req, res, next) => {
    // Log the error details (stack trace, etc.)
    console.error(`[Error] ${new Date().toISOString()}:`, err);

    // Default status and message
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Show stack in dev only
    });
};

module.exports = errorHandler;

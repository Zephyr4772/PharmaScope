const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

// GET /api/trends?query=paramol
router.get('/', (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
    }

    // Path to the python script
    // Adjusting path to point to API/python_services/trends_service.py
    // Assuming this file is in API/routes/, so we go up one level then into python_services
    const scriptPath = path.join(__dirname, '../python_services/trends_service.py');

    // Command to execute
    // Use "python" or "python3" depending on environment. Using "python" for Windows default.
    const command = `python "${scriptPath}" "${query}"`;

    console.log(`[Trends] Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (stderr) {
            console.error(`[Trends] Stderr: ${stderr}`);
        }

        if (error) {
            console.error(`[Trends] Execution Error: ${error.message}`);
            // If python script failed but printed valid JSON (e.g. mock data fallback with exit code 0?), we might still want to proceed.
            // But usually error means non-zero exit code.
            // If stdout is empty, it's a real failure.
            if (!stdout || !stdout.trim()) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to execute trends service',
                    details: error.message,
                    stderr: stderr
                });
            }
        }

        try {
            const jsonStart = stdout.indexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('No JSON found in output');
            }
            const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
            const data = JSON.parse(jsonString);
            res.json(data);
        } catch (parseError) {
            console.error(`[Trends] Parse Error: ${parseError.message}`);
            console.error(`[Trends] raw stdout: ${stdout}`);
            res.status(500).json({
                status: 'error',
                message: 'Failed to parse trends data',
                parse_error: parseError.message,
                raw_output: stdout.substring(0, 200), // First 200 chars
                stderr: stderr
            });
        }
    });
});

module.exports = router;

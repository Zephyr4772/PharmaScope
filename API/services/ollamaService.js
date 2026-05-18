/**
 * Ollama Service - Communicates with local Ollama API
 * Model: gpt-oss:20b-cloud
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gpt-oss:20b-cloud';

/**
 * Generate a response from Ollama
 * @param {string} systemPrompt - The system instructions
 * @param {string} userPrompt - The user's question with data context
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(systemPrompt, userPrompt) {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: userPrompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    top_k: 40,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
        }
        throw error;
    }
}

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>}
 */
async function isOllamaAvailable() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get list of available models
 * @returns {Promise<Array>}
 */
async function getModels() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.models || [];
    } catch {
        return [];
    }
}

module.exports = {
    generateResponse,
    isOllamaAvailable,
    getModels,
    MODEL_NAME
};

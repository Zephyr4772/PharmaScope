/**
 * PharmaSynapse Drug API Service
 * Uses RELATIVE URLs so requests are always same-origin.
 * Works seamlessly via localhost:3000 AND via ngrok — no CORS issues.
 */

// Always use relative URLs — the Node server serves both the API and the frontend
// on the same port (3000), so '/api/...' resolves correctly from any origin.
const API_BASE_URL = '';
const API_TIMEOUT = 15000; // 15 second timeout

// Utility to parse price string to number
const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const num = parseFloat(String(priceStr).replace(/[₹$,\s]/g, ''));
    return isNaN(num) ? 0 : num;
};

// Get status based on drug data
export const getDrugStatus = (drug) => {
    if (drug.suspicious && drug.suspicious.length > 0) {
        return { status: 'flagged', label: 'Flagged', color: 'danger' };
    }
    if (drug.shortages && drug.shortages.length > 0) {
        return { status: 'shortage', label: 'Low Stock', color: 'warning' };
    }
    if (drug.price) {
        return { status: 'available', label: 'Available', color: 'safe' };
    }
    return { status: 'unknown', label: 'Unknown', color: 'info' };
};

// Fetch with timeout
const fetchWithTimeout = async (url, timeout = API_TIMEOUT) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            // Required to bypass the ngrok free-tier browser warning page
            // when the app is accessed via a public ngrok URL
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// Simple in-memory cache
const cache = {
    data: {},
    set: (key, value, ttl = 300000) => { // 5 min TTL
        cache.data[key] = { value, expires: Date.now() + ttl };
    },
    get: (key) => {
        const item = cache.data[key];
        if (item && item.expires > Date.now()) {
            return item.value;
        }
        delete cache.data[key];
        return null;
    }
};

// Main API service
export const drugAPI = {
    /**
     * Generic search function with timeout
     */
    search: async (params) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const cacheKey = `search_${queryString}`;

            // Check cache first
            const cached = cache.get(cacheKey);
            if (cached) return cached;

            const response = await fetchWithTimeout(`${API_BASE_URL}/api/search?${queryString}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return { meta: { total: 0, page: 1, total_pages: 1 }, data: [], query: params };
                }
                if (response.status === 400) {
                    return { meta: { total: 0, page: 1, total_pages: 1 }, data: [], query: params };
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            cache.set(cacheKey, result);
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('API request timed out');
                return { meta: { total: 0, page: 1, total_pages: 1 }, data: [], error: 'timeout' };
            }
            console.error('API Request failed:', error);
            throw error;
        }
    },

    /**
     * Search drugs by name
     */
    searchByDrug: (drugName, page = 1, limit = 20, options = {}) => {
        return drugAPI.search({
            drug: drugName || 'a',
            page,
            limit,
            ...options
        });
    },

    /**
     * Search drugs by medical condition
     */
    searchByCondition: (condition, page = 1, limit = 20) => {
        return drugAPI.search({ condition, page, limit });
    },

    /**
     * Get total drug count (fast - only fetches 1 item)
     */
    getTotalCount: async () => {
        try {
            const result = await drugAPI.search({ drug: 'a', limit: 1 });
            return result.meta?.total || 0;
        } catch {
            return 195605; // Fallback to known count
        }
    },

    /**
     * Get flagged drugs - OPTIMIZED: smaller sample size
     */
    getFlaggedDrugs: async () => {
        try {
            const result = await drugAPI.search({ drug: 'a', limit: 50 });
            return result.data?.filter(d => d.suspicious && d.suspicious.length > 0) || [];
        } catch {
            return [];
        }
    },

    /**
     * Get drugs in shortage - OPTIMIZED: smaller sample size
     */
    getShortageDrugs: async () => {
        try {
            const result = await drugAPI.search({ drug: 'a', limit: 50 });
            return result.data?.filter(d => d.shortages && d.shortages.length > 0) || [];
        } catch {
            return [];
        }
    },

    /**
     * Get dashboard stats - OPTIMIZED: dedicated stats endpoint
     */
    getDashboardStats: async () => {
        try {
            // Use dedicated stats endpoint (instant - O(1))
            const response = await fetchWithTimeout(`${API_BASE_URL}/api/search/stats`, 5000);
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Stats endpoint failed');
        } catch (error) {
            console.error('Failed to get dashboard stats:', error);
            // Return fallback stats if API offline
            return {
                totalDrugs: 195605,
                flaggedDrugs: 34,
                avgSavings: 45,
                shortages: 1850
            };
        }
    },

    /**
     * Get popular/recent drugs for dashboard table
     */
    getPopularDrugs: async (limit = 10) => {
        try {
            const result = await drugAPI.search({ drug: 'a', limit, sort: 'rating' });
            return result.data || [];
        } catch {
            return [];
        }
    },

    /**
     * Find alternatives (drugs with same salt composition)
     */
    findAlternatives: async (saltComposition, currentPrice) => {
        try {
            const result = await drugAPI.search({
                drug: saltComposition,
                limit: 20,
                sort: 'price_asc'
            });

            const currentPriceNum = parsePrice(currentPrice);

            return (result.data || []).map(drug => ({
                ...drug,
                savings: currentPriceNum > 0
                    ? Math.round(((currentPriceNum - parsePrice(drug.price)) / currentPriceNum) * 100)
                    : 0
            }));
        } catch {
            return [];
        }
    },

    /**
     * Check if API is available (fast check)
     */
    healthCheck: async () => {
        try {
            const response = await fetchWithTimeout(API_BASE_URL, 5000);
            return response.ok;
        } catch (err) {
            return false;
        }
    },

    /**
     * Analyze drugs using Ollama AI
     * @param {Array} drugs - Array of drug objects to analyze
     * @param {string} query - The search query used
     * @param {string} question - Optional specific question
     */
    analyzeWithAI: async (drugs, query, question = null) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ drugs, query, question })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `AI Analysis failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AI Analysis error:', error);
            throw error;
        }
    },

    /**
     * Check Ollama AI status
     */
    checkAIStatus: async () => {
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/api/ai/status`, 5000);
            if (!response.ok) return { ollama_available: false };
            return await response.json();
        } catch {
            return { ollama_available: false, error: 'Could not reach AI service' };
        }
    }
};

export default drugAPI;

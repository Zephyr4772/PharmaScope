// Use relative URLs — same-origin, works via localhost AND ngrok without CORS issues
const API_BASE_URL = '/api';

export const fetchTrends = async (drugName) => {
    try {
        const response = await fetch(`${API_BASE_URL}/trends?query=${encodeURIComponent(drugName)}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!response.ok) {
            let errorMessage = 'Failed to fetch trends data';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                if (errorData.details) errorMessage += `: ${errorData.details}`;
                if (errorData.stderr) console.warn("Backend Stderr:", errorData.stderr);
            } catch (e) {
                // response was not JSON
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error("Trends Service Error:", error);
        throw error;
    }
};

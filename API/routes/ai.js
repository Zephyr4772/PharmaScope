/**
 * AI Routes - Provides AI-powered drug analysis using Ollama
 * ENHANCED: Full drug context, structured prompts, comprehensive analysis
 */

const express = require('express');
const { generateResponse, isOllamaAvailable, getModels, MODEL_NAME } = require('../services/ollamaService');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE SYSTEM PROMPT - Acts as the AI's instruction manual
// ═══════════════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are PharmaLens AI, a highly trained pharmaceutical analysis assistant created to help healthcare consumers make informed decisions about their medication options.

═══════════════════════════════════════════════════════════════════════════════
YOUR ROLE & CAPABILITIES
═══════════════════════════════════════════════════════════════════════════════
1. You are an expert at analyzing pharmaceutical data systematically
2. You have access to COMPLETE drug information including:
   - Product details (name, manufacturer, composition)
   - Pricing and availability data
   - User ratings and reviews (aggregated and detailed)
   - Side effects and drug interactions
   - Clinical applications and uses
   - Manufacturer trust scores and recall history

═══════════════════════════════════════════════════════════════════════════════
STRICT ANALYSIS PROTOCOL - FOLLOW THIS SCRIPT EXACTLY
═══════════════════════════════════════════════════════════════════════════════

When analyzing drugs, ALWAYS structure your response in this EXACT order:

## 📋 Search Summary
- State what was searched and how many results were found
- Identify the primary salt composition if applicable
- Note if these are brand names vs generic versions

## 💊 Available Options
List ALL drugs in the data with this format for each:
- **[Product Name]** by [Manufacturer]
  - Price: ₹[price] | Rating: [X/10] ([review_count] reviews)
  - Salt: [composition]

## 💰 Price Analysis
- Lowest price option: [name] at ₹[price]
- Highest price option: [name] at ₹[price]
- Price range: ₹[min] - ₹[max]
- Average price: ₹[avg]
- IDENTIFY any overpriced options (>50% above average)

## ⭐ Quality Rankings (Based on User Reviews)
Rank the top 3 drugs by:
1. User rating (if available)
2. Number of reviews (more reviews = more reliable)
3. Highlight any with particularly positive/negative feedback

## ⚠️ Safety Information
Extract and list ALL mentioned:
- **Common Side Effects**: [list from data]
- **Serious Warnings**: [if any]
- **Drug Interactions**: [list all interacting drugs from the data]
- **Contraindications**: [if mentioned]

## 🏭 Manufacturer Trust
For each unique manufacturer:
- Note if well-known pharmaceutical company
- Flag any concerns if recall history exists
- Rate manufacturer reliability based on available data

## ✅ Final Recommendation
Provide THREE specific recommendations:
1. **Best Value Pick** - Best price-to-quality ratio
2. **Premium Choice** - Highest rated regardless of price
3. **Budget Option** - Cheapest that meets safety standards

End with: "⚕️ Always consult your doctor or pharmacist before starting any medication."

═══════════════════════════════════════════════════════════════════════════════
RULES FOR QUESTIONS
═══════════════════════════════════════════════════════════════════════════════
When the user asks a specific question:
1. Answer the question DIRECTLY first using the drug data provided
2. Quote specific data points (prices, ratings, effects) from the context
3. If the question cannot be answered from the data, clearly state that
4. Do NOT make up information - only reference what's in the drug data
5. Provide relevant additional context from the data that might help

═══════════════════════════════════════════════════════════════════════════════
FORMATTING REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
- Use markdown formatting with clear headers
- Use bullet points for lists
- Use **bold** for drug names and important values
- Use emojis sparingly for section headers only
- Keep language clear and accessible to non-medical users
- Include specific numbers and percentages wherever possible`;

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE DATA EXTRACTION - Pass ALL available fields to AI
// ═══════════════════════════════════════════════════════════════════════════
function formatDrugDataForAI(drugs) {
    // Take up to 30 drugs for comprehensive analysis (balance between context and token limits)
    return drugs.slice(0, 30).map(drug => {
        // Extract all available fields - don't filter anything out
        const formatted = {
            // Core identification
            id: drug.id,
            product_name: drug.product_name,
            salt_composition: drug.salt_composition || drug.salt,
            manufacturer: drug.manufacturer,
            category: drug.category,

            // Pricing
            price: drug.price,
            mrp: drug.mrp,
            discount: drug.discount,

            // Ratings & Reviews (Layer 1 Clinical Data)
            rating: drug.layer1_reviews?.avg_rating || drug.rating || null,
            total_reviews: drug.layer1_reviews?.review_count || 0, // Note: JSON uses review_count
            conditions_treated: drug.layer1_reviews?.conditions || [],
            sample_reviews: drug.layer1_reviews?.sample_reviews || [],
            review_sentiment: drug.layer1_reviews?.sentiment || null,
            pros: drug.layer1_reviews?.pros || [],
            cons: drug.layer1_reviews?.cons || [],

            // Clinical Information
            uses: drug.uses || drug.description,
            introduction: drug.introduction,
            how_it_works: drug.how_it_works,

            // Safety Data
            side_effects: typeof drug.side_effects === 'string'
                ? drug.side_effects
                : (drug.side_effects?.list || drug.side_effects),

            // Drug Interactions (CRITICAL for safety)
            drug_interactions: drug.drug_interactions,

            // Contraindications
            contraindications: drug.contraindications,
            warnings: drug.warnings,

            // Additional Specs
            pack_size: drug.pack_size,
            form: drug.form, // tablet, capsule, syrup, etc.

            // Layer 2: Economic data
            brand_comparison: drug.layer2_economic?.brand_savings || null,
            official_price_ceiling: drug.official_price_ceiling || null,

            // Layer 3: Safety
            fda_safety_alert: drug.layer3_safety || null,

            // Layer 4: Manufacturer Trust
            manufacturer_trust: drug.layer4_vendor?.trust_level || null,
            recall_history: drug.layer4_vendor?.recall_count || 0,

            // Layer 5: Trends/Demand
            demand_status: drug.layer5_resilience?.demand_trend || null
        };

        // Remove null/undefined fields to keep context clean
        return Object.fromEntries(
            Object.entries(formatted).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD COMPREHENSIVE USER PROMPT
// ═══════════════════════════════════════════════════════════════════════════
function buildUserPrompt(formattedData, query, question) {
    // Calculate summary statistics
    const prices = formattedData.filter(d => d.price).map(d => parseFloat(String(d.price).replace(/[^0-9.]/g, '')));
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 'N/A';
    const minPrice = prices.length > 0 ? Math.min(...prices) : 'N/A';
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 'N/A';

    const ratings = formattedData.filter(d => d.rating).map(d => parseFloat(d.rating));
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'N/A';

    const manufacturers = [...new Set(formattedData.map(d => d.manufacturer).filter(Boolean))];

    let prompt = `
════════════════════════════════════════════════════════════════════════════════
DRUG DATA CONTEXT (${formattedData.length} items)
════════════════════════════════════════════════════════════════════════════════

QUICK STATS:
- Total Results: ${formattedData.length}
- Price Range: ₹${minPrice} - ₹${maxPrice} (Avg: ₹${avgPrice})
- Average Rating: ${avgRating}/10
- Unique Manufacturers: ${manufacturers.length} (${manufacturers.slice(0, 5).join(', ')}${manufacturers.length > 5 ? '...' : ''})

────────────────────────────────────────────────────────────────────────────────
COMPLETE DRUG DATA (JSON):
────────────────────────────────────────────────────────────────────────────────
${JSON.stringify(formattedData, null, 2)}

════════════════════════════════════════════════════════════════════════════════
ANALYSIS REQUEST
════════════════════════════════════════════════════════════════════════════════
Search Query: "${query || 'general search'}"
`;

    if (question) {
        prompt += `
────────────────────────────────────────────────────────────────────────────────
USER QUESTION:
"${question}"
────────────────────────────────────────────────────────────────────────────────

INSTRUCTIONS:
1. Answer the user's question DIRECTLY using ONLY the drug data provided above
2. Reference specific products, prices, ratings from the data
3. If the answer is not in the data, clearly state: "This information is not available in the current drug data."
4. Provide helpful context from the data that supports your answer
5. End with any relevant safety reminders

DO NOT make up information. Use ONLY the data provided.
`;
    } else {
        prompt += `
INSTRUCTIONS:
Follow the STRICT ANALYSIS PROTOCOL from your system instructions.
Analyze ALL ${formattedData.length} drugs in the data thoroughly.
Provide a complete, structured analysis covering every section.
`;
    }

    return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/analyze - Main analysis endpoint
// ═══════════════════════════════════════════════════════════════════════════
router.post('/analyze', async (req, res) => {
    try {
        // Check if Ollama is running
        const ollamaAvailable = await isOllamaAvailable();
        if (!ollamaAvailable) {
            return res.status(503).json({
                error: 'Ollama service unavailable',
                message: 'Please ensure Ollama is running. Start with: ollama serve'
            });
        }

        const { drugs, query, question } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
            return res.status(400).json({
                error: 'Missing data',
                message: "Please provide 'drugs' array in the request body."
            });
        }

        console.log(`[AI] Analyzing ${drugs.length} drugs for query: "${query}"${question ? ` | Question: "${question}"` : ''}`);

        // Format complete data for AI
        const formattedData = formatDrugDataForAI(drugs);

        // Build comprehensive prompt
        const userPrompt = buildUserPrompt(formattedData, query, question);

        console.log(`[AI] Sending ${formattedData.length} drugs to model with ${userPrompt.length} chars context`);

        // Generate AI response
        const aiResponse = await generateResponse(SYSTEM_PROMPT, userPrompt);

        res.json({
            success: true,
            query,
            question: question || null,
            drugs_analyzed: formattedData.length,
            model: MODEL_NAME,
            analysis: aiResponse
        });

    } catch (error) {
        console.error('[AI] Analysis Error:', error);
        res.status(500).json({
            error: 'AI Analysis Failed',
            message: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ai/status - Check Ollama status
// ═══════════════════════════════════════════════════════════════════════════
router.get('/status', async (req, res) => {
    try {
        const available = await isOllamaAvailable();
        const models = available ? await getModels() : [];

        res.json({
            ollama_available: available,
            configured_model: MODEL_NAME,
            available_models: models.map(m => m.name),
            message: available ? 'Ollama is running and ready' : 'Ollama is not running. Start with: ollama serve'
        });
    } catch (error) {
        res.status(500).json({
            ollama_available: false,
            error: error.message
        });
    }
});

module.exports = router;

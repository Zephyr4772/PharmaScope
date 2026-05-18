# PharmaSynapse Project Rundown

**Use this document to master every detail of your project for presentations and showcases.**

---

## 1. Project Overview
**Name**: PharmaSynapse based on PharmaLens Engine
**Tagline**: "Advanced Pharmaceutical Intelligence & Supply Chain Resilience Platform"
**Core Problem Solved**: The pharmaceutical supply chain is opaque. Prices vary wildly, shortages are unpredictable, and verifying drug safety is difficult for end-users.
**Solution**: A unified platform that aggregates data, applies a **5-Layer Verification Engine**, and uses **AI Agents** to provide actionable intelligence.

---

## 2. Tech Stack Setup
### Frontend (The Face)
*   **Framework**: React 19 + Vite (Fastest build tool).
*   **Styling**: Vanilla CSS Variables (The "Purist" Approach) + Tailwind CSS (Utility).
*   **Icons**: Lucide React (Clean, SVG-based).
*   **Charts**: Recharts (Responsive data visualization).
*   **PDF Generation**: `jspdf` + `jspdf-autotable`.

### Backend (The Brain)
*   **Runtime**: Node.js + Express.
*   **AI Engine**: Ollama (Running local LLMs like `gpt-oss` or `searchgpt` for privacy).
*   **Data Processing**: Python Scripts (for ETL - Extract, Transform, Load).
*   **Database**: JSON-based Flat File System (Optimized for read-heavy workloads without SQL overhead).

---

## 3. Core Architecture: The "5-Layer Engine"
This is your **Unique Value Proposition (UVP)**. Memorize these layers:

1.  **Layer 1: Clinical**: Verifies chemical composition, verified medical uses (from `drugs.com` scraping), and dosage info.
2.  **Layer 2: Economic**: compares prices across 1mg, Apollo, Pharmeasy to find "Price Arbitrage" (Savings opportunities).
3.  **Layer 3: Safety**: Scans for side effects, habit-forming warnings, and pregnancy safety flags.
4.  **Layer 4: Vendor**: Assessment of manufacturer reputation (e.g., flagging "Sun Pharma" vs generic unknown labs).
5.  **Layer 5: Resilience**: Supply chain monitoring—predicting shortages based on stock levels and trends.

---

## 4. Functionality Deep Dive

### A. Dashboard (`Dashboard.jsx`)
*   **Purpose**: Command center for supply chain managers.
*   **Key Widgets**:
    *   **KPI Cards**: Total Products, Shortages (Red alert), Price Volatility.
    *   **Charts**:
        *   *Shortage Trends*: Area Chart (Gradient fill).
        *   *Category Distribution*: Donut Chart (Custom active shape).
    *   **Activity Feed**: Live scrolling list of recent system events.

### B. Drug Database / Products Page (`DrugDatabase.jsx`)
*   **Dynamic Search**: Real-time filtering by Drug Name OR Symptom.
*   **Multi-Symptom Search**: You can add tags like "fever" + "pain" to find drugs that treat *both* (Intersection logic).
*   **Pagination**: Custom logic—Rows per page (10/50/100) and "Jump to Page" input.
*   **"Analyze" Button**: Triggers the AI Agent to read the *current* table view and generate a summary.

### C. AI Analysis & Chat
*   **Context-Aware**: The AI doesn't just "chat". It receives the *exact list of drugs* you are looking at as JSON context.
*   **Model**: Ollama Local (Privacy focused).
*   **Workflow**: User asks question -> Frontend sends Table Data + Question -> API -> LLM Process -> Response.

### D. PDF Export Engine (`utils/pdfGenerator.js`)
*   **Design**: Landscape A4, 3-Column "Swim Lane" Layout.
*   **Sanitization**: Custom regex function `cleanPrice()` to remove corrupted characters (like `1&2&0`).
*   **Dynamic Layout**: Calculates text height for "Uses" and "Side Effects" to prevent page-break cuts.

### E. Help Center (`HelpCenter.jsx`)
*   **Animation**: `fadeInUp` CSS keyframes. Staggered delays (`animation-delay: 0.1s`).
*   **Glassmorphism**: Feature cards use `rgba(255,255,255,0.5)` backgrounds with blur filters.

---

## 5. Design System & CSS Choices (`index.css`)

**"Why did you choose this design?"**
> "We went for a 'Professional Medical SaaS' aesthetic—clean, trustworthy, but modern."

### Color Palette
*   **Primary**: Indigo/Blue (`#3B82F6` to `#6366F1`). Represents trust and medical science.
*   **Success**: Emerald (`#10B981`). Used for "Safe" and "In Stock".
*   **Danger**: Red (`#EF4444`). Used for "shortages", "side effects", and "habit forming".
*   **Backgrounds**: Slate/Gray scale (`#F8FAFC`). Reduces eye strain compared to pure white.

### Typography
*   **Font**: Inter (Google Fonts). The gold standard for UI readability.
*   **Hierarchy**:
    *   `font-weight: 800` for Hero titles.
    *   `text-transform: uppercase` + `letter-spacing: 1px` for labels (e.g., "TEAM LEAD").

### Effects
*   **Glassmorphism**: Used in the Help Center and Dashboard cards.
    *   CSS: `background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(10px);`
*   **Gradients**: Subtle linear gradients on icons and buttons to make them "pop" without looking cheap.
*   **Hover States**: `transform: translateY(-5px)` gives a tactile "lift" feel to interactive cards.

---

## 6. Backend Logic Explained

### File Structure
*   `server.js`: The entry point. Handles CORS and routes.
*   `routes/search.js`: The "Query Engine".
    *   **Caching**: Implements a simple in-memory `cache` object to store search results for 5 minutes (Performance optimization).
    *   **Regex Search**: Uses `new RegExp(query, 'i')` for fuzzy matching.
*   `routes/ai.js`: The "AI Bridge".
    *   Connects to Ollama running on port 11434.
    *   Constructs a prompt: *"You are a pharmaceutical expert. Analyze these drugs: [JSON Data]..."*

### Optimization Hacks
*   **Lazy Loading**: The frontend only fetches dashboard stats if the dashboard is active.
*   **Debouncing**: Search inputs wait 300ms before firing API calls to save bandwidth.
*   **Local Processing**: Sorting and filtering (Price/Rating) happens on the frontend for instant feedback, while search happens on the backend.

---

## 7. Presentation Talking Points

1.  **"Is this real data?"**
    *   *Answer*: "Yes, it's a mix of scraped data from verified sources (1mg/Drugs.com) and synthetic data trained to model real-world supply chain fluctuations."

2.  **"Why Local AI?"**
    *   *Answer*: "Patient data privacy is paramount in healthcare. By using local Ollama models, no data ever leaves our secure infrastructure."

3.  **"How scalable is this?"**
    *   *Answer*: "The frontend is separated from the backend. We can swap the JSON storage for MongoDB or PostgreSQL in 24 hours without changing a single line of frontend code."

# PharmaSynapse UI - Farmaku Design Implementation

## Overview
This project is a pixel-perfect React implementation of the Farmaku pharmacy dashboard, adapted for the PharmaSynapse drug intelligence system. It features a modern, clean interface with a specific focus on "best, good, professional, and industry-ready" design standards.

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Icons**: Lucide React (Outline style)
- **Charts**: Recharts
- **Routing**: React Router DOM

## Project Structure
```
pharmasynapse-ui/
├── src/
│   ├── components/
│   │   ├── charts/         # Custom Recharts wrappers (Bar, Donut)
│   │   ├── common/         # StatCard, StatusBadge, Buttons
│   │   └── layout/         # Sidebar, Header, Main Layout
│   ├── data/
│   │   └── mockData.js     # Static data for all pages
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main landing
│   │   ├── DrugCategories.jsx  # Category management
│   │   ├── DrugDatabase.jsx    # Product inventory
│   │   ├── GovernmentAlerts.jsx # Alerts & Flags
│   │   └── PriceComparison.jsx # Transaction history
│   ├── styles/
│   │   └── design-tokens.js # Extracted colors/spacing
│   ├── App.jsx             # Routing configuration
│   ├── index.css           # Global styles & Tailwind
│   └── main.jsx            # Entry point
```

## Key Design Features
1.  **Sidebar**:
    -   Fixed width (`260px`)
    -   Navy background (`#2C3E50`)
    -   Interactive hover/active states with accent color (`#4F63D2`)
    -   Section headers with 50% opacity
2.  **Header**:
    -   Clean white background (`68px` height)
    -   Search bar with focus states
    -   User profile and notification center
3.  **Stats Cards**:
    -   4-column grid layout
    -   Soft shadows (`box-shadow: 0 1px 3px...`)
    -   Gradient icon backgrounds (Pink, Blue, Green, Orange)
4.  **Data Tables**:
    -   Clean rows with hover effects (`#F9FAFB`)
    -   Status pills for actionable feedback
    -   SVG action icons

## how to Run
1.  Navigate to the directory:
    ```bash
    cd pharmasynapse-ui
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173` in your browser.

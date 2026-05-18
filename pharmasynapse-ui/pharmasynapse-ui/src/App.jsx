import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { SavedProvider } from './context/SavedContext';
import Dashboard from './pages/Dashboard';
import DrugDatabase from './pages/DrugDatabase';
import SavedDrugs from './pages/SavedDrugs';
import GovernmentAlerts from './pages/GovernmentAlerts';
import HelpCenter from './pages/HelpCenter';
import DrugVisualizer from './pages/DrugVisualizer';

function App() {
  return (
    <ThemeProvider>
      <SavedProvider>
        <SearchProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<DrugDatabase />} />
              <Route path="/visualizer" element={<DrugVisualizer />} />
              <Route path="/saved" element={<SavedDrugs />} />
              <Route path="/alerts" element={<GovernmentAlerts />} />
              <Route path="/shortage" element={<GovernmentAlerts />} />
              <Route path="/vendors" element={<GovernmentAlerts />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/user" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SearchProvider>
      </SavedProvider>
    </ThemeProvider>
  );
}

export default App;


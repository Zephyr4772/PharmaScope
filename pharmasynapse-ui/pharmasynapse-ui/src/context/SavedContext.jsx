import React, { createContext, useContext, useState, useEffect } from 'react';

const SavedContext = createContext();

export const useSavedDrugs = () => {
    const context = useContext(SavedContext);
    if (!context) {
        throw new Error('useSavedDrugs must be used within a SavedProvider');
    }
    return context;
};

export const SavedProvider = ({ children }) => {
    // Session-only state (clears on refresh)
    const [savedDrugs, setSavedDrugs] = useState([]);

    // No localStorage effects anymore

    const saveDrug = (drug) => {
        setSavedDrugs(prev => {
            if (prev.some(d => d.id === drug.id)) return prev;
            return [...prev, { ...drug, savedAt: new Date().toISOString() }];
        });
    };

    const removeDrug = (drugId) => {
        setSavedDrugs(prev => prev.filter(d => d.id !== drugId));
    };

    const isSaved = (drugId) => {
        return savedDrugs.some(d => d.id === drugId);
    };

    const clearSaved = () => {
        setSavedDrugs([]);
    };

    return (
        <SavedContext.Provider value={{ savedDrugs, saveDrug, removeDrug, isSaved, clearSaved }}>
            {children}
        </SavedContext.Provider>
    );
};

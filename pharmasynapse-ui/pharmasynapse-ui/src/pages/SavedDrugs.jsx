import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useSavedDrugs } from '../context/SavedContext';
import { generateDrugPDF } from '../utils/pdfGenerator';
import DrugCard from '../components/common/DrugCard';
import FieldConfigPanel, { DEFAULT_SELECTED } from '../components/common/FieldConfigPanel';
import { Trash2, Download, ExternalLink, Pill, Grid3X3, List, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const SavedDrugs = () => {
    const { savedDrugs, removeDrug, clearSaved, saveDrug } = useSavedDrugs();

    // View mode and field selection (shared with Products page via localStorage)
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('pharmalens_viewMode') || 'cards';
    });
    const [selectedFields, setSelectedFields] = useState(() => {
        const saved = localStorage.getItem('pharmalens_selectedFields');
        return saved ? JSON.parse(saved) : DEFAULT_SELECTED;
    });
    const [showFieldConfig, setShowFieldConfig] = useState(false);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('pharmalens_viewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('pharmalens_selectedFields', JSON.stringify(selectedFields));
    }, [selectedFields]);

    const handleExport = () => {
        if (savedDrugs.length === 0) return;
        generateDrugPDF(savedDrugs, 'PharmaLens Saved Drugs Report', selectedFields);
    };

    return (
        <Layout>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Saved Drugs</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        You have <strong>{savedDrugs.length}</strong> items in your list
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {savedDrugs.length > 0 && (
                        <>
                            <button
                                onClick={clearSaved}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #EF4444',
                                    background: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} /> Clear All
                            </button>
                            <button
                                onClick={handleExport}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    background: '#6366F1', color: 'white', fontSize: '13px', fontWeight: 600,
                                    cursor: 'pointer', boxShadow: '0 2px 5px rgba(99, 102, 241, 0.3)'
                                }}
                            >
                                <Download size={16} /> Download Report
                            </button>
                        </>
                    )}
                </div>
            </div>

            {savedDrugs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Pill size={24} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Your list is empty</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                        Browse drugs and click the heart icon to save them here for later.
                    </p>
                    <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: 'var(--primary)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                        Browse Products <ExternalLink size={14} />
                    </Link>
                </div>
            ) : (
                <div className="table-card" style={{ marginBottom: '20px' }}>
                    {/* Toolbar with view toggle */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{savedDrugs.length}</strong> saved items
                        </div>

                        {/* View Mode Toggle & Field Config */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Field Config Button (only for card view) */}
                            {viewMode === 'cards' && (
                                <button
                                    onClick={() => setShowFieldConfig(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 10px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Settings size={12} />
                                    Fields ({selectedFields.length})
                                </button>
                            )}

                            {/* View Toggle */}
                            <div style={{
                                display: 'flex',
                                background: 'var(--bg-main)',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden'
                            }}>
                                <button
                                    onClick={() => setViewMode('cards')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 10px',
                                        border: 'none',
                                        background: viewMode === 'cards' ? 'var(--primary)' : 'transparent',
                                        color: viewMode === 'cards' ? 'white' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Grid3X3 size={12} />
                                    Cards
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 10px',
                                        border: 'none',
                                        background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                                        color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <List size={12} />
                                    Table
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Card View */}
                    {viewMode === 'cards' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '16px',
                            padding: '16px'
                        }}>
                            {savedDrugs.map((drug) => (
                                <DrugCard
                                    key={drug.id}
                                    drug={drug}
                                    selectedFields={selectedFields}
                                    isSaved={true}
                                    onSave={saveDrug}
                                    onRemove={removeDrug}
                                />
                            ))}
                        </div>
                    )}

                    {/* Table View */}
                    {viewMode === 'table' && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>Product Name</th>
                                    <th>Manufacturer</th>
                                    <th>Price</th>
                                    <th>Category</th>
                                    <th>Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedDrugs.map((drug) => (
                                    <tr key={drug.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => removeDrug(drug.id)}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}
                                                title="Remove from saved"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{drug.product_name || 'N/A'}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{drug.manufacturer || 'N/A'}</td>
                                        <td style={{ fontWeight: 600, color: '#10B981' }}>{drug.price ? `₹${drug.price}` : 'N/A'}</td>
                                        <td>{drug.category || 'N/A'}</td>
                                        <td>{drug.layer1_reviews?.avg_rating ? `${drug.layer1_reviews.avg_rating}/10` : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Field Configuration Panel */}
            <FieldConfigPanel
                isOpen={showFieldConfig}
                onClose={() => setShowFieldConfig(false)}
                selectedFields={selectedFields}
                onFieldsChange={setSelectedFields}
            />
        </Layout>
    );
};

export default SavedDrugs;

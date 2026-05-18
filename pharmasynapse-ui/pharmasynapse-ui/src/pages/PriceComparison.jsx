import React, { useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { drugAPI, getDrugStatus } from '../api/drugService';
import { Search, Loader2, ArrowRight, TrendingDown, Package } from 'lucide-react';

const PriceComparison = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentDrug, setCurrentDrug] = useState(null);
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const statsCards = [
        { id: 1, label: 'Total Comparisons', value: '12,847', icon: 'ArrowLeftRight', color: 'blue' },
        { id: 2, label: 'Avg. Savings', value: '₹847', icon: 'TrendingUp', color: 'green' },
        { id: 3, label: 'Total Savings', value: '₹1.2Cr', icon: 'Wallet', color: 'orange' },
        { id: 4, label: 'Searches Today', value: '1,245', icon: 'Search', color: 'purple' },
    ];

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setSearched(true);

        try {
            // First search for the drug
            const result = await drugAPI.search({ drug: searchQuery, limit: 1 });

            if (result.data && result.data.length > 0) {
                const drug = result.data[0];
                setCurrentDrug(drug);

                // Search for alternatives with same salt_composition
                if (drug.salt_composition) {
                    const altResult = await drugAPI.search({
                        drug: drug.salt_composition.split('(')[0].trim(),
                        limit: 20,
                        sort: 'price_asc'
                    });

                    // Parse prices and calculate savings
                    const currentPrice = parseFloat(String(drug.price).replace(/[₹,\s]/g, '')) || 0;

                    const alts = (altResult.data || [])
                        .filter(d => d.product_name !== drug.product_name)
                        .map(d => {
                            const altPrice = parseFloat(String(d.price).replace(/[₹,\s]/g, '')) || 0;
                            const savings = currentPrice > 0 ? Math.round(((currentPrice - altPrice) / currentPrice) * 100) : 0;
                            return { ...d, savings, altPrice };
                        })
                        .filter(d => d.savings > 0)
                        .slice(0, 10);

                    setAlternatives(alts);
                } else {
                    setAlternatives([]);
                }
            } else {
                setCurrentDrug(null);
                setAlternatives([]);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setCurrentDrug(null);
            setAlternatives([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    return (
        <Layout>
            {/* Stats Row */}
            <div className="stats-row">
                {statsCards.map(stat => (
                    <StatCard key={stat.id} {...stat} />
                ))}
            </div>

            {/* Search Section */}
            <div className="chart-card" style={{ marginBottom: '24px' }}>
                <div className="chart-header">
                    <div className="chart-title-section">
                        <div className="chart-title">Find Cheaper Alternatives</div>
                        <div className="chart-subtitle">Search for a drug to compare prices and find savings</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', padding: '0 20px 20px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Enter drug name (e.g., Dolo, Paracetamol, Metformin)..."
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 16px 0 44px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                transition: 'all 200ms ease'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !searchQuery.trim()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 24px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !searchQuery.trim() ? 0.6 : 1
                        }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        Compare
                    </button>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : searched && !currentDrug ? (
                <div className="chart-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>No drug found</p>
                    <p style={{ fontSize: '13px' }}>Try a different search term</p>
                </div>
            ) : currentDrug ? (
                <>
                    {/* Current Drug Card */}
                    <div className="chart-card" style={{ marginBottom: '24px' }}>
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        marginBottom: '4px'
                                    }}>
                                        {currentDrug.product_name}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        {currentDrug.manufacturer}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <strong>Salt:</strong> {currentDrug.salt_composition || 'N/A'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 700,
                                        color: 'var(--primary)',
                                        marginBottom: '4px'
                                    }}>
                                        {currentDrug.price}
                                    </div>
                                    <StatusBadge
                                        status={getDrugStatus(currentDrug).status}
                                        label={getDrugStatus(currentDrug).label}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alternatives */}
                    {alternatives.length > 0 ? (
                        <div className="table-card">
                            <div className="table-header">
                                <div className="table-title-section">
                                    <div className="table-title">Cheaper Alternatives Found ({alternatives.length})</div>
                                    <div className="table-subtitle">Same salt composition, lower price</div>
                                </div>
                            </div>

                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Drug Name</th>
                                        <th>Manufacturer</th>
                                        <th>Price</th>
                                        <th>You Save</th>
                                        <th>Rating</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alternatives.map((alt, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <span style={{
                                                    fontWeight: 600,
                                                    maxWidth: 200,
                                                    display: 'block',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {alt.product_name}
                                                </span>
                                            </td>
                                            <td className="cell-secondary">{alt.manufacturer}</td>
                                            <td className="cell-highlight">{alt.price}</td>
                                            <td>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: 'var(--success)',
                                                    fontWeight: 600
                                                }}>
                                                    <TrendingDown size={14} />
                                                    {alt.savings}%
                                                </span>
                                            </td>
                                            <td>{alt.layer1_reviews?.avg_rating ? `${alt.layer1_reviews.avg_rating}/10` : 'N/A'}</td>
                                            <td>
                                                <StatusBadge
                                                    status={getDrugStatus(alt).status}
                                                    label={getDrugStatus(alt).label}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="chart-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <TrendingDown size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No cheaper alternatives found</p>
                            <p style={{ fontSize: '13px' }}>This may already be the cheapest option for this salt composition</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="chart-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <ArrowRight size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>Search for a drug to compare prices</p>
                    <p style={{ fontSize: '13px' }}>Enter a drug name above to find cheaper alternatives</p>
                </div>
            )}
        </Layout>
    );
};

export default PriceComparison;

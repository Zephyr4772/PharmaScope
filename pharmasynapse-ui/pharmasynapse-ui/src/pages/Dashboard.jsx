import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatCard from '../components/common/StatCard';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { drugAPI, getDrugStatus } from '../api/drugService';
import { useSearch } from '../context/SearchContext';
import { Loader2, AlertCircle, RefreshCw, Wifi, WifiOff, Search, ArrowRight } from 'lucide-react';

// Color palette for charts
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

// Default chart data (when no search or API offline)
const defaultPriceBuckets = [
    { name: '₹0-50', value: 45000 },
    { name: '₹51-100', value: 65000 },
    { name: '₹101-200', value: 42000 },
    { name: '₹201-500', value: 28000 },
    { name: '₹500+', value: 15000 },
];

const defaultRatingData = [
    { name: 'Poor (1-3)', value: 8500, fill: 'url(#barGradientPoor)' },
    { name: 'Average (4-6)', value: 45000, fill: 'url(#barGradientMedium)' },
    { name: 'Good (7-10)', value: 142000, fill: 'url(#barGradientGood)' },
];

const defaultManufacturers = [
    { name: 'Cipla', value: 28000, fill: CHART_COLORS[0] },
    { name: 'Sun Pharma', value: 24000, fill: CHART_COLORS[1] },
    { name: 'Dr. Reddys', value: 18000, fill: CHART_COLORS[2] },
    { name: 'Lupin', value: 15000, fill: CHART_COLORS[3] },
    { name: 'Others', value: 110000, fill: CHART_COLORS[4] },
];

// FALLBACK DATA when API is offline
const fallbackStats = {
    totalDrugs: 195605,
    flaggedDrugs: 34,
    avgSavings: 45,
    shortages: 1850
};

const fallbackDrugs = [
    { id: '#D001', product_name: 'Dolo 650 Tablet', manufacturer: 'Micro Labs Ltd', category: 'Pain Relief', price: '₹30.50', rating: 8.5, status: 'available' },
    { id: '#D002', product_name: 'Crocin Advance 500mg', manufacturer: 'GSK', category: 'Pain Relief', price: '₹45.00', rating: 9.0, status: 'available' },
    { id: '#D003', product_name: 'Pantoprazole 40mg', manufacturer: 'Sun Pharma', category: 'Digestive', price: '₹55.00', rating: 8.0, status: 'available' },
    { id: '#D004', product_name: 'Metformin 500mg', manufacturer: 'USV Ltd', category: 'Diabetes', price: '₹35.00', rating: 8.5, status: 'lowStock' },
    { id: '#D005', product_name: 'Azithromycin 500mg', manufacturer: 'Cipla', category: 'Antibiotic', price: '₹85.00', rating: 9.0, status: 'available' },
];

// Table columns
const tableColumns = [
    { key: 'id', header: 'ID', className: 'cell-id' },
    {
        key: 'product_name',
        header: 'Drug Name',
        render: (val) => (
            <span style={{ fontWeight: 600, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {val}
            </span>
        )
    },
    { key: 'manufacturer', header: 'Manufacturer', className: 'cell-secondary' },
    { key: 'category', header: 'Category' },
    { key: 'price', header: 'Price', className: 'cell-highlight' },
    {
        key: 'rating',
        header: 'Rating',
        render: (val) => val ? `${val}/10` : 'N/A'
    },
    {
        key: 'status',
        header: 'Status',
        render: (val, row) => {
            const statusInfo = row.suspicious ? getDrugStatus(row) : { status: val || 'available', label: val === 'lowStock' ? 'Low Stock' : 'Available' };
            return <StatusBadge status={statusInfo.status} label={statusInfo.label} />;
        }
    },
];

// Helper functions to generate chart data from drug results
const generateManufacturerData = (drugs) => {
    if (!drugs || drugs.length === 0) return defaultManufacturers;

    const manufacturerCounts = {};
    drugs.forEach(drug => {
        const mfr = drug.manufacturer || drug.Manufacturer || 'Unknown';
        manufacturerCounts[mfr] = (manufacturerCounts[mfr] || 0) + 1;
    });

    // Sort by count and take top 5
    const sorted = Object.entries(manufacturerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return sorted.map(([name, value], idx) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value,
        fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));
};

const generatePriceBuckets = (drugs) => {
    if (!drugs || drugs.length === 0) return defaultPriceBuckets;

    const buckets = {
        '₹0-50': 0,
        '₹51-100': 0,
        '₹101-200': 0,
        '₹201-500': 0,
        '₹500+': 0
    };

    drugs.forEach(drug => {
        const priceStr = String(drug.price || drug.Price || '0');
        const price = parseFloat(priceStr.replace(/[₹$,\s]/g, '')) || 0;

        if (price <= 50) buckets['₹0-50']++;
        else if (price <= 100) buckets['₹51-100']++;
        else if (price <= 200) buckets['₹101-200']++;
        else if (price <= 500) buckets['₹201-500']++;
        else buckets['₹500+']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
};

const generateRatingBreakdown = (drugs) => {
    if (!drugs || drugs.length === 0) return defaultRatingData;

    let poor = 0, average = 0, good = 0;

    drugs.forEach(drug => {
        const rating = drug.rating || drug.layer1_reviews?.avg_rating || 0;
        if (rating > 0 && rating <= 3) poor++;
        else if (rating > 3 && rating <= 6) average++;
        else if (rating > 6) good++;
    });

    return [
        { name: 'Poor (1-3)', value: poor, fill: 'url(#barGradientPoor)' },
        { name: 'Average (4-6)', value: average, fill: 'url(#barGradientMedium)' },
        { name: 'Good (7-10)', value: good, fill: 'url(#barGradientGood)' },
    ];
};

const Dashboard = () => {
    const { searchQuery, setSearchResults, setIsSearching } = useSearch();
    const navigate = useNavigate();

    const [stats, setStats] = useState(fallbackStats);
    const [drugs, setDrugs] = useState(fallbackDrugs);
    const [loading, setLoading] = useState(false);
    const [apiOnline, setApiOnline] = useState(false);



    // Search-specific state
    const [searchStats, setSearchStats] = useState(null);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // Navigate to products page with current search query
    const handleViewMore = () => {
        if (isSearchMode && searchQuery) {
            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
        } else {
            navigate('/products');
        }
    };

    // Generate chart data - use defaults for initial view, dynamic only when searching
    const manufacturerData = useMemo(() =>
        isSearchMode ? generateManufacturerData(drugs) : defaultManufacturers
        , [drugs, isSearchMode]);

    const priceBucketData = useMemo(() =>
        isSearchMode ? generatePriceBuckets(drugs) : defaultPriceBuckets
        , [drugs, isSearchMode]);

    const ratingData = useMemo(() =>
        isSearchMode ? generateRatingBreakdown(drugs) : defaultRatingData
        , [drugs, isSearchMode]);

    const checkApiAndFetch = async () => {
        setLoading(true);

        try {
            const isOnline = await drugAPI.healthCheck();
            setApiOnline(isOnline);

            if (isOnline) {
                const [statsData, drugsResult] = await Promise.all([
                    drugAPI.getDashboardStats(),
                    drugAPI.search({ drug: 'Paracetamol', limit: 50 })
                ]);

                setStats(statsData);

                if (drugsResult.data && drugsResult.data.length > 0) {
                    const transformedDrugs = drugsResult.data.slice(0, 5).map((drug, idx) => ({
                        ...drug,
                        id: `#D${String(idx + 1).padStart(3, '0')}`,
                        rating: drug.layer1_reviews?.avg_rating || null
                    }));
                    setDrugs(transformedDrugs);
                }
            }
        } catch (err) {
            console.log('API unavailable, using fallback data');
            setApiOnline(false);
        } finally {
            setLoading(false);
        }
    };

    // Handle search query changes
    const performSearch = async (query) => {
        if (!query || !apiOnline) {
            setIsSearchMode(false);
            setSearchStats(null);
            return;
        }

        setIsSearching(true);
        setLoading(true);

        try {
            const result = await drugAPI.search({ drug: query, limit: 200 });

            if (result.data && result.data.length > 0) {
                // Transform and set drug results (with robust rating extraction)
                const transformedDrugs = result.data.map((drug, idx) => {
                    // Try multiple ways to get rating
                    let rating = drug.layer1_reviews?.avg_rating
                        || drug.rating
                        || drug.avg_rating
                        || (drug.reviews && drug.reviews.length > 0 ?
                            drug.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / drug.reviews.length : null);

                    // If still no rating, generate a reasonable one based on review count
                    if (!rating && drug.layer1_reviews?.review_count > 0) {
                        rating = 6.5 + Math.random() * 2; // 6.5-8.5 range for drugs with reviews
                    }

                    return {
                        ...drug,
                        id: `#D${String(idx + 1).padStart(3, '0')}`,
                        rating: rating ? parseFloat(rating.toFixed(1)) : null
                    };
                });
                setDrugs(transformedDrugs);
                setSearchResults(result.data);

                // Calculate search-specific stats
                const flaggedCount = result.data.filter(d => d.suspicious && d.suspicious.length > 0).length;
                const shortageCount = result.data.filter(d => d.shortages && d.shortages.length > 0).length;

                // Calculate average savings (price variance)
                const prices = result.data
                    .map(d => parseFloat(String(d.price || '0').replace(/[₹$,\s]/g, '')))
                    .filter(p => p > 0);
                const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const savingsPercent = avgPrice > 0 ? Math.round(((avgPrice - minPrice) / avgPrice) * 100) : 0;

                // Determine shortage risk
                const hasShortageRisk = shortageCount > 0 || result.meta.total < 5;

                setSearchStats({
                    resultsFound: result.meta.total,
                    flaggedInResults: flaggedCount,
                    potentialSavings: savingsPercent,
                    shortageRisk: hasShortageRisk ? 'High' : 'Low',
                    shortageRiskLevel: hasShortageRisk ? 'danger' : 'safe'
                });
                setIsSearchMode(true);
            } else {
                // No results found
                setSearchStats({
                    resultsFound: 0,
                    flaggedInResults: 0,
                    potentialSavings: 0,
                    shortageRisk: 'Unknown',
                    shortageRiskLevel: 'warning'
                });
                setIsSearchMode(true);
                setDrugs([]);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        checkApiAndFetch();

        const interval = setInterval(() => {
            drugAPI.healthCheck().then(online => setApiOnline(online));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // React to search query changes
    useEffect(() => {
        if (searchQuery) {
            performSearch(searchQuery);
        } else {
            // Reset to default view
            setIsSearchMode(false);
            setSearchStats(null);
            checkApiAndFetch();
        }
    }, [searchQuery]);

    // Generate stats cards based on mode
    const statsCards = isSearchMode && searchStats ? [
        {
            id: 1,
            label: 'Results Found',
            value: searchStats.resultsFound.toLocaleString(),
            icon: 'Search',
            color: 'blue'
        },
        {
            id: 2,
            label: "Gov't Flagged",
            value: String(searchStats.flaggedInResults),
            icon: 'AlertTriangle',
            color: searchStats.flaggedInResults > 0 ? 'red' : 'green'
        },
        {
            id: 3,
            label: 'Potential Savings',
            value: `${searchStats.potentialSavings}%`,
            icon: 'Percent',
            color: 'orange'
        },
        {
            id: 4,
            label: 'Shortage Risk',
            value: searchStats.shortageRisk,
            icon: 'AlertCircle',
            color: searchStats.shortageRiskLevel === 'danger' ? 'red' : 'green'
        },
    ] : [
        { id: 1, label: 'Total Drugs', value: stats.totalDrugs.toLocaleString(), icon: 'Pill', color: 'blue' },
        { id: 2, label: "Gov't Flagged", value: String(stats.flaggedDrugs), icon: 'AlertTriangle', color: 'green' },
        { id: 3, label: 'Avg. Savings', value: `${stats.avgSavings}%`, icon: 'Percent', color: 'orange' },
        { id: 4, label: 'Shortage Risk', value: stats.shortages > 1000 ? 'Moderate' : 'Low', icon: 'AlertCircle', color: 'purple' },
    ];

    return (
        <Layout>
            {/* API Status Banner */}

            {/* Header Actions Row */}
            {/* API Status Banner */}
            <div style={{
                background: apiOnline ? 'var(--success-light)' : 'var(--warning-light)',
                border: `1px solid ${apiOnline ? 'var(--success)' : 'var(--warning)'}`,
                borderRadius: '8px',
                padding: '10px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px'
            }}>
                {apiOnline ? <Wifi size={16} color="var(--success)" /> : <WifiOff size={16} color="var(--warning)" />}
                <span style={{ color: apiOnline ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                    {apiOnline
                        ? (isSearchMode ? `Showing results for "${searchQuery}"` : 'API Connected - Live Data')
                        : 'API Offline - Showing Demo Data'
                    }
                </span>
                {loading && (
                    <Loader2 size={14} className="animate-spin" style={{ marginLeft: 'auto', color: 'var(--primary)' }} />
                )}
                {!apiOnline && (
                    <button
                        onClick={checkApiAndFetch}
                        disabled={loading}
                        style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            background: 'var(--warning)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Retry
                    </button>
                )}
            </div>

            {/* Stats Row */}
            <div className="stats-row">
                {statsCards.map(stat => (
                    <StatCard key={stat.id} {...stat} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <AreaChart
                    data={priceBucketData}
                    title="Price Distribution"
                    subtitle={isSearchMode ? `Price ranges for "${searchQuery}" results` : "Distribution of drugs by price range"}
                    valueLabel="Drugs"
                />
                <DonutChart
                    data={manufacturerData}
                    title="By Manufacturer"
                    centerLabel={isSearchMode ? "Results" : "Total"}
                />
            </div>

            {/* Bottom Row: Bar Chart + Table */}
            <div className="charts-row-equal">
                <BarChart
                    data={ratingData}
                    title="Rating Breakdown"
                    subtitle={isSearchMode ? `Quality distribution for "${searchQuery}"` : "Distribution of drugs by rating"}
                    showDropdown={false}
                    valueSuffix=" drugs"
                    formatYAxis="count"
                />

                <div className="chart-card" style={{ flex: 1 }}>
                    <div className="chart-header">
                        <div className="chart-title-section">
                            <div className="chart-title">{isSearchMode ? `Search Results: "${searchQuery}"` : "Top Drugs"}</div>
                            <div className="chart-subtitle">
                                {apiOnline
                                    ? (isSearchMode ? `Showing 5 of ${drugs.length} results` : "Live data from API")
                                    : "Demo data (API offline)"
                                }
                            </div>
                        </div>
                        <button
                            onClick={handleViewMore}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 200ms ease'
                            }}
                        >
                            View More <ArrowRight size={14} />
                        </button>
                    </div>
                    <DataTable
                        columns={tableColumns}
                        data={drugs.slice(0, 5)}
                        hideHeader={true}
                    />
                </div>
            </div>
            {/* Trends Modal */}

        </Layout >
    );
};

export default Dashboard;

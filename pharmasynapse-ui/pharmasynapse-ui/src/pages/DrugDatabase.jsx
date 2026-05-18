import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { drugAPI, getDrugStatus } from '../api/drugService';
import { useSearch } from '../context/SearchContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSavedDrugs } from '../context/SavedContext';
import { generateDrugPDF } from '../utils/pdfGenerator';
import { fetchTrends } from '../api/trendsService';
import TrendsModal from '../components/common/TrendsModal';
import DrugCard from '../components/common/DrugCard';
import FieldConfigPanel, { DEFAULT_SELECTED } from '../components/common/FieldConfigPanel';
import { Loader2, ChevronLeft, ChevronRight, SlidersHorizontal, X, Check, DollarSign, Star, Building2, Ban, Sparkles, Brain, AlertCircle, Pill, Stethoscope, SendHorizontal, Heart, Download, LayoutList, FileText, TrendingUp, Grid3X3, List, Settings } from 'lucide-react';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

const tableColumns = [
    { key: 'id', header: 'ID', className: 'cell-id' },
    {
        key: 'product_name', header: 'Product Name', render: (val) => (
            <span style={{ fontWeight: 600, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val || 'N/A'}</span>
        )
    },
    { key: 'manufacturer', header: 'Manufacturer', className: 'cell-secondary' },
    { key: 'category', header: 'Category' },
    { key: 'price', header: 'Price', className: 'cell-highlight' },
    { key: 'rating', header: 'Rating', render: (val) => val ? `${val}/10` : 'N/A' },
    {
        key: 'status', header: 'Status', render: (_, row) => {
            try {
                const statusInfo = getDrugStatus(row);
                return <StatusBadge status={statusInfo?.status || 'default'} label={statusInfo?.label || 'Unknown'} />;
            } catch {
                return <StatusBadge status="default" label="Unknown" />;
            }
        }
    },
];

const generateManufacturerData = (drugs) => {
    try {
        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) return [];
        const counts = {};
        drugs.forEach(d => {
            if (d) {
                const m = d.manufacturer || 'Unknown';
                counts[m] = (counts[m] || 0) + 1;
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, value], i) => ({ name: name.length > 10 ? name.slice(0, 10) + '...' : name, value, fill: CHART_COLORS[i] }));
    } catch {
        return [];
    }
};

const generateRatingBreakdown = (drugs) => {
    try {
        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) return [];
        let p = 0, a = 0, g = 0;
        drugs.forEach(d => {
            if (d) {
                const r = d.rating || 0;
                if (r > 0 && r <= 3) p++;
                else if (r > 3 && r <= 6) a++;
                else if (r > 6) g++;
            }
        });
        return [
            { name: 'Poor', value: p, fill: 'url(#barGradientPoor)' },
            { name: 'Avg', value: a, fill: 'url(#barGradientMedium)' },
            { name: 'Good', value: g, fill: 'url(#barGradientGood)' }
        ];
    } catch {
        return [];
    }
};

const parsePrice = (priceStr) => {
    try {
        if (!priceStr) return null;
        const cleaned = String(priceStr).replace(/[₹$,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    } catch {
        return null;
    }
};

const DrugDatabase = () => {
    const { saveDrug, removeDrug, isSaved } = useSavedDrugs();
    const searchContext = useSearch();
    const globalSearchQuery = searchContext?.searchQuery || '';
    const setSearchQuery = searchContext?.setSearchQuery || (() => { });

    const [searchParams] = useSearchParams();
    const urlQuery = searchParams.get('q') || '';

    const [drugs, setDrugs] = useState([]);
    const [allResultsForFilters, setAllResultsForFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeQuery, setActiveQuery] = useState(urlQuery || globalSearchQuery || '');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
    const [stats, setStats] = useState(null);
    const [dbStatus, setDbStatus] = useState(null);
    const [sortBy, setSortBy] = useState('relevance');
    const [showFilters, setShowFilters] = useState(false);
    const [searchMode, setSearchMode] = useState('drug'); // 'drug' or 'condition'
    const [symptomTags, setSymptomTags] = useState([]); // Multi-symptom tags
    const [symptomInput, setSymptomInput] = useState(''); // Current symptom input
    // State for Enhanced Pagination
    const [limit, setLimit] = useState(50);
    const [pageInput, setPageInput] = useState('1');

    // Sync pageInput with page
    useEffect(() => {
        setPageInput(String(page));
    }, [page]);

    // Add symptom tag
    const addSymptomTag = (tag) => {
        const trimmed = tag.trim().toLowerCase();
        if (trimmed && !symptomTags.includes(trimmed)) {
            setSymptomTags(prev => [...prev, trimmed]);
        }
        setSymptomInput('');
    };

    // Remove symptom tag
    const removeSymptomTag = (tag) => {
        setSymptomTags(prev => prev.filter(t => t !== tag));
    };

    // Filter state
    const [filters, setFilters] = useState({
        minPrice: 0,
        maxPrice: 99999,
        minRating: 0,
        excludeNoPrice: false,
        manufacturers: []
    });

    // AI Analysis state
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [questionInput, setQuestionInput] = useState('');
    const [askingQuestion, setAskingQuestion] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Trends State
    const [trendsModalOpen, setTrendsModalOpen] = useState(false);
    const [trendsData, setTrendsData] = useState(null);
    const [trendsLoading, setTrendsLoading] = useState(false);

    // Card View State
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('pharmalens_viewMode') || 'cards';
    });
    const [selectedFields, setSelectedFields] = useState(() => {
        const saved = localStorage.getItem('pharmalens_selectedFields');
        return saved ? JSON.parse(saved) : DEFAULT_SELECTED;
    });
    const [showFieldConfig, setShowFieldConfig] = useState(false);

    // Persist viewMode and selectedFields to localStorage
    useEffect(() => {
        localStorage.setItem('pharmalens_viewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('pharmalens_selectedFields', JSON.stringify(selectedFields));
    }, [selectedFields]);

    // Handle Trends Check
    const handleCheckTrends = async () => {
        if (!activeQuery || activeQuery.length < 3) return;
        setTrendsModalOpen(true);
        setTrendsLoading(true);
        try {
            const data = await fetchTrends(activeQuery);
            setTrendsData(data);
        } catch (e) {
            console.error(e);
            // Modal stays open but shows error state if we implemented one, 
            // but for now the modal handles loading state well.
        } finally {
            setTrendsLoading(false);
        }
    };

    // Generate AI Analysis
    const handleAnalyze = async () => {
        if (!drugs || drugs.length === 0) return;
        setAiLoading(true);
        setAiError(null);
        setChatHistory([]); // Reset chat on new analysis
        try {
            const result = await drugAPI.analyzeWithAI(drugs, activeQuery || 'general search');
            setAiAnalysis(result);
        } catch (err) {
            setAiError(err.message || 'AI analysis failed');
        } finally {
            setAiLoading(false);
        }
    };

    // Handle PDF Export
    const handleExport = async (limit) => {
        setExportLoading(true);
        setShowExportMenu(false);
        try {
            let exportDrugs = [];
            if (limit === 'current') {
                exportDrugs = drugs;
            } else {
                // Fetch top X items based on current filters
                const params = searchMode === 'condition'
                    ? { condition: activeQuery || 'fever', limit: limit ? parseInt(limit) : 50, sort: sortBy }
                    : { drug: activeQuery || 'a', limit: limit ? parseInt(limit) : 50, sort: sortBy };

                if (filters.minPrice > 0) params.min_price = filters.minPrice;
                if (filters.maxPrice < 99999) params.max_price = filters.maxPrice;
                if (filters.minRating > 0) params.min_rating = filters.minRating;
                if (filters.manufacturers?.length === 1) params.manufacturer = filters.manufacturers[0];

                const result = await drugAPI.search(params);
                exportDrugs = result?.data || [];
            }

            if (exportDrugs.length > 0) {
                generateDrugPDF(exportDrugs, `PharmaLens Report - ${activeQuery || 'Drugs'}`, selectedFields);
            }
        } catch (e) {
            console.error('Export failed', e);
        } finally {
            setExportLoading(false);
        }
    };

    // Handle Follow-up Question
    const handleFollowUp = async () => {
        if (!questionInput.trim() || !drugs.length) return;

        const question = questionInput.trim();
        setQuestionInput('');
        setAskingQuestion(true);

        // Add user question to history immediately
        setChatHistory(prev => [...prev, { type: 'user', content: question }]);

        try {
            // Re-send drugs with the question for context-aware answer
            const result = await drugAPI.analyzeWithAI(drugs, activeQuery, question);

            setChatHistory(prev => [...prev, {
                type: 'ai',
                content: result.analysis,
                model: result.model
            }]);
        } catch (err) {
            setChatHistory(prev => [...prev, {
                type: 'error',
                content: 'Failed to get answer. Please try again.'
            }]);
        } finally {
            setAskingQuestion(false);
        }
    };

    // Dynamic filter bounds computed from results - with safety
    const filterBounds = useMemo(() => {
        try {
            const data = allResultsForFilters?.length > 0 ? allResultsForFilters : drugs;
            if (!data || !Array.isArray(data) || data.length === 0) {
                return { minPrice: 0, maxPrice: 5000, manufacturers: [] };
            }

            const prices = data.map(d => parsePrice(d?.price)).filter(p => p !== null && p > 0);
            const manufacturers = [...new Set(data.map(d => d?.manufacturer).filter(Boolean))].sort();

            return {
                minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
                maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 5000,
                manufacturers: manufacturers.slice(0, 20)
            };
        } catch {
            return { minPrice: 0, maxPrice: 5000, manufacturers: [] };
        }
    }, [allResultsForFilters, drugs]);

    const manufacturerData = useMemo(() => generateManufacturerData(drugs), [drugs]);
    const ratingData = useMemo(() => generateRatingBreakdown(drugs), [drugs]);

    const activeFilterCount = useMemo(() => {
        try {
            return [
                filters.minPrice > filterBounds.minPrice,
                filters.maxPrice < filterBounds.maxPrice,
                filters.minRating > 0,
                filters.excludeNoPrice,
                filters.manufacturers?.length > 0
            ].filter(Boolean).length;
        } catch {
            return 0;
        }
    }, [filters, filterBounds]);

    // Sync with global search
    useEffect(() => {
        if (globalSearchQuery && globalSearchQuery !== activeQuery) {
            setActiveQuery(globalSearchQuery);
            setPage(1);
            setFilters({ minPrice: 0, maxPrice: 99999, minRating: 0, excludeNoPrice: false, manufacturers: [] });
        }
    }, [globalSearchQuery, activeQuery]);

    // Sync with URL on mount
    useEffect(() => {
        if (urlQuery && urlQuery !== activeQuery) {
            setActiveQuery(urlQuery);
            if (setSearchQuery) setSearchQuery(urlQuery);
            setPage(1);
        }
    }, []);

    // Fetch filter data
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const params = searchMode === 'condition'
                    ? { condition: activeQuery || 'fever', limit: 200 }
                    : { drug: activeQuery || 'a', limit: 200 };
                const result = await drugAPI.search(params);
                setAllResultsForFilters(result?.data || []);
            } catch {
                setAllResultsForFilters([]);
            }
        };
        fetchFilterData();
    }, [activeQuery, searchMode]);

    // Fetch drugs
    const fetchDrugs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = searchMode === 'condition'
                ? { condition: activeQuery || 'fever', page, limit, sort: sortBy }
                : { drug: activeQuery || 'a', page, limit, sort: sortBy };

            if (filters.minPrice > 0) params.min_price = filters.minPrice;
            if (filters.maxPrice < 99999) params.max_price = filters.maxPrice;
            if (filters.minRating > 0) params.min_rating = filters.minRating;
            if (filters.manufacturers?.length === 1) params.manufacturer = filters.manufacturers[0];

            const result = await drugAPI.search(params);
            let transformed = (result?.data || []).map((drug, idx) => ({
                ...drug,
                id: `P${String((page - 1) * limit + idx + 1).padStart(4, '0')}`,
                rating: drug?.layer1_reviews?.avg_rating || null
            }));

            if (filters.excludeNoPrice) {
                transformed = transformed.filter(d => parsePrice(d?.price) > 0);
            }
            if (filters.manufacturers?.length > 1) {
                transformed = transformed.filter(d =>
                    filters.manufacturers.some(m => (d?.manufacturer || '').toLowerCase().includes(m.toLowerCase()))
                );
            }

            // Multi-symptom filtering (when in condition mode with additional symptom tags)
            if (searchMode === 'condition' && symptomTags.length > 0) {
                transformed = transformed.filter(d => {
                    const desc = ((d?.description || '') + ' ' + (d?.uses || '')).toLowerCase();
                    // Drug must match ALL symptom tags
                    return symptomTags.every(tag => desc.includes(tag));
                });
            }

            setDrugs(transformed);
            setMeta(result?.meta || { total: 0, total_pages: 1 });
        } catch (e) {
            console.error('Fetch error:', e);
            setError('Failed to load drugs');
            setDrugs([]);
        } finally {
            setLoading(false);
        }
    }, [activeQuery, page, limit, sortBy, filters, searchMode, symptomTags]);

    useEffect(() => {
        drugAPI.getDashboardStats().then(setStats).catch(() => setStats(null));
        fetch('/api/db-status')
            .then(res => res.json())
            .then(data => {
                if (data.success) setDbStatus(data);
            })
            .catch(() => {});
    }, []);

    useEffect(() => { fetchDrugs(); }, [fetchDrugs]);

    const resetFilters = () => setFilters({ minPrice: 0, maxPrice: 99999, minRating: 0, excludeNoPrice: false, manufacturers: [] });
    const toggleMfr = (m) => setFilters(p => ({
        ...p,
        manufacturers: (p.manufacturers || []).includes(m)
            ? p.manufacturers.filter(x => x !== m)
            : [...(p.manufacturers || []), m]
    }));

    const isSearching = activeQuery && activeQuery !== 'a';

    const statsCards = useMemo(() => {
        try {
            if (isSearching) {
                const avgPrice = drugs.length > 0
                    ? Math.round(drugs.reduce((s, d) => s + (parsePrice(d?.price) || 0), 0) / drugs.length)
                    : 0;
                return [
                    { id: 1, label: 'Found', value: (meta?.total || 0).toLocaleString(), icon: 'Search', color: 'blue' },
                    { id: 2, label: 'Showing', value: String(drugs.length), icon: 'Package', color: 'green' },
                    { id: 3, label: 'Avg Price', value: avgPrice > 0 ? `₹${avgPrice}` : '---', icon: 'DollarSign', color: 'orange' },
                    { id: 4, label: 'Flagged', value: String(drugs.filter(d => d?.suspicious?.length > 0).length), icon: 'XCircle', color: 'purple' },
                ];
            }
            if (stats) {
                return [
                    { id: 1, label: 'Products', value: (stats?.totalDrugs || 0).toLocaleString(), icon: 'Package', color: 'blue' },
                    { id: 2, label: 'Categories', value: '547', icon: 'Grid3X3', color: 'green' },
                    { id: 3, label: 'Low Stock', value: String(stats?.shortages || 0), icon: 'AlertCircle', color: 'orange' },
                    { id: 4, label: 'Flagged', value: String(stats?.flaggedDrugs || 0), icon: 'XCircle', color: 'purple' },
                ];
            }
            return [];
        } catch {
            return [];
        }
    }, [isSearching, drugs, meta, stats]);

    const chipStyle = (active, color = '#6366F1') => ({
        padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
        border: active ? `1.5px solid ${color}` : '1px solid var(--border-color)',
        background: active ? `${color}15` : 'var(--bg-main)',
        color: active ? color : 'var(--text-secondary)'
    });

    const pricePresets = useMemo(() => {
        try {
            const { minPrice, maxPrice } = filterBounds;
            const range = maxPrice - minPrice;
            if (range <= 0) return [];
            const step = Math.ceil(range / 3);
            return [
                { l: `<₹${minPrice + step}`, min: minPrice, max: minPrice + step },
                { l: `₹${minPrice + step}-${minPrice + step * 2}`, min: minPrice + step, max: minPrice + step * 2 },
                { l: `>₹${minPrice + step * 2}`, min: minPrice + step * 2, max: maxPrice }
            ];
        } catch {
            return [];
        }
    }, [filterBounds]);

    return (
        <Layout>
            {/* Stats Row */}
            <div className="stats-row">
                {statsCards.map(s => <StatCard key={s.id} {...s} />)}
            </div>

            {/* Provenance Line */}
            {dbStatus && (
                <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    marginTop: '-8px',
                    marginBottom: '16px',
                    paddingRight: '4px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span>Data last updated: <strong>{new Date(dbStatus.last_updated).toLocaleString()}</strong></span>
                    <span>|</span>
                    <span>{dbStatus.record_count.toLocaleString()} verified records</span>
                    {dbStatus.scraper_sources && dbStatus.scraper_sources.length > 0 && (
                        <>
                            <span>|</span>
                            <span>Sources: {dbStatus.scraper_sources.join(', ')}</span>
                        </>
                    )}
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Search Mode Toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setSearchMode('drug')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: 'none', fontSize: '11px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 150ms',
                                background: searchMode === 'drug' ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'transparent',
                                color: searchMode === 'drug' ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            <Pill size={12} /> Drug Name
                        </button>
                        <button
                            onClick={() => setSearchMode('condition')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: 'none', fontSize: '11px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 150ms',
                                background: searchMode === 'condition' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                                color: searchMode === 'condition' ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            <Stethoscope size={12} /> Symptom
                        </button>
                    </div>

                    <button onClick={() => setShowFilters(!showFilters)} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: 'none', background: showFilters ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'var(--bg-card)',
                        color: showFilters ? 'white' : 'var(--text-primary)', boxShadow: showFilters ? '0 2px 10px rgba(99,102,241,0.3)' : 'none'
                    }}>
                        <SlidersHorizontal size={14} /> Filters
                        {activeFilterCount > 0 && <span style={{ background: showFilters ? 'rgba(255,255,255,0.3)' : 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '8px', fontSize: '10px' }}>{activeFilterCount}</span>}
                    </button>
                    {activeFilterCount > 0 && <button onClick={resetFilters} style={{ ...chipStyle(true, '#EF4444'), display: 'flex', alignItems: 'center', gap: '4px' }}><X size={12} />Clear</button>}
                    {isSearching && <span style={{ ...chipStyle(true, searchMode === 'condition' ? '#10B981' : '#3B82F6') }}>{searchMode === 'condition' ? '🩺' : '💊'} "{activeQuery}"</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Export Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={exportLoading || drugs.length === 0}
                            style={{
                                height: '34px', padding: '0 12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                                background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                            }}
                        >
                            {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Export
                        </button>
                        {showExportMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', zIndex: 50,
                                boxShadow: 'var(--shadow-lg)', minWidth: '160px'
                            }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>DOWNLOAD PDF</div>
                                <button onClick={() => handleExport('current')} style={{ display: 'flex', gap: '8px', width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '12px', cursor: 'pointer', alignItems: 'center', color: 'var(--text-primary)' }}><FileText size={14} /> Current Page ({drugs.length})</button>
                                <button onClick={() => handleExport(50)} style={{ display: 'flex', gap: '8px', width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '12px', cursor: 'pointer', alignItems: 'center', color: 'var(--text-primary)' }}><LayoutList size={14} /> Top 50 results</button>
                                <button onClick={() => handleExport(100)} style={{ display: 'flex', gap: '8px', width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '12px', cursor: 'pointer', alignItems: 'center', color: 'var(--text-primary)' }}><LayoutList size={14} /> Top 100 results</button>
                            </div>
                        )}
                    </div>

                    {/* Trends Button */}
                    <button
                        onClick={handleCheckTrends}
                        disabled={!activeQuery || activeQuery === 'a'}
                        title="Check Google Trends Demand"
                        style={{
                            height: '34px', padding: '0 12px', border: '1px solid var(--warning)', borderRadius: '8px',
                            background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '12px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                            opacity: (!activeQuery || activeQuery === 'a') ? 0.5 : 1
                        }}
                    >
                        <TrendingUp size={14} />
                        Market Trends
                    </button>

                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <option value="relevance">Relevance</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                        <option value="rating">Rating</option>
                    </select>
                </div>
            </div>

            {/* Multi-Symptom Tags Input (only in condition mode) */}
            {searchMode === 'condition' && (
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Stethoscope size={14} color="#10B981" />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Multi-Symptom Search</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Add symptoms to narrow down results</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Active symptom tags */}
                        {symptomTags.map(tag => (
                            <span key={tag} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                                padding: '5px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600
                            }}>
                                {tag}
                                <button onClick={() => removeSymptomTag(tag)} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                                    <X size={10} color="white" />
                                </button>
                            </span>
                        ))}

                        {/* Add symptom input */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                                type="text"
                                value={symptomInput}
                                onChange={(e) => setSymptomInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && symptomInput.trim() && addSymptomTag(symptomInput)}
                                placeholder={symptomTags.length === 0 ? "e.g., headache, nausea..." : "Add more..."}
                                style={{
                                    height: '28px', padding: '0 10px', border: '1px solid var(--border-color)',
                                    borderRadius: '6px', fontSize: '11px', background: 'var(--bg-main)',
                                    color: 'var(--text-primary)', minWidth: '120px'
                                }}
                            />
                            <button
                                onClick={() => symptomInput.trim() && addSymptomTag(symptomInput)}
                                disabled={!symptomInput.trim()}
                                style={{
                                    padding: '0 10px', borderRadius: '6px', border: 'none',
                                    background: symptomInput.trim() ? '#10B981' : 'var(--bg-card)',
                                    color: symptomInput.trim() ? 'white' : 'var(--text-muted)',
                                    fontSize: '11px', fontWeight: 600, cursor: symptomInput.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        {symptomTags.length > 0 && (
                            <button onClick={() => setSymptomTags([])} style={{ fontSize: '10px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Clear all
                            </button>
                        )}
                    </div>

                    {symptomTags.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
                            🔍 Showing drugs that treat <strong>ALL</strong> of: {symptomTags.join(' + ')}
                        </div>
                    )}
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && filterBounds && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                    {filterBounds.manufacturers?.length > 0 && (
                        <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', fontSize: '11px', color: 'var(--primary)' }}>
                            💡 Price: ₹{filterBounds.minPrice} - ₹{filterBounds.maxPrice} — {filterBounds.manufacturers.length} manufacturers
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Price */}
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <DollarSign size={12} color="#6366F1" />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Price Range</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input type="number" value={filters.minPrice || ''} onChange={e => setFilters(p => ({ ...p, minPrice: +e.target.value || 0 }))} placeholder="Min" style={{ flex: 1, height: '32px', padding: '0 8px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px', alignSelf: 'center' }}>-</span>
                                <input type="number" value={filters.maxPrice >= 99999 ? '' : filters.maxPrice} onChange={e => setFilters(p => ({ ...p, maxPrice: +e.target.value || 99999 }))} placeholder="Max" style={{ flex: 1, height: '32px', padding: '0 8px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {pricePresets.map(p => (
                                    <button key={p.l} onClick={() => setFilters(f => ({ ...f, minPrice: p.min, maxPrice: p.max }))} style={chipStyle(filters.minPrice === p.min && filters.maxPrice === p.max)}>{p.l}</button>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Star size={12} color="#F59E0B" />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Min Rating</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {[{ v: 0, l: 'Any' }, { v: 5, l: '5+' }, { v: 6, l: '6+' }, { v: 7, l: '7+' }, { v: 8, l: '8+' }].map(r => (
                                    <button key={r.v} onClick={() => setFilters(f => ({ ...f, minRating: r.v }))} style={chipStyle(filters.minRating === r.v, '#F59E0B')}>{r.l}</button>
                                ))}
                            </div>
                            <button onClick={() => setFilters(p => ({ ...p, excludeNoPrice: !p.excludeNoPrice }))} style={{ ...chipStyle(filters.excludeNoPrice, '#EF4444'), display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                                <Ban size={12} /> No price {filters.excludeNoPrice && <Check size={12} />}
                            </button>
                        </div>

                        {/* Manufacturers */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Building2 size={12} color="#10B981" />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                                    Manufacturers ({filters.manufacturers?.length || 0} selected)
                                </span>
                            </div>
                            {filterBounds.manufacturers?.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {filterBounds.manufacturers.map(m => {
                                        const shortName = (m || '').replace(/ Ltd$| Laboratories$| Industries$| Pharmaceuticals$| Pharma$/i, '').trim();
                                        return (
                                            <button key={m} onClick={() => toggleMfr(m)} style={{ ...chipStyle((filters.manufacturers || []).includes(m), '#10B981'), display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {(filters.manufacturers || []).includes(m) && <Check size={10} />}
                                                {shortName.length > 15 ? shortName.slice(0, 15) + '...' : shortName}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>No manufacturers found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{ padding: '20px', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {/* Data Display */}
            <div className="table-card" style={{ marginBottom: '20px' }}>
                {/* Header with count and view toggle */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{drugs.length}</strong> of {(meta?.total || 0).toLocaleString()} results
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

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
                ) : drugs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
                        <p style={{ fontSize: '14px' }}>No results found</p>
                    </div>
                ) : (
                    <>
                        {/* Card View */}
                        {viewMode === 'cards' && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                gap: '16px',
                                padding: '16px'
                            }}>
                                {drugs.map((drug, i) => (
                                    <DrugCard
                                        key={drug.id || i}
                                        drug={drug}
                                        selectedFields={selectedFields}
                                        isSaved={isSaved(drug.id)}
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
                                        {tableColumns.map((c, i) => <th key={i}>{c.header}</th>)}
                                    </tr>
                                </thead>
                                <tbody>{drugs.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => isSaved(row.id) ? removeDrug(row.id) : saveDrug(row)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title={isSaved(row.id) ? "Remove from Saved" : "Save Drug"}
                                            >
                                                <Heart size={16} fill={isSaved(row.id) ? "#EF4444" : "none"} color={isSaved(row.id) ? "#EF4444" : "#94A3B8"} />
                                            </button>
                                        </td>
                                        {tableColumns.map((c, j) => (
                                            <td key={j} className={c.className || ''}>
                                                {c.render ? c.render(row?.[c.key], row) : (row?.[c.key] || 'N/A')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}

                        {/* Pagination Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderTop: '1px solid var(--border-color)', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rows per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><ChevronLeft size={14} />Prev</button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page</span>
                                    <input
                                        type="number"
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const p = Math.max(1, Math.min(meta?.total_pages || 1, Number(pageInput) || 1));
                                                setPage(p);
                                            }
                                        }}
                                        onBlur={() => {
                                            const p = Math.max(1, Math.min(meta?.total_pages || 1, Number(pageInput) || 1));
                                            setPageInput(String(p));
                                            setPage(p);
                                        }}
                                        style={{ width: '40px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}
                                    />
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {meta?.total_pages || 1}</span>
                                </div>

                                <button onClick={() => setPage(p => Math.min(meta?.total_pages || 1, p + 1))} disabled={page >= (meta?.total_pages || 1)} style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: page >= (meta?.total_pages || 1) ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= (meta?.total_pages || 1) ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>Next<ChevronRight size={14} /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* AI Insights Panel */}
            {
                drugs.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '16px', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Brain size={20} color="white" />
                                <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>AI Drug Analysis</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Powered by Ollama (gpt-oss:20b-cloud)</span>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={aiLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    background: aiLoading ? 'rgba(255,255,255,0.2)' : 'white',
                                    color: aiLoading ? 'white' : '#6366F1',
                                    fontWeight: 600, fontSize: '12px', cursor: aiLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 150ms'
                                }}
                            >
                                {aiLoading ? (
                                    <><Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                                ) : (
                                    <><Sparkles size={14} /> Analyze {drugs.length} Drugs</>
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '20px' }}>
                            {aiError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                                    <AlertCircle size={16} color="#EF4444" />
                                    <span style={{ color: '#EF4444', fontSize: '13px' }}>{aiError}</span>
                                </div>
                            )}

                            {!aiAnalysis && !aiLoading && !aiError && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <Sparkles size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>Click <strong>"Analyze"</strong> to get AI-powered insights</p>
                                    <p style={{ fontSize: '12px' }}>The AI will analyze drug data, compare options, and highlight key information</p>
                                </div>
                            )}

                            {aiLoading && (
                                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <Loader2 size={28} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing {drugs.length} drugs with AI...</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>This may take a few seconds</p>
                                </div>
                            )}

                            {aiAnalysis && !aiLoading && (
                                <div className="ai-content" style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Model: <strong>{aiAnalysis.model}</strong> · Analyzed: <strong>{aiAnalysis.drugs_analyzed}</strong> drugs
                                        </span>
                                    </div>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            strong: ({ node, ...props }) => <strong style={{ color: '#6366F1', fontWeight: 600 }} {...props} />,
                                            h1: ({ node, ...props }) => <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 8px', color: '#1e293b' }} {...props} />,
                                            h2: ({ node, ...props }) => <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '14px 0 8px', color: '#334155' }} {...props} />,
                                            h3: ({ node, ...props }) => <h5 style={{ fontSize: '14px', fontWeight: 600, margin: '12px 0 6px', color: '#475569' }} {...props} />,
                                            ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', marginBottom: '12px' }} {...props} />,
                                            ol: ({ node, ...props }) => <ol style={{ paddingLeft: '20px', marginBottom: '12px' }} {...props} />,
                                            li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                            table: ({ node, ...props }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }} {...props} />,
                                            th: ({ node, ...props }) => <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }} {...props} />,
                                            td: ({ node, ...props }) => <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }} {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote style={{ borderLeft: '3px solid #6366F1', paddingLeft: '12px', margin: '12px 0', color: '#64748b', fontStyle: 'italic' }} {...props} />,
                                        }}
                                    >
                                        {aiAnalysis.analysis}
                                    </ReactMarkdown>

                                    {/* Chat History */}
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)' }}>
                                            {msg.type === 'user' ? (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                                    <div style={{ background: '#6366F1', color: 'white', padding: '8px 14px', borderRadius: '12px 12px 0 12px', fontSize: '13px', maxWidth: '80%' }}>
                                                        {msg.content}
                                                    </div>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', fontSize: '11px', fontWeight: 600 }}>You</div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={14} color="white" /></div>
                                                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: '12px', borderRadius: '0 12px 12px 12px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                                                        {msg.type === 'error' ? (
                                                            <span style={{ color: '#EF4444' }}>{msg.content}</span>
                                                        ) : (
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    strong: ({ node, ...props }) => <strong style={{ color: '#6366F1', fontWeight: 600 }} {...props} />,
                                                                    table: ({ node, ...props }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '12px' }} {...props} />,
                                                                    th: ({ node, ...props }) => <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }} {...props} />,
                                                                    td: ({ node, ...props }) => <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }} {...props} />,
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Chat Input */}
                                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            value={questionInput}
                                            onChange={(e) => setQuestionInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !askingQuestion && handleFollowUp()}
                                            placeholder="Ask a follow-up question (e.g., 'Which one is causing drowsiness?')"
                                            disabled={askingQuestion}
                                            style={{
                                                flex: 1, height: '40px', padding: '0 14px', borderRadius: '8px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                                                color: 'var(--text-primary)', fontSize: '13px'
                                            }}
                                        />
                                        <button
                                            onClick={handleFollowUp}
                                            disabled={!questionInput.trim() || askingQuestion}
                                            style={{
                                                height: '40px', padding: '0 20px', borderRadius: '8px', border: 'none',
                                                background: !questionInput.trim() || askingQuestion ? 'var(--bg-card)' : '#6366F1',
                                                color: !questionInput.trim() || askingQuestion ? 'var(--text-muted)' : 'white',
                                                cursor: !questionInput.trim() || askingQuestion ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px',
                                                transition: 'all 200ms'
                                            }}
                                        >
                                            {askingQuestion ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Field Configuration Panel */}
            <FieldConfigPanel
                isOpen={showFieldConfig}
                onClose={() => setShowFieldConfig(false)}
                selectedFields={selectedFields}
                onFieldsChange={setSelectedFields}
            />

            {/* Trends Modal */}
            <TrendsModal
                isOpen={trendsModalOpen}
                onClose={() => setTrendsModalOpen(false)}
                data={trendsData}
                loading={trendsLoading}
                drugName={activeQuery}
            />
        </Layout >
    );
};

export default DrugDatabase;

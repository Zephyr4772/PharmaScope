import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Search, X, Plus, Maximize2, AlertTriangle, Loader2, TrendingUp, Activity, Beaker, Users, Star, Pill } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    PieChart, Pie, ComposedChart, Area, Line, ReferenceLine, CartesianGrid
} from 'recharts';
import { drugAPI } from '../api/drugService';

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = {
    navy: '#0F172A',
    teal: '#0D9488',
    tealLight: 'rgba(13, 148, 136, 0.12)',
    steel: '#64748B',
    alert: '#EA580C',
    danger: '#DC2626',
    success: '#059669',
    blue: '#1E40AF',
    violet: '#7C3AED',
    magenta: '#BE185D'
};

const DRUG_COLORS = ['#0D9488', '#1E40AF', '#7C3AED', '#BE185D'];
const DRUG_KEYS = ['A', 'B', 'C', 'D'];

const SEVERITY_COLORS = {
    'SEVERE': '#DC2626',
    'LIFE-THREATENING': '#991B1B',
    'SERIOUS': '#EA580C',
    'MODERATE': '#D97706',
    'MILD': '#059669',
    'MINOR': '#64748B'
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA PARSING UTILITIES - Handle all possible data formats
// ═══════════════════════════════════════════════════════════════════════════
const parsePrice = (price) => {
    if (!price) return 0;
    if (typeof price === 'number') return price;
    const cleaned = String(price).replace(/[₹$€£,\s]/g, '').trim();
    return parseFloat(cleaned) || 0;
};

const parseJSON = (data) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch { return data; }
};

// Parse side effects from various formats
const parseSideEffects = (drug) => {
    const effects = [];

    // Try side_effects field
    if (drug.side_effects) {
        const parsed = parseJSON(drug.side_effects);
        if (typeof parsed === 'string') {
            parsed.split(/[,;]/).map(e => e.trim()).filter(Boolean).forEach(e => effects.push(e));
        } else if (Array.isArray(parsed)) {
            parsed.forEach(e => effects.push(String(e)));
        } else if (parsed && typeof parsed === 'object') {
            // Could be an object with arrays
            Object.values(parsed).forEach(v => {
                if (Array.isArray(v)) v.forEach(e => effects.push(String(e)));
                else if (typeof v === 'string') effects.push(v);
            });
        }
    }

    // Also check layer3_safety
    if (drug.layer3_safety) {
        const safety = parseJSON(drug.layer3_safety);
        if (safety?.dangerous_side_effects) {
            safety.dangerous_side_effects.forEach(e => effects.push(`⚠ ${e}`));
        }
        if (safety?.warnings) {
            safety.warnings.forEach(e => effects.push(e));
        }
    }

    return [...new Set(effects)]; // Remove duplicates
};

// Parse drug interactions
const parseInteractions = (drug) => {
    const interactions = [];

    if (drug.drug_interactions) {
        const parsed = parseJSON(drug.drug_interactions);
        if (parsed && typeof parsed === 'object') {
            // Format: { drug: [...], brand: [...], effect: [...] }
            if (Array.isArray(parsed.drug)) {
                parsed.drug.forEach((name, i) => {
                    interactions.push({
                        drug: name,
                        brand: parsed.brand?.[i] || '',
                        severity: (parsed.effect?.[i] || 'UNKNOWN').toUpperCase().trim()
                    });
                });
            }
        }
    }

    return interactions;
};

// Parse rating from various sources
const parseRating = (drug) => {
    // Try multiple sources
    if (drug.layer1_reviews?.avg_rating) return drug.layer1_reviews.avg_rating;
    if (drug.rating) return drug.rating;
    if (drug.reviews?.rating) return drug.reviews.rating;
    return 0;
};

const parseReviewCount = (drug) => {
    if (drug.layer1_reviews?.review_count) return drug.layer1_reviews.review_count;
    if (drug.layer1_reviews?.total_reviews) return drug.layer1_reviews.total_reviews;
    if (drug.review_count) return drug.review_count;
    return 0;
};

// Parse conditions treated
const parseConditions = (drug) => {
    const conditions = [];

    // layer1_reviews.conditions
    if (drug.layer1_reviews?.conditions) {
        const c = drug.layer1_reviews.conditions;
        if (Array.isArray(c)) conditions.push(...c);
        else if (typeof c === 'string') conditions.push(...c.split(',').map(s => s.trim()));
    }

    // uses field
    if (drug.uses) {
        const parsed = parseJSON(drug.uses);
        if (Array.isArray(parsed)) conditions.push(...parsed);
        else if (typeof parsed === 'string') conditions.push(...parsed.split(',').map(s => s.trim()));
    }

    // therapeutic_class
    if (drug.therapeutic_class) {
        conditions.push(drug.therapeutic_class);
    }

    return [...new Set(conditions.filter(Boolean))];
};

// ═══════════════════════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════
const ClinicalTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '2px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>
            {label && <div style={{ color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>}
            {payload.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F1F5F9' }}>
                    <span style={{ width: '8px', height: '8px', background: entry.color || entry.fill }} />
                    <span style={{ color: '#94A3B8' }}>{entry.name}:</span>
                    <span style={{ fontWeight: 600 }}>{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// PANEL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════
const Panel = ({ title, icon: Icon, children, span = 1, onExpand }) => (
    <div style={{ gridColumn: `span ${span}`, background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={12} style={{ color: COLORS.teal }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
            </div>
            <button onClick={onExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}><Maximize2 size={11} /></button>
        </div>
        <div style={{ padding: '12px 14px', minHeight: '220px' }}>{children}</div>
    </div>
);

const EmptyState = ({ icon: Icon, text }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <Icon size={24} style={{ opacity: 0.4, marginBottom: '8px' }} />
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{text}</span>
    </div>
);

const KPIBox = ({ label, value, color }) => (
    <div style={{ padding: '8px 10px', background: 'var(--bg-main)', borderLeft: `3px solid ${color}`, borderRadius: '2px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 1: PRICE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════
const PricePanel = ({ drugs }) => {
    const data = drugs.map((drug, idx) => ({
        id: DRUG_KEYS[idx],
        name: drug.product_name?.substring(0, 12) || DRUG_KEYS[idx],
        price: parsePrice(drug.price),
        fill: DRUG_COLORS[idx]
    }));

    const validPrices = data.filter(d => d.price > 0).map(d => d.price);
    const avg = validPrices.length ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
    const min = validPrices.length ? Math.min(...validPrices) : 0;
    const max = validPrices.length ? Math.max(...validPrices) : 0;

    if (!drugs.length) return <EmptyState icon={TrendingUp} text="Add drugs to compare" />;

    return (
        <div style={{ display: 'flex', gap: '14px', height: '100%' }}>
            <div style={{ width: '90px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <KPIBox label="LOW" value={`₹${min.toFixed(0)}`} color={COLORS.success} />
                <KPIBox label="AVG" value={`₹${avg.toFixed(0)}`} color={COLORS.steel} />
                <KPIBox label="HIGH" value={`₹${max.toFixed(0)}`} color={COLORS.alert} />
            </div>
            <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={(v) => `₹${v}`} width={45} />
                        <Tooltip content={<ClinicalTooltip />} />
                        <ReferenceLine y={avg} stroke={COLORS.alert} strokeDasharray="4 4" strokeWidth={1} label={{ value: 'AVG', fill: COLORS.alert, fontSize: 9, fontFamily: 'monospace' }} />
                        <Bar dataKey="price" name="Price" radius={[2, 2, 0, 0]} maxBarSize={28}>
                            {data.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 2: INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════
const InteractionPanel = ({ drugs }) => {
    const allInteractions = drugs.flatMap(d => parseInteractions(d));

    // Count by severity
    const counts = {};
    allInteractions.forEach(i => {
        const sev = i.severity || 'UNKNOWN';
        counts[sev] = (counts[sev] || 0) + 1;
    });

    const chartData = Object.entries(counts).map(([name, value]) => ({
        name, value, fill: SEVERITY_COLORS[name] || COLORS.steel
    }));

    const total = allInteractions.length;
    const severe = allInteractions.filter(i => ['SEVERE', 'LIFE-THREATENING', 'SERIOUS'].includes(i.severity)).length;

    if (!total) return <EmptyState icon={AlertTriangle} text="No interactions found" />;

    return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ position: 'relative', width: '55%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
                            {chartData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip content={<ClinicalTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: severe > 0 ? COLORS.danger : 'var(--text-primary)' }}>{total}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL</div>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '10px' }}>
                {chartData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                        <span style={{ width: '8px', height: '8px', background: d.fill }} />
                        <span style={{ color: 'var(--text-muted)', flex: 1 }}>{d.name}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 3: SIDE EFFECTS
// ═══════════════════════════════════════════════════════════════════════════
const SideEffectsPanel = ({ drugs }) => {
    const dangerous = ['severe', 'fatal', 'death', 'emergency', 'anaphylaxis', 'bleeding'];
    const warning = ['allergic', 'swelling', 'difficulty', 'chest', 'breathing', 'pain'];

    const getColor = (e) => {
        const l = e.toLowerCase();
        if (dangerous.some(k => l.includes(k))) return COLORS.danger;
        if (warning.some(k => l.includes(k))) return COLORS.alert;
        return COLORS.steel;
    };

    const counts = {};
    drugs.forEach(drug => {
        parseSideEffects(drug).forEach(e => {
            if (!counts[e]) counts[e] = { count: 0, color: getColor(e) };
            counts[e].count++;
        });
    });

    const data = Object.entries(counts)
        .map(([name, d]) => ({ name: name.length > 28 ? name.slice(0, 28) + '…' : name, fullName: name, count: d.count, fill: d.color }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    if (!data.length) return <EmptyState icon={Pill} text="No side effects data" />;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 9, fontFamily: 'monospace' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 9 }} width={110} />
                <Tooltip content={<ClinicalTooltip />} />
                <Bar dataKey="count" name="Occurrences" radius={[0, 2, 2, 0]} maxBarSize={14}>
                    {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 4: CLINICAL RATING
// ═══════════════════════════════════════════════════════════════════════════
const RatingPanel = ({ drugs }) => {
    const data = drugs.map((drug, idx) => ({
        id: DRUG_KEYS[idx],
        rating: parseRating(drug),
        reviews: parseReviewCount(drug)
    }));

    const avg = data.length ? (data.reduce((s, d) => s + d.rating, 0) / data.length) : 0;
    const total = data.reduce((s, d) => s + d.reviews, 0);

    if (!drugs.length) return <EmptyState icon={Star} text="No ratings" />;

    return (
        <div style={{ display: 'flex', gap: '14px', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace', color: avg >= 7 ? COLORS.teal : avg >= 5 ? COLORS.alert : COLORS.danger }}>{avg.toFixed(1)}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OUT OF 10</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>{total} reviews</div>
            </div>
            <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" />
                        <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 9, fontFamily: 'monospace' }} width={25} />
                        <Tooltip content={<ClinicalTooltip />} />
                        <Area type="linear" dataKey="rating" fill={COLORS.tealLight} stroke="none" />
                        <Line type="linear" dataKey="rating" stroke={COLORS.teal} strokeWidth={2} dot={{ fill: COLORS.teal, r: 4, strokeWidth: 0 }} name="Rating" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 5: CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════
const ConditionsPanel = ({ drugs }) => {
    const counts = {};
    drugs.forEach(d => parseConditions(d).forEach(c => counts[c] = (counts[c] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (!sorted.length) return <EmptyState icon={Users} text="No conditions data" />;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
            {sorted.map(([name, count], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '2px', fontSize: '10px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: COLORS.teal }}>{count}</span>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET 6: COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
const CompositionPanel = ({ drugs }) => {
    if (!drugs.length) return <EmptyState icon={Beaker} text="No composition data" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {drugs.map((drug, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-main)', borderLeft: `3px solid ${DRUG_COLORS[idx]}`, borderRadius: '2px' }}>
                    <span style={{ width: '20px', height: '20px', background: DRUG_COLORS[idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, borderRadius: '2px' }}>{DRUG_KEYS[idx]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drug.product_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{drug.salt_composition || drug.composition || drug.generic_name || '—'}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{drug.price || '—'}</div>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPANDED MODAL
// ═══════════════════════════════════════════════════════════════════════════
const ExpandedModal = ({ title, icon: Icon, children, onClose }) => {
    useEffect(() => {
        const esc = e => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [onClose]);

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '4px', width: '100%', maxWidth: '1100px', height: '75vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={14} style={{ color: COLORS.teal }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>{title}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '2px', padding: '6px 12px', cursor: 'pointer', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={10} /> ESC
                    </button>
                </div>
                <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>{children}</div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const DrugVisualizer = () => {
    const [drugs, setDrugs] = useState([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);

    const search = useCallback(async () => {
        if (query.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const r = await drugAPI.searchByDrug(query, 1, 12);
            setResults(r.data || []);
        } catch { setResults([]); }
        finally { setLoading(false); }
    }, [query]);

    useEffect(() => { const t = setTimeout(search, 250); return () => clearTimeout(t); }, [query, search]);

    const add = (drug) => {
        if (drugs.length < 4) {
            // Log the drug data for debugging
            console.log('Added drug:', drug);
            console.log('Side effects:', drug.side_effects);
            console.log('Interactions:', drug.drug_interactions);
            console.log('Layer1 Reviews:', drug.layer1_reviews);
            console.log('Uses:', drug.uses);

            setDrugs([...drugs, drug]);
            setQuery('');
            setResults([]);
        }
    };
    const remove = (i) => setDrugs(drugs.filter((_, idx) => idx !== i));

    return (
        <Layout>
            <div style={{ padding: '16px 20px', maxWidth: '1500px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <Activity size={18} style={{ color: COLORS.teal }} />
                        <span style={{ letterSpacing: '0.5px' }}>CLINICAL ANALYTICS</span>
                    </h1>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-drug comparison dashboard • Up to 4 compounds</p>
                </div>

                {/* Drug Selector */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative', marginBottom: drugs.length ? '10px' : 0 }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={drugs.length >= 4 ? 'Maximum 4 drugs' : 'Search drug name...'}
                            disabled={drugs.length >= 4}
                            style={{ width: '100%', padding: '10px 10px 10px 34px', border: '1px solid var(--border-color)', borderRadius: '2px', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
                        />
                        {loading && <Loader2 size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.teal, animation: 'spin 1s linear infinite' }} />}

                        {results.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '2px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '240px', overflow: 'auto' }}>
                                {results.map((drug, i) => (
                                    <div key={i} onClick={() => add(drug)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                        <Plus size={12} color={COLORS.teal} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{drug.product_name}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{drug.manufacturer} • {drug.price}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Drugs */}
                    {drugs.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {drugs.map((drug, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-main)', border: `1px solid ${DRUG_COLORS[i]}`, borderRadius: '2px' }}>
                                    <span style={{ width: '18px', height: '18px', background: DRUG_COLORS[i], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, borderRadius: '2px' }}>{DRUG_KEYS[i]}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-primary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drug.product_name}</span>
                                    <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={12} color="var(--text-muted)" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    <Panel title="PRICE COMPARISON" icon={TrendingUp} span={3} onExpand={() => setExpanded('price')}><PricePanel drugs={drugs} /></Panel>
                    <Panel title="INTERACTION SEVERITY" icon={AlertTriangle} span={1} onExpand={() => setExpanded('interactions')}><InteractionPanel drugs={drugs} /></Panel>
                    <Panel title="SIDE EFFECTS" icon={Pill} span={2} onExpand={() => setExpanded('sideEffects')}><SideEffectsPanel drugs={drugs} /></Panel>
                    <Panel title="CLINICAL RATING" icon={Star} span={1} onExpand={() => setExpanded('rating')}><RatingPanel drugs={drugs} /></Panel>
                    <Panel title="CONDITIONS" icon={Users} span={1} onExpand={() => setExpanded('conditions')}><ConditionsPanel drugs={drugs} /></Panel>
                    <Panel title="COMPOSITION" icon={Beaker} span={1} onExpand={() => setExpanded('composition')}><CompositionPanel drugs={drugs} /></Panel>
                </div>

                {/* Modals */}
                {expanded === 'price' && <ExpandedModal title="Price Comparison" icon={TrendingUp} onClose={() => setExpanded(null)}><PricePanel drugs={drugs} /></ExpandedModal>}
                {expanded === 'interactions' && <ExpandedModal title="Interaction Severity" icon={AlertTriangle} onClose={() => setExpanded(null)}><InteractionPanel drugs={drugs} /></ExpandedModal>}
                {expanded === 'sideEffects' && <ExpandedModal title="Side Effects" icon={Pill} onClose={() => setExpanded(null)}><SideEffectsPanel drugs={drugs} /></ExpandedModal>}
                {expanded === 'rating' && <ExpandedModal title="Clinical Rating" icon={Star} onClose={() => setExpanded(null)}><RatingPanel drugs={drugs} /></ExpandedModal>}
                {expanded === 'conditions' && <ExpandedModal title="Conditions" icon={Users} onClose={() => setExpanded(null)}><ConditionsPanel drugs={drugs} /></ExpandedModal>}
                {expanded === 'composition' && <ExpandedModal title="Composition" icon={Beaker} onClose={() => setExpanded(null)}><CompositionPanel drugs={drugs} /></ExpandedModal>}
            </div>
            <style>{`@keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }`}</style>
        </Layout>
    );
};

export default DrugVisualizer;

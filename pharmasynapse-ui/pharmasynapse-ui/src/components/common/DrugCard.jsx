import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Heart, Star, AlertTriangle, Building2, DollarSign, Tag, FlaskConical, FileText, AlertCircle, Repeat } from 'lucide-react';

// Icon mapping for field types
const FIELD_ICONS = {
    salt_composition: FlaskConical,
    manufacturer: Building2,
    price: DollarSign,
    category: Tag,
    description: FileText,
    side_effects: AlertTriangle,
    drug_interactions: Repeat,
    rating: Star,
    total_reviews: FileText,
};

// Helper to extract nested values
const getFieldValue = (drug, fieldKey) => {
    if (fieldKey === 'rating') {
        return drug.layer1_reviews?.avg_rating || drug.rating || null;
    }
    if (fieldKey === 'total_reviews') {
        return drug.layer1_reviews?.total_reviews || null;
    }
    return drug[fieldKey];
};

// Format field value for display
const formatFieldValue = (key, value) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    if (key === 'price') {
        const str = String(value);
        return str.startsWith('₹') ? str : `₹${str}`;
    }
    if (key === 'rating') {
        return `${parseFloat(value).toFixed(1)} / 10`;
    }
    if (key === 'total_reviews') {
        return `${value} reviews`;
    }

    // Try to parse JSON string
    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
            parsedValue = JSON.parse(value);
        } catch (e) {
            // Not valid JSON, use as-is
        }
    }

    // Handle JSON objects/arrays (drug_interactions, side_effects)
    if (typeof parsedValue === 'object' && parsedValue !== null) {
        // Check if it's a drug_interactions object with drug/brand arrays
        if (parsedValue.drug && Array.isArray(parsedValue.drug)) {
            const drugs = parsedValue.drug.slice(0, 3).join(', ');
            return drugs + (parsedValue.drug.length > 3 ? '...' : '');
        }
        // Check if it's an array
        if (Array.isArray(parsedValue)) {
            const items = parsedValue.slice(0, 3).join(', ');
            return items + (parsedValue.length > 3 ? '...' : '');
        }
        // Generic object - try to extract meaningful text
        const str = JSON.stringify(parsedValue);
        return str.length > 100 ? str.substring(0, 100) + '...' : str;
    }

    // Truncate long text for display
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
};

// Format field value for expanded view (full content)
const formatExpandedValue = (key, value) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    // Try to parse JSON string
    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
            parsedValue = JSON.parse(value);
        } catch (e) {
            // Not valid JSON, use as-is
        }
    }

    // Handle JSON objects/arrays
    if (typeof parsedValue === 'object' && parsedValue !== null) {
        // Drug interactions with drug/brand structure
        if (parsedValue.drug && Array.isArray(parsedValue.drug)) {
            return parsedValue.drug.map((drug, i) => {
                const brand = parsedValue.brand?.[i] || '';
                return `• ${drug}${brand ? ` (${brand.trim()})` : ''}`;
            }).join('\n');
        }
        // Plain array
        if (Array.isArray(parsedValue)) {
            return parsedValue.map(item => `• ${item}`).join('\n');
        }
        // Generic object
        return JSON.stringify(parsedValue, null, 2);
    }

    return String(value);
};

const DrugCard = ({
    drug,
    selectedFields = ['manufacturer', 'price', 'category', 'rating'],
    onSave,
    onRemove,
    isSaved = false
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Split fields into primary (first 4) and expanded (rest)
    const primaryFields = selectedFields.slice(0, 4);
    const expandedFields = selectedFields.slice(4);

    const renderFieldItem = (fieldKey, isCompact = false) => {
        const value = getFieldValue(drug, fieldKey);
        const Icon = FIELD_ICONS[fieldKey] || Tag;
        const displayValue = formatFieldValue(fieldKey, value);

        // Field label mapping
        const labels = {
            salt_composition: 'Salt',
            manufacturer: 'Manufacturer',
            price: 'Price',
            category: 'Category',
            description: 'Description',
            side_effects: 'Side Effects',
            drug_interactions: 'Interactions',
            rating: 'Rating',
            total_reviews: 'Reviews',
        };

        if (isCompact) {
            return (
                <div
                    key={fieldKey}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '10px',
                        background: 'var(--bg-main)',
                        borderRadius: '8px',
                        minWidth: 0
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                    }}>
                        <Icon size={12} />
                        {labels[fieldKey]}
                    </div>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>{displayValue}</span>
                        {fieldKey === 'price' && (() => {
                            const opc = drug.official_price_ceiling;
                            if (!opc || typeof opc !== 'object') return null;
                            const prices = opc.ceiling_prices;
                            if (!prices || prices.length === 0) return null;
                            const first = prices[0];
                            const val = first.ceiling_price_per_unit;
                            if (!val) return null;
                            return (
                                <span style={{
                                    fontSize: '10px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10B981',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                }}>
                                    Govt. Ceiling: ₹{val}{first.unit ? '/' + first.unit.replace('per ', '') : ''}
                                </span>
                            );
                        })()}
                    </div>
                </div>
            );
        }

        // Expanded view - full text
        const expandedValue = formatExpandedValue(fieldKey, value);

        return (
            <div
                key={fieldKey}
                style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border-subtle)'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    <Icon size={14} />
                    {labels[fieldKey]}
                </div>
                <div style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    flexDirection: fieldKey === 'price' ? 'row' : 'column'
                }}>
                    <span>{expandedValue}</span>
                    {fieldKey === 'price' && (() => {
                        const opc = drug.official_price_ceiling;
                        if (!opc || typeof opc !== 'object') return null;
                        const prices = opc.ceiling_prices;
                        if (!prices || prices.length === 0) return null;
                        return (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>GOVT. CEILING PRICES (DPCO 2013)</div>
                                {prices.slice(0, 3).map((p, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '4px 8px',
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        borderRadius: '6px',
                                        marginBottom: '4px',
                                        fontSize: '12px'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{p.strength} {p.unit}</span>
                                        <span style={{ color: '#10B981', fontWeight: 700 }}>₹{p.ceiling_price_per_unit}</span>
                                    </div>
                                ))}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Source: {opc.source}</div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)'
            }}
        >
            {/* Header - Always Visible */}
            <div
                style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                }}
            >
                {/* Save Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        isSaved ? onRemove?.(drug.id) : onSave?.(drug);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        marginTop: '2px'
                    }}
                    title={isSaved ? "Remove from Saved" : "Save Drug"}
                >
                    <Heart
                        size={18}
                        fill={isSaved ? "var(--danger)" : "none"}
                        color={isSaved ? "var(--danger)" : "var(--text-muted)"}
                    />
                </button>

                {/* Product Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4
                        }}>
                            {drug.product_name || 'Unknown Drug'}
                        </h3>
                        {drug.layer3_safety && drug.layer3_safety.total_reports > 0 && (
                            <span style={{
                                fontSize: '10px',
                                background: '#FEF2F2',
                                color: '#EF4444',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                border: '1px solid #FCA5A5',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '2px'
                            }}>
                                ⚠ FDA {drug.layer3_safety.total_reports.toLocaleString()} reports
                            </span>
                        )}
                    </div>
                    {drug.id && (
                        <span style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace'
                        }}>
                            {drug.id}
                        </span>
                    )}
                </div>

                {/* Expand Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        background: 'var(--bg-main)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s ease'
                    }}
                >
                    {isExpanded ? (
                        <ChevronUp size={16} color="var(--text-muted)" />
                    ) : (
                        <ChevronDown size={16} color="var(--text-muted)" />
                    )}
                </button>
            </div>

            {/* Primary Fields Grid - Always Visible */}
            <div
                style={{
                    padding: '0 16px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px'
                }}
            >
                {primaryFields.map(fieldKey => renderFieldItem(fieldKey, true))}
            </div>

            {/* Expanded Content */}
            {isExpanded && expandedFields.length > 0 && (
                <div
                    style={{
                        padding: '0 16px 16px',
                        borderTop: '1px solid var(--border-color)',
                        marginTop: '0'
                    }}
                >
                    {expandedFields.map(fieldKey => renderFieldItem(fieldKey, false))}
                </div>
            )}

            {/* Expansion Hint */}
            {!isExpanded && expandedFields.length > 0 && (
                <button
                    onClick={() => setIsExpanded(true)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'var(--bg-main)',
                        border: 'none',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <ChevronDown size={14} />
                    Show {expandedFields.length} more field{expandedFields.length > 1 ? 's' : ''}
                </button>
            )}
        </div>
    );
};

export default DrugCard;

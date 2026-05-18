import React from 'react';
import { Settings, GripVertical, Check, Info } from 'lucide-react';

// All available fields from the drug JSON
const AVAILABLE_FIELDS = [
    { key: 'salt_composition', label: 'Salt Composition', icon: '🧪' },
    { key: 'manufacturer', label: 'Manufacturer', icon: '🏭' },
    { key: 'price', label: 'Price', icon: '💰' },
    { key: 'category', label: 'Category', icon: '📁' },
    { key: 'description', label: 'Description', icon: '📝' },
    { key: 'side_effects', label: 'Side Effects', icon: '⚠️' },
    { key: 'drug_interactions', label: 'Drug Interactions', icon: '🔄' },
    { key: 'rating', label: 'Rating', icon: '⭐' },
    { key: 'total_reviews', label: 'Total Reviews', icon: '💬' },
];

// Default: first 4 fields selected
const DEFAULT_SELECTED = ['manufacturer', 'price', 'category', 'rating'];

const FieldConfigPanel = ({
    selectedFields = DEFAULT_SELECTED,
    onFieldsChange,
    isOpen,
    onClose
}) => {
    const toggleField = (fieldKey) => {
        const isSelected = selectedFields.includes(fieldKey);
        let newFields;

        if (isSelected) {
            // Remove field
            newFields = selectedFields.filter(f => f !== fieldKey);
        } else {
            // Add field
            newFields = [...selectedFields, fieldKey];
        }

        onFieldsChange(newFields);
    };

    const getPrimaryFields = () => selectedFields.slice(0, 4);
    const getExpandedFields = () => selectedFields.slice(4);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '320px',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.2s ease-out'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                        Card Fields
                    </span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '4px'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Info Banner */}
            <div style={{
                margin: '16px',
                padding: '12px',
                background: 'var(--primary-light)',
                borderRadius: '8px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
            }}>
                <Info size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    First <strong>4 fields</strong> appear in collapsed view.
                    Additional fields show when card is expanded.
                </p>
            </div>

            {/* Field List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                {/* Primary Fields Section */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        letterSpacing: '0.5px'
                    }}>
                        Primary Fields ({getPrimaryFields().length}/4)
                    </div>

                    {AVAILABLE_FIELDS.map((field, index) => {
                        const isSelected = selectedFields.includes(field.key);
                        const primaryIndex = getPrimaryFields().indexOf(field.key);
                        const isPrimary = primaryIndex !== -1;

                        return (
                            <button
                                key={field.key}
                                onClick={() => toggleField(field.key)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    marginBottom: '6px',
                                    background: isSelected
                                        ? (isPrimary ? 'var(--primary-light)' : 'var(--bg-main)')
                                        : 'var(--bg-card)',
                                    border: `1px solid ${isSelected ? (isPrimary ? 'var(--primary)' : 'var(--border-color)') : 'var(--border-color)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontSize: '16px' }}>{field.icon}</span>
                                <span style={{
                                    flex: 1,
                                    fontSize: '13px',
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}>
                                    {field.label}
                                </span>
                                {isPrimary && (
                                    <span style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        #{primaryIndex + 1}
                                    </span>
                                )}
                                {isSelected && !isPrimary && (
                                    <Check size={16} color="var(--success)" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-main)'
            }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <strong>{selectedFields.length}</strong> fields selected
                    {getExpandedFields().length > 0 && (
                        <span> • {getExpandedFields().length} in expanded view</span>
                    )}
                </div>
                <button
                    onClick={() => onFieldsChange(DEFAULT_SELECTED)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    Reset to Defaults
                </button>
            </div>
        </div>
    );
};

export default FieldConfigPanel;
export { AVAILABLE_FIELDS, DEFAULT_SELECTED };

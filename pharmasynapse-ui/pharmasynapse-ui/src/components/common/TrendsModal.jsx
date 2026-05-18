import React from 'react';
import { X, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const TrendsModal = ({ isOpen, onClose, data, loading, drugName }) => {
    if (!isOpen) return null;

    // Helper to get status color and icon
    const getStatusConfig = (status, isSpike) => {
        if (isSpike) return { color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle, label: 'Critical Spike' };
        if (status?.includes('Rising')) return { color: '#F59E0B', bg: '#FFFBEB', icon: TrendingUp, label: 'Rising Demand' };
        if (status?.includes('Declining')) return { color: '#10B981', bg: '#ECFDF5', icon: TrendingDown, label: 'Declining' };
        return { color: '#3B82F6', bg: '#EFF6FF', icon: Minus, label: 'Stable' };
    };

    // Safely derive config only if data exists
    const config = data ? getStatusConfig(data.trend_status, data.is_spike) : { color: '#94A3B8', bg: '#F1F5F9', icon: Activity, label: 'No Data' };
    const hasError = !loading && !data;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                width: '100%', maxWidth: '500px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '32px',
                position: 'relative',
                animation: 'fadeInUp 0.3s ease-out'
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#64748B', padding: '8px', borderRadius: '50%',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#F1F5F9'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', margin: '0 auto 20px',
                        background: loading ? '#E2E8F0' : (hasError ? '#FEE2E2' : config.bg),
                        borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: loading ? '#94A3B8' : (hasError ? '#EF4444' : config.color)
                    }}>
                        {loading ? (
                            <Activity className="animate-spin" size={32} />
                        ) : hasError ? (
                            <AlertTriangle size={32} />
                        ) : (
                            <config.icon size={32} />
                        )}
                    </div>

                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
                        {loading ? `Analyzing ${drugName}...` : hasError ? 'Analysis Failed' : `Trends Analysis: ${data.drug_name}`}
                    </h2>

                    {!loading && !hasError && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '20px',
                            background: config.bg, color: config.color,
                            fontSize: '13px', fontWeight: 700
                        }}>
                            {config.label}
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#64748B', padding: '20px 0' }}>
                        <p>Connecting to Google Trends (India)...</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>Verifying 30-day search volume spikes.</p>
                    </div>
                ) : hasError ? (
                    <div style={{ textAlign: 'center', color: '#64748B', padding: '20px 0' }}>
                        <p style={{ color: '#EF4444', fontWeight: 500 }}>Unable to fetch trends data.</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>Please check your internet connection or try again later.</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Status Box */}
                        <div style={{
                            background: '#F8FAFC', borderRadius: '16px', padding: '20px',
                            marginBottom: '24px', border: '1px solid #E2E8F0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <CheckCircle size={20} color={config.color} />
                                <span style={{ fontWeight: 600, color: '#334155' }}>Prediction Engine</span>
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: 500, color: '#1E293B', lineHeight: '1.5' }}>
                                {data.prediction_text}
                            </p>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
                                Confidence Score: {(data.confidence_score * 100).toFixed(0)}%
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{data.metrics.recent_volume}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Recent Vol</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{data.metrics.monthly_avg}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Avg Vol</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{data.metrics.peak_volume}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Peak</div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8' }}>
                            Source: {data.data_source} • Updated: {data.last_updated}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendsModal;

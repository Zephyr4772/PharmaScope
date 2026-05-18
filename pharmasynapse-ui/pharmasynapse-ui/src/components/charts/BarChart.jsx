import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
                <p style={{
                    margin: 0,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                }}>
                    {label}
                </p>
                <p style={{
                    margin: '4px 0 0',
                    color: '#6366F1',
                    fontSize: '16px',
                    fontWeight: 700
                }}>
                    {valuePrefix}{payload[0].value.toLocaleString()}{valueSuffix}
                </p>
            </div>
        );
    }
    return null;
};

const CustomBarChart = ({ data, title, subtitle, showDropdown = true, valuePrefix = '', valueSuffix = '', formatYAxis }) => {
    // Safety check for valid data
    const hasValidData = data && Array.isArray(data) && data.length > 0 && data.some(d => d.value > 0);

    // Default Y-axis formatter
    const defaultFormatter = (value) => {
        if (formatYAxis === 'count') {
            return value.toLocaleString();
        }
        return `$${(value / 1000).toFixed(0)}k`;
    };

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-title-section">
                    <div className="chart-title">{title}</div>
                    {subtitle && <div className="chart-subtitle">{subtitle}</div>}
                </div>
                <div className="chart-actions">
                    {showDropdown && (
                        <button className="chart-dropdown">
                            Weekly <ChevronDown size={14} />
                        </button>
                    )}
                    <button className="chart-menu-btn">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            </div>

            <div className="chart-container-sm" style={{ width: '100%', height: '200px' }}>
                {!hasValidData ? (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                    }}>
                        No data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            barSize={32}
                        >
                            <defs>
                                <linearGradient id="barGradientGood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34D399" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="barGradientMedium" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FBBF24" />
                                    <stop offset="100%" stopColor="#F59E0B" />
                                </linearGradient>
                                <linearGradient id="barGradientPoor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F87171" />
                                    <stop offset="100%" stopColor="#EF4444" />
                                </linearGradient>
                                <linearGradient id="barGradientCustom" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818CF8" />
                                    <stop offset="50%" stopColor="#6366F1" />
                                    <stop offset="100%" stopColor="#4F46E5" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="var(--border-color)"
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                dx={-5}
                                tickFormatter={formatYAxis === 'count' ? (v) => v : defaultFormatter}
                            />
                            <Tooltip
                                content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
                                cursor={{ fill: 'var(--primary-light)', radius: 4 }}
                            />
                            <Bar
                                dataKey="value"
                                radius={[6, 6, 0, 0]}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.fill || 'url(#barGradientCustom)'}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'opacity 200ms ease'
                                        }}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default CustomBarChart;

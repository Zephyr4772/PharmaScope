import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { MoreHorizontal } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, valueLabel = 'Count' }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
                <p style={{
                    margin: 0,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    marginBottom: '6px'
                }}>
                    {label}
                </p>
                {payload.map((item, idx) => (
                    <p key={idx} style={{
                        margin: '2px 0',
                        color: item.color,
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        {valueLabel}: {item.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomAreaChart = ({ data, title, subtitle, valueLabel = 'Count', showSecondLine = false }) => {
    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-title-section">
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
                <div className="chart-actions">
                    <button className="chart-menu-btn">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
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
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
                        {showSecondLine && (
                            <Area
                                type="monotone"
                                dataKey="value2"
                                stroke="#60A5FA"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorSecondary)"
                                name="value2"
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorPrimary)"
                            name="value"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CustomAreaChart;

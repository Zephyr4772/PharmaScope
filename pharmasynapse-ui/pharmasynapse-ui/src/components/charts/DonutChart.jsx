import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';

const CustomDonutChart = ({ data, title, centerValue, centerLabel }) => {
    // Safety check for valid data
    const hasValidData = data && Array.isArray(data) && data.length > 0 && data.some(d => d.value > 0);

    // Calculate total if centerValue not provided
    const total = centerValue || (hasValidData ? data.reduce((acc, curr) => acc + curr.value, 0).toLocaleString() : 0);

    // Determine font size based on value length
    const getFontSize = (val) => {
        const len = String(val).length;
        if (len > 6) return '20px';
        if (len > 4) return '24px';
        return '28px';
    };

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div className="chart-title-section">
                    <div className="chart-title">{title}</div>
                </div>
                <button className="chart-menu-btn">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            <div style={{ position: 'relative', height: '200px', width: '100%' }}>
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
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.fill}
                                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Text - Fixed sizing */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '90px',
                            height: '90px',
                        }}>
                            <div style={{
                                fontSize: getFontSize(total),
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                lineHeight: 1.1,
                                transition: 'color 200ms ease'
                            }}>
                                {total}
                            </div>
                            {centerLabel && (
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px',
                                    transition: 'color 200ms ease'
                                }}>
                                    {centerLabel}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Legend */}
            {hasValidData && (
                <div className="chart-legend">
                    {data.map((item, index) => (
                        <div key={index} className="legend-item">
                            <div className="legend-dot" style={{ backgroundColor: item.fill }} />
                            <span className="legend-text">{item.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDonutChart;

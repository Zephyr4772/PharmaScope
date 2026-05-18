import React from 'react';
import { MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';

const DataTable = ({ title, subtitle, columns, data, showSeeAll = true, showActions = false }) => {
    return (
        <div className="table-card">
            <div className="table-header">
                <div className="table-title-section">
                    <div className="table-title">{title}</div>
                    {subtitle && <div className="table-subtitle">{subtitle}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {showSeeAll && (
                        <a href="#" className="table-action">See All</a>
                    )}
                    <button className="chart-menu-btn">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx}>{col.header}</th>
                        ))}
                        {showActions && <th style={{ width: '100px' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className={col.className || ''}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                            {showActions && (
                                <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            className="action-btn"
                                            title="View"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                background: 'transparent',
                                                borderRadius: '6px',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                transition: 'all 150ms ease'
                                            }}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            title="Edit"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                background: 'transparent',
                                                borderRadius: '6px',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                transition: 'all 150ms ease'
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;

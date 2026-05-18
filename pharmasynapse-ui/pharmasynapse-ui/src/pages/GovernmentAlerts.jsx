import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import DonutChart from '../components/charts/DonutChart';
import { drugAPI } from '../api/drugService';
import { Loader2, AlertTriangle, PackageX } from 'lucide-react';

const GovernmentAlerts = () => {
    const [flaggedDrugs, setFlaggedDrugs] = useState([]);
    const [shortageDrugs, setShortageDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('flagged');

    useEffect(() => {
        const fetchAlerts = async () => {
            setLoading(true);
            try {
                const [flagged, shortage] = await Promise.all([
                    drugAPI.getFlaggedDrugs(),
                    drugAPI.getShortageDrugs()
                ]);

                setFlaggedDrugs(flagged.map((drug, idx) => ({
                    id: `A${String(idx + 1).padStart(3, '0')}`,
                    drugName: drug.product_name,
                    manufacturer: drug.manufacturer,
                    batchNo: drug.suspicious?.[0]?.['Batch No.'] || 'N/A',
                    reason: drug.suspicious?.[0]?.['Reason for failure'] || 'Under investigation',
                    authority: 'CDSCO',
                    type: 'flagged'
                })));

                setShortageDrugs(shortage.map((drug, idx) => ({
                    id: `S${String(idx + 1).padStart(3, '0')}`,
                    drugName: drug.shortages?.[0]?.['Generic Name'] || drug.product_name,
                    manufacturer: drug.shortages?.[0]?.['Company Name'] || drug.manufacturer,
                    status: drug.shortages?.[0]?.Status || 'Unknown',
                    reason: drug.shortages?.[0]?.['Reason for Shortage'] || 'Supply chain issue',
                    info: drug.shortages?.[0]?.['Related Information'] || null,
                    type: 'shortage'
                })));
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const statsCards = [
        { id: 1, label: 'Total Flagged', value: String(flaggedDrugs.length), icon: 'Flag', color: 'red' },
        { id: 2, label: 'Shortage Alerts', value: String(shortageDrugs.length), icon: 'Package', color: 'orange' },
        { id: 3, label: 'Critical', value: String(Math.ceil(flaggedDrugs.length * 0.3)), icon: 'AlertTriangle', color: 'purple' },
        { id: 4, label: 'Resolved Recently', value: '12', icon: 'Check', color: 'green' },
    ];

    const alertTypesData = [
        { name: 'Flagged', value: flaggedDrugs.length, fill: '#EF4444' },
        { name: 'Shortage', value: shortageDrugs.length, fill: '#F59E0B' },
        { name: 'Recall', value: 5, fill: '#8B5CF6' },
    ];

    const flaggedColumns = [
        { key: 'id', header: 'Alert ID', className: 'cell-id' },
        {
            key: 'drugName',
            header: 'Drug Name',
            render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
        },
        { key: 'batchNo', header: 'Batch No.' },
        { key: 'manufacturer', header: 'Manufacturer', className: 'cell-secondary' },
        {
            key: 'reason',
            header: 'Reason',
            render: (val) => (
                <span style={{
                    color: 'var(--danger)',
                    maxWidth: '200px',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {val}
                </span>
            )
        },
        {
            key: 'authority',
            header: 'Authority',
            render: () => <StatusBadge status="danger" label="CDSCO" />
        },
    ];

    const shortageColumns = [
        { key: 'id', header: 'Alert ID', className: 'cell-id' },
        {
            key: 'drugName',
            header: 'Drug Name',
            render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
        },
        { key: 'manufacturer', header: 'Company', className: 'cell-secondary' },
        {
            key: 'status',
            header: 'Status',
            render: (val) => (
                <StatusBadge
                    status={val === 'Resolved' ? 'available' : 'warning'}
                    label={val}
                />
            )
        },
        {
            key: 'reason',
            header: 'Reason',
            render: (val) => (
                <span style={{
                    color: 'var(--warning)',
                    maxWidth: '180px',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {val || 'Not specified'}
                </span>
            )
        },
        {
            key: 'info',
            header: 'Info',
            render: (val) => val ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{val}</span>
            ) : '-'
        },
    ];

    return (
        <Layout>
            {/* Warning Banner */}
            {flaggedDrugs.length > 0 && (
                <div style={{
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <AlertTriangle size={24} color="var(--danger)" />
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '15px' }}>
                            ⚠️ Government Alert: {flaggedDrugs.length} drugs have been flagged
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            These drugs have been flagged by regulatory authorities. Do not purchase or consume.
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="stats-row">
                {statsCards.map(stat => (
                    <StatCard key={stat.id} {...stat} />
                ))}
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '8px'
            }}>
                <button
                    onClick={() => setActiveTab('flagged')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        background: activeTab === 'flagged' ? 'var(--danger)' : 'transparent',
                        color: activeTab === 'flagged' ? 'white' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 150ms ease'
                    }}
                >
                    <AlertTriangle size={16} />
                    Flagged Drugs ({flaggedDrugs.length})
                </button>
                <button
                    onClick={() => setActiveTab('shortage')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        background: activeTab === 'shortage' ? 'var(--warning)' : 'transparent',
                        color: activeTab === 'shortage' ? 'white' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 150ms ease'
                    }}
                >
                    <PackageX size={16} />
                    Shortage Alerts ({shortageDrugs.length})
                </button>
            </div>

            {/* Content */}
            <div className="charts-row">
                <div className="table-card" style={{ gridColumn: 'span 2 / span 2' }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    ) : activeTab === 'flagged' ? (
                        flaggedDrugs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                <AlertTriangle size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <p style={{ fontSize: '16px' }}>✅ No government flags at this time</p>
                                <p style={{ fontSize: '13px' }}>All drugs are clear of regulatory alerts</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="table-title-section">
                                        <div className="table-title">Government Flagged Drugs</div>
                                        <div className="table-subtitle">Drugs flagged by CDSCO and other authorities</div>
                                    </div>
                                </div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {flaggedColumns.map((col, idx) => (
                                                <th key={idx}>{col.header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flaggedDrugs.map((row, rowIdx) => (
                                            <tr key={rowIdx}>
                                                {flaggedColumns.map((col, colIdx) => (
                                                    <td key={colIdx} className={col.className || ''}>
                                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )
                    ) : (
                        shortageDrugs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                <PackageX size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <p style={{ fontSize: '16px' }}>📦 No shortage alerts</p>
                                <p style={{ fontSize: '13px' }}>All drugs are in stock</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="table-title-section">
                                        <div className="table-title">Drug Shortage Alerts</div>
                                        <div className="table-subtitle">FDA and manufacturer reported shortages</div>
                                    </div>
                                </div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {shortageColumns.map((col, idx) => (
                                                <th key={idx}>{col.header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shortageDrugs.slice(0, 20).map((row, rowIdx) => (
                                            <tr key={rowIdx}>
                                                {shortageColumns.map((col, colIdx) => (
                                                    <td key={colIdx} className={col.className || ''}>
                                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* Chart */}
            <div style={{ marginTop: '24px', maxWidth: '400px' }}>
                <DonutChart
                    data={alertTypesData}
                    title="Alerts by Type"
                    centerValue={String(flaggedDrugs.length + shortageDrugs.length)}
                    centerLabel="Total Alerts"
                />
            </div>
        </Layout>
    );
};

export default GovernmentAlerts;

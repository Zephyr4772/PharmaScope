import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import { drugAPI } from '../api/drugService';
import { Loader2 } from 'lucide-react';

// Pre-defined categories based on common drug classifications
const predefinedCategories = [
    { id: 1, name: 'Pain Relief', type: 'Medicine', description: 'Analgesics and antipyretics for pain management' },
    { id: 2, name: 'Antibiotics', type: 'Medicine', description: 'Anti-infective medications' },
    { id: 3, name: 'Diabetes Care', type: 'Medicine', description: 'Insulin and oral hypoglycemics' },
    { id: 4, name: 'Cardiovascular', type: 'Medicine', description: 'Heart and blood pressure medications' },
    { id: 5, name: 'Digestive Health', type: 'Medicine', description: 'Antacids, PPIs, and GI medications' },
    { id: 6, name: 'Respiratory', type: 'Medicine', description: 'Bronchodilators and inhalers' },
    { id: 7, name: 'Vitamins & Supplements', type: 'Supplement', description: 'Nutritional supplements' },
    { id: 8, name: 'Skin Care', type: 'Topical', description: 'Dermatological preparations' },
    { id: 9, name: 'Eye Care', type: 'Ophthalmic', description: 'Eye drops and ointments' },
    { id: 10, name: 'Mental Health', type: 'Medicine', description: 'Antidepressants and anxiolytics' },
];

const tableColumns = [
    { key: 'id', header: 'ID', className: 'cell-id' },
    {
        key: 'name',
        header: 'Category Name',
        render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
    },
    { key: 'type', header: 'Type' },
    { key: 'items', header: 'Products', className: 'cell-highlight' },
    { key: 'description', header: 'Description', className: 'cell-secondary' },
];

const DrugCategories = () => {
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const statsData = await drugAPI.getDashboardStats();
                setStats(statsData);

                // For now, use predefined categories with estimated item counts
                // In a real app, this would come from the API
                const categoriesWithCounts = predefinedCategories.map(cat => ({
                    ...cat,
                    items: Math.floor(Math.random() * 500) + 100 // Random count for demo
                }));

                setCategories(categoriesWithCounts);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const statsCards = [
        { id: 1, label: 'Total Categories', value: String(categories.length || 10), icon: 'Grid3X3', color: 'blue' },
        { id: 2, label: 'Active Types', value: '4', icon: 'Layers', color: 'green' },
        { id: 3, label: 'Total Products', value: stats?.totalDrugs.toLocaleString() || '---', icon: 'Package', color: 'orange' },
        { id: 4, label: 'Empty Categories', value: '0', icon: 'FolderX', color: 'purple' },
    ];

    return (
        <Layout>
            {/* Stats Row */}
            <div className="stats-row">
                {statsCards.map(stat => (
                    <StatCard key={stat.id} {...stat} />
                ))}
            </div>

            {/* Categories Table */}
            {loading ? (
                <div className="table-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : (
                <DataTable
                    title="Drug Categories"
                    subtitle="Manage and organize drug categories"
                    columns={tableColumns}
                    data={categories}
                    showActions={true}
                />
            )}
        </Layout>
    );
};

export default DrugCategories;

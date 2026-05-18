import React from 'react';
import {
    Pill,
    AlertTriangle,
    Percent,
    Package,
    Grid3X3,
    Layers,
    FolderX,
    AlertCircle,
    XCircle,
    ArrowLeftRight,
    TrendingUp,
    Wallet,
    Search,
    Flag,
    Building2,
    FileText,
    HelpCircle
} from 'lucide-react';

// Icon mapping
const iconMap = {
    Pill,
    AlertTriangle,
    Percent,
    Package,
    Grid3X3,
    Layers,
    FolderX,
    AlertCircle,
    XCircle,
    ArrowLeftRight,
    TrendingUp,
    Wallet,
    Search,
    Flag,
    Building2,
    FileText,
    HelpCircle
};

const StatCard = ({ label, value, icon, color = 'blue' }) => {
    const IconComponent = iconMap[icon] || Pill;

    return (
        <div className="stat-card">
            <div className={`stat-icon ${color}`}>
                <IconComponent size={24} />
            </div>
            <div className="stat-content">
                <span className="stat-label">{label}</span>
                <span className="stat-value">{value}</span>
            </div>
        </div>
    );
};

export default StatCard;

import React from 'react';
import { Check, AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';

const statusConfig = {
    available: { label: 'Available', icon: Check, className: 'available' },
    safe: { label: 'Safe', icon: Check, className: 'safe' },
    lowStock: { label: 'Low Stock', icon: AlertTriangle, className: 'lowStock' },
    warning: { label: 'Warning', icon: AlertTriangle, className: 'warning' },
    flagged: { label: 'Flagged', icon: XCircle, className: 'flagged' },
    danger: { label: 'Danger', icon: XCircle, className: 'danger' },
    outOfStock: { label: 'Out of Stock', icon: AlertCircle, className: 'danger' },
    info: { label: 'Info', icon: Info, className: 'info' },
    purple: { label: 'Review', icon: AlertCircle, className: 'purple' },
};

const StatusBadge = ({ status, label }) => {
    const config = statusConfig[status] || statusConfig.info;
    const IconComponent = config.icon;
    const displayLabel = label || config.label;

    return (
        <span className={`status-badge ${config.className}`}>
            <IconComponent size={12} />
            {displayLabel}
        </span>
    );
};

export default StatusBadge;

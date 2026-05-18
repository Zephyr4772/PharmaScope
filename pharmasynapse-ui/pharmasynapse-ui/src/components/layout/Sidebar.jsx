import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard,
    Grid3X3,
    Package,
    ArrowLeftRight,
    AlertTriangle,
    PackageX,
    Building2,
    Moon,
    Settings,
    HelpCircle,
    Pill,
    Users,
    User,
    Heart,
    BarChart3
} from 'lucide-react';

const menuSections = [
    {
        label: 'MENU',
        items: [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/products', icon: Package, label: 'Products' },
            { path: '/visualizer', icon: BarChart3, label: 'Visualizer' },
            { path: '/saved', icon: Heart, label: 'Saved Drugs' },
        ]
    }
];

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Pill size={18} />
                </div>
                <span className="sidebar-logo-text">PharmaSynapse</span>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuSections.map((section, idx) => (
                    <div key={idx} className="sidebar-section">
                        <div className="sidebar-section-label">{section.label}</div>
                        <div className="sidebar-menu">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen && setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `sidebar-link ${isActive ? 'active' : ''}`
                                    }
                                >
                                    <span className="icon">
                                        <item.icon size={18} />
                                    </span>
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <span className="sidebar-badge">{item.badge}</span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Preferences */}
            <div className="sidebar-footer">
                <div className="sidebar-section-label">PREFERENCES</div>
                <div className="sidebar-menu">
                    <button
                        className="sidebar-link"
                        onClick={toggleDarkMode}
                    >
                        <span className="icon">
                            <Moon size={18} />
                        </span>
                        <span>Dark Mode</span>
                        <div className={`sidebar-toggle ${darkMode ? 'active' : ''}`} />
                    </button>
                    <button className="sidebar-link">
                        <span className="icon">
                            <Settings size={18} />
                        </span>
                        <span>Settings</span>
                    </button>
                    <NavLink
                        to="/help"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="icon">
                            <HelpCircle size={18} />
                        </span>
                        <span>Help</span>
                    </NavLink>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

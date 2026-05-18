import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Code2, X, Menu } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

const Header = ({ darkMode, toggleMobileMenu }) => {
    const { searchQuery, setSearchQuery, clearSearch, isSearching } = useSearch();
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            setSearchQuery(inputValue.trim());
        } else if (e.key === 'Escape') {
            setInputValue('');
            clearSearch();
        }
    };

    const handleClear = () => {
        setInputValue('');
        clearSearch();
    };

    return (
        <header className="header">
            {/* Mobile Menu Toggle */}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                <Menu size={20} />
            </button>
            
            {/* Left - Welcome Text */}
            <div className="header-left">
                <span className="header-welcome">Welcome,</span>
                <span className="header-role">User</span>
            </div>

            {/* Center Search */}
            <div className="header-center">
                <div className="header-search" style={{ position: 'relative' }}>
                    <span className="header-search-icon">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        className="header-search-input"
                        placeholder="Search drugs... (Press Enter to search)"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ paddingRight: searchQuery ? '36px' : '12px' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClear}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#94A3B8'
                            }}
                            title="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Right Section */}
            <div className="header-right">
                <div style={{ position: 'relative' }}>
                    <button className="header-icon-btn" title="No new alerts">
                        <Bell size={20} />
                        {/* Only show dot if there are actual notifications. For now, we assume none. */}
                        {/* <span className="notification-dot" /> */}
                    </button>
                </div>

                <div className="user-profile">
                    <div className="user-avatar" style={{ background: 'var(--primary)' }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>PL</span>
                    </div>
                    <span className="user-name">PharmaLens Team</span>
                    <ChevronDown size={16} className="chevron-icon" />
                </div>
            </div>
        </header>
    );
};

export default Header;


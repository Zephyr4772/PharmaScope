import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="mobile-overlay" 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
            
            <div className="main-wrapper">
                <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;


/**
 * PharmaSynapse Design Tokens
 * Extracted from Farmaku Reference Design
 */

export const colors = {
    // Sidebar Colors
    sidebar: {
        bg: '#2C3E50',
        bgDark: '#243342',
        text: 'rgba(255, 255, 255, 0.65)',
        textHover: 'rgba(255, 255, 255, 0.9)',
        textActive: '#FFFFFF',
        hoverBg: 'rgba(255, 255, 255, 0.08)',
        activeBg: '#4F63D2',
        sectionLabel: 'rgba(255, 255, 255, 0.45)',
        border: 'rgba(255, 255, 255, 0.08)',
    },

    // Main Content Colors
    content: {
        bg: '#F7F9FC',
        cardBg: '#FFFFFF',
        border: '#E8ECF1',
        borderSubtle: '#F3F4F6',
    },

    // Primary Accent
    primary: {
        DEFAULT: '#4F63D2',
        hover: '#4355B8',
        light: 'rgba(79, 99, 210, 0.1)',
        dark: '#3A4BB0',
    },

    // Status Colors
    status: {
        success: '#22C55E',
        successLight: 'rgba(34, 197, 94, 0.1)',
        warning: '#F59E0B',
        warningLight: 'rgba(245, 158, 11, 0.1)',
        danger: '#EF4444',
        dangerLight: 'rgba(239, 68, 68, 0.1)',
        info: '#3B82F6',
        infoLight: 'rgba(59, 130, 246, 0.1)',
    },

    // Text Colors
    text: {
        primary: '#1E293B',
        secondary: '#64748B',
        muted: '#94A3B8',
        white: '#FFFFFF',
    },

    // Stats Card Icon Gradients
    statsIcons: {
        pink: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
        red: 'linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)',
        green: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
        orange: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
        blue: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
        purple: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
        teal: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
        amber: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
    },

    // Chart Colors
    charts: {
        primary: '#4F63D2',
        secondary: '#60A5FA',
        tertiary: '#A78BFA',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
    },
};

export const typography = {
    fontFamily: {
        primary: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    fontSize: {
        xs: '11px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
        '6xl': '48px',
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.6,
    },
};

export const spacing = {
    sidebar: {
        width: '260px',
        logoHeight: '72px',
        itemHeight: '42px',
        itemPadding: '12px 16px',
        iconSize: '20px',
        iconGap: '12px',
        sectionPadding: '24px 0 8px 0',
    },
    header: {
        height: '68px',
        padding: '0 32px',
    },
    content: {
        padding: '28px 32px',
        gap: '24px',
        cardPadding: '24px',
    },
    table: {
        headerPadding: '14px 20px',
        cellPadding: '16px 20px',
        rowHeight: '60px',
    },
};

export const borderRadius = {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
};

export const shadows = {
    none: 'none',
    subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)',
    large: '0 10px 25px rgba(0, 0, 0, 0.08)',
    hero: '0 4px 20px rgba(0, 0, 0, 0.1)',
};

export const transitions = {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
};

export default {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    transitions,
};

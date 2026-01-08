import { StyleSheet } from 'react-native';

export const LightColors = {
    // Brand
    primary: '#03396c',
    primaryLight: '#2c5d8f',
    secondary: '#005b96',
    accent: '#f59e0b',

    // Backgrounds
    background: '#f2f2f7',
    surface: '#ffffff',

    // Text
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textLight: '#94a3b8',
    white: '#ffffff',

    // Status
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',

    // UI
    border: '#e2e8f0',
    inputBg: '#f8fafc',
    shadow: '#000000',
};

export const DarkColors = {
    // Brand
    primary: '#0f172a', // Darker Header
    primaryLight: '#1e293b',
    secondary: '#3b82f6', // Brighter Blue for Dark Mode
    accent: '#fbbf24',

    // Backgrounds
    background: '#020617', // Very Dark Blue/Black
    surface: '#1e293b',    // Card Background

    // Text
    textPrimary: '#f8fafc', // White text
    textSecondary: '#94a3b8',
    textLight: '#64748b',
    white: '#ffffff',

    // Status
    success: '#34d399',
    error: '#f87171',
    warning: '#fbbf24',

    // UI
    border: '#334155',
    inputBg: '#334155', // Dark Input
    shadow: '#000000',
};

// Default export for backward compat (will point to Light)
export const Colors = LightColors;

export const GlobalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LightColors.background,
    },
    // ... rest of styles allow static usage but won't auto-update. 
    // Components should prefer using dynamic styles from Context.
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    button: {
        backgroundColor: LightColors.secondary,
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    buttonText: {
        color: LightColors.white,
        fontSize: 16,
        fontWeight: 'bold',
    }
});

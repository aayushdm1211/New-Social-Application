import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '../styles/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' or 'dark'
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const stored = await AsyncStorage.getItem('appTheme');
            if (stored) {
                setIsDark(stored === 'dark');
            } else {
                // Default to system, or light for now
                setIsDark(systemScheme === 'dark');
            }
        } catch (e) {
            console.log("Theme load error", e);
        } finally {
            setLoaded(true);
        }
    };

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await AsyncStorage.setItem('appTheme', newMode ? 'dark' : 'light');
        } catch (e) {
            console.log("Theme save error", e);
        }
    };

    const colors = isDark ? DarkColors : LightColors;

    if (!loaded) return null; // Or splash screen

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

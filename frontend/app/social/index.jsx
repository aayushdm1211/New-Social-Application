import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlobalStyles } from '../../src/styles/theme';
import { useTheme } from '../../src/context/ThemeContext';

export default function SocialScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const theme = colors || Colors;
    const styles = getStyles(theme);

    return (
        <View style={GlobalStyles.containerCenter}>
            <View style={styles.iconCircle}>
                <Ionicons name="share-social" size={60} color={theme.secondary} />
            </View>
            <Text style={styles.text}>Social Media</Text>
            <Text style={styles.subText}>Connect with your network shortly.</Text>
        </View>
    );
}

function getStyles(theme) {
    return StyleSheet.create({
        iconCircle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: theme.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            elevation: 10,
            shadowColor: theme.shadow,
            shadowOpacity: 0.1,
            shadowRadius: 10
        },
        text: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, textAlign: 'center' },
        subText: { fontSize: 16, color: theme.textSecondary, marginTop: 10 }
    });
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SocialScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Ionicons name="share-social-outline" size={80} color="#005b96" />
            <Text style={styles.text}>Social Media Integration Coming Soon!</Text>
            <Text style={styles.subText}>Stay tuned for updates.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
    text: { fontSize: 24, fontWeight: 'bold', color: '#011f4b', marginTop: 20, textAlign: 'center' },
    subText: { fontSize: 16, color: 'gray', marginTop: 10 }
});

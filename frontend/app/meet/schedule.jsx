import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../src/services/apiService';
import { Colors, GlobalStyles } from '../../src/styles/theme';
import { useTheme } from '../../src/context/ThemeContext';

export default function ScheduleMeetingScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const theme = colors || Colors;
    const styles = getStyles(theme);

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [mode, setMode] = useState('date'); // 'date' or 'time'

    const onChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowPicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const showMode = (currentMode) => {
        setShowPicker(true);
        setMode(currentMode);
    };

    const handleSchedule = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Please enter a meeting title");
            return;
        }

        try {
            const userId = await AsyncStorage.getItem('userId');
            const res = await fetch(`${API_BASE}/meet/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    scheduledTime: date.toISOString(),
                    hostId: userId
                })
            });

            const data = await res.json();
            if (res.ok) {
                Alert.alert("Success", `Meeting scheduled! Code: ${data.meeting.code}`, [
                    { text: "OK", onPress: () => router.back() }
                ]);
            } else {
                Alert.alert("Error", data.error || "Failed to schedule");
            }
        } catch (err) {
            Alert.alert("Error", "Failed to connect to server");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Meeting</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Meeting Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Weekly Sync"
                    placeholderTextColor={theme.textLight}
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Date & Time</Text>
                <View style={styles.dateTimeContainer}>
                    <TouchableOpacity onPress={() => showMode('date')} style={styles.dateBtn}>
                        <Ionicons name="calendar-outline" size={20} color={theme.secondary} />
                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => showMode('time')} style={styles.dateBtn}>
                        <Ionicons name="time-outline" size={20} color={theme.secondary} />
                        <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                </View>

                {showPicker && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode={mode}
                        is24Hour={true}
                        display="default"
                        onChange={onChange}
                        themeVariant={theme === Colors ? 'light' : 'dark'}
                    />
                )}

                <TouchableOpacity style={styles.scheduleBtn} onPress={handleSchedule}>
                    <Text style={styles.btnText}>Schedule Meeting</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function getStyles(theme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: {
            backgroundColor: theme.primary,
            padding: 20,
            paddingTop: 50,
            flexDirection: 'row',
            alignItems: 'center'
        },
        headerTitle: { color: theme.white, fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
        form: { padding: 20 },
        label: { fontSize: 16, color: theme.textPrimary, marginBottom: 8, fontWeight: '600' },
        input: {
            backgroundColor: theme.inputBg,
            padding: 15,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
            fontSize: 16,
            color: theme.textPrimary
        },
        dateTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
        dateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.inputBg,
            padding: 15,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            width: '48%',
            justifyContent: 'center'
        },
        dateText: { marginLeft: 8, color: theme.textPrimary, fontSize: 15 },
        scheduleBtn: {
            backgroundColor: theme.secondary,
            padding: 18,
            borderRadius: 10,
            alignItems: 'center',
            elevation: 3
        },
        btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
    });
}

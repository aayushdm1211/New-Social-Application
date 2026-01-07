import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../src/services/apiService';

export default function ScheduleMeetingScreen() {
    const router = useRouter();
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
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Meeting</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Meeting Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Weekly Sync"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Date & Time</Text>
                <View style={styles.dateTimeContainer}>
                    <TouchableOpacity onPress={() => showMode('date')} style={styles.dateBtn}>
                        <Ionicons name="calendar-outline" size={20} color="#005b96" />
                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => showMode('time')} style={styles.dateBtn}>
                        <Ionicons name="time-outline" size={20} color="#005b96" />
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
                    />
                )}

                <TouchableOpacity style={styles.scheduleBtn} onPress={handleSchedule}>
                    <Text style={styles.btnText}>Schedule Meeting</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        backgroundColor: '#011f4b',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
    form: { padding: 20 },
    label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 20,
        fontSize: 16
    },
    dateTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        width: '48%',
        justifyContent: 'center'
    },
    dateText: { marginLeft: 8, color: '#333', fontSize: 15 },
    scheduleBtn: {
        backgroundColor: '#005b96',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3
    },
    btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});

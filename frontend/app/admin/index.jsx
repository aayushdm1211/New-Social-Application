import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, StyleSheet, Animated, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../src/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState([]);

    // Scroll Indicator State

    // Scroll Indicator State
    const scrollX = useRef(new Animated.Value(0)).current;
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    // Meeting State
    const [meetModalVisible, setMeetModalVisible] = useState(false);
    const [meetTab, setMeetTab] = useState('instant'); // 'instant' | 'schedule'
    const [meetTitle, setMeetTitle] = useState('');
    const [meetDate, setMeetDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [mode, setMode] = useState('date');
    const [createdCode, setCreatedCode] = useState(null);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    const handleLogout = async () => {
        await AsyncStorage.clear();
        router.replace('/(auth)/login');
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchUsers();
        }, [])
    );

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        }
    };



    const createInstantMeet = async () => {
        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/meet`, { method: 'POST' });
            const data = await res.json();
            setCreatedCode(data.roomCode);
            setSuccessModalVisible(true);
            setMeetModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to create meet');
        }
    };

    const scheduleMeet = async () => {
        if (!meetTitle.trim()) {
            Alert.alert("Error", "Please enter a meeting title");
            return;
        }

        try {
            const userId = await AsyncStorage.getItem('userId');
            const res = await fetch(`${API_BASE}/meet/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: meetTitle,
                    scheduledTime: meetDate.toISOString(),
                    hostId: userId
                })
            });

            const data = await res.json();
            if (res.ok) {
                setCreatedCode(data.meeting.code);
                setSuccessModalVisible(true);
                setMeetModalVisible(false);
                setMeetTitle('');
                setMeetDate(new Date());
            } else {
                Alert.alert("Error", data.error || "Failed to schedule");
            }
        } catch (err) {
            Alert.alert("Error", "Failed to connect to server");
        }
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(createdCode);
        Alert.alert('Copied', 'Meeting code copied to clipboard!');
    };

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || meetDate;
        setShowPicker(Platform.OS === 'ios');
        setMeetDate(currentDate);
    };

    const showMode = (currentMode) => {
        setShowPicker(true);
        setMode(currentMode);
    };

    // Calculate scroll indicator size and position
    const indicatorSize = containerWidth > 0 && contentWidth > 0
        ? (containerWidth / contentWidth) * 30 // Scale down the width, max 30ish
        : 10;

    const indicatorTranslateX = scrollX.interpolate({
        inputRange: [0, Math.max(contentWidth - containerWidth, 1)],
        outputRange: [0, 30], // Move within a small track
        extrapolate: 'clamp'
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Admin Dashboard</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Actions Grid */}
                <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalScroll}
                        contentContainerStyle={styles.horizontalContent}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                        scrollEventThrottle={16}
                        onContentSizeChange={(w) => setContentWidth(w)}
                        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                    >
                        <TouchableOpacity style={styles.card} onPress={() => router.push('/announcement')}>
                            <Ionicons name="megaphone-outline" size={32} color="#005b96" />
                            <Text style={styles.cardText}>Announcements</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.card} onPress={() => setMeetModalVisible(true)}>
                            <Ionicons name="videocam-outline" size={32} color="#005b96" />
                            <Text style={styles.cardText}>Manage Meetings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.card} onPress={() => router.push('/gd')}>
                            <Ionicons name="people-outline" size={32} color="#005b96" />
                            <Text style={styles.cardText}>Group Discussion</Text>
                        </TouchableOpacity>
                    </ScrollView>
                    {/* Custom Scroll Indicator */}
                    <View style={styles.scrollTrack}>
                        <Animated.View
                            style={[
                                styles.scrollIndicator,
                                {
                                    width: indicatorSize + 20, // Make it a bit wider pill
                                    transform: [{ translateX: indicatorTranslateX }]
                                }
                            ]}
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>User Chats</Text>
                <FlatList
                    data={users}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => router.push(`/chat/${item._id}`)} style={styles.userItem}>
                            <View style={styles.avatar}><Text style={{ color: 'white' }}>{item.name[0]}</Text></View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.userName}>{item.name}</Text>
                                    {item.lastMessage && (
                                        <Text style={{ fontSize: 10, color: '#999' }}>
                                            {new Date(item.lastMessage.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(item.lastMessage.createdAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.userEmail}>{item.email}</Text>
                                    {item.unreadCount > 0 && (
                                        <View style={{ backgroundColor: '#25D366', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' }}>
                                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{item.unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                />
            </ScrollView>


            {/* Meeting Management Modal */}
            <Modal animationType="slide" transparent={true} visible={meetModalVisible} onRequestClose={() => setMeetModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Manage Meetings</Text>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity style={[styles.tab, meetTab === 'instant' && styles.activeTab]} onPress={() => setMeetTab('instant')}>
                                <Text style={[styles.tabText, meetTab === 'instant' && styles.activeTabText]}>Instant</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tab, meetTab === 'schedule' && styles.activeTab]} onPress={() => setMeetTab('schedule')}>
                                <Text style={[styles.tabText, meetTab === 'schedule' && styles.activeTabText]}>Schedule</Text>
                            </TouchableOpacity>
                        </View>

                        {meetTab === 'instant' ? (
                            <View style={styles.tabContent}>
                                <Text style={styles.infoText}>Create a meeting instantly and share the code.</Text>
                                <TouchableOpacity style={styles.fullWidthBtn} onPress={createInstantMeet}>
                                    <Ionicons name="flash-outline" size={20} color="white" style={{ marginRight: 10 }} />
                                    <Text style={styles.btnText}>Start Instant Meeting</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.tabContent}>
                                <TextInput
                                    placeholder="Meeting Title"
                                    style={styles.input}
                                    value={meetTitle}
                                    onChangeText={setMeetTitle}
                                />

                                <View style={styles.dateTimeRow}>
                                    <TouchableOpacity onPress={() => showMode('date')} style={styles.dateBtn}>
                                        <Ionicons name="calendar-outline" size={20} color="#005b96" />
                                        <Text style={styles.dateText}>{meetDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => showMode('time')} style={styles.dateBtn}>
                                        <Ionicons name="time-outline" size={20} color="#005b96" />
                                        <Text style={styles.dateText}>{meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                </View>

                                {showPicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={meetDate}
                                        mode={mode}
                                        is24Hour={true}
                                        display="default"
                                        onChange={onChangeDate}
                                    />
                                )}

                                <TouchableOpacity style={styles.fullWidthBtn} onPress={scheduleMeet}>
                                    <Text style={styles.btnText}>Schedule Meeting</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setMeetModalVisible(false)}>
                            <Text style={{ color: '#666' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Success Modal */}
            <Modal animationType="fade" transparent={true} visible={successModalVisible} onRequestClose={() => setSuccessModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.successView}>
                        <Ionicons name="checkmark-circle" size={60} color="green" />
                        <Text style={styles.successTitle}>Meeting Created!</Text>

                        <View style={styles.codeBox}>
                            <Text style={styles.codeTextDisplay}>{createdCode}</Text>
                            <TouchableOpacity onPress={copyToClipboard} style={{ padding: 10 }}>
                                <Ionicons name="copy-outline" size={24} color="#005b96" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#666' }]} onPress={() => setSuccessModalVisible(false)}>
                                <Text style={styles.btnText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                setSuccessModalVisible(false);
                                router.push(`/meet/${createdCode}`);
                            }}>
                                <Text style={styles.btnText}>Join Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: {
        backgroundColor: '#011f4b',
        padding: 20,
        paddingTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    headerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    logoutBtn: { position: 'absolute', right: 20, top: 35 },
    horizontalScroll: { marginBottom: 5, flexGrow: 0 },
    horizontalContent: { paddingHorizontal: 5, paddingVertical: 10 },
    card: { width: 120, backgroundColor: 'white', padding: 10, borderRadius: 10, alignItems: 'center', marginRight: 15, elevation: 3, height: 90, justifyContent: 'center' },
    cardText: { marginTop: 5, fontSize: 11, fontWeight: 'bold', color: '#011f4b', textAlign: 'center' },
    scrollTrack: { height: 4, width: 60, backgroundColor: '#e1e8ed', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    scrollIndicator: { height: 4, backgroundColor: '#005b96', borderRadius: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    userItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center', elevation: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#005b96', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    userName: { fontWeight: 'bold', fontSize: 16 },
    userEmail: { color: '#666', fontSize: 12 },

    // Modal & Meeting Styles
    modalView: { margin: 20, marginTop: '30%', backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#011f4b' },
    tabContainer: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#005b96' },
    tabText: { fontSize: 16, color: '#999' },
    activeTabText: { color: '#005b96', fontWeight: 'bold' },
    tabContent: { marginBottom: 10 },
    infoText: { textAlign: 'center', color: '#666', marginBottom: 20 },
    fullWidthBtn: { backgroundColor: '#005b96', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16 },
    dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, width: '48%' },
    dateText: { marginLeft: 8, color: '#333' },
    closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },

    // Success Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    successView: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 10 },
    successTitle: { fontSize: 24, fontWeight: 'bold', marginVertical: 10, color: '#333' },
    codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 15, borderRadius: 10, marginVertical: 20, width: '100%', justifyContent: 'space-between' },
    codeTextDisplay: { fontSize: 28, fontWeight: 'bold', letterSpacing: 2, color: '#005b96' },
    modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#005b96', marginHorizontal: 5 }
});

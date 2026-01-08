import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlobalStyles } from '../../src/styles/theme'; // Assuming these paths are correct
import { useTheme } from '../../src/context/ThemeContext'; // Assuming this path is correct

const BACKEND_URL = "http://192.168.29.129:5000";

export default function GroupDiscussionScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const theme = colors || Colors; // Fallback to default Colors if context not ready
    const styles = getStyles(theme);

    const [isAdmin, setIsAdmin] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [timer, setTimer] = useState(0); // in seconds
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [durationInput, setDurationInput] = useState('10'); // Default 10 mins
    const [loading, setLoading] = useState(true);

    const socket = useRef(null);
    const timerRef = useRef(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                if (flatListRef.current) {
                    // Small delay to ensure layout is done
                    setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
                }
            }
        );
        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        checkUserRole();
        fetchStatus();
        fetchHistory();
        setupSocket();

        return () => {
            if (socket.current) socket.current.disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const checkUserRole = async () => {
        try {
            const storedUserId = await AsyncStorage.getItem("userId");
            setUserId(storedUserId);
            if (storedUserId) {
                // Fetch Admin ID to compare
                const res = await fetch(`${BACKEND_URL}/api/auth/admin-id`);
                const data = await res.json();
                if (data.adminId === storedUserId) {
                    setIsAdmin(true);
                }
            }
        } catch (e) {
            console.error("Role check error:", e);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/gd/status`);
            const data = await res.json();
            handleStatusUpdate(data);
            setLoading(false);
        } catch (e) {
            console.error("Fetch status error:", e);
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/gd/messages`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);
            }
        } catch (e) {
            console.error("Fetch history error:", e);
        }
    };

    const setupSocket = () => {
        socket.current = io(BACKEND_URL);

        socket.current.on('connect', () => {
            console.log("Connected to socket");
            socket.current.emit('joinGD');
        });

        socket.current.on('gdStatusUpdate', (status) => {
            handleStatusUpdate(status);
        });

        socket.current.on('receiveMessage', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });
    };

    const handleStatusUpdate = (status) => {
        setIsActive(status.isActive);
        if (status.isActive && status.endTime) {
            const end = new Date(status.endTime).getTime();
            const now = Date.now();
            const diff = Math.floor((end - now) / 1000);
            if (diff > 0) {
                setTimer(diff);
                startTimerCountdown(end);
            } else {
                setTimer(0);
                setIsActive(false); // expired
            }
        } else {
            setTimer(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const startTimerCountdown = (endTimeMs) => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((endTimeMs - now) / 1000);
            if (diff <= 0) {
                setTimer(0);
                setIsActive(false);
                clearInterval(timerRef.current);
            } else {
                setTimer(diff);
            }
        }, 1000);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleStartGD = async () => {
        if (!durationInput) return;
        try {
            await fetch(`${BACKEND_URL}/api/admin/gd/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true, durationMinutes: parseInt(durationInput) })
            });
        } catch (e) {
            Alert.alert("Error", "Failed to start GD");
        }
    };

    const handleStopGD = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/admin/gd/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false })
            });
        } catch (e) {
            Alert.alert("Error", "Failed to stop GD");
        }
    };

    const sendMessage = () => {
        if (!text.trim() || !userId) return;
        const msgData = {
            sender: userId,
            groupId: 'finance-gd',
            content: text,
            type: 'text'
        };
        socket.current.emit('sendMessage', msgData);
        // Optimistic UI update could be added here, but waiting for server echo (receiveMessage) is safer for group sync
        // For specific user experience, we can append it immediately if we want.
        // setMessages(prev => [...prev, { ...msgData, createdAt: new Date() }]); 
        setText('');
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={theme.secondary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 20 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerText}>Group Discussion</Text>
                {isAdmin && isActive && (
                    <TouchableOpacity onPress={handleStopGD} style={styles.btnStopHeader}>
                        <Text style={styles.btnEndText}>End</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.statusContainer}>
                {isActive ? (
                    <View style={styles.timerBox}>
                        <Ionicons name="time-outline" size={24} color="white" />
                        <Text style={styles.timerText}>Time Left: {formatTime(timer)}</Text>
                    </View>
                ) : (
                    <Text style={styles.closedText}>Discussion is Closed</Text>
                )}
            </View>

            {isAdmin && !isActive && (
                <View style={styles.adminPanel}>
                    <Text style={styles.adminTitle}>Admin Controls</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={styles.input}
                            value={durationInput}
                            onChangeText={setDurationInput}
                            keyboardType="numeric"
                            placeholder="Min"
                            placeholderTextColor={theme.textLight}
                        />
                        <TouchableOpacity style={styles.btnStart} onPress={handleStartGD}>
                            <Text style={styles.btnText}>Start Discussion</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                style={{ flex: 1 }}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => index.toString()}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => {
                        const senderId = item.sender?._id || item.sender;
                        const isMe = senderId === userId;

                        // Handle Admin Name
                        let senderName = item.sender?.name || 'User';
                        if (item.sender?.role === 'admin') {
                            senderName = 'Admin';
                        }

                        // Handle Avatar URL
                        let avatarUri = null;
                        if (item.sender?.profilePic) {
                            let picPath = item.sender.profilePic.replace(/\\/g, '/');
                            if (!picPath.startsWith('http')) {
                                if (picPath.startsWith('/')) picPath = picPath.substring(1);
                                avatarUri = `http://192.168.29.129:5000/${picPath}`;
                            } else {
                                avatarUri = picPath;
                            }
                        }

                        return (
                            <View style={[
                                styles.msgRow,
                                isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
                            ]}>
                                {!isMe && (
                                    <Avatar uri={avatarUri} name={senderName} styles={styles} />
                                )}
                                <View style={[
                                    styles.msgBubble,
                                    isMe ? styles.msgMe : styles.msgOther
                                ]}>
                                    {!isMe && (
                                        <Text style={[
                                            styles.senderName,
                                            item.sender?.role === 'admin' ? { color: '#d32f2f' } : {}
                                        ]}>
                                            {senderName}
                                        </Text>
                                    )}
                                    <Text style={isMe ? styles.msgTextMe : styles.msgTextOther}>{item.content}</Text>
                                    <Text style={[styles.msgTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textSecondary }]}>
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
                />

                {isActive ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.msgInput}
                            value={text}
                            onChangeText={setText}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.textLight}
                        />
                        <TouchableOpacity onPress={sendMessage}>
                            <Ionicons name="send" size={24} color={theme.secondary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.closedInputBox}>
                        <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>Discussion is closed.</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const Avatar = ({ uri, name, styles }) => {
    const [error, setError] = useState(false);

    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={styles.avatar}
                onError={() => setError(true)}
            />
        );
    }

    return (
        <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
        </View>
    );
};

function getStyles(theme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { backgroundColor: theme.primary, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        headerText: { color: theme.white, fontSize: 20, fontWeight: 'bold' },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        statusContainer: { padding: 10, alignItems: 'center', backgroundColor: theme.inputBg },
        timerBox: { flexDirection: 'row', backgroundColor: '#ef5350', padding: 10, borderRadius: 20, alignItems: 'center' }, // Keep hardcoded as per instruction
        timerText: { color: theme.white, fontWeight: 'bold', marginLeft: 5 },
        closedText: { color: theme.primary, fontWeight: 'bold' },
        adminPanel: { padding: 15, backgroundColor: theme.surface, margin: 10, borderRadius: 10, elevation: 3 },
        adminTitle: { fontWeight: 'bold', marginBottom: 10, color: theme.textPrimary },
        row: { flexDirection: 'row', alignItems: 'center' },
        input: { borderWidth: 1, borderColor: theme.border, borderRadius: 5, padding: 8, width: 60, marginRight: 10, textAlign: 'center', color: theme.textPrimary },
        btnStart: { backgroundColor: theme.secondary, padding: 10, borderRadius: 5, flex: 1, alignItems: 'center' },
        btnStop: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 5, width: '100%', alignItems: 'center' }, // Keep hardcoded as per instruction
        btnText: { color: theme.white, fontWeight: 'bold' },
        msgBubble: { padding: 10, borderRadius: 10, marginBottom: 10, maxWidth: '80%' },
        msgMe: { alignSelf: 'flex-end', backgroundColor: theme.secondary },
        msgOther: { alignSelf: 'flex-start', backgroundColor: theme.surface },
        msgTextMe: { color: theme.white },
        msgTextOther: { color: theme.textPrimary },
        inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: theme.surface, alignItems: 'center' },
        msgInput: { flex: 1, backgroundColor: theme.inputBg, borderRadius: 20, padding: 10, marginRight: 10, color: theme.textPrimary },
        btnStopHeader: { position: 'absolute', right: 20, backgroundColor: '#d32f2f', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20 }, // Keep hardcoded as per instruction
        btnEndText: { color: theme.white, fontWeight: 'bold', fontSize: 12 },
        msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
        avatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 8, backgroundColor: theme.inputBg },
        avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.secondary },
        avatarText: { color: theme.white, fontWeight: 'bold', fontSize: 14 },
        senderName: { fontSize: 10, color: '#e65100', fontWeight: 'bold', marginBottom: 2 }, // Keep hardcoded as per instruction
        msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
        closedInputBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: theme.inputBg, borderTopWidth: 1, borderTopColor: theme.border }
    });
}

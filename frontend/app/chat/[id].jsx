import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ImageBackground, StyleSheet, StatusBar, Keyboard, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = "http://192.168.29.129:5000";

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [myId, setMyId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const socket = useRef(null);

    const flatListRef = useRef(null);

    useEffect(() => {
        AsyncStorage.getItem("userId").then(setMyId);
    }, []);

    useEffect(() => {
        if (!myId || !id) return;
        fetch(`${BACKEND_URL}/api/auth/messages/${myId}/${id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMessages(data);
            })
            .catch(console.error);
    }, [myId, id]);

    useEffect(() => {
        if (!myId) return;
        socket.current = io(BACKEND_URL);

        socket.current.on('connect', () => {
            console.log("Connected to socket");
            socket.current.emit('join', myId);
        });

        socket.current.on('receiveMessage', (msg) => {
            if (msg.sender === id || msg.recipient === id) {
                setMessages((prev) => [...prev, msg]);
                // If I am the recipient and I am ON this screen, mark as read immediately
                if (msg.sender === id) {
                    socket.current.emit('markAsRead', { msgId: msg._id, userId: myId });
                }
            }
        });

        socket.current.on('messageStatusUpdate', ({ msgId, status }) => {
            setMessages(prev => prev.map(m =>
                m._id === msgId ? { ...m, status } : m
            ));
        });

        socket.current.on('messageDeleted', (msgId) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
        });

        return () => socket.current.disconnect();
    }, [myId, id]);

    // Mark existing unread messages as read when entering screen
    useEffect(() => {
        if (messages.length > 0 && myId) {
            messages.forEach(msg => {
                if (msg.sender === id && msg.recipient === myId && msg.status !== 'read') {
                    socket.current?.emit('markAsRead', { msgId: msg._id, userId: myId });
                }
            });
        }
    }, [messages.length, myId, id]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    const renderTicks = (item) => {
        if (item.sender !== myId && item.sender?._id !== myId) return null;

        const status = item.status || 'sent'; // default to sent
        let iconName = "checkmark";
        let color = "#BDC3C7"; // Grey

        if (status === 'delivered') {
            iconName = "checkmark-done"; // double check
        } else if (status === 'read') {
            iconName = "checkmark-done";
            color = "#34B7F1"; // Blue
        }

        return <Ionicons name={iconName} size={16} color={color} style={{ marginLeft: 5 }} />;
    };



    const sendMessage = () => {
        if (!text.trim() || !myId) return;
        const msgData = {
            sender: myId,
            recipient: id,
            content: text
        };
        socket.current.emit('sendMessage', msgData);
        setText('');
    };

    const handleLongPress = (item) => {
        const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
        if (senderId !== myId) return;

        Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        socket.current.emit('deleteMessage', { msgId: item._id, userId: myId });
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#075E54' }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />

            {/* Creative Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={45} color="#fff" />
                    <View style={styles.onlineDot} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Admin Support</Text>
                    <Text style={styles.headerStatus}>Always here to help</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                    <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>

            <ImageBackground
                source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
                style={{ flex: 1, backgroundColor: '#E5DDD5' }}
                resizeMode="repeat"
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                >
                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        ref={flatListRef}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        data={messages}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onLongPress={() => handleLongPress(item)}
                                activeOpacity={0.8}
                                style={[
                                    styles.msgBubble,
                                    (typeof item.sender === 'object' ? item.sender._id : item.sender) === myId ? styles.msgMe : styles.msgOther
                                ]}
                            >
                                <Text style={styles.msgText}>{item.content}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 }}>
                                    <Text style={styles.timeText}>
                                        {item.createdAt
                                            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        }
                                    </Text>
                                    {renderTicks(item)}
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingVertical: 10 }}
                    />
                    <View style={styles.inputContainer}>
                        <TextInput
                            value={text}
                            onChangeText={setText}
                            style={styles.input}
                            placeholder="Type a message"
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                            <Ionicons name="send" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#075E54', // WhatsApp Teal
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#003366',
        elevation: 4
    },
    backBtn: { marginRight: 15 },
    avatarContainer: { position: 'relative' },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4caf50',
        borderWidth: 2,
        borderColor: '#075E54'
    },
    headerInfo: { flex: 1, marginLeft: 10 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    headerStatus: { color: '#b0bec5', fontSize: 12 },
    callBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    msgBubble: {
        marginHorizontal: 15,
        marginVertical: 5,
        padding: 12,
        borderRadius: 15,
        maxWidth: '75%',
        elevation: 1
    },
    msgMe: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6', borderBottomRightRadius: 2 },
    msgOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2 },
    msgText: { fontSize: 16, color: '#333' },
    timeText: { fontSize: 10, color: '#333', alignSelf: 'flex-end', marginTop: 5, opacity: 0.7 },
    inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center' },
    input: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        elevation: 2,
        color: '#000'
    },
    sendBtn: {
        backgroundColor: '#075E54', // WhatsApp Teal
        padding: 12,
        borderRadius: 25,
        elevation: 2,
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

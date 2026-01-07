import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Button, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE } from '../../../src/services/apiService';

const BACKEND_URL = "http://192.168.29.129:5000";

const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
};

export default function GroupFeedScreen() {
    const { id: groupId } = useLocalSearchParams();
    const router = useRouter();
    const [announcements, setAnnouncements] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const socket = useRef(null);

    // Creation State
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [pollMode, setPollMode] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // Members Management State
    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);

    useEffect(() => {
        checkRole();
        fetchGroupAnnouncements();
        fetchGroupDetails();

        socket.current = io(BACKEND_URL);
        socket.current.on('newAnnouncement', (newPost) => {
            if (newPost.group === groupId) {
                setAnnouncements(prev => [newPost, ...prev]);
            }
        });
        socket.current.on('deleteAnnouncement', (id) => {
            setAnnouncements(prev => prev.filter(a => a._id !== id));
        });

        return () => {
            if (socket.current) socket.current.disconnect();
        };
    }, [groupId]);

    useEffect(() => {
        if (!modalVisible) {
            resetForm();
        }
    }, [modalVisible]);

    const resetForm = () => {
        setPollMode(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setTitle('');
        setContent('');
        setSelectedFile(null);
    };

    const checkRole = async () => {
        const role = await AsyncStorage.getItem('userRole');
        setIsAdmin(role === 'admin');
    };

    const fetchGroupAnnouncements = async () => {
        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group/${groupId}/announcements`);
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchGroupDetails = async () => {
        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group/list`); // Inefficient, better to have /group/:id info route, but existing list has populate
            if (res.ok) {
                const groups = await res.json();
                const group = groups.find(g => g._id === groupId);
                if (group) setGroupMembers(group.members.map(m => m._id));
            }
        } catch (err) { console.error(err); }
    };

    const fetchAllUsers = async () => {
        try {
            console.log("Fetching users for modal...");
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/users`);
            console.log("Fetch Users Status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetch Users Count:", data.length);
                console.log("Users Data Sample:", JSON.stringify(data.slice(0, 2))); // Log first 2
                setAllUsers(data);
            } else {
                console.log("Fetch Users Failed:", await res.text());
            }
        } catch (err) { console.error(err); }
    };

    const openMembersModal = () => {
        fetchAllUsers();
        setMembersModalVisible(true);
    };

    const toggleMember = (userId) => {
        if (groupMembers.includes(userId)) {
            setGroupMembers(prev => prev.filter(id => id !== userId));
        } else {
            setGroupMembers(prev => [...prev, userId]);
        }
    };

    const saveMembers = async () => {
        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group/${groupId}/members`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: groupMembers })
            });
            if (res.ok) {
                Alert.alert("Success", "Members updated");
                setMembersModalVisible(false);
            } else {
                Alert.alert("Error", "Failed to update members");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to update members");
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedFile({
                uri: result.assets[0].uri,
                name: result.assets[0].fileName || 'image.jpg',
                type: 'image/jpeg'
            });
        }
    };

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (result.assets && result.assets.length > 0) {
            setSelectedFile({
                uri: result.assets[0].uri,
                name: result.assets[0].name,
                type: result.assets[0].mimeType
            });
        }
    };

    const postAnnouncement = async () => {
        if (!title || !content) {
            Alert.alert('Error', 'Title and Content are required');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('groupId', groupId); // IMPORTANT: Link to group

        if (selectedFile) {
            formData.append('file', {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.type
            });
        }

        if (pollMode) {
            const validOptions = pollOptions.filter(o => o.trim().length > 0);
            if (!pollQuestion.trim() || validOptions.length < 2) {
                Alert.alert('Error', 'Poll must have a question and at least 2 options.');
                return;
            }
            const pollData = {
                question: pollQuestion,
                options: validOptions.map(text => ({ text, votes: 0 }))
            };
            formData.append('poll', JSON.stringify(pollData));
        }

        try {
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/announcement`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                Alert.alert('Success', 'Announcement Posted');
                setModalVisible(false);
            } else {
                const errData = await res.json();
                Alert.alert('Error', errData.error || 'Failed to post');
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to post');
        }
    };

    const [groupMenuVisible, setGroupMenuVisible] = useState(false);

    const deleteGroup = () => {
        console.log("Attempting delete, Group ID:", groupId);
        if (!groupId) {
            Alert.alert("Error", "Group ID missing");
            return;
        }

        Alert.alert(
            "Delete Group",
            "Are you sure? This will delete the group and ALL its announcements.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Sending DELETE request...");
                            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group/${groupId}`, {
                                method: 'DELETE'
                            });
                            console.log("Delete Status:", res.status);
                            if (res.ok) {
                                Alert.alert("Success", "Group Deleted");
                                router.back();
                            } else {
                                const txt = await res.text();
                                console.log("Delete Fail:", txt);
                                Alert.alert("Error", "Failed to delete: " + txt);
                            }
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Exception: " + e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Group Feed</Text>
                {isAdmin && (
                    <View style={{ marginLeft: 'auto', position: 'relative' }}>
                        <TouchableOpacity onPress={() => setGroupMenuVisible(!groupMenuVisible)}>
                            <Ionicons name="ellipsis-vertical" size={26} color="white" />
                        </TouchableOpacity>

                        {groupMenuVisible && (
                            <View style={styles.headerMenu}>
                                <TouchableOpacity
                                    style={styles.headerMenuItem}
                                    onPress={() => { setGroupMenuVisible(false); openMembersModal(); }}
                                >
                                    <Text style={styles.headerMenuText}>Manage Members</Text>
                                    <Ionicons name="people-outline" size={20} color="#333" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerMenuItem}
                                    onPress={() => { setGroupMenuVisible(false); deleteGroup(); }}
                                >
                                    <Text style={[styles.headerMenuText, { color: 'red' }]}>Delete Group</Text>
                                    <Ionicons name="trash-outline" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <FlatList
                data={announcements}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.cardContainer}
                        onPress={() => router.push(`/announcement/${item._id}`)}
                    >
                        <View style={styles.card}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FFD700' }]}>
                                <Ionicons name="megaphone" size={24} color="black" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.date}>{formatTime(item.createdAt)}</Text>
                                {/* Content and Poll hidden for cleaner list view */}
                            </View>
                            {isAdmin && (
                                <View style={{ position: 'relative' }}>
                                    <TouchableOpacity
                                        onPress={() => setActiveMenu(activeMenu === item._id ? null : item._id)}
                                        style={styles.moreBtn}
                                    >
                                        <Ionicons name="ellipsis-vertical" size={20} color="#555" />
                                    </TouchableOpacity>
                                    {activeMenu === item._id && (
                                        <View style={styles.menuPopup}>
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setActiveMenu(null);
                                                    handleDelete(item._id);
                                                }}
                                            >
                                                <Text style={styles.menuTextDelete}>Delete</Text>
                                                <Ionicons name="trash-outline" size={16} color="#d32f2f" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No announcements yet.</Text>}
            />

            {isAdmin && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}

            {/* Create Announcement Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Post to Group</Text>
                    <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
                    <TextInput placeholder="Content" multiline value={content} onChangeText={setContent} style={[styles.input, { height: 80 }]} />

                    <View style={styles.attachmentToolbar}>
                        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}><Ionicons name="image-outline" size={24} color="#005b96" /></TouchableOpacity>
                        <TouchableOpacity onPress={pickDocument} style={styles.attachBtn}><Ionicons name="document-attach-outline" size={24} color="#005b96" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => setPollMode(!pollMode)} style={styles.attachBtn}><Ionicons name="stats-chart-outline" size={24} color={pollMode ? "#ff9800" : "#005b96"} /></TouchableOpacity>
                        {selectedFile && <View style={styles.filePreview}><Text numberOfLines={1}>{selectedFile.name}</Text></View>}
                    </View>

                    {pollMode && (
                        <View style={styles.pollContainerCreate}>
                            <Text style={styles.pollLabel}>Create Poll</Text>
                            <TextInput placeholder="Question" style={styles.input} value={pollQuestion} onChangeText={setPollQuestion} />
                            {pollOptions.map((opt, index) => (
                                <View key={index} style={styles.optionRow}>
                                    <TextInput placeholder={`Option ${index + 1}`} style={[styles.input, { flex: 1, marginBottom: 5 }]} value={opt} onChangeText={(text) => {
                                        const newOpts = [...pollOptions];
                                        newOpts[index] = text;
                                        setPollOptions(newOpts);
                                    }} />
                                </View>
                            ))}
                            <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}><Text style={styles.addOptionText}>+ Option</Text></TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.modalButtons}>
                        <Button title="Cancel" onPress={() => setModalVisible(false)} color="#666" />
                        <Button title="Post" onPress={postAnnouncement} color="#005b96" />
                    </View>
                </View>
            </Modal>

            {/* Manage Members Modal */}
            <Modal animationType="slide" transparent={true} visible={membersModalVisible} onRequestClose={() => setMembersModalVisible(false)}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Manage Members</Text>
                    <View style={{ height: 300, width: '100%', marginBottom: 15 }}>
                        <FlatList
                            data={allUsers}
                            keyExtractor={item => item._id}
                            showsVerticalScrollIndicator={true}
                            renderItem={({ item: user }) => {
                                const isSelected = groupMembers.includes(user._id);
                                return (
                                    <TouchableOpacity onPress={() => toggleMember(user._id)} style={styles.memberRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.memberName}>{user.name}</Text>
                                            <Text style={styles.memberEmail}>{user.email}</Text>
                                        </View>
                                        <Ionicons
                                            name={isSelected ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={isSelected ? "#005b96" : "#dbdbdb"}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                    <View style={styles.modalButtons}>
                        <Button title="Cancel" onPress={() => setMembersModalVisible(false)} color="#666" />
                        <Button title="Save" onPress={saveMembers} color="#005b96" />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { backgroundColor: '#011f4b', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginLeft: 10 },
    listContent: { padding: 15, paddingBottom: 80 },
    cardContainer: { marginBottom: 10 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    textContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 10, color: '#999', marginBottom: 5 },
    content: { fontSize: 14, color: '#444' },
    pollContainer: { marginTop: 5, padding: 5, backgroundColor: '#f9f9f9', borderRadius: 5 },
    pollQuestion: { fontWeight: 'bold', fontSize: 12, color: '#005b96' },
    moreBtn: { padding: 5 },
    menuPopup: { position: 'absolute', right: 20, top: 10, backgroundColor: 'white', elevation: 5, borderRadius: 5, padding: 5, minWidth: 80, zIndex: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 },
    menuTextDelete: { color: '#d32f2f', fontSize: 12, fontWeight: 'bold', marginRight: 5 },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#005b96', justifyContent: 'center', alignItems: 'center', elevation: 5 },

    headerMenu: {
        position: 'absolute',
        top: 30,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 8,
        shadowColor: 'black',
        shadowOpacity: 0.2,
        shadowRadius: 5,
        minWidth: 160,
        paddingVertical: 5,
        zIndex: 100
    },
    headerMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee'
    },
    headerMenuText: { fontSize: 14, fontWeight: '500', color: '#333' },

    modalView: { margin: 20, marginTop: '20%', backgroundColor: 'white', borderRadius: 20, padding: 35, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
    attachmentToolbar: { flexDirection: 'row', marginBottom: 15 },
    attachBtn: { marginRight: 15 },
    filePreview: { flex: 1, justifyContent: 'center' },
    pollContainerCreate: { marginBottom: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5 },
    pollLabel: { fontWeight: 'bold', marginBottom: 5 },
    optionRow: { flexDirection: 'row', marginBottom: 5 },
    addOptionText: { color: '#005b96', fontWeight: 'bold', marginTop: 5 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    memberName: { fontSize: 16, fontWeight: '500', color: '#333' },
    memberEmail: { fontSize: 13, color: '#777', marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

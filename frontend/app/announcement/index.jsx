import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Button } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../src/services/apiService';

export default function AnnouncementGroupsScreen() {
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // Group Creation
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            checkRole();
            fetchGroups();
        }, [])
    );

    const checkRole = async () => {
        const role = await AsyncStorage.getItem('userRole');
        setIsAdmin(role === 'admin');
    };

    const fetchGroups = async () => {
        try {
            console.log("Fetching groups...");
            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group/list`);
            console.log("Fetch Groups Status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetched Groups:", data.length);
                setGroups(data);
            } else {
                console.log("Fetch Failed:", await res.text());
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    const createGroup = async () => {
        if (!name.trim()) return Alert.alert("Error", "Group name is required");
        try {
            console.log("Creating group:", name, description);
            console.log("URL:", `${API_BASE.replace('/auth', '/admin')}/group`);

            const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/group`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            console.log("Response status:", res.status);

            if (res.ok) {
                setModalVisible(false);
                setName('');
                setDescription('');
                fetchGroups();
                Alert.alert("Success", "Group created");
            } else {
                const text = await res.text();
                console.log("Response text:", text);
                Alert.alert("Error", "Failed: " + text);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Exception: " + e.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Announcement Groups</Text>
            </View>

            <FlatList
                data={groups}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.cardContainer}
                        onPress={() => router.push(`/announcement/group/${item._id}`)}
                    >
                        <View style={styles.card}>
                            <View style={[styles.iconContainer, { backgroundColor: '#4caf50' }]}>
                                <Ionicons name="people" size={24} color="white" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.name}</Text>
                                <Text style={styles.content}>{item.description || 'No description'}</Text>
                                <Text style={styles.date}>{item.members?.length || 0} members</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No groups found. Create one!</Text>}
            />

            {isAdmin && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>New Group</Text>
                    <TextInput placeholder="Group Name" value={name} onChangeText={setName} style={styles.input} />
                    <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />

                    <View style={styles.modalButtons}>
                        <Button title="Cancel" onPress={() => setModalVisible(false)} color="#666" />
                        <Button title="Create" onPress={createGroup} color="#005b96" />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: {
        backgroundColor: '#011f4b',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    listContent: { padding: 15 },
    cardContainer: { marginBottom: 15 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    textContainer: { flex: 1 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { fontSize: 14, color: '#666', marginTop: 2 },
    date: { fontSize: 12, color: '#999', marginTop: 4 },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#005b96',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    modalView: { margin: 20, marginTop: '50%', backgroundColor: 'white', borderRadius: 20, padding: 35, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontStyle: 'italic' }
});

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, Animated, Image, Easing, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE } from '../../src/services/apiService';

export default function CommunityScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [meetCode, setMeetCode] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const [counts, setCounts] = useState({ chat: 0, gd: 0, announcement: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, [])
  );

  const fetchCounts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const name = await AsyncStorage.getItem('userName');
      if (name) setUserName(name);

      const pic = await AsyncStorage.getItem('profilePic');
      if (pic) setProfilePic(pic);

      const lastReadGD = await AsyncStorage.getItem('lastReadGD');
      const lastReadAnnounce = await AsyncStorage.getItem('lastReadAnnounce');

      const query = new URLSearchParams({
        userId,
        lastReadGD: lastReadGD || '',
        lastReadAnnounce: lastReadAnnounce || ''
      }).toString();

      // Use custom fetch to bypass auth wrapper error handling if needed, or use authRequest if available
      // Need to make sure API_BASE is correct. API_BASE usually ends with /auth
      const res = await fetch(`${API_BASE}/counts?${query}`);
      if (res.ok) {
        const data = await res.json();
        setCounts(data);
      }
    } catch (e) {
      console.log("Error fetching counts", e);
    }
  };

  const toggleMenu = () => {
    if (showProfileMenu) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start(() => setShowProfileMenu(false));
    } else {
      setShowProfileMenu(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('image', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'profile.jpg',
      });

      // Construct server URL from API_BASE (remove /api/auth)
      const SERVER_URL = API_BASE.replace('/api/auth', '');

      const res = await fetch(`${API_BASE}/upload-avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setProfilePic(data.profilePic);
        await AsyncStorage.setItem('profilePic', data.profilePic);
        Alert.alert("Success", "Profile updated!");
        toggleMenu();
      } else {
        Alert.alert("Error", data.error || "Upload failed");
      }
    } catch (e) {
      Alert.alert("Error", "Upload failed");
    }
  };

  const handleJoinMeet = () => {
    if (!meetCode) {
      Alert.alert("Error", "Please enter a code");
      return;
    }
    setModalVisible(false);
    router.push(`/meet/${meetCode}`);
  };

  const goToChat = async () => {
    try {
      const res = await fetch(`http://192.168.29.129:5000/api/auth/admin-id`);
      const data = await res.json();
      if (data.adminId) {
        router.push(`/chat/${data.adminId}`);
      } else {
        Alert.alert("Error", "Admin not found");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Profile",
      `Logged in as ${userName || 'User'}\nDo you want to logout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const handlePressAnnouncement = async () => {
    await AsyncStorage.setItem('lastReadAnnounce', new Date().toISOString());
    router.push('/announcement');
  };

  const handlePressGD = async () => {
    await AsyncStorage.setItem('lastReadGD', new Date().toISOString());
    router.push('/gd');
  };

  const Badge = ({ count }) => {
    if (!count || count <= 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.headerText}>{userName || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={toggleMenu} style={styles.logoutBtn}>
          {profilePic ? (
            <Image source={{ uri: `http://192.168.29.129:5000${profilePic}` }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {showProfileMenu && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.menuBackdrop} />
        </TouchableWithoutFeedback>
      )}
      {showProfileMenu && (
        <Animated.View style={[styles.profileMenu, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
          <TouchableOpacity style={styles.menuItem} onPress={pickImage}>
            <Ionicons name="camera-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Change Profile</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={[styles.menuText, { color: '#dc3545' }]}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={handlePressAnnouncement}>
          <Ionicons name="megaphone-outline" size={40} color="#005b96" />
          <Text style={styles.cardText}>Announcements</Text>
          <Badge count={counts.announcement} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={goToChat}>
          <Ionicons name="chatbubbles-outline" size={40} color="#005b96" />
          <Text style={styles.cardText}>Chat with Admin</Text>
          <Badge count={counts.chat} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handlePressGD}>
          <Ionicons name="people-outline" size={40} color="#005b96" />
          <Text style={styles.cardText}>Group Discussion</Text>
          <Badge count={counts.gd} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/social')}>
          <Ionicons name="share-social-outline" size={40} color="#005b96" />
          <Text style={styles.cardText}>Social Media</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)}>
          <Ionicons name="videocam-outline" size={40} color="#005b96" />
          <Text style={styles.cardText}>Join Video Meet</Text>
        </TouchableOpacity>
      </View>



      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Video Meet</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Join a Meeting</Text>
            <View style={styles.joinContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter Code (e.g., ABC123)"
                value={meetCode}
                onChangeText={setMeetCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity onPress={handleJoinMeet} style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Upcoming Meetings</Text>



            <MeetingsList onSelect={(meeting) => {
              const meetDate = new Date(meeting.scheduledTime);
              const now = new Date();

              // Allow joining 10 minutes before
              const timeDiff = meetDate - now;
              const tenMinutes = 10 * 60 * 1000;

              if (timeDiff > tenMinutes) {
                Alert.alert("Upcoming Meeting", `This meeting is scheduled for \n${meetDate.toDateString()} at ${meetDate.toLocaleTimeString()}.\n\nYou can join 10 minutes before the start time.`);
                return;
              }

              // Optional: Check if it's too late (e.g. 2 hours after?)
              // For now, focusing on "early" restriction.

              setMeetCode(meeting.code);
            }} />

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Sub-component for list (defined here for simplicity or separate file)
const MeetingsList = ({ onSelect }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchMeetings();
    }, [])
  );

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE}/meet/list`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="small" color="#005b96" />;

  if (meetings.length === 0) return <Text style={{ color: '#999', fontStyle: 'italic', marginTop: 10 }}>No upcoming meetings.</Text>;

  return (
    <View style={{ maxHeight: 200, width: '100%' }}>
      {meetings.slice(0, 3).map((m, i) => (
        <TouchableOpacity key={i} style={styles.meetingItem} onPress={() => onSelect(m)}>
          <View>
            <Text style={styles.meetingTitle}>{m.title}</Text>
            <Text style={styles.meetingTime}>
              {new Date(m.scheduledTime).toLocaleDateString()} • {new Date(m.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{m.code}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#011f4b',
    padding: 20,
    paddingTop: 40,
    alignItems: 'flex-start', // Changed to align left
    justifyContent: 'center',
    position: 'relative'
  },
  headerContent: { marginLeft: 10 },
  welcomeText: { color: '#a0c4ff', fontSize: 16, fontWeight: '600' },
  headerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { position: 'absolute', right: 20, top: 50 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 15, elevation: 3, position: 'relative' },
  cardText: { marginTop: 10, textAlign: 'center', fontWeight: 'bold', color: '#011f4b' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#011f4b' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },

  joinContainer: { flexDirection: 'row', marginBottom: 5 },
  input: { flex: 1, height: 45, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#f9f9f9' },
  joinBtn: { backgroundColor: '#28a745', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  joinBtnText: { color: 'white', fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },

  scheduleLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  scheduleText: { color: '#005b96', fontWeight: 'bold', marginLeft: 8 },

  meetingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f5f7fa', borderRadius: 8, marginBottom: 8 },
  meetingTitle: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  meetingTime: { fontSize: 12, color: '#666' },
  codeBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  codeText: { fontSize: 12, fontWeight: 'bold', color: '#005b96' },

  button: { padding: 10, borderRadius: 5, backgroundColor: '#005b96', minWidth: 80, alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#25D366', // WhatsApp Green
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  profileImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'white' },

  // Menu Styles
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 },
  profileMenu: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    zIndex: 20,
    width: 180,
    paddingVertical: 5
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, fontSize: 16, color: '#333', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#eee', marginHorizontal: 10 }
});
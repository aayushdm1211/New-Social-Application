import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../src/services/apiService';

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
};

import io from 'socket.io-client';

// ...

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socketRef = React.useRef(null);

  useEffect(() => {
    fetchAnnouncementDetails();

    // Socket connection
    socketRef.current = io("http://192.168.29.129:5000"); // Use BACKEND_URL or API_BASE host
    socketRef.current.on('pollUpdated', (data) => {
      if (data.announcementId === id) {
        setAnnouncement(prev => prev ? { ...prev, poll: data.poll } : prev);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [id]);

  const fetchAnnouncementDetails = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      setCurrentUserId(uid);

      const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/announcement/list`);
      if (res.ok) {
        const data = await res.json();
        const found = data.find(a => a._id === id);
        setAnnouncement(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncementDetails();
  };

  const handleVote = async (announcementId, optionIndex) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        alert("Please login to vote");
        return;
      }

      const res = await fetch(`${API_BASE}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId, optionIndex, userId })
      });

      const data = await res.json();
      if (res.ok) {
        setAnnouncement(prev => ({ ...prev, poll: data.poll }));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to vote");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#005b96" /></View>;
  if (!announcement) return <View style={styles.center}><Text>Announcement not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Ionicons name="megaphone" size={20} color="white" />
          </View>
          <Text style={styles.headerTitle}>{announcement.title}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.bubble}>
          <Text style={styles.content}>{announcement.content}</Text>

          {announcement.poll && (
            <View style={styles.pollContainer}>
              <Text style={styles.pollQuestion}>{announcement.poll.question}</Text>
              {announcement.poll.options.map((opt, index) => {
                const totalVotes = announcement.poll.options.reduce((acc, curr) => acc + curr.votes, 0);
                const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;

                const isSelected = announcement.poll.userVotes && announcement.poll.userVotes.some(
                  v => v.userId === currentUserId && v.optionIndex === index
                );

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pollOption,
                      isSelected ? { borderColor: '#005b96', borderWidth: 2, backgroundColor: '#e3f2fd' } : {}
                    ]}
                    onPress={() => handleVote(announcement._id, index)}
                  >
                    <View style={[styles.progressBar, { width: `${percentage}%`, opacity: isSelected ? 0.3 : 0.1 }]} />
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionText, isSelected && { fontWeight: 'bold', color: '#005b96' }]}>{opt.text}</Text>
                      <Text style={[styles.percentageText, isSelected && { color: '#005b96' }]}>{percentage}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.metaContainer}>
            <Text style={styles.date}>{formatTime(announcement.createdAt)}</Text>
            <Ionicons name="checkmark-done-outline" size={16} color="#005b96" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    backgroundColor: '#011f4b',
    padding: 15,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  avatar: {
    width: 35, height: 35, borderRadius: 20, backgroundColor: '#005b96',
    justifyContent: 'center', alignItems: 'center'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bubble: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    elevation: 2
  },
  content: { fontSize: 16, color: '#303030', marginBottom: 5, lineHeight: 22 },
  pollContainer: { marginTop: 10, width: '100%' },
  pollQuestion: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  pollOption: {
    height: 40,
    backgroundColor: '#f0f2f5',
    borderRadius: 5,
    marginBottom: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  progressBar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#005b96', // Use solid color, opacity controlled in style
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 1
  },
  optionText: { fontSize: 13, color: '#333' },
  percentageText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  metaContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  date: { fontSize: 11, color: '#999', marginRight: 5 }
});
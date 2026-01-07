import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { API_BASE } from '../../src/services/apiService';

export default function CreateAnnouncement() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');


  /* Poll State */
  const [isPoll, setIsPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const addOption = () => setPollOptions([...pollOptions, '']);
  const removeOption = (index) => {
    const newOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOptions);
  };
  const updateOption = (text, index) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  const handlePost = async () => {
    if (!title || !desc) {
      alert("Please fill title and description");
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', desc);

    if (isPoll) {
      if (!pollQuestion || pollOptions.some(opt => !opt.trim())) {
        alert("Please fill poll question and all options");
        return;
      }
      const pollData = {
        question: pollQuestion,
        options: pollOptions.map(opt => ({ text: opt, votes: 0 }))
      };
      formData.append('poll', JSON.stringify(pollData));
    }

    try {
      // API_BASE is likely needed here, importing...
      // Assuming logic exists or using fetch directly
      // Use API_BASE and correct endpoint
      const res = await fetch(`${API_BASE.replace('/auth', '/admin')}/announcement`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert("Announcement Posted");
        router.back();
      } else {
        const err = await res.text();
        alert("Failed to post: " + err);
      }
    } catch (e) {
      console.error(e);
      alert("Error posting announcement");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter title" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        multiline
        value={desc}
        onChangeText={setDesc}
        placeholder="Enter details..."
      />

      {/* Poll Section */}
      <View style={styles.pollToggle}>
        <Text style={styles.label}>Attach Poll</Text>
        <TouchableOpacity onPress={() => setIsPoll(!isPoll)} style={[styles.toggleBtn, isPoll && styles.toggleActive]}>
          <Text style={styles.toggleText}>{isPoll ? "ON" : "OFF"}</Text>
        </TouchableOpacity>
      </View>

      {isPoll && (
        <View style={styles.pollContainer}>
          <Text style={styles.subLabel}>Question</Text>
          <TextInput
            style={styles.pollInput}
            value={pollQuestion}
            onChangeText={setPollQuestion}
            placeholder="Ask a question..."
          />

          <Text style={styles.subLabel}>Options</Text>
          {pollOptions.map((opt, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={[styles.pollInput, { flex: 1, marginBottom: 0 }]}
                value={opt}
                onChangeText={(text) => updateOption(text, index)}
                placeholder={`Option ${index + 1}`}
              />
              {pollOptions.length > 2 && (
                <TouchableOpacity onPress={() => removeOption(index)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>X</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addOption} style={styles.addBtn}>
            <Text style={styles.addText}>+ Add Option</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handlePost}>
        <Text style={styles.buttonText}>Post Announcement</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20, backgroundColor: '#fff' },
  button: { backgroundColor: '#005b96', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },

  pollToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#ddd' },
  toggleActive: { backgroundColor: '#005b96' },
  toggleText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  pollContainer: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  subLabel: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#555' },
  pollInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  removeBtn: { marginLeft: 10, padding: 10, backgroundColor: '#ffcccc', borderRadius: 5 },
  removeText: { color: 'red', fontWeight: 'bold' },
  addBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#e6f0ff', borderRadius: 5 },
  addText: { color: '#005b96', fontWeight: 'bold' }
});
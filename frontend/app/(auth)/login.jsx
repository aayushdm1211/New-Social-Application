import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { loginUser } from "../../src/controllers/authController";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState('user'); // 'user' or 'admin'

  const handleLoginPress = async () => {
    try {
      const user = await loginUser(email, password);

      // Enforce Role Check
      if (user.role !== selectedRole) {
        alert(`Access Denied: You are not an ${selectedRole === 'admin' ? 'Admin' : 'User'}`);
        return;
      }

      if (user.role === 'admin') {
        router.replace("/admin");
      } else {
        router.replace("/(tabs)/communityScreen");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerText}>Hike</Text></View>
      <View style={styles.content}>
        <Text style={styles.title}>Finance Community</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, selectedRole === 'user' && styles.toggleBtnActive]}
            onPress={() => setSelectedRole('user')}
          >
            <Text style={[styles.toggleText, selectedRole === 'user' && styles.toggleTextActive]}>User Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, selectedRole === 'admin' && styles.toggleBtnActive]}
            onPress={() => setSelectedRole('admin')}
          >
            <Text style={[styles.toggleText, selectedRole === 'admin' && styles.toggleTextActive]}>Admin Login</Text>
          </TouchableOpacity>
        </View>

        <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(auth)/signUpScreen")}>
          <Text style={styles.link}>New user? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: { backgroundColor: "#011f4b", height: 120, paddingHorizontal: 20, justifyContent: "center" },
  headerText: { color: "#ffffff", fontSize: 36, fontWeight: 'bold' },
  content: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 30, color: '#011f4b' },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#e1e8ed',
    borderRadius: 30,
    padding: 4,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 25
  },
  toggleBtnActive: {
    backgroundColor: '#005b96',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  toggleText: { fontSize: 16, color: '#555', fontWeight: '500' },
  toggleTextActive: { color: 'white', fontWeight: 'bold' },
  input: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  button: { backgroundColor: "#005b96", padding: 15, borderRadius: 10, marginTop: 10, elevation: 3 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 18 },
  link: { marginTop: 20, textAlign: "center", color: "#005b96", fontWeight: '600' }
});
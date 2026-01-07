import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { startSignup } from "../../src/controllers/authController";

export default function SignUpScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [validations, setValidations] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });

  const checkValidation = (text) => {
    setUsername(text);
    setValidations({
      hasUpper: /[A-Z]/.test(text),
      hasLower: /[a-z]/.test(text),
      hasNumber: /[0-9]/.test(text),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(text)
    });
  };

  const isFormValid = Object.values(validations).every(Boolean) && email && password;

  const handleSignup = async () => {
    if (!Object.values(validations).every(Boolean)) {
      alert("Please ensure username meets all requirements.");
      return;
    }
    setLoading(true);
    try {
      await startSignup(email);
      router.push({
        pathname: "/(auth)/otp",
        params: { email, username, password }
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput placeholder="Nickname (e.g. Neo_99)" style={styles.input} onChangeText={checkValidation} />

      <View style={styles.validationContainer}>
        <ValidationItem label="Small Letter" isValid={validations.hasLower} />
        <ValidationItem label="Capital Letter" isValid={validations.hasUpper} />
        <ValidationItem label="Number" isValid={validations.hasNumber} />
        <ValidationItem label="Special Character" isValid={validations.hasSpecial} />
      </View>
      <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} />
      <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={setPassword} />
      <TouchableOpacity style={[styles.button, !isFormValid && styles.disabledBtn]} onPress={handleSignup} disabled={loading || !isFormValid}>
        <Text style={styles.buttonText}>{loading ? "Sending..." : "Sign Up"}</Text>
      </TouchableOpacity>
    </View>
  );
}
function ValidationItem({ label, isValid }) {
  return (
    <View style={styles.validationItem}>
      <Ionicons
        name={isValid ? "checkmark-circle" : "close-circle"}
        size={16}
        color={isValid ? "green" : "red"}
      />
      <Text style={[styles.validationText, { color: isValid ? "green" : "#666" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: '#f5f7fa' },
  title: { fontSize: 28, textAlign: "center", fontWeight: "bold", marginBottom: 30, color: '#011f4b' },
  input: { borderWidth: 1, padding: 15, marginBottom: 15, borderRadius: 10, borderColor: "#ddd", backgroundColor: 'white' },
  button: { backgroundColor: "#005b96", padding: 15, borderRadius: 10, marginTop: 10 },
  disabledBtn: { backgroundColor: "#a0c4ff" },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 18 },

  validationContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  validationItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 5 },
  validationText: { marginLeft: 5, fontSize: 12 }
});
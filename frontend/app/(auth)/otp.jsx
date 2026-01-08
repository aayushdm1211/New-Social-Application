import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { completeSignup } from "../../src/controllers/authController";
import { Colors, GlobalStyles } from "../../src/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OtpScreen() {
  const { email, username, password } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtpPress = async () => {
    if (!otp) return alert("Please enter the OTP.");
    setLoading(true);
    try {
      await completeSignup(username, email, password, otp);
      alert("Account verified! Please sign in.");
      router.replace("/(auth)/login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={GlobalStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={40} color={Colors.white} />
            </View>
            <Text style={styles.headerText}>Verification</Text>
            <Text style={styles.headerSubText}>Enter the code sent to your email</Text>
          </View>
        </SafeAreaView>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={[styles.value, { marginBottom: 20 }]}>{email}</Text>

          <Text style={styles.label}>OTP Code</Text>
          <TextInput
            placeholder="123456"
            style={[GlobalStyles.input, { fontSize: 24, letterSpacing: 5, textAlign: 'center' }]}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setOtp}
            placeholderTextColor={Colors.textLight}
          />

          <TouchableOpacity style={[GlobalStyles.button, { marginTop: 10 }]} onPress={verifyOtpPress} disabled={loading}>
            <Text style={GlobalStyles.buttonText}>{loading ? "Verifying..." : "Verify Account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
            <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>Wrong email? <Text style={{ color: Colors.secondary, fontWeight: 'bold' }}>Go Back</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    height: 300,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  headerText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubText: {
    color: Colors.textLight,
    fontSize: 14,
    marginTop: 5
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 5
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 60
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600'
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  }
});
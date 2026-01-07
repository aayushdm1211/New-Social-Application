import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

// Adjust this to your local IP
const BACKEND_URL = "http://192.168.29.129:5000";

export default function MeetScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams();

    return (
        <View style={{ flex: 1 }}>
            <WebView
                source={{ uri: `${BACKEND_URL}/meet.html?room=${code}` }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                onPermissionRequest={(req) => {
                    req.grant(req.resources);
                }}
                onMessage={(event) => {
                    if (event.nativeEvent.data === 'END_CALL') {
                        router.back();
                    }
                }}
            />
        </View>
    );
}

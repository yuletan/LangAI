import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Automatically detects the correct API URL based on platform and network
 * - Web/iOS Simulator: Uses localhost
 * - Android (physical device/emulator): Uses your computer's LAN IP
 * - Automatically updates when you switch networks!
 */
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return "http://localhost:3000/api";
    }
    
    if (Platform.OS === 'android') {
        // Expo automatically detects your computer's IP address
        // This works when running "npm start" - it uses the same IP as the Metro bundler
        const debuggerHost = Constants.expoConfig?.hostUri;
        
        if (debuggerHost) {
            // Extract IP from debuggerHost (format: "192.168.x.x:8081")
            const ip = debuggerHost.split(':')[0];
            const url = `http://${ip}:3000/api`;
            console.log("🤖 Android API URL (auto-detected):", url);
            return url;
        }
        
        // Fallback to localhost if detection fails (for emulator)
        console.warn("⚠️ Could not auto-detect IP, using localhost");
        return "http://10.0.2.2:3000/api"; // Android emulator localhost
    }
    
    // iOS - use localhost (simulator shares host network)
    return "http://localhost:3000/api";
};

export const API_BASE_URL = getBaseUrl();

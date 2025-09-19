import React, { useRef, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function ProjectCanvasScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const webviewRef = useRef<WebView>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync("supabaseSession");
      if (stored) setSession(JSON.parse(stored));
    })();
  }, []);

  if (!projectId || !session) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const canvasUrl = `https://rtastudio-v2.vercel.app/project/${projectId}`;

  const injectedJS = `
    (function() {
      try {
        const token = {
          currentSession: {
            access_token: "${session.access_token}",
            refresh_token: "${session.refresh_token}",
            token_type: "bearer",
            user: { id: "${session.user.id}" }
          },
          currentUser: { id: "${session.user.id}" }
        };
        localStorage.setItem("supabase.auth.token", JSON.stringify(token));
        window.dispatchEvent(new Event("storage"));
        window.ReactNativeWebView.postMessage("✅ Injected access_token");
      } catch (e) {
        window.ReactNativeWebView.postMessage("❌ Injection error: " + e.message);
      }
    })();
    true;
  `;

  return (
    // <WebView
    //   ref={webviewRef}
    //   source={{ uri: canvasUrl }}
    //   style={{ flex: 1 }}
    //   javaScriptEnabled
    //   domStorageEnabled
    //   originWhitelist={["*"]}
    //   injectedJavaScriptBeforeContentLoaded={injectedJS}
    //   startInLoadingState
    //   renderLoading={() => (
    //     <View className="flex-1 justify-center items-center bg-white">
    //       <ActivityIndicator size="large" />
    //     </View>
    //   )}
    //   onMessage={(event) => {
    //     console.log("WebView message:", event.nativeEvent.data);
    //   }}
    // />

    <WebView
      ref={webviewRef}
      source={{ uri: canvasUrl }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      sharedCookiesEnabled={true} // ✅ ensures Supabase cookies are sent
      thirdPartyCookiesEnabled={true}
    />
  );
}

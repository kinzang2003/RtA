import React, { useRef, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabase";

export default function ProjectCanvasScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const webviewRef = useRef<WebView>(null);

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Load stored session
        const storedSession = await AsyncStorage.getItem("supabaseSession");
        const storedEmail = await AsyncStorage.getItem("loginEmail");
        const storedPassword = await AsyncStorage.getItem("loginPassword");

        setEmail(storedEmail);
        setPassword(storedPassword);

        let parsedSession = storedSession ? JSON.parse(storedSession) : null;

        if (parsedSession) {
          // Try refresh
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: parsedSession.refresh_token,
          });

          if (!error && data?.session) {
            parsedSession = data.session;
            await AsyncStorage.setItem(
              "supabaseSession",
              JSON.stringify(parsedSession)
            );
            setSession(parsedSession);
          }
        }

        setReady(true);
      } catch (err) {
        console.error("Session load error:", err);
        setReady(true);
      }
    })();
  }, []);

  if (!projectId || !ready) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const canvasUrl = `https://rtastudio-v2.vercel.app/project/${projectId}`;

  // Inject JS: either session or invisible login form autofill
  const injectedJS = session
    ? `
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
    `
    : `
      (function() {
        try {
          // Autofill login form
          const emailField = document.querySelector('input[type="email"]');
          const passwordField = document.querySelector('input[type="password"]');
          const loginForm = emailField?.closest('form');

          if(emailField && passwordField && loginForm){
            emailField.value = "${email || ""}";
            passwordField.value = "${password || ""}";
            loginForm.submit(); // auto-submit
            window.ReactNativeWebView.postMessage("✅ Autofilled login and submitted");
          } else {
            window.ReactNativeWebView.postMessage("⚠️ No login form found");
          }
        } catch(e){
          window.ReactNativeWebView.postMessage("❌ Autofill error: "+e.message);
        }
      })();
      true;
    `;

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: canvasUrl }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      injectedJavaScriptBeforeContentLoaded={injectedJS}
      startInLoadingState
      renderLoading={() => (
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" />
        </View>
      )}
      onMessage={(event) => {
        console.log("WebView message:", event.nativeEvent.data);
      }}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
    />
  );
}

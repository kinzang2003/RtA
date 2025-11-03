import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabase";

export default function ProjectCanvasScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const webviewRef = useRef<WebView>(null);

  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);

  // Create stable onMessage handler
  const handleWebViewMessage = useCallback(
    (event: any) => {
      const message = event.nativeEvent.data;
      console.log("WebView message:", message);

      // If session injection failed, try alternative approach
      if (message.includes("No existing session") && session) {
        console.log("Attempting fallback session injection");
        const sessionToken = {
          currentSession: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: "bearer",
            user: { id: session.user.id },
          },
          currentUser: { id: session.user.id },
        };

        const fallbackScript = `
        (function() {
          try {
            const token = ${JSON.stringify(sessionToken)};
            localStorage.setItem("supabase.auth.token", JSON.stringify(token));
            localStorage.setItem("sb-rtastudio-auth-token", JSON.stringify(token));
            window.dispatchEvent(new Event("storage"));
            console.log("Fallback session injection successful");
            window.ReactNativeWebView.postMessage("✅ Fallback session injected");
          } catch (e) {
            console.error("Fallback injection failed:", e);
            window.ReactNativeWebView.postMessage("❌ Fallback injection error: " + e.message);
          }
        })();
      `;

        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(fallbackScript);
        }
      }
    },
    [session]
  ); // Only depends on session

  useEffect(() => {
    (async () => {
      try {
        console.log("Loading session for project:", projectId);

        // Load stored session from deep linking authentication
        const storedSession = await AsyncStorage.getItem("supabaseSession");
        console.log("Stored session exists:", !!storedSession);

        if (storedSession) {
          let parsedSession = JSON.parse(storedSession);
          console.log(
            "Session parsed, has access_token:",
            !!parsedSession.access_token
          );

          // Try to refresh the session to ensure it's still valid
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: parsedSession.refresh_token,
          });

          if (!error && data?.session) {
            console.log("Session refreshed successfully");
            parsedSession = data.session;
            // Update stored session with refreshed one
            await AsyncStorage.setItem(
              "supabaseSession",
              JSON.stringify(parsedSession)
            );
            setSession(parsedSession);
          } else {
            console.log("Session refresh failed:", error);
            // If refresh fails, try to get current session
            const { data: currentSession } = await supabase.auth.getSession();
            if (currentSession?.session) {
              console.log("Using current session from Supabase");
              setSession(currentSession.session);
            } else {
              console.log("No valid session available");
            }
          }
        } else {
          console.log("No stored session, checking for current session");
          // Fallback: try to get current session if no stored session
          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession?.session) {
            console.log("Found current session");
            setSession(currentSession.session);
          } else {
            console.log("No session available at all");
          }
        }

        setReady(true);
      } catch (err) {
        console.error("Session load error:", err);
        setReady(true);
      }
    })();
  }, [projectId]);

  if (!projectId || !ready) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const canvasUrl = `https://rtastudio-v2.vercel.app/project/${projectId}`;

  // Inject JS: session token for web app authentication
  const injectedJS = `
    (function() {
      try {
        // Listen for session injection from React Native
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'SESSION_INJECT') {
            const token = event.data.token;
            localStorage.setItem("supabase.auth.token", JSON.stringify(token));
            window.dispatchEvent(new Event("storage"));
            window.ReactNativeWebView.postMessage("✅ Session injected via postMessage");
          }
        });

        // Check if session is already available
        const existingToken = localStorage.getItem("supabase.auth.token");
        if (existingToken) {
          window.ReactNativeWebView.postMessage("✅ Existing session found");
        } else {
          window.ReactNativeWebView.postMessage("⚠️ No existing session");
        }
      } catch (e) {
        window.ReactNativeWebView.postMessage("❌ Initial setup error: " + e.message);
      }
    })();
    true;
  `;

  // Inject session after WebView loads
  useEffect(() => {
    if (webViewLoaded && session && webviewRef.current) {
      // Add a small delay to ensure WebView is fully ready
      const timer = setTimeout(() => {
        const sessionToken = {
          currentSession: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: "bearer",
            user: { id: session.user.id },
          },
          currentUser: { id: session.user.id },
        };

        const injectScript = `
          (function() {
            try {
              const token = ${JSON.stringify(sessionToken)};
              localStorage.setItem("supabase.auth.token", JSON.stringify(token));
              // Also try the alternative key that some Supabase versions use
              localStorage.setItem("sb-rtastudio-auth-token", JSON.stringify(token));
              window.dispatchEvent(new Event("storage"));
              window.ReactNativeWebView.postMessage("✅ Session injected after load");
            } catch (e) {
              window.ReactNativeWebView.postMessage("❌ Post-load injection error: " + e.message);
            }
          })();
        `;

        webviewRef.current?.injectJavaScript(injectScript);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [webViewLoaded, session]);

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
      onLoadEnd={() => {
        console.log("WebView loaded");
        setWebViewLoaded(true);
      }}
      renderLoading={() => (
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" />
        </View>
      )}
      onMessage={handleWebViewMessage}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
    />
  );
}

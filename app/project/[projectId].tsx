import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { useRef, useState, useEffect } from "react";
import { useAuthUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { useData } from "@/lib/data-provider";
import {
  createPostMessageJS,
  createAuthSessionMessage,
  parseWebViewResponse,
  buildEditorURL,
  isValidUUID,
  WEBVIEW_CONFIG,
  webViewLogger,
  WebViewResponse,
} from "@/utils/webview-integration";

const WEB_EDITOR_BASE_URL = process.env.EXPO_PUBLIC_WEB_EDITOR_URL || "https://rtastudio.app";

export default function ProjectCanvasScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const user = useAuthUser();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const { colorScheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionSent, setSessionSent] = useState(false);
  const [canSendAuth, setCanSendAuth] = useState(false);
  const [authQueued, setAuthQueued] = useState(false);
  const [authRetryCount, setAuthRetryCount] = useState(0);
  const MAX_AUTH_RETRIES = 3;
  const [currentURL, setCurrentURL] = useState<string>("");
  const [loadStartCount, setLoadStartCount] = useState(0);
  const [loadEndCount, setLoadEndCount] = useState(0);
  const [navCanGoBack, setNavCanGoBack] = useState(false);
  const [navCanGoForward, setNavCanGoForward] = useState(false);
  
  // Use DataProvider cached projects - instant load!
  const { allProjects } = useData();
  const project = allProjects.find(p => p.id === projectId);
  const projectName = project?.name || "Project";

  // Validate project ID
  if (!projectId || !isValidUUID(projectId)) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-lg font-semibold text-red-600 mb-2">
            Invalid Project ID
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            {projectId ? `Format: ${projectId}` : "No project ID provided"}
          </Text>
          <Text
            onPress={() => router.back()}
            className="text-blue-600 font-semibold px-4 py-2"
          >
            ← Go Back
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Build editor URL (clean bridge, no tokens)
  const editorURL = buildEditorURL(WEB_EDITOR_BASE_URL, projectId);
  const [editorURLWithToken] = useState(editorURL);

  webViewLogger.info("Canvas screen mounted", {
    projectId,
    editorURL: editorURLWithToken,
    userAuthenticated: !!user,
  });

  // Injected JS: forward console logs/errors and request auth from native
  const injectedJS = `
    (function(){
      window.projectId = "${projectId}";
      window.__REACT_NATIVE__ = true;
      
      // Enable WebRTC and WebSocket for real-time collaboration
      window.__COLLABORATION_ENABLED__ = true;
      
      console.log('[Canvas] Injected script running...');
      console.log('[Canvas] Collaboration enabled: WebRTC/WebSocket support active');

      const levels = ['log','info','warn','error','debug'];
      levels.forEach(l => {
        const orig = console[l];
        console[l] = function(){
          try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', payload: { level: l, args: Array.from(arguments) } })); }catch(e){}
          if(orig && orig.apply) orig.apply(console, arguments);
        };
      });

      window.addEventListener('unhandledrejection', function(e){
        try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', payload: { level: 'error', message: 'unhandledrejection', reason: (e && e.reason) || null } })); }catch(e){}
      });

      window.onerror = function(message, source, lineno, colno, error) {
        try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', payload: { level: 'error', message, source, lineno, colno, stack: error && error.stack } })); }catch(e){}
      };

      // Listen for auth messages from native
      window.__handleAuthFromNative = function(auth) {
        console.log('[Canvas] Received auth from native:', { userId: auth.user.id, email: auth.user.email });
        // Store auth globally so your web code can access it
        window.__nativeAuth = auth;
        // Trigger a custom event in case your app listens for it
        window.dispatchEvent(new CustomEvent('native-auth', { detail: auth }));
      };

      // Request auth from native when page initializes
      setTimeout(function(){
        console.log('[Canvas] Requesting auth from native...');
        try {
          // Post both legacy and bridge alias to maximize compatibility
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth.request' }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'request-supabase-session' }));
        } catch(e) {
          console.error('[Canvas] Failed to post auth request:', e);
        }
      }, 300);

      console.log('[Canvas] WebView initialized for project:', window.projectId);
    })();
    true;
  `;

  // Send authentication session to web (deferred until web requests it)
  const sendAuthToWeb = async () => {
    if (!user || sessionSent) return;

    if (!canSendAuth) {
      // Defer sending until web requests it
      setAuthQueued(true);
      webViewLogger.info("Auth handshake queued until web requests auth");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session) {
        webViewLogger.warn("No active session found");
        setError("Authentication session lost. Please log in again.");
        return;
      }

      // Inject a MessageEvent into the web context carrying the Supabase session
      const js = `(() => {
        try {
          const evt = new MessageEvent('message', { data: ${JSON.stringify(
            {
              type: "supabase-session",
              payload: {
                access_token: session.session.access_token,
                refresh_token: session.session.refresh_token,
              },
            }
          )} });
          window.dispatchEvent(evt);
          console.log('[Native->Web] Supabase session delivered via MessageEvent');
        } catch (err) {
          console.error('[Native->Web] Failed to inject session', err);
        }
      })();
      true;`;

      webViewRef.current?.injectJavaScript(js);

      setSessionSent(true);
      setAuthQueued(false);
      webViewLogger.info("Auth session injected to web via MessageEvent", {
        userId: user.id,
        email: user.email,
      });
    } catch (err) {
      webViewLogger.error("Failed to send auth session", err);
      setAuthRetryCount((c) => c + 1);
      if (authRetryCount < MAX_AUTH_RETRIES) {
        setTimeout(() => sendAuthToWeb(), 1000 * (authRetryCount + 1));
      } else {
        setError("Failed to authenticate with editor. Please try again.");
      }
    }
  };

  // Handle messages from web editor
  const handleWebViewMessage = (event: any) => {
    try {
      const response = parseWebViewResponse(event.nativeEvent.data);

      if (!response) return;

      webViewLogger.info("Received message from web", {
        type: response.type,
        payload: response.payload,
      });

      switch (response.type) {
        case "console":
          // Forward web console payload to terminal console
          try {
            const level = (response.payload?.level as string) || "log";
            const args = response.payload?.args || [response.payload];
            if (typeof (console as any)[level] === "function") {
              (console as any)[level]("[WebConsole]", ...args);
            } else {
              console.log("[WebConsole]", ...args);
            }
          } catch (e) {
            console.log("[WebConsole] (fallback)", JSON.stringify(response.payload));
          }
          return;

        case "auth.request":
        case "request-supabase-session":
          webViewLogger.info("Web requested auth handshake");
          setCanSendAuth(true);
          // If auth was queued earlier, send it now
          if (authQueued && !sessionSent) {
            sendAuthToWeb();
          }
          return;

        case "canvas.ready":
          setLoading(false);
          setError(null);
          webViewLogger.info("✅ Canvas ready received from web", { projectId });
          // Canvas is now fully initialized and ready for interaction
          break;

        case "project.saved":
          console.log("✅ Project saved at", response.payload?.timestamp);
          break;

        case "error":
          const errorMsg =
            response.payload?.message || "Unknown error occurred";
          console.error("❌ Canvas error:", errorMsg);
          setError(errorMsg);
          setLoading(false);
          break;

        case "canvas.state":
          webViewLogger.info("Canvas state updated", response.payload);
          break;

        case "collaborators.update":
          webViewLogger.info(
            "Collaborators updated",
            response.payload?.collaborators
          );
          // Someone joined/left the collaboration
          if (response.payload?.action === "joined") {
            console.log(`✅ ${response.payload.userName} joined the project`);
          } else if (response.payload?.action === "left") {
            console.log(`👋 ${response.payload.userName} left the project`);
          }
          break;

        default:
          webViewLogger.warn("Unknown message type", response.type);
      }
    } catch (err) {
      webViewLogger.error("Failed to handle WebView message", err);
    }
  };

  // Handle WebView errors
  const handleWebViewError = (error: any) => {
    const errorMsg = `${error.description} (Code: ${error.code})`;
    webViewLogger.error("WebView error", error);
    setError(errorMsg);
    setLoading(false);
  };

  const handleWebViewHTTPError = (error: any) => {
    const errorMsg = `HTTP ${error.statusCode}: ${error.description}`;
    webViewLogger.error("WebView HTTP error", error);
    setError(errorMsg);
    setLoading(false);
  };

  const handleNavigationStateChange = (navState: any) => {
    try {
      setCurrentURL(navState?.url || "");
      setNavCanGoBack(!!navState?.canGoBack);
      setNavCanGoForward(!!navState?.canGoForward);
      webViewLogger.info("Nav state", navState);
      // If we are on a project page, clear loading as a safety fallback
      if (navState?.url && /\/project\//.test(navState.url)) {
        setTimeout(() => setLoading(false), 150);
      }
    } catch (e) {
      webViewLogger.error("Failed to handle nav state", e);
    }
  };

  const handleLoadStart = (e: any) => {
    setLoadStartCount((c) => c + 1);
    setCurrentURL(e?.nativeEvent?.url || currentURL);
    webViewLogger.info("Load start", { url: e?.nativeEvent?.url, count: loadStartCount + 1 });
  };

  const handleLoadEnd = (e: any) => {
    setLoadEndCount((c) => c + 1);
    setCurrentURL(e?.nativeEvent?.url || currentURL);
    webViewLogger.info("Load end", { url: e?.nativeEvent?.url, count: loadEndCount + 1 });
    // Fallback: ensure we don't keep the overlay forever
    if (/\/project\//.test(e?.nativeEvent?.url || "")) {
      setTimeout(() => setLoading(false), 150);
    }
    // Trigger auth send attempt after a short delay for stability
    setTimeout(() => sendAuthToWeb(), 150);
  };


  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View style={{ flex: 1 }}>
        {/* Header with Back Button and Project Title */}
        <View
          className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colorScheme === "dark" ? "#fff" : "#111827"}
            />
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold text-gray-900 dark:text-white flex-1"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {projectName}
          </Text>
        </View>

        {/* Error Overlay */}
        {error && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: "#fff", marginBottom: 16, fontSize: 18, fontWeight: "600" }}>
              Canvas Loading Failed
            </Text>
            <Text
              style={{
                color: "#f87171",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {error}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  webViewRef.current?.reload();
                }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: "600",
                }}
              >
                Retry
              </Text>
              <Text
                onPress={() => router.back()}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: "600",
                }}
              >
                Go Back
              </Text>
            </View>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{
            uri: editorURLWithToken,
            headers: WEBVIEW_CONFIG.headers,
          }}
          javaScriptEnabled={WEBVIEW_CONFIG.javaScriptEnabled}
          domStorageEnabled={WEBVIEW_CONFIG.domStorageEnabled}
          sharedCookiesEnabled={WEBVIEW_CONFIG.sharedCookiesEnabled}
          thirdPartyCookiesEnabled={WEBVIEW_CONFIG.thirdPartyCookiesEnabled}
          startInLoadingState={WEBVIEW_CONFIG.startInLoadingState}
          allowsBackForwardNavigationGestures={WEBVIEW_CONFIG.allowsBackForwardNavigationGestures}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleWebViewError}
          onHttpError={handleWebViewHTTPError}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={handleNavigationStateChange}
          injectedJavaScript={injectedJS}
        />
      </View>
    </SafeAreaView>
  );
}

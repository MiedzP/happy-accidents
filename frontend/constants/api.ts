import Constants from 'expo-constants';
import { Platform } from 'react-native';

// The backend listens on port 8000 (uvicorn --host 0.0.0.0).
const API_PORT = 8000;

// On a physical phone or an emulator, "localhost" points at the device itself,
// NOT at your computer — that's why the app couldn't connect. In dev we instead
// reuse the same host that Expo's Metro bundler is served from, so whichever IP
// your phone already uses to load the app is also used to reach the API.
function resolveDevHost(): string | null {
  // e.g. "172.20.10.2:8081" (LAN) or "localhost:8081" (web/simulator).
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Fallbacks for older/edge Expo runtimes:
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost ??
    null;

  if (!hostUri) return null;
  const host = hostUri.split(':')[0].trim();
  if (!host) return null;

  // Android emulator can't reach the host machine via 127.0.0.1 — it uses 10.0.2.2.
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    return '10.0.2.2';
  }
  return host;
}

// Set EXPO_PUBLIC_API_URL to override completely (e.g. a deployed backend).
const explicit = process.env.EXPO_PUBLIC_API_URL;

export const API_URL =
  explicit ??
  (() => {
    const host = resolveDevHost();
    return host ? `http://${host}:${API_PORT}` : `http://localhost:${API_PORT}`;
  })();

// Quick reachability probe for the backend. Returns true if /health responds.
export async function checkHealth(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { storeImage } from '../store/imageStore';
import { API_URL, checkHealth } from '../constants/api';

export default function HomeScreen() {
  const router = useRouter();
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  // Probe the backend on mount (and on focus-back) so a dead server surfaces as
  // a clear banner instead of a generic failure when the user picks a medium.
  const probe = async () => setServerUp(await checkHealth());
  useEffect(() => {
    probe();
  }, []);

  const pickImage = async (useCamera: boolean) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      alert(`Permission needed to access your ${useCamera ? 'camera' : 'photos'}.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;

      if (Platform.OS === 'web') {
        // Convert the picked file to a data URI — a stable representation that
        // survives navigation and page reloads (unlike a blob: URL), and is what
        // we later turn back into the upload File.
        const file: File | undefined = (asset as any).file;
        const blob: Blob = file ?? (await fetch(uri).then((r) => r.blob()));
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target!.result as string);
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(blob);
        });
        storeImage(dataUri, dataUri);
        router.push('/medium-picker');
      } else {
        storeImage(uri);
        router.push('/medium-picker');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {serverUp === false && (
        <TouchableOpacity style={styles.banner} onPress={probe} activeOpacity={0.8}>
          <Text style={styles.bannerText}>
            ⚠️ Can't reach the drawing server at {API_URL}.{'\n'}
            Make sure the backend window is open, then tap here to retry.
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Drawing{'\n'}Teacher</Text>
          <Text style={styles.subtitle}>
            Point your camera at anything.{'\n'}
            Get step-by-step instructions to draw it.
          </Text>
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => pickImage(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>📷  Take a Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => pickImage(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryText}>🖼️  Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  banner: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bannerText: { color: '#b91c1c', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  hero: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -1,
    marginBottom: 16,
  },
  subtitle: { fontSize: 18, color: '#555', lineHeight: 26 },
  buttons: { gap: 12 },
  primary: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondary: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryText: { color: '#000', fontSize: 18, fontWeight: '600' },
});

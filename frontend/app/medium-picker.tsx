import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { MEDIUMS, Medium } from '../constants/mediums';
import { API_URL } from '../constants/api';
import { getImageUri, getImageDataUri, storeLesson } from '../store/imageStore';

const LOADING_MESSAGES = [
  { emoji: '🔍', text: 'Analyzing your photo…' },
  { emoji: '🧠', text: 'Identifying shapes and structure…' },
  { emoji: '📋', text: 'Planning your drawing steps…' },
  { emoji: '🎨', text: 'Adapting for your medium…' },
  { emoji: '✍️', text: 'Writing step-by-step instructions…' },
  { emoji: '⭐', text: 'Adding expert tips…' },
  { emoji: '🖼️', text: 'Almost ready…' },
];

function LoadingScreen({ imageUri, medium }: { imageUri: string | null; medium: Medium }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const msg = LOADING_MESSAGES[messageIndex];

  return (
    <View style={styles.loadingScreen}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.loadingImage} resizeMode="cover" />
      )}
      <View style={styles.loadingCard}>
        <Text style={styles.loadingEmoji}>{msg.emoji}</Text>
        <Text style={styles.loadingTitle}>{msg.text}</Text>
        <Text style={styles.loadingMedium}>
          Drawing in {medium.label.toLowerCase()} {medium.emoji}
        </Text>
        <ActivityIndicator size="small" color="#999" style={{ marginTop: 16 }} />
        <Text style={styles.loadingHint}>Usually ready in a few seconds.</Text>
        <View style={styles.dots}>
          {LOADING_MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === messageIndex && styles.dotActive, i < messageIndex && styles.dotDone]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function MediumPickerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMedium, setActiveMedium] = useState<Medium | null>(null);

  // Image comes from the store (data URI on web, file URI on native), recovered
  // from sessionStorage if the page was reloaded.
  const imageUri = Platform.OS === 'web' ? getImageDataUri() : getImageUri();

  // If we arrived here with no image (e.g. deep link / lost state), go home.
  useEffect(() => {
    if (!imageUri) {
      Alert.alert('No photo selected', 'Please pick a photo first.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [imageUri]);

  const startLesson = async (medium: Medium) => {
    setActiveMedium(medium);
    setLoading(true);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const dataUri = getImageDataUri();
        if (!dataUri) throw new Error('Your photo was lost — please go back and pick it again.');
        const blob = await fetch(dataUri).then((r) => r.blob());
        if (!blob || blob.size === 0) {
          throw new Error('The photo could not be read — please pick it again.');
        }
        const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } else {
        const uri = getImageUri();
        if (!uri) throw new Error('Your photo was lost — please go back and pick it again.');
        formData.append('image', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      }

      formData.append('medium', medium.id);

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error ${response.status}`);
      }

      const lesson = await response.json();
      storeLesson(lesson);
      router.push('/lesson');
    } catch (err: any) {
      // A failed fetch (server down / CORS / DNS) throws a TypeError in browsers.
      const isNetwork =
        err?.name === 'TypeError' || /failed to fetch|network/i.test(err?.message ?? '');
      Alert.alert(
        'Could not create lesson',
        isNetwork
          ? `Can't reach the drawing server at ${API_URL}.\nMake sure the backend window is open and try again.`
          : err?.message ?? 'Something went wrong. Please try again.'
      );
      setLoading(false);
      setActiveMedium(null);
    }
  };

  if (loading && activeMedium) {
    return <LoadingScreen imageUri={imageUri} medium={activeMedium} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}
      <Text style={styles.header}>What will you draw with?</Text>
      <FlatList
        data={MEDIUMS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => startLesson(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  preview: { width: '100%', height: 180 },
  header: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  grid: { paddingHorizontal: 12, paddingBottom: 32 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    flex: 0.48,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardDescription: { fontSize: 12, color: '#888' },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingImage: {
    width: '100%',
    height: 260,
  },
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  loadingEmoji: { fontSize: 48, marginBottom: 8 },
  loadingTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  loadingMedium: { fontSize: 15, color: '#888', textAlign: 'center' },
  loadingHint: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 10 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' },
  dotActive: { backgroundColor: '#000', width: 20 },
  dotDone: { backgroundColor: '#bbb' },
});

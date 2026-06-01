import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getLesson } from '../store/imageStore';

const { width } = Dimensions.get('window');

// Step reference image. The backend fetches it lazily on first view, so show a
// spinner while it loads and fall back to a placeholder if it can't be produced.
function StepImage({ uri }: { uri?: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    uri ? 'loading' : 'error'
  );
  useEffect(() => setStatus(uri ? 'loading' : 'error'), [uri]);

  if (!uri || status === 'error') {
    return (
      <View style={styles.stepImagePlaceholder}>
        <Text style={styles.placeholderText}>🎨</Text>
        <Text style={styles.placeholderLabel}>Reference image unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.stepImageWrap}>
      <Image
        source={{ uri }}
        style={styles.stepImage}
        resizeMode="cover"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'loading' && (
        <View style={styles.stepImageLoading}>
          <ActivityIndicator color="#999" />
          <Text style={styles.placeholderLabel}>Drawing this step…</Text>
        </View>
      )}
    </View>
  );
}

interface Step {
  step_number: number;
  title: string;
  instruction: string;
  tip?: string;
  image_url?: string;
}

interface Lesson {
  subject: { subject: string; description: string };
  medium: string;
  steps: Step[];
}

export default function LessonScreen() {
  const router = useRouter();
  const lesson = getLesson<Lesson>();
  const [current, setCurrent] = useState(0);

  // No lesson in the store (e.g. a direct reload of /lesson) — send home.
  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No lesson loaded.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/')}>
            <Text style={styles.emptyBtnText}>Start over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const steps = lesson.steps;
  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  const mediumLabel = lesson.medium.replace('_', ' ');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subject} numberOfLines={1}>
          {lesson.subject.subject}
        </Text>
        <Text style={styles.mediumBadge}>{mediumLabel}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((current + 1) / steps.length) * 100}%` },
          ]}
        />
      </View>

      {/* Step content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepCounter}>
          Step {step.step_number} of {steps.length}
        </Text>
        <Text style={styles.stepTitle}>{step.title}</Text>

        <StepImage uri={step.image_url} />

        <Text style={styles.instruction}>{step.instruction}</Text>

        {step.tip && (
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>💡 Pro Tip</Text>
            <Text style={styles.tipText}>{step.tip}</Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.backBtn, isFirst && styles.disabled]}
          onPress={() => setCurrent((c) => c - 1)}
          disabled={isFirst}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.doneBtnText}>🎉  Done!</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => setCurrent((c) => c + 1)}
          >
            <Text style={styles.nextBtnText}>Next Step →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subject: { fontSize: 18, fontWeight: '700', flex: 1 },
  mediumBadge: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    color: '#555',
    textTransform: 'capitalize',
    marginLeft: 8,
  },

  progressTrack: {
    height: 4,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },

  stepCounter: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 4 },
  stepTitle: { fontSize: 28, fontWeight: '800', marginBottom: 20, lineHeight: 34 },

  stepImageWrap: {
    width: '100%',
    height: width - 40,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepImageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 40 },
  placeholderLabel: { fontSize: 14, color: '#aaa' },

  instruction: { fontSize: 17, lineHeight: 27, color: '#1a1a1a' },

  tipBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  tipLabel: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 6 },
  tipText: { fontSize: 15, color: '#78350f', lineHeight: 22 },

  nav: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
  },
  disabled: { opacity: 0.3 },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },

  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#000',
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  doneBtn: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#10b981',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { fontSize: 16, color: '#666' },
  emptyBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

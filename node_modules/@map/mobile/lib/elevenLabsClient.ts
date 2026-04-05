// ─── ElevenLabs client ────────────────────────────────────────────────────────
// STT: scribe_v2   (multipart/form-data — uses RN native file ref, NOT Blob)
// TTS: eleven_multilingual_v3 (fetch → base64 → expo-file-system cache)

import { File, Paths } from 'expo-file-system/next';
import { Audio } from 'expo-av';

const BASE_URL = 'https://api.elevenlabs.io/v1';
const STT_MODEL = 'scribe_v2';
const TTS_MODEL = 'eleven_flash_v2_5';

export const VOICE_STANDARD =
  process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_STANDARD ?? 'zGjIP4SZlMnY9m93k97r';

export const VOICE_DARIJA =
  process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_DARIJA ?? 'OfGMGmhShO8iL9jCkXy8';

// ─── Types ────────────────────────────────────────────────────────────────────
export class ElevenLabsError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

export interface TranscriptionResult {
  text: string;
  detectedLangCode: string;
  confidence?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('EXPO_PUBLIC_ELEVENLABS_API_KEY is not set');
  return key;
}

/**
 * Determines which ElevenLabs voice to use based on language code and transcript.
 */
export function selectVoiceForLanguage(
  detectedLangCode: string,
  transcriptText: string,
): string {
  const lang = normalizeLanguageCode(detectedLangCode);

  // Heuristic first: handle Darija even when STT language code is noisy.
  if (isDarijaText(transcriptText)) return VOICE_DARIJA;

  const isDarijaCode =
    lang === 'ar-ma' ||
    lang === 'ar-mar' ||
    lang === 'ary' ||
    lang === 'ar_ma' ||
    lang.startsWith('ar-ma');

  if (isDarijaCode) return VOICE_DARIJA;

  if (lang === 'ar' || lang.startsWith('ar')) {
    return isDarijaText(transcriptText) ? VOICE_DARIJA : VOICE_STANDARD;
  }

  return VOICE_STANDARD;
}

function normalizeLanguageCode(code: string): string {
  const raw = (code ?? '').toLowerCase().trim().replace('_', '-');
  if (!raw) return '';

  const map: Record<string, string> = {
    fra: 'fr',
    fre: 'fr',
    eng: 'en',
    spa: 'es',
    por: 'pt',
    ita: 'it',
    deu: 'de',
    ger: 'de',
    cmn: 'zh',
    zho: 'zh',
    jpn: 'ja',
    ara: 'ar',
    ary: 'ary',
  };

  return map[raw] ?? raw;
}

/**
 * Lightweight heuristic to identify Moroccan Darija text.
 */
function isDarijaText(text: string): boolean {
  const source = (text ?? '').toLowerCase();
  const latinNorm = source
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ɣ/g, 'gh')
    .replace(/č/g, 'ch')
    .replace(/ṣ/g, 's')
    .replace(/ṭ/g, 't')
    .replace(/ḍ/g, 'd')
    .replace(/ḥ/g, 'h')
    .replace(/ʿ/g, 'a')
    .replace(/-/g, ' ');
  const darijaMarkers = [
    'واش', 'كيفاش', 'فين', 'علاش', 'بزاف', 'مزيان',
    'دابا', 'هاد', 'ديال', 'غادي', 'باغي', 'كنقول',
    'كنمشي', 'كاين', 'ماكاينش', 'بغيت', 'ماشي',
    'شحال', 'فاش', 'منين', 'علا', 'بلا', 'حتى',
    'كيران', 'صاحبي', 'خويا', 'لبس', 'كولشي',
    'لاباس', 'مرحبا', 'أهلا', 'بخير',
    'شنو', 'أشنو', 'فماش', 'تما',
    // Latin-script Darija variants commonly produced by STT
    'wach', 'wa9ch', 'wačč', 'kifach', '3lach', 'bzaf', 'mzyan',
    'daba', 'dabu', 'had', 'dial', 'ghadi', 'bghit', 'kayn', 'kayen',
    'makaynch', 'chhal', 'mnin', 'safi', 'labas', 'merrakc',
    'bghigh', 'bghit', 'blasa', 'lmakla', 'kaza', 'mzianin',
  ];

  return darijaMarkers.some(marker =>
    source.includes(marker) || latinNorm.includes(marker),
  );
}

// ─── STT: Speech → Text (scribe_v2) ──────────────────────────────────────────
// React Native FormData requires a native file reference { uri, type, name }.
// Do NOT read the file to base64 first — RN fetch handles the URI directly.
export async function transcribeAudio(
  fileUri: string,
  signal?: AbortSignal,
  languageHint?: string,
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();
  console.log('[STT] start — fileUri:', fileUri);

  const form = new FormData();
  form.append('file', { uri: fileUri, type: 'audio/m4a', name: 'recording.m4a' } as any);
  form.append('model_id', STT_MODEL);
  form.append('timestamps_granularity', 'none');
  form.append('tag_audio_events', 'false');
  if (languageHint) {
    form.append('language_code', languageHint);
  }

  console.log('[STT] sending to ElevenLabs...');
  const response = await fetch(`${BASE_URL}/speech-to-text`, {
    method:  'POST',
    headers: { 'xi-api-key': apiKey },
    body:    form,
    signal,
  });

  console.log('[STT] response status:', response.status);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[STT] error body:', text);
    throw new ElevenLabsError(`STT ${response.status}: ${text}`, response.status);
  }

  const data = await response.json();
  console.log('[STT] response data:', JSON.stringify(data));

  const transcript = data?.text ?? data?.transcription ?? '';
  if (!transcript || !String(transcript).trim()) {
    throw new ElevenLabsError('NO_SPEECH_DETECTED');
  }
  console.log('[STT] transcript:', transcript);
  return {
    text: String(transcript).trim(),
    detectedLangCode: (data?.language_code ?? 'en') as string,
    confidence: typeof data?.language_probability === 'number' ? data.language_probability : undefined,
  };
}

// ─── TTS: Text → Speech (eleven_multilingual_v3) ─────────────────────────────
// Fetches audio, converts ArrayBuffer → base64 in chunks, writes to cache dir.
export async function synthesizeSpeech(
  text: string,
  voiceId: string = VOICE_STANDARD,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = getApiKey();
  console.log('[TTS] start — text length:', text.length);

  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method:  'POST',
    headers: {
      'xi-api-key':   apiKey,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id:              TTS_MODEL,              // ~3x faster than eleven_v3
      output_format:         'mp3_22050_32',         // 4x smaller file → faster download
      voice_settings:        { stability: 0.4, similarity_boost: 0.7 },
      optimize_streaming_latency: 4,                 // max latency reduction (0–4)
    }),
    signal,
  });

  console.log('[TTS] response status:', response.status);

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[TTS] error body:', errText);
    throw new ElevenLabsError(`TTS ${response.status}: ${errText}`, response.status);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log('[TTS] audio bytes received:', arrayBuffer.byteLength);

  const file = new File(Paths.cache, `sarah_tts_${Date.now()}.mp3`);
  file.write(new Uint8Array(arrayBuffer));
  console.log('[TTS] written to:', file.uri);

  return file.uri;
}

export async function speakText(
  text: string,
  voiceId: string,
  onStart?: () => void,
  onFinish?: () => void,
): Promise<() => Promise<void>> {
  const uri = await synthesizeSpeech(text, voiceId);

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume: 1.0 },
  );

  onStart?.();

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      onFinish?.();
      sound.unloadAsync().catch(() => {});
    }
  });

  return async () => {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      // no-op
    }
  };
}

let recordingHandle: Audio.Recording | null = null;

export async function startRecording(options: Audio.RecordingOptions): Promise<void> {
  const { recording } = await Audio.Recording.createAsync(options);
  recordingHandle = recording;
}

export async function stopRecording(): Promise<string | null> {
  if (!recordingHandle) return null;
  await recordingHandle.stopAndUnloadAsync();
  const uri = recordingHandle.getURI();
  recordingHandle = null;
  return uri;
}

export function isRecording(): boolean {
  return recordingHandle != null;
}

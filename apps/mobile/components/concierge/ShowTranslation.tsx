import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../lib/theme';
import { sendGroqMessage } from '../../lib/groqClient';
import {
	transcribeAudio,
	synthesizeSpeech,
	selectVoiceForLanguage,
	VOICE_DARIJA,
} from '../../lib/elevenLabsClient';

type TranslationState = 'idle' | 'recording' | 'processing' | 'translating' | 'speaking' | 'error';

const TARGET_LANGS = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'French' },
	{ code: 'es', label: 'Spanish' },
	{ code: 'ar', label: 'Arabic (MSA)' },
	{ code: 'ar-MA', label: 'Darija' },
	{ code: 'it', label: 'Italian' },
	{ code: 'pt', label: 'Portuguese' },
	{ code: 'de', label: 'German' },
];

function langLabel(code: string): string {
	return TARGET_LANGS.find(l => l.code === code)?.label ?? code;
}

function buildTranslateSystemPrompt(targetLang: string): string {
	const label = langLabel(targetLang);
	if (targetLang === 'ar-MA') {
		return [
			'You are a translation engine.',
			'Translate the user text into Moroccan Arabic Darija.',
			'Write Darija in Arabic script only (not Latin/Arabizi).',
			'Keep meaning and tone natural for native Moroccan speech.',
			'Return only the translation text, with no explanation.',
		].join(' ');
	}

	return [
		'You are a translation engine.',
		`Translate the user text into ${label}.`,
		'Return only translated text with no explanation, no quotes, no prefix.',
	].join(' ');
}

async function translateText(input: string, targetLang: string): Promise<string> {
	return sendGroqMessage([
		{ role: 'system', content: buildTranslateSystemPrompt(targetLang) },
		{ role: 'user', content: input },
	]);
}

interface Props {
	visible: boolean;
	onClose: () => void;
}

export default function ShowTranslation({ visible, onClose }: Props) {
	const [state, setState] = useState<TranslationState>('idle');
	const [forceDarijaSTT, setForceDarijaSTT] = useState(false);
	const [targetLang, setTargetLang] = useState('en');
	const [sourceText, setSourceText] = useState('');
	const [detectedLangCode, setDetectedLangCode] = useState('');
	const [translation, setTranslation] = useState('');
	const [errorText, setErrorText] = useState('');

	const recordingRef = useRef<Audio.Recording | null>(null);
	const soundRef = useRef<Audio.Sound | null>(null);
	const lastAudioUriRef = useRef<string | null>(null);

	const selectedTargetLabel = useMemo(() => langLabel(targetLang), [targetLang]);

	useEffect(() => {
		if (!visible) {
			recordingRef.current?.stopAndUnloadAsync().catch(() => {});
			recordingRef.current = null;
			soundRef.current?.unloadAsync().catch(() => {});
			soundRef.current = null;
			setState('idle');
			setErrorText('');
		}
	}, [visible]);

	const playAudioUri = async (uri: string) => {
		try {
			soundRef.current?.unloadAsync().catch(() => {});
			const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });
			soundRef.current = sound;
			setState('speaking');
			sound.setOnPlaybackStatusUpdate((status) => {
				if (status.isLoaded && status.didJustFinish) {
					setState('idle');
				}
			});
		} catch {
			setState('error');
			setErrorText('Could not play translated audio.');
		}
	};

	const runTranslationFlow = async (audioUri: string) => {
		try {
			setState('processing');
			setErrorText('');
			const stt = await transcribeAudio(
				audioUri,
				undefined,
				forceDarijaSTT ? 'ar' : undefined,
			);

			setSourceText(stt.text);
			setDetectedLangCode(stt.detectedLangCode);

			setState('translating');
			const translated = await translateText(stt.text, targetLang);
			setTranslation(translated);

			const voiceId = selectVoiceForLanguage(targetLang, translated);
			const audioUriOut = await synthesizeSpeech(translated, voiceId);
			lastAudioUriRef.current = audioUriOut;

			console.log(
				`[Translate] forced ar: ${forceDarijaSTT ? 'yes' : 'no'} | src: ${stt.detectedLangCode} -> target: ${targetLang} | voice: ${voiceId === VOICE_DARIJA ? 'Darija' : 'Standard'}`,
			);

			await playAudioUri(audioUriOut);
		} catch (err: any) {
			setState('error');
			setErrorText(err?.message ?? 'Translation failed.');
		}
	};

	const onMicPress = async () => {
		if (state === 'recording') {
			if (!recordingRef.current) return;
			await recordingRef.current.stopAndUnloadAsync();
			const uri = recordingRef.current.getURI();
			recordingRef.current = null;
			if (!uri) {
				setState('error');
				setErrorText('Recording failed.');
				return;
			}
			await runTranslationFlow(uri);
			return;
		}

		if (state === 'speaking') {
			await soundRef.current?.stopAsync().catch(() => {});
			await soundRef.current?.unloadAsync().catch(() => {});
			soundRef.current = null;
			setState('idle');
			return;
		}

		if (state === 'processing' || state === 'translating') return;

		const { granted } = await Audio.requestPermissionsAsync();
		if (!granted) {
			setState('error');
			setErrorText('Microphone permission is required.');
			return;
		}

		await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
		const { recording } = await Audio.Recording.createAsync({
			android: {
				extension: '.m4a',
				outputFormat: Audio.AndroidOutputFormat.MPEG_4,
				audioEncoder: Audio.AndroidAudioEncoder.AAC,
				sampleRate: 44100,
				numberOfChannels: 1,
				bitRate: 128000,
			},
			ios: {
				extension: '.m4a',
				outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
				audioQuality: Audio.IOSAudioQuality.HIGH,
				sampleRate: 44100,
				numberOfChannels: 1,
				bitRate: 128000,
				linearPCMBitDepth: 16,
				linearPCMIsBigEndian: false,
				linearPCMIsFloat: false,
			},
			web: {
				mimeType: 'audio/webm',
				bitsPerSecond: 128000,
			},
		});

		recordingRef.current = recording;
		setState('recording');
	};

	const onReplayPress = async () => {
		if (!lastAudioUriRef.current) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		await playAudioUri(lastAudioUriRef.current);
	};

	const statusText: Record<TranslationState, string> = {
		idle: 'Tap mic to translate',
		recording: 'Listening...',
		processing: 'Transcribing...',
		translating: 'Translating...',
		speaking: 'Playing translation',
		error: errorText || 'Something went wrong',
	};

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 28 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
					<Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.nearBlack }}>Live Translation</Text>
					<TouchableOpacity
						activeOpacity={0.85}
						onPress={onClose}
						style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' }}
					>
						<Svg width={16} height={16} viewBox="0 0 16 16">
							<Path d="M3 3l10 10M13 3L3 13" stroke={COLORS.nearBlack} strokeWidth={1.8} strokeLinecap="round" />
						</Svg>
					</TouchableOpacity>
				</View>

				<Text style={{ marginTop: 8, fontSize: 13, color: COLORS.grayText }}>{statusText[state]}</Text>

				<View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
					<TouchableOpacity
						activeOpacity={0.85}
						onPress={() => {
							Haptics.selectionAsync();
							setForceDarijaSTT(v => !v);
						}}
						style={{
							borderWidth: 1.5,
							borderColor: forceDarijaSTT ? COLORS.gold : COLORS.grayBorder,
							backgroundColor: forceDarijaSTT ? 'rgba(212,175,55,0.12)' : COLORS.white,
							borderRadius: 16,
							height: 34,
							paddingHorizontal: 12,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Text style={{ fontSize: 12, fontWeight: '700', color: forceDarijaSTT ? COLORS.goldDark : COLORS.grayText }}>
							Force Darija STT
						</Text>
					</TouchableOpacity>
				</View>

				<Text style={{ marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: '700', color: COLORS.grayText }}>
					Translate to
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
					{TARGET_LANGS.map(l => {
						const active = l.code === targetLang;
						return (
							<TouchableOpacity
								key={l.code}
								activeOpacity={0.85}
								onPress={() => {
									Haptics.selectionAsync();
									setTargetLang(l.code);
								}}
								style={{
									borderWidth: 1.5,
									borderColor: active ? COLORS.gold : COLORS.grayBorder,
									backgroundColor: active ? 'rgba(212,175,55,0.12)' : COLORS.white,
									borderRadius: 18,
									paddingHorizontal: 12,
									height: 36,
									justifyContent: 'center',
								}}
							>
								<Text style={{ fontSize: 12, fontWeight: '700', color: active ? COLORS.goldDark : COLORS.nearBlack }}>
									{l.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>

				<TouchableOpacity
					activeOpacity={0.9}
					onPress={onReplayPress}
					style={{
						marginTop: 18,
						flex: 1,
						borderRadius: 24,
						borderWidth: 1.5,
						borderColor: COLORS.grayBorder,
						backgroundColor: '#FAFAF9',
						padding: 18,
					}}
				>
					<Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.grayText, textTransform: 'uppercase', letterSpacing: 1 }}>
						Translation ({selectedTargetLabel})
					</Text>
					<View style={{ flex: 1, justifyContent: 'center' }}>
						{translation ? (
							<Text style={{ fontSize: 34, lineHeight: 46, fontWeight: '700', color: COLORS.nearBlack }}>
								{translation}
							</Text>
						) : (
							<Text style={{ fontSize: 18, lineHeight: 28, color: COLORS.grayText }}>
								Record speech, then translation appears here in large text. Tap this panel to replay the saved audio.
							</Text>
						)}
					</View>
				</TouchableOpacity>

				<View style={{ marginTop: 14 }}>
					<Text style={{ fontSize: 12, color: COLORS.grayText }} numberOfLines={2}>
						Source: {sourceText || '—'}
					</Text>
					<Text style={{ fontSize: 12, color: COLORS.grayText, marginTop: 4 }}>
						Detected: {detectedLangCode || '—'}
					</Text>
				</View>

				<TouchableOpacity
					activeOpacity={0.88}
					onPress={onMicPress}
					style={{
						marginTop: 16,
						height: 56,
						borderRadius: 28,
						backgroundColor: state === 'recording' ? '#EF4444' : COLORS.gold,
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'row',
						gap: 10,
					}}
				>
					{(state === 'processing' || state === 'translating') && (
						<ActivityIndicator color={COLORS.white} />
					)}
					<Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.white }}>
						{state === 'recording' ? 'Stop recording' : state === 'speaking' ? 'Stop playback' : 'Record to Translate'}
					</Text>
				</TouchableOpacity>
			</View>
		</Modal>
	);
}

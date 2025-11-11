/**
 * Speech-to-Text Utilities
 * Supports 50+ languages using Web Speech API
 */

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  language: string;
  isFinal: boolean;
}

export interface SpeechRecognitionOptions {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// Supported languages with their ISO 639-1 codes and BCP 47 tags
export const SUPPORTED_SPEECH_LANGUAGES = {
  // Major languages
  en: { code: 'en-US', name: 'English (US)' },
  'en-GB': { code: 'en-GB', name: 'English (UK)' },
  'en-AU': { code: 'en-AU', name: 'English (Australia)' },
  'en-CA': { code: 'en-CA', name: 'English (Canada)' },
  'en-IN': { code: 'en-IN', name: 'English (India)' },
  es: { code: 'es-ES', name: 'Spanish (Spain)' },
  'es-MX': { code: 'es-MX', name: 'Spanish (Mexico)' },
  'es-AR': { code: 'es-AR', name: 'Spanish (Argentina)' },
  fr: { code: 'fr-FR', name: 'French (France)' },
  'fr-CA': { code: 'fr-CA', name: 'French (Canada)' },
  de: { code: 'de-DE', name: 'German' },
  it: { code: 'it-IT', name: 'Italian' },
  pt: { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  'pt-BR': { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  ru: { code: 'ru-RU', name: 'Russian' },
  ja: { code: 'ja-JP', name: 'Japanese' },
  ko: { code: 'ko-KR', name: 'Korean' },
  zh: { code: 'zh-CN', name: 'Chinese (Simplified)' },
  'zh-TW': { code: 'zh-TW', name: 'Chinese (Traditional)' },
  'zh-HK': { code: 'zh-HK', name: 'Chinese (Hong Kong)' },
  ar: { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  'ar-EG': { code: 'ar-EG', name: 'Arabic (Egypt)' },
  hi: { code: 'hi-IN', name: 'Hindi' },
  bn: { code: 'bn-IN', name: 'Bengali' },
  pa: { code: 'pa-IN', name: 'Punjabi' },
  te: { code: 'te-IN', name: 'Telugu' },
  ta: { code: 'ta-IN', name: 'Tamil' },
  mr: { code: 'mr-IN', name: 'Marathi' },
  nl: { code: 'nl-NL', name: 'Dutch' },
  pl: { code: 'pl-PL', name: 'Polish' },
  tr: { code: 'tr-TR', name: 'Turkish' },
  vi: { code: 'vi-VN', name: 'Vietnamese' },
  th: { code: 'th-TH', name: 'Thai' },
  id: { code: 'id-ID', name: 'Indonesian' },
  ms: { code: 'ms-MY', name: 'Malay' },
  // European languages
  sv: { code: 'sv-SE', name: 'Swedish' },
  no: { code: 'no-NO', name: 'Norwegian' },
  da: { code: 'da-DK', name: 'Danish' },
  fi: { code: 'fi-FI', name: 'Finnish' },
  cs: { code: 'cs-CZ', name: 'Czech' },
  sk: { code: 'sk-SK', name: 'Slovak' },
  hu: { code: 'hu-HU', name: 'Hungarian' },
  ro: { code: 'ro-RO', name: 'Romanian' },
  bg: { code: 'bg-BG', name: 'Bulgarian' },
  el: { code: 'el-GR', name: 'Greek' },
  hr: { code: 'hr-HR', name: 'Croatian' },
  sr: { code: 'sr-RS', name: 'Serbian' },
  uk: { code: 'uk-UA', name: 'Ukrainian' },
  he: { code: 'he-IL', name: 'Hebrew' },
  // Asian languages
  ur: { code: 'ur-PK', name: 'Urdu' },
  fa: { code: 'fa-IR', name: 'Persian' },
  ml: { code: 'ml-IN', name: 'Malayalam' },
  kn: { code: 'kn-IN', name: 'Kannada' },
  gu: { code: 'gu-IN', name: 'Gujarati' },
  // African languages
  sw: { code: 'sw-KE', name: 'Swahili' },
  zu: { code: 'zu-ZA', name: 'Zulu' },
  af: { code: 'af-ZA', name: 'Afrikaans' },
} as const;

/**
 * Client-side speech recognition class (Browser-based)
 * This should be used in the browser, not on the server
 */
export class SpeechToText {
  private recognition: any = null;
  private isListening: boolean = false;
  private language: string = 'en-US';

  constructor(language: string = 'en-US') {
    this.language = language;
  }

  /**
   * Check if speech recognition is supported in the browser
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Initialize speech recognition
   */
  initialize(options: SpeechRecognitionOptions): void {
    if (typeof window === 'undefined') {
      throw new Error('Speech recognition only works in browser environment');
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = options.language;
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;
    this.language = options.language;
  }

  /**
   * Start listening for speech
   */
  start(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: Error) => void
  ): void {
    if (!this.recognition) {
      throw new Error('Speech recognition not initialized');
    }

    if (this.isListening) {
      return;
    }

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      onResult({
        transcript,
        confidence,
        language: this.language,
        isFinal: result.isFinal,
      });
    };

    this.recognition.onerror = (event: any) => {
      if (onError) {
        onError(new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Abort listening
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

/**
 * Get language code for speech recognition from ISO 639-1 code
 */
export function getSpeechLanguageCode(isoCode: string): string {
  const langConfig = SUPPORTED_SPEECH_LANGUAGES[isoCode as keyof typeof SUPPORTED_SPEECH_LANGUAGES];
  return langConfig ? langConfig.code : 'en-US';
}

/**
 * Get all supported speech languages
 */
export function getSupportedSpeechLanguages(): Array<{
  isoCode: string;
  bcp47Code: string;
  name: string;
}> {
  return Object.entries(SUPPORTED_SPEECH_LANGUAGES).map(([isoCode, config]) => ({
    isoCode,
    bcp47Code: config.code,
    name: config.name,
  }));
}

/**
 * Check if a language is supported for speech recognition
 */
export function isSpeechLanguageSupported(isoCode: string): boolean {
  return isoCode in SUPPORTED_SPEECH_LANGUAGES;
}

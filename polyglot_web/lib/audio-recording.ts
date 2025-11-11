/**
 * Audio Recording and Playback Utilities
 * Handles voice message recording, playback, and storage
 */

export interface AudioRecordingResult {
  audioBlob: Blob;
  audioDurationMs: number;
  audioUrl: string; // Blob URL for playback
}

export interface AudioPlayerOptions {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Audio Recorder class for recording voice messages
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;

  /**
   * Check if audio recording is supported
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    if (!AudioRecorder.isSupported()) {
      throw new Error('Audio recording not supported in this browser');
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start();
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start recording: ${(error as Error).message}`);
    }
  }

  /**
   * Stop recording and return audio data
   */
  async stopRecording(): Promise<AudioRecordingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const audioDurationMs = Date.now() - this.startTime;
          const mimeType = this.getSupportedMimeType();
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);

          this.cleanup();

          resolve({
            audioBlob,
            audioDurationMs,
            audioUrl,
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without saving
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get recording duration in milliseconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording()) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }
}

/**
 * Audio Player class for playing voice messages
 */
export class AudioPlayer {
  private audio: HTMLAudioElement;
  private options: AudioPlayerOptions;

  constructor(audioUrl: string, options: AudioPlayerOptions = {}) {
    this.audio = new Audio(audioUrl);
    this.options = options;

    this.setupEventListeners();
  }

  /**
   * Set up audio event listeners
   */
  private setupEventListeners(): void {
    if (this.options.onTimeUpdate) {
      this.audio.addEventListener('timeupdate', () => {
        this.options.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
      });
    }

    if (this.options.onEnded) {
      this.audio.addEventListener('ended', () => {
        this.options.onEnded?.();
      });
    }

    if (this.options.onError) {
      this.audio.addEventListener('error', () => {
        this.options.onError?.(new Error('Audio playback error'));
      });
    }
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      throw new Error(`Failed to play audio: ${(error as Error).message}`);
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    this.audio.pause();
  }

  /**
   * Stop audio and reset to beginning
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  /**
   * Seek to specific time
   */
  seek(timeInSeconds: number): void {
    this.audio.currentTime = timeInSeconds;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set playback rate (0.5 to 2.0)
   */
  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2, rate));
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.audio.duration;
  }

  /**
   * Check if audio is playing
   */
  isPlaying(): boolean {
    return !this.audio.paused;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }
}

/**
 * Text-to-Speech for reading messages aloud
 */
export class TextToSpeech {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (!('speechSynthesis' in window)) {
      throw new Error('Text-to-speech not supported in this browser');
    }
    this.synthesis = window.speechSynthesis;
  }

  /**
   * Check if TTS is supported
   */
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  /**
   * Get voices for a specific language
   */
  getVoicesForLanguage(languageCode: string): SpeechSynthesisVoice[] {
    return this.getVoices().filter((voice) =>
      voice.lang.startsWith(languageCode)
    );
  }

  /**
   * Speak text
   */
  speak(
    text: string,
    options: {
      lang?: string;
      rate?: number; // 0.1 to 10
      pitch?: number; // 0 to 2
      volume?: number; // 0 to 1
      voice?: SpeechSynthesisVoice;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): void {
    // Cancel any ongoing speech
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (options.lang) utterance.lang = options.lang;
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    if (options.voice) utterance.voice = options.voice;

    if (options.onEnd) {
      utterance.onend = options.onEnd;
    }

    if (options.onError) {
      utterance.onerror = (event) => {
        options.onError?.(new Error(event.error));
      };
    }

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Cancel speech
   */
  cancel(): void {
    this.synthesis.cancel();
    this.currentUtterance = null;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.synthesis.paused;
  }
}

/**
 * Convert audio blob to base64 for encryption/storage
 */
export async function audioBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to audio blob
 */
export function base64ToAudioBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Format duration from milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

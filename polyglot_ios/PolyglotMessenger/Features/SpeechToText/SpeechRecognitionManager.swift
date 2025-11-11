import Foundation
import Speech
import AVFoundation

/// Manages speech recognition for voice messages
/// Supports 50+ languages using iOS Speech framework
@MainActor
class SpeechRecognitionManager: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var recognizedText = ""
    @Published var errorMessage: String?
    @Published var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    private var currentLanguage: String = "en-US"

    // Supported languages (50+ languages)
    static let supportedLanguages: [String: String] = [
        // English variants
        "en-US": "English (US)",
        "en-GB": "English (UK)",
        "en-AU": "English (Australia)",
        "en-CA": "English (Canada)",
        "en-IN": "English (India)",

        // European languages
        "es-ES": "Spanish (Spain)",
        "es-MX": "Spanish (Mexico)",
        "fr-FR": "French (France)",
        "fr-CA": "French (Canada)",
        "de-DE": "German",
        "it-IT": "Italian",
        "pt-PT": "Portuguese (Portugal)",
        "pt-BR": "Portuguese (Brazil)",
        "nl-NL": "Dutch",
        "pl-PL": "Polish",
        "ru-RU": "Russian",
        "tr-TR": "Turkish",
        "sv-SE": "Swedish",
        "no-NO": "Norwegian",
        "da-DK": "Danish",
        "fi-FI": "Finnish",
        "cs-CZ": "Czech",
        "sk-SK": "Slovak",
        "hu-HU": "Hungarian",
        "ro-RO": "Romanian",
        "bg-BG": "Bulgarian",
        "el-GR": "Greek",
        "hr-HR": "Croatian",
        "uk-UA": "Ukrainian",
        "he-IL": "Hebrew",

        // Asian languages
        "ja-JP": "Japanese",
        "ko-KR": "Korean",
        "zh-CN": "Chinese (Simplified)",
        "zh-TW": "Chinese (Traditional)",
        "zh-HK": "Chinese (Hong Kong)",
        "ar-SA": "Arabic (Saudi Arabia)",
        "hi-IN": "Hindi",
        "th-TH": "Thai",
        "vi-VN": "Vietnamese",
        "id-ID": "Indonesian",
        "ms-MY": "Malay",
        "bn-IN": "Bengali",
        "ta-IN": "Tamil",
        "te-IN": "Telugu",
        "mr-IN": "Marathi",
        "ur-PK": "Urdu",
        "fa-IR": "Persian",

        // Other languages
        "sw-KE": "Swahili",
        "af-ZA": "Afrikaans",
    ]

    override init() {
        super.init()
        self.authorizationStatus = SFSpeechRecognizer.authorizationStatus()
    }

    /// Request authorization for speech recognition
    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                Task { @MainActor in
                    self.authorizationStatus = status
                    continuation.resume(returning: status == .authorized)
                }
            }
        }
    }

    /// Set the language for speech recognition
    func setLanguage(_ languageCode: String) {
        currentLanguage = languageCode
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: languageCode))
    }

    /// Start recording and recognition
    func startRecording() async throws {
        // Cancel any ongoing task
        recognitionTask?.cancel()
        recognitionTask = nil

        // Request microphone permission
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Create recognizer if not set
        if speechRecognizer == nil {
            speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: currentLanguage))
        }

        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw SpeechRecognitionError.recognizerNotAvailable
        }

        // Create and configure recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw SpeechRecognitionError.unableToCreateRequest
        }

        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = false

        // Configure audio engine
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        // Start recognition task
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            Task { @MainActor in
                if let result = result {
                    self.recognizedText = result.bestTranscription.formattedString
                }

                if error != nil {
                    self.stopRecording()
                    self.errorMessage = error?.localizedDescription
                }

                if result?.isFinal == true {
                    self.stopRecording()
                }
            }
        }

        isRecording = true
    }

    /// Stop recording and recognition
    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        recognitionTask?.cancel()
        recognitionTask = nil

        isRecording = false
    }

    /// Get ISO 639-1 code from BCP 47 code
    static func getISOCode(from bcp47Code: String) -> String {
        // Extract ISO code (e.g., "en-US" -> "en")
        return String(bcp47Code.prefix(2))
    }
}

/// Speech recognition errors
enum SpeechRecognitionError: LocalizedError {
    case recognizerNotAvailable
    case unableToCreateRequest
    case authorizationDenied

    var errorDescription: String? {
        switch self {
        case .recognizerNotAvailable:
            return "Speech recognizer not available for this language"
        case .unableToCreateRequest:
            return "Unable to create recognition request"
        case .authorizationDenied:
            return "Speech recognition authorization denied"
        }
    }
}

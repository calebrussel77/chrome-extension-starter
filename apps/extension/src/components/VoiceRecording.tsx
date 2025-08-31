import { AnimatePresence, motion } from "framer-motion";
import { Copy, Mic, MicOff, Square, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { speechToText, translateText, smartTranslateText } from "../services/api";
import { addToHistory, getHistory } from "../services/storage";
import { HistoryItem, SmartTranslationConfig } from "../types";
import Button from "./Button";

interface VoiceRecordingProps {
  openaiApiKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  isAutoTranslate: boolean;
  microphonePermission: boolean | null;
  customInstructions: string;
  smartTranslation: boolean;
  smartTranslationConfig: SmartTranslationConfig;
  onError: (error: string) => void;
  onInputTextChange: (text: string) => void;
  onTranslatedTextChange: (text: string) => void;
  onHistoryUpdate: (history: HistoryItem[]) => void;
  inputText: string;
  translatedText: string;
}

const VoiceRecording: React.FC<VoiceRecordingProps> = ({
  openaiApiKey,
  sourceLanguage,
  targetLanguage,
  isAutoTranslate,
  microphonePermission,
  customInstructions,
  smartTranslation,
  smartTranslationConfig,
  onError,
  onInputTextChange,
  onTranslatedTextChange,
  onHistoryUpdate,
  inputText,
  translatedText,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    onError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError("Your browser does not support microphone access");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );
          analyserRef.current.getByteFrequencyData(dataArray);

          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255);

          if (isRecording) {
            animationRef.current = requestAnimationFrame(monitorAudioLevel);
          }
        }
      };

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        try {
          setIsProcessing(true);
          onError("");
          const transcribedText = await speechToText(audioBlob, openaiApiKey);
          onInputTextChange(transcribedText);

          // Add to history as transcription
          await addToHistory({
            type: "transcription",
            originalText: transcribedText,
            translatedText: transcribedText,
            sourceLanguage: "auto",
            targetLanguage: "auto",
          });

          // Auto-translate if enabled
          if (isAutoTranslate) {
            const result = smartTranslation
              ? await smartTranslateText(
                  transcribedText,
                  openaiApiKey,
                  smartTranslationConfig,
                  customInstructions
                )
              : await translateText(
                  transcribedText,
                  sourceLanguage,
                  targetLanguage,
                  openaiApiKey,
                  customInstructions
                );

            if (result.error) {
              onError(result.error);
            } else {
              onTranslatedTextChange(result.translatedText);

              // Add to history as translation
              await addToHistory({
                type: "translation",
                originalText: transcribedText,
                translatedText: result.translatedText,
                sourceLanguage: smartTranslation ? "auto" : sourceLanguage,
                targetLanguage: smartTranslation ? "auto" : targetLanguage,
              });
            }
          }

          // Refresh history
          const historyItems = await getHistory();
          onHistoryUpdate(historyItems);
        } catch (err) {
          console.error("Speech to text error:", err);
          onError(err instanceof Error ? err.message : "An error occurred");
        } finally {
          setIsProcessing(false);
        }

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start audio level monitoring
      monitorAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          onError(
            "Microphone access denied. Please check your browser settings."
          );
        } else if (error.name === "NotFoundError") {
          onError("No microphone was found on your device.");
        } else {
          onError(`Microphone access error: ${error.message}`);
        }
      } else {
        onError("Failed to access microphone for an unknown reason");
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      setAudioLevel(0);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy error:", err);
      onError("Failed to copy to clipboard");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Recording Interface */}
      <div className="flex flex-col items-center space-y-6">
        {/* Status Text */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Voice to Text
          </h3>
          <p className="text-sm text-gray-600">
            {isProcessing
              ? "Processing your voice..."
              : isRecording
              ? "Listening... Speak clearly into your microphone"
              : microphonePermission === false
              ? "Microphone access required"
              : "Press the button to start recording"}
          </p>
        </div>

        {/* Recording Visualization */}
        <div className="relative">
          {/* Pulse rings for recording state */}
          {isRecording && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400 opacity-20"
                animate={{
                  scale: [1, 1.5 + audioLevel * 0.5],
                  opacity: [0.2, 0.1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400 opacity-30"
                animate={{
                  scale: [1, 1.3 + audioLevel * 0.3],
                  opacity: [0.3, 0.1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5,
                }}
              />
            </>
          )}

          {/* Main Recording Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-10"
          >
            <Button
              variant={isRecording ? "secondary" : "primary"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={
                !openaiApiKey ||
                microphonePermission === false ||
                isProcessing
              }
              className={`
                relative w-20 h-20 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-300
                ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                }
              `}
            >
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center justify-center"
                  >
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                ) : isRecording ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Square size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Mic size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>

        {/* Timer and Audio Level */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center space-y-3"
            >
              {/* Timer */}
              <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-full border border-red-200">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-lg font-mono font-semibold text-red-700">
                  {formatTime(recordingTime)}
                </span>
              </div>

              {/* Audio Level Indicator */}
              <div className="flex items-center space-x-2">
                <Volume2 size={16} className="text-gray-500" />
                <div className="flex space-x-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <motion.div
                      key={i}
                      className={`w-1 h-4 rounded-full ${
                        audioLevel * 10 > i ? "bg-green-500" : "bg-gray-200"
                      }`}
                      animate={{
                        height: audioLevel * 10 > i ? [16, 20, 16] : 16,
                      }}
                      transition={{
                        duration: 0.3,
                        repeat: audioLevel * 10 > i ? Infinity : 0,
                        repeatType: "reverse",
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Indicator */}
        <div className="text-center">
          <AnimatePresence>
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center space-x-2 text-blue-600"
              >
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Processing audio...</span>
              </motion.div>
            ) : isRecording ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center space-x-2 text-red-600"
              >
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  Recording in progress
                </span>
              </motion.div>
            ) : microphonePermission === false ? (
              <motion.div
                key="permission"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center space-x-2 text-amber-600"
              >
                <MicOff size={16} />
                <span className="text-sm font-medium">
                  Microphone access required
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-green-600"
              >
                Ready to record
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Transcribed Text */}
        <AnimatePresence>
          {inputText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 bg-blue-100 border-b border-blue-200">
                <div className="flex items-center space-x-2">
                  <Mic size={16} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">
                    Transcribed Text
                  </h4>
                </div>
                <button
                  onClick={() => copyToClipboard(inputText)}
                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-md transition-colors duration-200"
                  title="Copy transcribed text"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {inputText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translation Result */}
        <AnimatePresence>
          {translatedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 bg-green-100 border-b border-green-200">
                <div className="flex items-center space-x-2">
                  <Volume2 size={16} className="text-green-600" />
                  <h4 className="text-sm font-semibold text-green-800">
                    Translation
                  </h4>
                </div>
                <button
                  onClick={() => copyToClipboard(translatedText)}
                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-md transition-colors duration-200"
                  title="Copy translation"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {translatedText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VoiceRecording;

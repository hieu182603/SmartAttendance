import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceFeedbackState {
  voiceEnabled: boolean;
  isSpeaking: boolean;
  lastMessage: string;
}

export interface VoiceFeedbackActions {
  speakMessage: (text: string) => void;
  toggleVoice: () => void;
  cancelSpeech: () => void;
}

export const useVoiceFeedback = (): VoiceFeedbackState & VoiceFeedbackActions => {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const viVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return;

        viVoiceRef.current =
          voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ||
          voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
          voices[0];
      };

      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    } else {
      setVoiceEnabled(false);
    }

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  const speakMessage = useCallback((text: string) => {
    if (!voiceEnabled || !speechSynthesisRef.current || isSpeaking) return;

    try {
      speechSynthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      if (viVoiceRef.current) {
        utterance.voice = viVoiceRef.current;
        utterance.lang = viVoiceRef.current.lang;
      }

      setIsSpeaking(true);
      setLastMessage(text);

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      speechSynthesisRef.current.speak(utterance);
    } catch (error) {
      console.warn("Speech synthesis error:", error);
      setIsSpeaking(false);
    }
  }, [voiceEnabled, isSpeaking]);

  const toggleVoice = useCallback(() => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);

    if (!newVoiceEnabled && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  const cancelSpeech = useCallback(() => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    voiceEnabled,
    isSpeaking,
    lastMessage,
    speakMessage,
    toggleVoice,
    cancelSpeech,
  };
};



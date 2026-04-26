import * as Speech from 'expo-speech';

/**
 * Constructs a natural reminder sentence and speaks it aloud.
 * Falls back gracefully if expo-speech is unavailable.
 */
export const playReminderVoice = (
  userName: string,
  medName: string,
  howItWorks?: string
) => {
  let message = `Hi ${userName}, it's time for your ${medName}.`;

  if (howItWorks) {
    // Keep it short — take the first sentence only
    const firstSentence = howItWorks.split('.')[0];
    message += ` ${firstSentence}.`;
  }

  message += ` Have you taken it?`;

  Speech.speak(message, {
    language: 'en-IN',
    pitch: 1.0,
    rate: 0.9,
  });
};

/**
 * Speak any given text with default or custom options.
 */
export const speakText = (text: string, options?: Speech.SpeechOptions) => {
  Speech.speak(text, {
    language: 'en-IN',
    pitch: 1.0,
    rate: 0.9,
    ...options,
  });
};

/**
 * Stop any ongoing speech.
 */
export const stopSpeech = () => {
  Speech.stop();
};

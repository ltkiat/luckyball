/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  preferredVoice =
    voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        (/CN|Hans|大陆|普通话|Tingting|Meijia|Sin-Ji|Yu-shu/i.test(v.name) ||
          v.lang === "zh-CN"),
    ) ??
    voices.find((v) => v.lang.startsWith("zh")) ??
    null;
  voicesReady = voices.length > 0;
  return preferredVoice;
}

/** 预加载语音列表（需在用户交互后调用一次） */
export function warmUpSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  pickChineseVoice();
  if (!voicesReady) {
    window.speechSynthesis.onvoiceschanged = () => {
      pickChineseVoice();
      voicesReady = true;
    };
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  warmUpSpeech();
}

/** 播报「收到 N 分」 */
export function speakReceivedPoints(points: number, enabled = true): void {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  if (points <= 0) return;

  const doSpeak = () => {
    try {
      const utterance = new SpeechSynthesisUtterance(`收到${points}分`);
      utterance.lang = "zh-CN";
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      const voice = pickChineseVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech failed", e);
    }
  };

  warmUpSpeech();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    const onReady = () => {
      pickChineseVoice();
      doSpeak();
      window.speechSynthesis.removeEventListener("voiceschanged", onReady);
    };
    window.speechSynthesis.addEventListener("voiceschanged", onReady);
    setTimeout(doSpeak, 400);
  }
}

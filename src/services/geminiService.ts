import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

// We create a new instance per request to ensure it uses the most up-to-date API key
// especially after the user selects one via the dialog.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

// Global concurrency state
let isProcessingImage = false;
let isProcessingSpeech = false;
let lastImageRequestTime = 0;
let lastSpeechRequestTime = 0;

/**
 * Helper to retry a function if it fails with a 429 (Rate Limit) error.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      // Add a small mandatory throttle to prevent "burst" slamming
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 0));
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Robust error parsing
      let errorMessage = "";
      let errorCode = 0;
      let errorStatus = "";
      
      try {
        errorMessage = error.message || "";
        errorCode = error.code || error.response?.status || 0;
        errorStatus = error.status || "";
        
        // If message is a JSON string, extract details
        if (errorMessage.startsWith('{') || errorMessage.includes('"error"')) {
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            errorCode = parsed.error?.code || errorCode;
            errorMessage = parsed.error?.message || errorMessage;
            errorStatus = parsed.error?.status || errorStatus;
          }
        }
      } catch (e) {
        errorMessage = String(error);
      }
      
      const isQuotaError = 
        errorCode === 429 || 
        errorStatus === "RESOURCE_EXHAUSTED" ||
        errorMessage.includes("RESOURCE_EXHAUSTED") || 
        errorMessage.includes("429") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("Rate limit");

      if (isQuotaError && i < maxRetries) {
        const backoff = delay * Math.pow(2.5, i);
        console.warn(`Gemini Quota exceeded, retrying in ${backoff}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Enhanced Mutex with throttling for high-cost operations.
 * Ensures minimum gap between requests of the same type.
 */
async function sequentialExecution<T>(type: 'image' | 'speech', fn: () => Promise<T>): Promise<T> {
  const check = () => (type === 'image' ? isProcessingImage : isProcessingSpeech);
  const set = (val: boolean) => {
    if (type === 'image') isProcessingImage = val;
    else isProcessingSpeech = val;
  };
  const getLastTime = () => (type === 'image' ? lastImageRequestTime : lastSpeechRequestTime);
  const setLastTime = (val: number) => {
    if (type === 'image') lastImageRequestTime = val;
    else lastSpeechRequestTime = val;
  };

  // 1. Wait turn in mutex
  while (check()) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 2. Enforce minimum gap (2s for speech, 10s for images)
  const minGap = type === 'image' ? 10000 : 2000;
  const timeSinceLast = Date.now() - getLastTime();
  if (timeSinceLast < minGap) {
    await new Promise(resolve => setTimeout(resolve, minGap - timeSinceLast));
  }

  set(true);
  try {
    const result = await fn();
    setLastTime(Date.now());
    return result;
  } finally {
    set(false);
  }
}

// 1. Fast AI responses (gemini-3-flash-preview)
export async function getFastTranslation(word: string) {
  return withRetry(async () => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following English word to Hawaiian, and provide a short example sentence in Hawaiian and English. Also provide a phonetic pronunciation guide for the Hawaiian word. Format as JSON: { "hawaiian": "word", "english": "translation", "pronunciation": "phonetic breakdown", "exampleHawaiian": "sentence", "exampleEnglish": "translation" }: ${word}`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "{}");
  });
}

// 2. Transcribe audio (gemini-3-flash-preview)
export async function transcribeAudio(base64Audio: string, mimeType: string) {
  return withRetry(async () => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
          {
            text: "Transcribe the following audio in Hawaiian. If it's English, transcribe it in English. Just provide the transcription text.",
          }
        ]
      },
    });
    return response.text;
  });
}

// 3. Generate speech (gemini-2.5-flash-preview-tts)
export async function generateSpeech(text: string) {
  return sequentialExecution('speech', () => withRetry(async () => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }, 4, 4000));
}

export function playAudioBase64(base64Data: string): Promise<void> & { stop?: () => void } {
  let audioContext: AudioContext | null = null;
  
  const promise = new Promise<void>((resolve) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (audioContext) {
          audioContext.close();
        }
        resolve();
      };
      source.start();
    } catch (error) {
      console.error("Failed to play audio:", error);
      if (audioContext) {
        audioContext.close();
      }
      resolve();
    }
  });

  (promise as any).stop = () => {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
  };

  return promise as Promise<void> & { stop: () => void };
}

// 4. Think more when needed (gemini-3.1-pro-preview with ThinkingLevel.HIGH)
export async function explainGrammar(query: string) {
  return withRetry(async () => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Explain the following Hawaiian grammar concept or cultural nuance in detail: ${query}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });
    return response.text;
  });
}

// 5. Video understanding (gemini-3.1-pro-preview)
export async function analyzeVideo(base64Video: string, mimeType: string, prompt: string) {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Video,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        }
      ]
    },
  });
  return response.text;
}

// 6. AI powered chatbot (gemini-3.1-pro-preview)
export function createChatSession() {
  const ai = getAi();
  return ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: "You are a Hawaiian language instructor avatar named Kumu. You embody Hawaiian values (aloha, kuleana, mālama). You are warm, encouraging, and authentic. You help users learn Hawaiian language and culture. Correct their mistakes gently and provide cultural context. Keep your responses concise and conversational.",
    },
  });
}

// 7. Generate images (gemini-2.5-flash-image by default, upgrade to 3.1 for high-quality)
export async function generateCulturalImage(prompt: string, size: "512px" | "1K" | "2K" | "4K" = "1K") {
  return sequentialExecution('image', () => withRetry(async () => {
    const ai = getAi();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              text: `A beautiful, high-quality image representing Hawaiian culture: ${prompt}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      console.error("Image generation error:", error);
      // If 403, it might be a permission issue with the model or key
      if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("403")) {
        throw new Error("Permission denied for image generation. Please ensure you have a valid API key with billing enabled if using high-quality models.");
      }
      throw error;
    }
  }, 6, 12000)); // Even more retries (6) and longer start delay (12s) for image tasks
}

/**
 * Handles common Gemini API errors, specifically status 429 (Resource Exhausted).
 */
export function handleGeminiError(error: any): string {
  console.error("Gemini API Error:", error);
  
  const errorMessage = error.message || "";
  const errorStatus = error.status || "";
  const errorCode = error.code || (error.response?.status);

  if (errorCode === 429 || errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
    return "The AI is currently busy with high-quality tasks. Please wait about 30 seconds and click 'Retry' if available. Image and speech generation share a strict limit.";
  }
  
  if (errorCode === 403 || errorMessage.includes("PERMISSION_DENIED")) {
    return "Access denied. This feature may require a valid API key with appropriate permissions or billing enabled.";
  }

  return "An unexpected AI error occurred. Please try again in a moment.";
}

// 8. Use Google Search data (gemini-3-flash-preview with googleSearch)
export async function searchCulturalEvents(query: string) {
  return withRetry(async () => {
    const ai = getAi();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for recent or upcoming Hawaiian cultural events, news, or language resources related to: ${query}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      return {
        text: response.text,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
      };
    } catch (error: any) {
      console.error("Search error:", error);
      // Fallback to normal generation if search tool is restricted
      if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("403")) {
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Provide information about Hawaiian cultural events, news, or resources related to: ${query} (Note: I'm providing this from my internal knowledge as real-time search is currently unavailable).`,
        });
        return {
          text: fallbackResponse.text,
          groundingChunks: [],
        };
      }
      throw error;
    }
  });
}

// 9. Process PDF exercises (gemini-3.1-pro-preview)
export async function processExercises(pdfText: string) {
  return withRetry(async () => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Role: Lead Instructional Designer & Media Producer. Task: You are processing a text containing numbered exercises. Your goal is to transform every single exercise into a structured slide format.
      
      Text:
      ${pdfText}
      
      For each exercise, provide:
      Slide Number & Title
      Refined Narrative Script (TTS ready)
      Cognitive Domain: Identify the Bloom's Taxonomy level (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating).
      Image Prompt: A concise, high-quality prompt for a 3D Pixar-style generator.
      
      Output Format: Use a clear, formatted list for each slide.`,
    });
    return response.text;
  });
}

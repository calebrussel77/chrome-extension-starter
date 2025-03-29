import OpenAI from "openai";
import { TranslationResponse } from "../types";

/**
 * Translates text using OpenAI's GPT-4o model
 * @param text The text to translate
 * @param sourceLanguage The source language code (or 'auto' for auto-detection)
 * @param targetLanguage The target language code
 * @param apiKey The OpenAI API key
 * @returns A promise that resolves to the translation response
 */
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string
): Promise<TranslationResponse> => {
  try {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const sourcePrompt =
      sourceLanguage === "auto"
        ? "Detect the language and then translate"
        : `Translate from ${sourceLanguage}`;

    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. ${sourcePrompt} to ${targetLanguage}. I am a Web Developer, so the text may contain technical terms in English that should not be translated (like programming language keywords, function names, variable names, etc.). Only respond with the translated text, nothing else.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
    });

    return {
      translatedText: completion.choices[0].message.content?.trim() ?? "",
      detectedLanguage:
        sourceLanguage === "auto" ? "auto-detected" : sourceLanguage,
    };
  } catch (error) {
    console.error("Translation error:", error);

    if (error instanceof OpenAI.APIError) {
      return {
        translatedText: "",
        error: error.message,
      };
    }

    return {
      translatedText: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Converts speech to text using OpenAI's API
 * @param audioBlob The audio blob to transcribe
 * @param apiKey The OpenAI API key
 * @returns A promise that resolves to the transcribed text
 */
export const speechToText = async (
  audioBlob: Blob,
  apiKey: string
): Promise<string> => {
  try {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    // Convert Blob to File with appropriate format
    const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1", // Utiliser whisper-1 comme indiqué dans la documentation
      response_format: "text",
    });

    return transcription;
  } catch (error) {
    console.error("Speech to text error:", error);
    throw error;
  }
};

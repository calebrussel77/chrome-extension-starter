import { GoogleGenAI } from "@google/genai";
import dedent from "dedent";
import OpenAI from "openai";
import { TranslationResponse } from "../types";

/**
 * Translates text using Google Gemini model
 * @param text The text to translate
 * @param sourceLanguage The source language code (or 'auto' for auto-detection)
 * @param targetLanguage The target language code
 * @param googleApiKey The Google Gemini API key
 * @param customInstructions Optional custom instructions to provide additional context for translation
 * @returns A promise that resolves to the translation response
 */
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  googleApiKey: string,
  customInstructions?: string
): Promise<TranslationResponse> => {
  try {
    if (!googleApiKey) {
      throw new Error("Google API key is required");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const genAI = new GoogleGenAI({
      apiKey: googleApiKey,
    });

    // Construct the system prompt based on source language
    let systemPrompt = dedent`
    You are an expert translator. ${
      sourceLanguage === "auto"
        ? "Detect the source language and translate the following text"
        : `Translate the following text from ${sourceLanguage}`
    } to ${targetLanguage}.

 - The current time is ${new Date().toLocaleString()} (${
      Intl.DateTimeFormat().resolvedOptions().timeZone
    } timezone).
 - Crucially, preserve any technical terms, code snippets, variable names, or keywords that appear in the original text, especially those related to programming or web development. Do not translate these specific elements.
 - Provide ONLY the translated text as your response, without any additional commentary, explanations, or formatting.
`;

    // Add custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += dedent`
      <important-rules>
        The following instructions take precedence over all other instructions:
        ${customInstructions.trim()}
      </important-rules>
      `;
    }

    // Create the full prompt combining system instructions and user text
    const fullPrompt = `${systemPrompt}\n\nText to translate:\n${text}`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20", // Using Gemini 2.5 Flash for fast translation
      contents: fullPrompt,
      config: {
        temperature: 0.3, // Keep temperature low for more deterministic translation
        maxOutputTokens: 2048,
      },
    });

    // Extract the translated text
    const translatedText = response.text?.trim() ?? "";

    // Note: Gemini doesn't directly return detected language in a structured way
    // We assume auto-detection worked if sourceLanguage was 'auto'.
    // A more robust solution might involve a separate call or prompt engineering
    // to ask the model for the detected language, but for simplicity, we'll
    // indicate 'auto-detected' if the source was 'auto'.
    const detectedLanguage =
      sourceLanguage === "auto" ? "auto-detected" : sourceLanguage;

    return {
      translatedText: translatedText,
      detectedLanguage: detectedLanguage,
    };
  } catch (error) {
    console.error("Translation error:", error);

    if (error instanceof Error) {
      // Handle standard JavaScript errors
      return {
        translatedText: "",
        error: `Translation failed: ${error.message}`,
      };
    } else {
      // Handle unexpected errors
      return {
        translatedText: "",
        error: "An unknown error occurred during translation.",
      };
    }
  }
};

/**
 * Converts speech to text using OpenAI's API
 * @param audioBlob The audio blob to transcribe
 * @param openaiApiKey The OpenAI API key
 * @returns A promise that resolves to the transcribed text
 */
export const speechToText = async (
  audioBlob: Blob,
  openaiApiKey: string
): Promise<string> => {
  try {
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is required");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
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

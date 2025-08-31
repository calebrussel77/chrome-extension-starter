import dedent from "dedent";
import OpenAI from "openai";
import { LANGUAGES } from "../languages";
import { SmartTranslationConfig, TranslationResponse } from "../types";

/**
 * Translates text using OpenAI model
 * @param text The text to translate
 * @param sourceLanguage The source language code (or 'auto' for auto-detection)
 * @param targetLanguage The target language code
 * @param openaiApiKey The OpenAI API key
 * @param customInstructions Optional custom instructions to provide additional context for translation
 * @returns A promise that resolves to the translation response
 */
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  openaiApiKey: string,
  customInstructions?: string
): Promise<TranslationResponse> => {
  try {
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is required");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true,
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14", // Using Gpt-4.1-nano-2025-04-14 for fast and cost-effective translation
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Text to translate:\n${text}`,
        },
      ],
      temperature: 0.3, // Keep temperature low for more deterministic translation
      max_tokens: 2048,
    });

    // Extract the translated text
    const translatedText = response.choices[0]?.message?.content?.trim() ?? "";

    // Note: OpenAI doesn't directly return detected language in a structured way
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
 * Smart translation that auto-detects and translates between configured language pairs
 * @param text The text to translate
 * @param openaiApiKey The OpenAI API key
 * @param smartConfig The smart translation configuration (language pairs)
 * @param customInstructions Optional custom instructions to provide additional context for translation
 * @returns A promise that resolves to the translation response
 */
export const smartTranslateText = async (
  text: string,
  openaiApiKey: string,
  smartConfig: SmartTranslationConfig,
  customInstructions?: string
): Promise<TranslationResponse> => {
  try {
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is required");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true,
    });

    // Get language names for the prompt
    const primaryLang = LANGUAGES.find(lang => lang.code === smartConfig.primaryLanguage)?.name || smartConfig.primaryLanguage;
    const secondaryLang = LANGUAGES.find(lang => lang.code === smartConfig.secondaryLanguage)?.name || smartConfig.secondaryLanguage;
    const fallbackLang = LANGUAGES.find(lang => lang.code === smartConfig.fallbackLanguage)?.name || smartConfig.fallbackLanguage;

    // Smart translation system prompt
    let systemPrompt = dedent`
    You are an expert translator specializing in ${primaryLang} and ${secondaryLang} with deep knowledge of modern slang, abbreviations, and cultural expressions.
    
    Your task is to:
    1. Auto-detect the language of the provided text
    2. If the text is in ${primaryLang}, translate it to ${secondaryLang}
    3. If the text is in ${secondaryLang}, translate it to ${primaryLang}
    4. If the text is in neither ${primaryLang} nor ${secondaryLang}, translate it to ${fallbackLang}
    
    ${smartConfig.primaryLanguage === 'en' || smartConfig.secondaryLanguage === 'en' || smartConfig.fallbackLanguage === 'en' ? `
    CRITICAL - American Expressions & Abbreviations Knowledge:
    You must properly understand and translate common American expressions, slang, and abbreviations including but not limited to:
    
    Common abbreviations: btw (by the way), tbd (to be determined), tldr (too long didn't read), imo/imho (in my opinion/humble), fyi (for your information), asap (as soon as possible), aka (also known as), etc (et cetera), nvm (never mind), omg (oh my god), lol (laugh out loud), brb (be right back), ttyl (talk to you later), irl (in real life), jk (just kidding), smh (shaking my head), rn (right now), tbh (to be honest), idk (I don't know), ikr (I know right), dm (direct message), rt (retweet), af (as f***), wth/wtf (what the hell/f***), gg (good game), ez (easy), op (original poster/overpowered)
    
    Slang terms: dude, bro, man, guys (when addressing people), cool, awesome, sick (meaning good), fire (excellent), lit (amazing), salty (upset), flex (show off), vibe/vibes, squad, fam, bestie, sus (suspicious), cap/no cap (lie/truth), periodt, slay, stan, ghost/ghosting, simp, karen, based, cringe, chad, boomer, zoomer, millennial, gen z, mood, bet (yes/agreed), facts, lowkey/highkey, deadass, fr/for real, no shot, mid (mediocre), bussin (excellent), slaps (sounds good), hits different, rent free, living for it, that's on me, my bad, catch these hands, spill the tea, throwing shade, coming for someone, pressed, triggered, woke, canceled, problematic, valid, chief (as in "this ain't it chief"), it's giving (it seems like), purr, and period/periodT
    
    Contextual expressions: "I'm dead" (very funny), "that's fire" (that's great), "no cap" (no lie), "it hits different" (it's uniquely good), "that's sus" (suspicious), "living rent free in my head" (can't stop thinking about it), "spill the tea" (tell me the gossip), "throwing shade" (subtle insult), "that's a vibe" (good feeling), "sending me" (making me laugh), "I can't even" (overwhelmed), "this slaps" (this is great), "lowkey/highkey" (somewhat/definitely), "periodt" (end of discussion), "we stan" (we support), "it's giving..." (it seems like/reminds me of)
    ` : ''}
    
    Important translation guidelines:
    - The current time is ${new Date().toLocaleString()} (${
      Intl.DateTimeFormat().resolvedOptions().timeZone
    } timezone).
    - Preserve any technical terms, code snippets, variable names, or keywords that appear in the original text, especially those related to programming or web development. Do not translate these specific elements.
    - Use proper spelling, vocabulary, and expressions appropriate for each language
    - When translating slang or colloquial expressions, find the most natural equivalent in the target language rather than literal translation
    - When translating abbreviations, either expand them in the target language or use equivalent abbreviations if they exist
    - Maintain the tone and register of the original text (formal, casual, technical, etc.)
    - Provide ONLY the translated text as your response, without any additional commentary, explanations, or formatting.
    - Do not include phrases like "Here is the translation:" or similar - just provide the direct translation.
    `;

    // Add custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += dedent`
      
      <important-rules>
        The following instructions take precedence over the base translation rules:
        ${customInstructions.trim()}
      </important-rules>
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14", // Using Gpt-4.1-nano-2025-04-14 for fast and cost-effective translation
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Text to translate:\n${text}`,
        },
      ],
      temperature: 0.3, //Keep temperature low for more deterministic translation
      max_tokens: 2048,
    });

    // Extract the translated text
    const translatedText = response.choices[0]?.message?.content?.trim() ?? "";

    return {
      translatedText: translatedText,
      detectedLanguage: "auto-detected", // We let the AI determine the source language
    };
  } catch (error) {
    console.error("Smart translation error:", error);

    if (error instanceof Error) {
      // Handle standard JavaScript errors
      return {
        translatedText: "",
        error: `Smart translation failed: ${error.message}`,
      };
    } else {
      // Handle unexpected errors
      return {
        translatedText: "",
        error: "An unknown error occurred during smart translation.",
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

// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI with API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

/**
 * Available Gemini models for different use cases
 */
export const GEMINI_MODELS = {
  // Text generation models
  FLASH: 'gemini-2.0-flash-exp',
  PRO: 'gemini-1.5-pro',
  PRO_PREVIEW: 'gemini-3-pro-preview',
  
  // Image generation models (multimodal)
  PRO_IMAGE: 'gemini-3-pro-image-preview',
  
  // Thinking models
  PRO_THINKING: 'gemini-3-pro-preview',
} as const;

/**
 * Generate text content using Gemini
 */
export async function generateText(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    thinkingLevel?: 'low' | 'medium' | 'high';
  }
) {
  try {
    const config: any = {
      temperature: options?.temperature || 0.7,
      maxOutputTokens: options?.maxTokens || 8192,
    };

    // Add thinking config if specified
    if (options?.thinkingLevel) {
      config.thinkingConfig = {
        thinkingLevel: options.thinkingLevel
      };
    }

    const response = await ai.models.generateContent({
      model: options?.model || GEMINI_MODELS.PRO_PREVIEW,
      contents: prompt,
      config
    });

    return response.text;
  } catch (error) {
    console.error('Gemini text generation error:', error);
    throw error;
  }
}

/**
 * Generate image using Gemini with multimodal model
 */
export async function generateImage(
  prompt: string,
  options?: {
    model?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages?: number;
  }
) {
  try {
    const config: any = {
      responseModalities: ['TEXT', 'IMAGE'],
      tools: [{ googleSearch: {} }],
    };

    const chat = ai.chats.create({
      model: options?.model || GEMINI_MODELS.PRO_IMAGE,
      config
    });

    const response = await chat.sendMessage({ message: prompt });
    
    const images: string[] = [];
    let textContent = '';

    // Extract images and text from response with proper type guards
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textContent += part.text;
        } else if (part.inlineData?.data) {
          images.push(part.inlineData.data);
        }
      }
    }

    return {
      images,
      text: textContent
    };
  } catch (error) {
    console.error('Gemini image generation error:', error);
    throw error;
  }
}

/**
 * Generate content with both text and images (multimodal)
 */
export async function generateMultimodalContent(
  prompt: string,
  options?: {
    includeImages?: boolean;
    model?: string;
    useGoogleSearch?: boolean;
  }
) {
  try {
    const config: any = {
      responseModalities: options?.includeImages !== false ? ['TEXT', 'IMAGE'] : ['TEXT'],
    };

    if (options?.useGoogleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const chat = ai.chats.create({
      model: options?.model || GEMINI_MODELS.PRO_IMAGE,
      config
    });

    const response = await chat.sendMessage({ message: prompt });
    
    const textParts: string[] = [];
    const imageParts: string[] = [];

    // Extract text and images with proper type guards
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textParts.push(part.text);
        } else if (part.inlineData?.data) {
          imageParts.push(part.inlineData.data);
        }
      }
    }

    return {
      text: textParts.join('\n'),
      images: imageParts
    };
  } catch (error) {
    console.error('Gemini multimodal generation error:', error);
    throw error;
  }
}

/**
 * Create a chat session with Gemini
 */
export async function createChat(
  systemInstruction?: string,
  options?: {
    model?: string;
    temperature?: number;
    includeImages?: boolean;
    useGoogleSearch?: boolean;
  }
) {
  const config: any = {
    responseModalities: options?.includeImages ? ['TEXT', 'IMAGE'] : ['TEXT'],
    temperature: options?.temperature || 0.7,
  };

  if (options?.useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const chat = ai.chats.create({
    model: options?.model || GEMINI_MODELS.PRO_IMAGE,
    config
  });

  return {
    sendMessage: async (message: string) => {
      const response = await chat.sendMessage({ message });
      
      const textParts: string[] = [];
      const imageParts: string[] = [];

      // Extract with proper type guards
      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            textParts.push(part.text);
          } else if (part.inlineData?.data) {
            imageParts.push(part.inlineData.data);
          }
        }
      }

      return {
        text: textParts.join('\n'),
        images: imageParts
      };
    }
  };
}

/**
 * Generate content with thinking (reasoning)
 */
export async function generateWithThinking(
  prompt: string,
  options?: {
    thinkingLevel?: 'low' | 'medium' | 'high';
    model?: string;
  }
) {
  try {
    const config: any = {};
    
    if (options?.thinkingLevel) {
      config.thinkingConfig = {
        thinkingLevel: options.thinkingLevel
      };
    }

    const response = await ai.models.generateContent({
      model: options?.model || GEMINI_MODELS.PRO_THINKING,
      contents: prompt,
      config
    });

    return response.text || '';
  } catch (error) {
    console.error('Gemini thinking generation error:', error);
    throw error;
  }
}

export default ai;

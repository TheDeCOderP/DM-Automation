// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI with API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

/**
 * Retry utility with exponential backoff for handling temporary API failures
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 2,
    initialDelay = 1000,
    maxDelay = 5000,
    operationName = 'API call'
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        console.log(`[RETRY] ⏳ Attempt ${attempt + 1}/${maxRetries + 1} for ${operationName} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Log the actual error for debugging
      console.error(`[RETRY] Error details:`, {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.constructor?.name
      });
      
      // Check if error is retryable
      const isNetworkError = error?.message?.includes('fetch failed') || 
                            error?.message?.includes('ECONNREFUSED') ||
                            error?.message?.includes('ETIMEDOUT') ||
                            error?.message?.includes('network');
      
      const isRetryable = error?.status === 503 || error?.code === 503 || 
                          error?.status === 429 || error?.code === 429 ||
                          error?.message?.includes('high demand') ||
                          error?.message?.includes('rate limit') ||
                          isNetworkError;
      
      if (!isRetryable || attempt === maxRetries) {
        if (attempt > 0) {
          console.error(`[RETRY] ❌ Failed after ${attempt + 1} attempts for ${operationName}`);
        }
        
        // Provide more helpful error message for network errors
        if (isNetworkError) {
          throw new Error(`Network error: Unable to connect to AI service. Please check your internet connection and try again.`);
        }
        
        throw error;
      }
      
      console.warn(`[RETRY] ⚠️  ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error?.message || 'Unknown error'}`);
    }
  }
  
  throw lastError;
}

/**
 * Available Gemini models for different use cases
 * See: https://ai.google.dev/gemini-api/docs/models/gemini
 */
export const GEMINI_MODELS = {
  // Gemini 3 models (latest, most intelligent)
  GEMINI_3_PRO: 'gemini-3-pro-preview',
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image-preview',
  
  // Gemini 2.5 models (stable, production-ready)
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image',
  
  // Gemini 2.0 models (deprecated, will be shut down March 31, 2026)
  GEMINI_2_0_FLASH: 'gemini-2.0-flash-exp',
  
  // Aliases for backward compatibility
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.5-pro',
  PRO_PREVIEW: 'gemini-3-flash-preview',  // Use Gemini 3 Flash for best balance
  PRO_IMAGE: 'gemini-2.5-flash-image',
  PRO_THINKING: 'gemini-2.5-pro',
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
  }
) {
  try {
    const response = await ai.models.generateContent({
      model: options?.model || GEMINI_MODELS.GEMINI_2_5_FLASH,
      contents: prompt,
      config: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxTokens || 8192,
      }
    });

    return response.text;
  } catch (error: any) {
    console.error('Gemini text generation error:', error);
    
    // Create a user-friendly error object
    const errorResponse = {
      code: error?.status || error?.code || 500,
      message: error?.message || 'Failed to generate text',
      status: error?.status || 'UNKNOWN'
    };

    // Handle specific error cases
    if (error?.status === 503 || error?.code === 503) {
      errorResponse.message = 'The AI service is currently experiencing high demand. Please try again in a few moments.';
    } else if (error?.status === 429 || error?.code === 429) {
      errorResponse.message = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (error?.status === 400 || error?.code === 400) {
      errorResponse.message = 'Invalid request. Please check your input and try again.';
    } else if (error?.status === 401 || error?.code === 401) {
      errorResponse.message = 'Authentication failed. Please check your API configuration.';
    }

    throw errorResponse;
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
    maxRetries?: number;
  }
) {
  return retryWithBackoff(
    async () => {
      try {
        const response = await ai.models.generateContent({
          model: options?.model || GEMINI_MODELS.GEMINI_2_5_FLASH_IMAGE,
          contents: prompt,
          config: {
            responseModalities: ['IMAGE', 'TEXT']
          }
        });
        
        const images: string[] = [];
        let textContent = '';

        // Extract images and text from response
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
      } catch (error: any) {
        console.error('Gemini image generation error:', error);
        
        // Create a user-friendly error object
        const errorResponse = {
          code: error?.status || error?.code || 500,
          message: error?.message || 'Failed to generate image',
          status: error?.status || 'UNKNOWN'
        };

        // Handle specific error cases
        if (error?.status === 503 || error?.code === 503) {
          errorResponse.message = 'The AI image generation service is currently experiencing high demand. Please try again in a few moments.';
        } else if (error?.status === 429 || error?.code === 429) {
          errorResponse.message = 'Rate limit exceeded. Please wait a moment before trying again.';
        } else if (error?.status === 400 || error?.code === 400) {
          errorResponse.message = 'Invalid request. Please check your prompt and try again.';
        } else if (error?.status === 401 || error?.code === 401) {
          errorResponse.message = 'Authentication failed. Please check your API configuration.';
        }

        throw errorResponse;
      }
    },
    {
      maxRetries: options?.maxRetries ?? 2,
      initialDelay: 1000,
      maxDelay: 5000,
      operationName: 'Image generation'
    }
  );
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

    const response = await ai.models.generateContent({
      model: options?.model || GEMINI_MODELS.GEMINI_2_5_FLASH,
      contents: prompt,
      config
    });
    
    const textParts: string[] = [];
    const imageParts: string[] = [];

    // Extract text and images
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
  } catch (error: any) {
    console.error('Gemini multimodal generation error:', error);
    
    // Create a user-friendly error object
    const errorResponse = {
      code: error?.status || error?.code || 500,
      message: error?.message || 'Failed to generate content',
      status: error?.status || 'UNKNOWN'
    };

    // Handle specific error cases
    if (error?.status === 503 || error?.code === 503) {
      errorResponse.message = 'The AI service is currently experiencing high demand. Please try again in a few moments.';
    } else if (error?.status === 429 || error?.code === 429) {
      errorResponse.message = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (error?.status === 400 || error?.code === 400) {
      errorResponse.message = 'Invalid request. Please check your input and try again.';
    } else if (error?.status === 401 || error?.code === 401) {
      errorResponse.message = 'Authentication failed. Please check your API configuration.';
    }

    throw errorResponse;
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
  }
) {
  const config: any = {
    temperature: options?.temperature || 0.7,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const chat = ai.chats.create({
    model: options?.model || GEMINI_MODELS.GEMINI_2_5_FLASH,
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
    maxRetries?: number;
  }
) {
  return retryWithBackoff(
    async () => {
      try {
        const config: any = {};
        
        // Add thinking config if specified
        if (options?.thinkingLevel) {
          config.thinkingConfig = {
            thinkingLevel: options.thinkingLevel
          };
        }

        const response = await ai.models.generateContent({
          model: options?.model || GEMINI_MODELS.GEMINI_3_FLASH,
          contents: prompt,
          config
        });

        return response.text || '';
      } catch (error) {
        console.error('Gemini thinking generation error:', error);
        throw error;
      }
    },
    {
      maxRetries: options?.maxRetries ?? 2,
      initialDelay: 1000,
      maxDelay: 5000,
      operationName: 'Content generation'
    }
  );
}

export default ai;

# Gemini AI Integration Setup Guide (Latest API)

This project now uses **Google Gemini AI (Latest @google/genai package)** as the primary AI provider for image generation and intelligent comment replies.

## 🆕 What's New

Using the latest `@google/genai` package (v1.40.0) with:
- **Multimodal capabilities**: Generate text AND images in one call
- **Thinking models**: Advanced reasoning with `gemini-3-pro-preview`
- **Image generation**: `gemini-3-pro-image-preview` model
- **Google Search integration**: Real-time web search in responses
- **Chat sessions**: Conversational AI with context

## Features Using Gemini

### 1. **AI Image Generation** 
- Uses `gemini-3-pro-image-preview` model
- Generates high-quality images with text descriptions
- Supports multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- Automatically uploads to Cloudinary
- Can include Google Search for context

### 2. **Auto-Reply to Comments**
- Uses `gemini-3-pro-preview` with thinking capabilities
- Generates intelligent, context-aware replies to LinkedIn comments
- Maintains brand voice and tone
- Handles sentiment analysis (positive, negative, questions)
- Low-latency responses with thinking level control

## Setup Instructions

### Step 1: Install Latest Package

The latest package is already installed:
```bash
pnpm add @google/genai
```

### Step 2: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

### Step 3: Add to Environment Variables

Add the following to your `.env` file:

```env
# Gemini AI API Key
GEMINI_API_KEY="your_gemini_api_key_here"
```

### Step 4: Restart Server

```bash
pnpm dev
```

## Usage Examples

### 1. Generate Image with Text Description

**API Endpoint:** `POST /api/ai-agent/generate-image`

```typescript
const response = await fetch('/api/ai-agent/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Create a vibrant infographic about photosynthesis",
    aspectRatio: "16:9"
  })
});

const data = await response.json();
// Returns: { 
//   imageUrl, 
//   imageBase64, 
//   provider: 'gemini-3-pro-image',
//   description: 'Generated text about the image'
// }
```

### 2. Generate Text with Thinking

```typescript
import { generateWithThinking } from '@/lib/gemini';

const response = await generateWithThinking(
  "Explain quantum computing in simple terms",
  {
    thinkingLevel: 'high' // low, medium, high
  }
);
```

### 3. Generate Multimodal Content (Text + Images)

```typescript
import { generateMultimodalContent } from '@/lib/gemini';

const result = await generateMultimodalContent(
  "Create an infographic about photosynthesis with explanatory text",
  {
    includeImages: true,
    useGoogleSearch: true // Include real-time web search
  }
);

console.log(result.text); // Generated text
console.log(result.images); // Array of base64 images
```

### 4. Create Chat Session with Images

```typescript
import { createChat } from '@/lib/gemini';

const chat = await createChat(
  "You are a helpful social media marketing assistant",
  { 
    includeImages: true,
    useGoogleSearch: true
  }
);

const reply1 = await chat.sendMessage(
  "Create a post about AI in marketing with an image"
);

console.log(reply1.text); // Text response
console.log(reply1.images); // Generated images
```

### 5. Simple Text Generation

```typescript
import { generateText } from '@/lib/gemini';

const caption = await generateText(
  "Write a professional LinkedIn post about AI in marketing",
  {
    temperature: 0.7,
    maxTokens: 500
  }
);
```

## Available Models

### Text Generation
- `gemini-3-pro-preview` - Latest with thinking (default)
- `gemini-2.0-flash-exp` - Fast, efficient
- `gemini-1.5-pro` - Stable, reliable

### Image Generation (Multimodal)
- `gemini-3-pro-image-preview` - Text + Image generation (default)

### Thinking Models
- `gemini-3-pro-preview` - Advanced reasoning

## Configuration Options

### Image Generation Options
```typescript
{
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
  numberOfImages: 1-4,
  model: 'gemini-3-pro-image-preview'
}
```

### Text Generation Options
```typescript
{
  model: 'gemini-3-pro-preview',
  temperature: 0.0-1.0,  // Creativity level
  maxTokens: 1-8192,     // Response length
  thinkingLevel: 'low' | 'medium' | 'high' // Reasoning depth
}
```

### Chat Options
```typescript
{
  model: 'gemini-3-pro-image-preview',
  temperature: 0.7,
  includeImages: true,    // Enable image generation
  useGoogleSearch: true   // Enable real-time search
}
```

## Key Features

### 1. Multimodal Responses
Generate both text and images in a single API call:
```typescript
const result = await generateImage("Create a marketing infographic");
// Returns: { images: [...], text: "Description of the image..." }
```

### 2. Thinking Capability
Get better reasoning with thinking models:
```typescript
const answer = await generateWithThinking(
  "Solve this complex problem...",
  { thinkingLevel: 'high' }
);
```

### 3. Google Search Integration
Include real-time web data:
```typescript
const chat = await createChat("Marketing assistant", {
  useGoogleSearch: true
});
```

## Error Handling

The Gemini integration includes automatic fallback mechanisms:

1. **Image Generation**: Returns detailed error with fallback suggestions
2. **Auto-Reply**: Falls back to sentiment-based template responses
3. **Text Generation**: Throws error with detailed message

## Cost Optimization

Gemini offers generous free tier:
- **Free tier**: 15 requests per minute (RPM)
- **Paid tier**: Higher rate limits

To optimize costs:
1. Use `thinkingLevel: 'low'` for faster responses
2. Cache frequently used prompts
3. Use appropriate models for tasks
4. Monitor usage in Google AI Studio

## Troubleshooting

### Error: "API key not found"
- Ensure `GEMINI_API_KEY` is set in `.env`
- Restart your development server: `pnpm dev`

### Error: "Model not found"
- Check if you're using the correct model name
- Some models may require API access approval
- Try `gemini-2.0-flash-exp` as fallback

### Images not generating
- Verify your API key has multimodal access
- Check if prompt violates content policy
- Try with a simpler prompt first
- Ensure you're using `gemini-3-pro-image-preview` model

### Error: "Rate limit exceeded"
- You've exceeded the free tier limit (15 RPM)
- Wait a minute or upgrade to paid tier
- Implement request queuing/throttling

## Migration from Old Package

If you were using `@google/generative-ai`:

**Old Code:**
```typescript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
```

**New Code:**
```typescript
const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: "gemini-3-pro-preview",
  contents: prompt
});
```

## Support

For issues with Gemini API:
- [Google AI Documentation](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api)
- [Community Forum](https://discuss.ai.google.dev/)

## License

This integration follows Google's Gemini API terms of service.

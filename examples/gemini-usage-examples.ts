// examples/gemini-usage-examples.ts
// Example usage of Gemini AI with latest @google/genai package

import { 
  generateText, 
  generateImage, 
  generateMultimodalContent,
  createChat,
  generateWithThinking 
} from '@/lib/gemini';

/**
 * Example 1: Generate a simple text response
 */
export async function example1_SimpleText() {
  const response = await generateText(
    "Write a catchy Instagram caption about coffee",
    {
      temperature: 0.8,
      maxTokens: 100
    }
  );
  
  console.log("Generated caption:", response);
}

/**
 * Example 2: Generate an image with description
 */
export async function example2_ImageGeneration() {
  const result = await generateImage(
    "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food",
    {
      aspectRatio: '16:9'
    }
  );
  
  console.log("Generated images:", result.images.length);
  console.log("Description:", result.text);
  
  // Save first image
  if (result.images.length > 0) {
    const fs = require('fs');
    const buffer = Buffer.from(result.images[0], 'base64');
    fs.writeFileSync('photosynthesis.png', buffer);
    console.log("Image saved as photosynthesis.png");
  }
}

/**
 * Example 3: Generate multimodal content (text + images)
 */
export async function example3_MultimodalContent() {
  const result = await generateMultimodalContent(
    "Create a social media post about AI in marketing with an engaging visual",
    {
      includeImages: true,
      useGoogleSearch: true // Include real-time web search
    }
  );
  
  console.log("Generated text:", result.text);
  console.log("Generated images:", result.images.length);
}

/**
 * Example 4: Chat session with context
 */
export async function example4_ChatSession() {
  const chat = await createChat(
    "You are a social media marketing expert",
    {
      includeImages: false,
      useGoogleSearch: true,
      temperature: 0.7
    }
  );
  
  // First message
  const reply1 = await chat.sendMessage(
    "What's the best time to post on LinkedIn?"
  );
  console.log("Reply 1:", reply1.text);
  
  // Follow-up message (maintains context)
  const reply2 = await chat.sendMessage(
    "What about Instagram?"
  );
  console.log("Reply 2:", reply2.text);
}

/**
 * Example 5: Chat with image generation
 */
export async function example5_ChatWithImages() {
  const chat = await createChat(
    "You are a creative designer assistant",
    {
      includeImages: true,
      temperature: 0.8
    }
  );
  
  const reply = await chat.sendMessage(
    "Design a modern logo concept for a tech startup called 'NeuralFlow'"
  );
  
  console.log("Design description:", reply.text);
  console.log("Generated images:", reply.images.length);
  
  // Save images
  if (reply.images.length > 0) {
    const fs = require('fs');
    reply.images.forEach((img, index) => {
      const buffer = Buffer.from(img, 'base64');
      fs.writeFileSync(`logo-concept-${index + 1}.png`, buffer);
    });
    console.log(`Saved ${reply.images.length} logo concepts`);
  }
}

/**
 * Example 6: Advanced reasoning with thinking
 */
export async function example6_ThinkingModel() {
  const response = await generateWithThinking(
    "Analyze the pros and cons of using AI for social media content creation",
    {
      thinkingLevel: 'high' // low, medium, high
    }
  );
  
  console.log("Analysis:", response);
}

/**
 * Example 7: Generate social media post with image
 */
export async function example7_SocialMediaPost() {
  const prompt = `
    Create a LinkedIn post about the future of AI in marketing.
    Include:
    - An attention-grabbing hook
    - 3 key insights
    - A call-to-action
    - Relevant hashtags
    
    Also generate a professional infographic image to accompany the post.
  `;
  
  const result = await generateMultimodalContent(prompt, {
    includeImages: true,
    useGoogleSearch: true
  });
  
  console.log("Post content:", result.text);
  console.log("Generated images:", result.images.length);
  
  return {
    content: result.text,
    images: result.images
  };
}

/**
 * Example 8: Generate multiple variations
 */
export async function example8_MultipleVariations() {
  const basePrompt = "Create a Facebook ad image for a coffee shop";
  
  const variations = await Promise.all([
    generateImage(`${basePrompt} - modern minimalist style`, { aspectRatio: '1:1' }),
    generateImage(`${basePrompt} - vintage retro style`, { aspectRatio: '1:1' }),
    generateImage(`${basePrompt} - colorful playful style`, { aspectRatio: '1:1' })
  ]);
  
  console.log("Generated variations:", variations.length);
  
  variations.forEach((variation, index) => {
    console.log(`Variation ${index + 1}:`, variation.text);
  });
  
  return variations;
}

/**
 * Example 9: Error handling
 */
export async function example9_ErrorHandling() {
  try {
    const result = await generateImage(
      "Create an image", // Too vague
      { aspectRatio: '1:1' }
    );
    console.log("Success:", result);
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Fallback strategy
    console.log("Trying with more detailed prompt...");
    const fallbackResult = await generateImage(
      "Create a professional business image with modern design",
      { aspectRatio: '1:1' }
    );
    console.log("Fallback success:", fallbackResult);
  }
}

/**
 * Example 10: Batch processing
 */
export async function example10_BatchProcessing() {
  const prompts = [
    "Write a tweet about AI",
    "Write a LinkedIn post about productivity",
    "Write an Instagram caption about travel"
  ];
  
  const results = await Promise.all(
    prompts.map(prompt => 
      generateText(prompt, { temperature: 0.7, maxTokens: 100 })
    )
  );
  
  results.forEach((result, index) => {
    console.log(`\nPrompt ${index + 1}:`, prompts[index]);
    console.log("Result:", result);
  });
}

// Run all examples
export async function runAllExamples() {
  console.log("=== Gemini AI Usage Examples ===\n");
  
  try {
    console.log("1. Simple Text Generation");
    await example1_SimpleText();
    
    console.log("\n2. Image Generation");
    await example2_ImageGeneration();
    
    console.log("\n3. Multimodal Content");
    await example3_MultimodalContent();
    
    console.log("\n4. Chat Session");
    await example4_ChatSession();
    
    console.log("\n5. Chat with Images");
    await example5_ChatWithImages();
    
    console.log("\n6. Thinking Model");
    await example6_ThinkingModel();
    
    console.log("\n7. Social Media Post");
    await example7_SocialMediaPost();
    
    console.log("\n8. Multiple Variations");
    await example8_MultipleVariations();
    
    console.log("\n9. Error Handling");
    await example9_ErrorHandling();
    
    console.log("\n10. Batch Processing");
    await example10_BatchProcessing();
    
    console.log("\n=== All examples completed ===");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Uncomment to run
// runAllExamples();

/**
 * Removes markdown formatting from text
 * Useful for platforms that don't support markdown (like LinkedIn, Twitter, etc.)
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Remove bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    
    // Remove italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    
    // Remove strikethrough (~~text~~)
    .replace(/~~(.+?)~~/g, '$1')
    
    // Remove inline code (`code`)
    .replace(/`(.+?)`/g, '$1')
    
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, '')
    
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    
    // Remove links but keep text [text](url)
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    
    // Remove images ![alt](url)
    .replace(/!\[.*?\]\(.+?\)/g, '')
    
    // Remove blockquotes (> text)
    .replace(/^>\s+(.+)$/gm, '$1')
    
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}$/gm, '')
    
    // Remove list markers (-, *, +, 1.)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts markdown to LinkedIn-friendly formatting
 * LinkedIn supports some basic formatting through Unicode characters
 */
export function markdownToLinkedIn(text: string): string {
  if (!text) return '';
  
  return text
    // Convert bold to Unicode bold (limited support)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    
    // Convert italic to regular text (LinkedIn doesn't support italic well)
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    
    // Remove inline code
    .replace(/`(.+?)`/g, '$1')
    
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    
    // Convert headers to plain text with line breaks
    .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
    
    // Keep link text, remove URL [text](url) -> text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    
    // Remove images
    .replace(/!\[.*?\]\(.+?\)/g, '')
    
    // Convert blockquotes to indented text
    .replace(/^>\s+(.+)$/gm, '  $1')
    
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    
    // Convert list markers to bullets
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*\d+\.\s+/gm, '• ')
    
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Text and HTML processing utilities for rich note editing and snippets
 */

export function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function getNotePreviewText(content: string, limit: number = 180): string {
  if (!content) return '';
  const plain = stripHtmlToText(content);
  if (plain.length <= limit) return plain;
  return plain.slice(0, limit).trim() + '...';
}

export function convertPlainTextToHtml(text: string): string {
  if (!text) return '<p><br></p>';
  // Check if it already looks like HTML
  if (/<(p|div|h[1-6]|ul|ol|li|blockquote|span|b|i|u|strong|em|table|thead|tbody|tr|th|td|tfoot)[\s>]/i.test(text)) {
    return text;
  }
  // Convert standard newlines to paragraphs
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

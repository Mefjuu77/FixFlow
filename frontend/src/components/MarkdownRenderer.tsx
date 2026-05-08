import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Basic HTML sanitizer to prevent XSS without using external libraries.
 */
const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 1. Remove dangerous tags
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'base', 'meta', 'title'];
  dangerousTags.forEach(tag => {
    const elements = doc.body.getElementsByTagName(tag);
    for (let i = elements.length - 1; i >= 0; i--) {
      elements[i].parentNode?.removeChild(elements[i]);
    }
  });
  
  // 2. Remove dangerous attributes (like 'onerror')
  const allElements = doc.body.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const attributes = el.attributes;
    for (let j = attributes.length - 1; j >= 0; j--) {
      const attr = attributes[j];
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();
      
      if (name.startsWith('on') || value.includes('javascript:') || value.includes('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    }
  }
  
  return doc.body.innerHTML;
};

/**
 * Renders HTML content safely.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content || content === '<p></p>') {
    return <span className="text-gray-400 italic text-sm">Brak opisu.</span>;
  }

  return (
    <div
      className={`tiptap-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
    />
  );
};

export default MarkdownRenderer;

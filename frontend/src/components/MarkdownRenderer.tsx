import React from 'react';
import { useTranslation } from 'react-i18next';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * HTML sanitizer to prevent XSS without external libraries.
 * Uses a blocklist of dangerous tags and an attribute allowlist approach.
 */
const DANGEROUS_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'style', 'link',
  'base', 'meta', 'title', 'svg', 'math', 'noscript', 'template',
  'applet', 'frame', 'frameset', 'textarea', 'xmp',
]);

const SAFE_ATTRIBUTES = new Set([
  'class', 'id', 'href', 'src', 'alt', 'title', 'width', 'height',
  'colspan', 'rowspan', 'target', 'rel', 'start', 'type', 'value',
  'align', 'valign', 'border', 'cellpadding', 'cellspacing',
  'data-type', 'data-id',
]);

const SAFE_URL_PATTERN = /^(https?:\/\/|mailto:|tel:|#|\/)/i;

const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Usuń niebezpieczne tagi (iteracja wsteczna bo modyfikujemy DOM)
  const removeByTag = () => {
    DANGEROUS_TAGS.forEach(tag => {
      const elements = doc.body.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode?.removeChild(elements[i]);
      }
    });
  };
  // Dwukrotne przejście — mutation XSS może ujawnić tagi po pierwszym usunięciu
  removeByTag();
  removeByTag();

  // 2. Sanityzuj atrybuty — allowlist + blokada niebezpiecznych URL-i
  const allElements = doc.body.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const attrs = el.attributes;
    for (let j = attrs.length - 1; j >= 0; j--) {
      const attr = attrs[j];
      const name = attr.name.toLowerCase();
      const value = attr.value;

      // Usuń event handlery (on*) i niezatwierdzone atrybuty
      if (name.startsWith('on') || !SAFE_ATTRIBUTES.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Walidacja URL-i w href i src
      if ((name === 'href' || name === 'src') && value.trim()) {
        if (!SAFE_URL_PATTERN.test(value.trim())) {
          el.removeAttribute(attr.name);
        }
      }
    }

    // Wymuszenie rel="noopener noreferrer" na linkach zewnętrznych
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
};

/**
 * Renders HTML content safely.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const { t } = useTranslation();
  if (!content || content === '<p></p>') {
    return <span className="text-gray-400 italic text-sm">{t('common.noDescription')}</span>;
  }

  return (
    <div
      className={`tiptap-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
    />
  );
};

export default MarkdownRenderer;

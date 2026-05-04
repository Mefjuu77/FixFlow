import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders HTML content produced by TipTap editor.
 * Uses dangerouslySetInnerHTML since TipTap output is trusted internal HTML.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content || content === '<p></p>') {
    return <span className="text-gray-400 italic text-sm">Brak opisu.</span>;
  }

  return (
    <div
      className={`tiptap-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default MarkdownRenderer;

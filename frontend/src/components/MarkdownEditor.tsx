import React, { useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link2,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  autoFocus?: boolean;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: (textarea: HTMLTextAreaElement, value: string, onChange: (v: string) => void) => void;
}

/**
 * Wraps selected text with prefix/suffix, or inserts placeholder if nothing is selected.
 */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string,
  suffix: string,
  placeholder: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.substring(start, end);
  const replacement = selected.length > 0 ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`;

  const newValue = value.substring(0, start) + replacement + value.substring(end);
  onChange(newValue);

  // Restore focus & selection after React re-renders
  requestAnimationFrame(() => {
    textarea.focus();
    if (selected.length > 0) {
      // Select the wrapped text (without prefix/suffix)
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selected.length;
    } else {
      // Select the placeholder text
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + placeholder.length;
    }
  });
}

/**
 * Inserts a line-prefix (e.g. "- " or "1. ") at the start of the current line.
 */
function insertLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string
) {
  const start = textarea.selectionStart;
  // Find the start of the current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
  onChange(newValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length;
  });
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    icon: <Bold className="w-3.5 h-3.5" />,
    label: 'Pogrubienie',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '**', '**', 'tekst'),
  },
  {
    icon: <Italic className="w-3.5 h-3.5" />,
    label: 'Kursywa',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '_', '_', 'tekst'),
  },
  {
    icon: <Strikethrough className="w-3.5 h-3.5" />,
    label: 'Przekreślenie',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '~~', '~~', 'tekst'),
  },
  {
    icon: <Code className="w-3.5 h-3.5" />,
    label: 'Kod',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '`', '`', 'kod'),
  },
  {
    icon: <List className="w-3.5 h-3.5" />,
    label: 'Lista punktowana',
    action: (ta, v, onChange) => insertLinePrefix(ta, v, onChange, '- '),
  },
  {
    icon: <ListOrdered className="w-3.5 h-3.5" />,
    label: 'Lista numerowana',
    action: (ta, v, onChange) => insertLinePrefix(ta, v, onChange, '1. '),
  },
  {
    icon: <Link2 className="w-3.5 h-3.5" />,
    label: 'Wstaw link',
    action: (ta, v, onChange) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = v.substring(start, end);
      const linkText = selected.length > 0 ? selected : 'tekst';
      const replacement = `[${linkText}](url)`;
      const newValue = v.substring(0, start) + replacement + v.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        ta.focus();
        // Select "url" so user can type the link
        const urlStart = start + linkText.length + 3; // after "[tekst]("
        ta.selectionStart = urlStart;
        ta.selectionEnd = urlStart + 3; // length of "url"
      });
    },
  },
];

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Pisz tutaj...',
  className = '',
  minHeight = '120px',
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolbarClick = useCallback(
    (button: ToolbarButton) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      button.action(textarea, value, onChange);
    },
    [value, onChange]
  );

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-300 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        {TOOLBAR_BUTTONS.map((button, i) => (
          <React.Fragment key={button.label}>
            {/* Separator after Strikethrough and Code (index 3) and after ListOrdered (index 5) */}
            {(i === 4 || i === 6) && (
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
            )}
            <button
              type="button"
              onClick={() => handleToolbarClick(button)}
              className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title={button.label}
            >
              {button.icon}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full p-3 text-sm resize-none bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
        style={{ minHeight }}
      />
    </div>
  );
};

export default MarkdownEditor;

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link2,
  Undo2,
  Redo2,
  Paperclip,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  autoFocus?: boolean;
  onAttachFile?: () => void;
  resizable?: boolean;
  onBlur?: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
        : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
    } disabled:opacity-30 disabled:cursor-not-allowed`}
    title={label}
  >
    {icon}
  </button>
);

const ToolbarSeparator = () => (
  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
);

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  minHeight = '120px',
  autoFocus = false,
  onAttachFile,
  resizable = false,
  onBlur,
}) => {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t('markdownEditor.placeholder');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: effectivePlaceholder,
      }),
    ],
    content: value || '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-3 text-sm text-gray-800 dark:text-gray-200 ${resizable ? 'resize-y overflow-y-auto max-h-[500px]' : ''}`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor is empty, return empty string (not "<p></p>")
      if (editor.isEmpty) {
        onChange('');
      } else {
        onChange(html);
      }
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  // Sync external value changes (e.g. when form is reset)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value === '' && !editor.isEmpty) {
      editor.commands.clearContent();
    } else if (value && value !== currentHtml) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleAddLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt(t('markdownEditor.linkPrompt'), previousUrl || 'https://');

    if (url === null) return; // cancelled

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-300 dark:focus-within:border-blue-500 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        <ToolbarButton
          icon={<Bold className="w-3.5 h-3.5" />}
          label={t('markdownEditor.bold')}
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic className="w-3.5 h-3.5" />}
          label={t('markdownEditor.italic')}
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<UnderlineIcon className="w-3.5 h-3.5" />}
          label={t('markdownEditor.underline')}
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          icon={<Strikethrough className="w-3.5 h-3.5" />}
          label={t('markdownEditor.strike')}
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<Code className="w-3.5 h-3.5" />}
          label={t('markdownEditor.code')}
          isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          icon={<List className="w-3.5 h-3.5" />}
          label={t('markdownEditor.bulletList')}
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered className="w-3.5 h-3.5" />}
          label={t('markdownEditor.orderedList')}
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<Link2 className="w-3.5 h-3.5" />}
          label={t('markdownEditor.insertLink')}
          isActive={editor.isActive('link')}
          onClick={handleAddLink}
        />

        {onAttachFile && (
          <>
            <ToolbarSeparator />
            <ToolbarButton
              icon={<Paperclip className="w-3.5 h-3.5" />}
              label={t('markdownEditor.attachFile')}
              onClick={onAttachFile}
            />
          </>
        )}

        <ToolbarSeparator />

        <ToolbarButton
          icon={<Undo2 className="w-3.5 h-3.5" />}
          label={t('markdownEditor.undo')}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo2 className="w-3.5 h-3.5" />}
          label={t('markdownEditor.redo')}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default MarkdownEditor;

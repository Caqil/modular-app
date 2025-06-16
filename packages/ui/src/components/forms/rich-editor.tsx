'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  Quote,
  Undo,
  Redo,
  Type,
  Palette,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../utils/cn';

const richEditorVariants = cva(
  'border border-input rounded-md overflow-hidden',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface RichEditorProps extends VariantProps<typeof richEditorVariants> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
  toolbarOptions?: {
    formatting?: boolean;
    alignment?: boolean;
    lists?: boolean;
    links?: boolean;
    media?: boolean;
    code?: boolean;
    history?: boolean;
  };
}

export function RichEditor({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  size,
  className,
  minHeight = 200,
  maxHeight = 500,
  showToolbar = true,
  toolbarOptions = {
    formatting: true,
    alignment: true,
    lists: true,
    links: true,
    media: true,
    code: true,
    history: true,
  },
}: RichEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [selection, setSelection] = React.useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  // Initialize editor
  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle formatting commands
  const executeCommand = (command: string, value?: string) => {
    if (disabled) return;

    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateSelectionState();
  };

  // Update selection state for toolbar buttons
  const updateSelectionState = () => {
    setSelection({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
    });
  };

  // Handle selection changes
  const handleSelectionChange = () => {
    if (document.activeElement === editorRef.current) {
      updateSelectionState();
    }
  };

  React.useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Toolbar button component
  const ToolbarButton = ({
    icon: Icon,
    isActive = false,
    onClick,
    disabled: buttonDisabled = false,
    title,
  }: {
    icon: React.ElementType;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    title: string;
  }) => (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled || buttonDisabled}
      className="h-8 w-8 p-0"
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn(richEditorVariants({ size }), className)}>
      {showToolbar && (
        <div className="flex items-center gap-1 border-b bg-muted/50 p-2">
          {/* Formatting */}
          {toolbarOptions.formatting && (
            <>
              <Select
                onValueChange={(value) => executeCommand('formatBlock', value)}
              >
                <SelectTrigger className="h-8 w-24">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="p">Paragraph</SelectItem>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                  <SelectItem value="h4">Heading 4</SelectItem>
                  <SelectItem value="h5">Heading 5</SelectItem>
                  <SelectItem value="h6">Heading 6</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6" />

              <ToolbarButton
                icon={Bold}
                isActive={selection.bold}
                onClick={() => executeCommand('bold')}
                title="Bold"
              />
              <ToolbarButton
                icon={Italic}
                isActive={selection.italic}
                onClick={() => executeCommand('italic')}
                title="Italic"
              />
              <ToolbarButton
                icon={Underline}
                isActive={selection.underline}
                onClick={() => executeCommand('underline')}
                title="Underline"
              />
              <ToolbarButton
                icon={Strikethrough}
                isActive={selection.strikethrough}
                onClick={() => executeCommand('strikeThrough')}
                title="Strikethrough"
              />

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Alignment */}
          {toolbarOptions.alignment && (
            <>
              <ToolbarButton
                icon={AlignLeft}
                onClick={() => executeCommand('justifyLeft')}
                title="Align Left"
              />
              <ToolbarButton
                icon={AlignCenter}
                onClick={() => executeCommand('justifyCenter')}
                title="Align Center"
              />
              <ToolbarButton
                icon={AlignRight}
                onClick={() => executeCommand('justifyRight')}
                title="Align Right"
              />

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Lists */}
          {toolbarOptions.lists && (
            <>
              <ToolbarButton
                icon={List}
                onClick={() => executeCommand('insertUnorderedList')}
                title="Bullet List"
              />
              <ToolbarButton
                icon={ListOrdered}
                onClick={() => executeCommand('insertOrderedList')}
                title="Numbered List"
              />

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Links and Media */}
          {toolbarOptions.links && (
            <>
              <ToolbarButton
                icon={Link}
                onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) executeCommand('createLink', url);
                }}
                title="Insert Link"
              />
            </>
          )}

          {toolbarOptions.media && (
            <>
              <ToolbarButton
                icon={Image}
                onClick={() => {
                  const url = prompt('Enter image URL:');
                  if (url) executeCommand('insertImage', url);
                }}
                title="Insert Image"
              />

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Code */}
          {toolbarOptions.code && (
            <>
              <ToolbarButton
                icon={Code}
                onClick={() => executeCommand('formatBlock', 'pre')}
                title="Code Block"
              />
              <ToolbarButton
                icon={Quote}
                onClick={() => executeCommand('formatBlock', 'blockquote')}
                title="Quote"
              />

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* History */}
          {toolbarOptions.history && (
            <>
              <ToolbarButton
                icon={Undo}
                onClick={() => executeCommand('undo')}
                title="Undo"
              />
              <ToolbarButton
                icon={Redo}
                onClick={() => executeCommand('redo')}
                title="Redo"
              />
            </>
          )}
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!disabled}
        className={cn(
          'prose prose-sm max-w-none p-4 focus:outline-none',
          isFocused && 'ring-2 ring-ring ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          overflowY: 'auto',
        }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  );
}

// Simple markdown editor variant
interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
}

export function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Start writing markdown...',
  disabled = false,
  className,
  minHeight = 200,
}: MarkdownEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-input',
        className
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/50 p-2">
        <span className="text-sm font-medium">Markdown</span>
        <div className="text-xs text-muted-foreground">
          Supports **bold**, *italic*, `code`, and more
        </div>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full resize-none bg-transparent p-4 font-mono text-sm focus:outline-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        style={{ minHeight: `${minHeight}px` }}
      />
    </div>
  );
}

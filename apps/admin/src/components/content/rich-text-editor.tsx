
'use client';

import React, { useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Type,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Button,
  Card,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@modular-app/ui';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  showPreview?: boolean;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = 300,
  maxHeight = 600,
  showPreview = true,
  className,
}) => {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [selectedFormat, setSelectedFormat] = useState('paragraph');

  const handleCommand = useCallback((command: string, value?: string) => {
    // In a real implementation, this would interact with a rich text editor
    // For now, we'll just simulate the behavior with markdown-like formatting
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let replacement = '';

    switch (command) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](url)`;
        break;
      case 'image':
        replacement = `![${selectedText || 'alt text'}](image-url)`;
        break;
      case 'ul':
        replacement = `\n- ${selectedText || 'list item'}`;
        break;
      case 'ol':
        replacement = `\n1. ${selectedText || 'list item'}`;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'quote text'}`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'h1':
        replacement = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        replacement = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        replacement = `### ${selectedText || 'Heading 3'}`;
        break;
      default:
        return;
    }

    const newValue = 
      textarea.value.substring(0, start) + 
      replacement + 
      textarea.value.substring(end);
    
    onChange(newValue);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  }, [onChange]);

  const renderMarkdown = (text: string) => {
    // Simple markdown-to-HTML conversion for preview
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    
    // Wrap consecutive list items in ul/ol tags
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    
    return html;
  };

  return (
    <Card className={className}>
      {/* Toolbar */}
      <div className="p-3 border-b flex flex-wrap items-center gap-2">
        {/* Format Selector */}
        <Select value={selectedFormat} onValueChange={setSelectedFormat}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('underline')}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Links & Media */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('link')}
            title="Link"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('image')}
            title="Image"
          >
            <Image className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('ul')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('ol')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('quote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCommand('code')}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* View Mode */}
        {showPreview && (
          <div className="flex items-center border rounded-md">
            <Button
              variant={mode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('edit')}
              className="rounded-r-none"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('split')}
              className="rounded-none"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('preview')}
              className="rounded-l-none"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex" style={{ minHeight, maxHeight }}>
        {/* Edit Mode */}
        {(mode === 'edit' || mode === 'split') && (
          <div className={mode === 'split' ? 'w-1/2 border-r' : 'w-full'}>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="border-0 resize-none focus-visible:ring-0"
              style={{ minHeight, maxHeight }}
            />
          </div>
        )}

        {/* Preview Mode */}
        {(mode === 'preview' || mode === 'split') && (
          <div className={mode === 'split' ? 'w-1/2 p-4' : 'w-full p-4'}>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
            {!value && (
              <p className="text-muted-foreground italic">Preview will appear here...</p>
            )}
          </div>
        )}
      </div>

      {/* Word Count */}
      <div className="p-3 border-t text-sm text-muted-foreground flex justify-between">
        <span>
          {value.split(/\s+/).filter(word => word.length > 0).length} words
        </span>
        <span>
          {value.length} characters
        </span>
      </div>
    </Card>
  );
};
import { useState, useRef, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { cn } from '../../utils/cn';
import { Eye, EyeOff } from 'lucide-react';

// Common mathematical symbols for quick insert
const QUICK_SYMBOLS = [
  { symbol: '+', latex: '+' },
  { symbol: '-', latex: '-' },
  { symbol: '×', latex: '\\times' },
  { symbol: '÷', latex: '\\div' },
  { symbol: '=', latex: '=' },
  { symbol: '≠', latex: '\\neq' },
  { symbol: '<', latex: '<' },
  { symbol: '>', latex: '>' },
  { symbol: '≤', latex: '\\leq' },
  { symbol: '≥', latex: '\\geq' },
  { symbol: '±', latex: '\\pm' },
  { symbol: '√', latex: '\\sqrt{}' },
  { symbol: 'x²', latex: '^{2}' },
  { symbol: 'xⁿ', latex: '^{}' },
  { symbol: 'xₙ', latex: '_{}' },
  { symbol: 'π', latex: '\\pi' },
  { symbol: 'θ', latex: '\\theta' },
  { symbol: '°', latex: '^{\\circ}' },
  { symbol: '∞', latex: '\\infty' },
  { symbol: 'a/b', latex: '\\frac{}{}' },
];

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export function MathInput({
  value,
  onChange,
  placeholder = 'Enter value (use $...$ for math)',
  className,
  error,
  disabled,
}: MathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (textToInsert: string) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      // Check if we need to wrap in $ for math mode
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);

      // Check if already in math mode
      const dollarsBefore = (beforeCursor.match(/\$/g) || []).length;
      const isInMathMode = dollarsBefore % 2 === 1;

      let newText: string;
      let newCursorPos: number;

      if (isInMathMode) {
        // Already in math mode, just insert
        newText = beforeCursor + textToInsert + afterCursor;
        newCursorPos = start + textToInsert.length;
      } else {
        // Wrap in $ for math mode
        newText = beforeCursor + '$' + textToInsert + '$' + afterCursor;
        newCursorPos = start + textToInsert.length + 1;
      }

      onChange(newText);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // Render preview with math
  const renderPreview = useCallback(() => {
    if (!value.trim()) return null;

    try {
      const parts: { type: 'text' | 'math'; content: string }[] = [];
      const regex = /\$([^$]+)\$/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: value.substring(lastIndex, match.index) });
        }
        parts.push({ type: 'math', content: match[1] });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < value.length) {
        parts.push({ type: 'text', content: value.substring(lastIndex) });
      }

      return parts.map((part, index) => {
        if (part.type === 'math') {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch {
            return <span key={index} className="text-red-500">${part.content}$</span>;
          }
        }
        return <span key={index}>{part.content}</span>;
      });
    } catch {
      return <span className="text-red-500">Error</span>;
    }
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 pr-16 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              error ? 'border-red-300' : 'border-gray-300',
              disabled && 'bg-gray-100 cursor-not-allowed',
              className
            )}
          />

          {/* Quick Action Buttons */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {/* Symbols Dropdown */}
            <button
              type="button"
              onClick={() => setShowSymbols(!showSymbols)}
              className={cn(
                'p-1 rounded text-xs font-medium focus:outline-none',
                showSymbols ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              title="Insert symbol"
            >
              <span className="text-sm">∑</span>
            </button>

            {/* Preview Toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'p-1 rounded focus:outline-none',
                showPreview ? 'text-green-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              title={showPreview ? 'Hide preview' : 'Show preview'}
            >
              {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Symbol Picker Dropdown */}
      {showSymbols && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg p-2">
          <div className="grid grid-cols-10 gap-0.5">
            {QUICK_SYMBOLS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  insertAtCursor(item.latex);
                  setShowSymbols(false);
                }}
                className="p-1.5 text-center text-sm hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title={item.latex}
              >
                {item.symbol}
              </button>
            ))}
          </div>
          <p className="mt-1 pt-1 border-t text-xs text-gray-500 text-center">
            Click to insert, or type <code className="bg-gray-100 px-1 rounded">$...$</code> manually
          </p>
        </div>
      )}

      {/* Preview */}
      {showPreview && value.includes('$') && (
        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
          <span className="text-xs text-gray-500 mr-2">Preview:</span>
          {renderPreview()}
        </div>
      )}
    </div>
  );
}

export default MathInput;

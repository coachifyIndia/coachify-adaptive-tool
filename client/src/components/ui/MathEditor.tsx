import { useState, useRef, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '../../utils/cn';
import {
  Divide,
  Superscript,
  Subscript,
  Pi,
  Sigma,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  Radical,
} from 'lucide-react';

// Mathematical symbol categories with LaTeX codes
const MATH_SYMBOLS = {
  basic: {
    label: 'Basic',
    symbols: [
      { symbol: '+', latex: '+', name: 'Plus' },
      { symbol: '-', latex: '-', name: 'Minus' },
      { symbol: '×', latex: '\\times', name: 'Multiply' },
      { symbol: '÷', latex: '\\div', name: 'Divide' },
      { symbol: '±', latex: '\\pm', name: 'Plus-Minus' },
      { symbol: '=', latex: '=', name: 'Equals' },
      { symbol: '≠', latex: '\\neq', name: 'Not Equal' },
      { symbol: '≈', latex: '\\approx', name: 'Approximately' },
      { symbol: '<', latex: '<', name: 'Less Than' },
      { symbol: '>', latex: '>', name: 'Greater Than' },
      { symbol: '≤', latex: '\\leq', name: 'Less or Equal' },
      { symbol: '≥', latex: '\\geq', name: 'Greater or Equal' },
    ],
  },
  fractions: {
    label: 'Fractions',
    symbols: [
      { symbol: '½', latex: '\\frac{1}{2}', name: 'One Half' },
      { symbol: '⅓', latex: '\\frac{1}{3}', name: 'One Third' },
      { symbol: '¼', latex: '\\frac{1}{4}', name: 'One Quarter' },
      { symbol: 'a/b', latex: '\\frac{a}{b}', name: 'Fraction', template: true },
      { symbol: 'a⁄b', latex: '\\dfrac{a}{b}', name: 'Display Fraction', template: true },
    ],
  },
  powers: {
    label: 'Powers & Roots',
    symbols: [
      { symbol: 'x²', latex: 'x^{2}', name: 'Square', template: true },
      { symbol: 'x³', latex: 'x^{3}', name: 'Cube', template: true },
      { symbol: 'xⁿ', latex: 'x^{n}', name: 'Power', template: true },
      { symbol: '√', latex: '\\sqrt{x}', name: 'Square Root', template: true },
      { symbol: '∛', latex: '\\sqrt[3]{x}', name: 'Cube Root', template: true },
      { symbol: 'ⁿ√', latex: '\\sqrt[n]{x}', name: 'Nth Root', template: true },
      { symbol: 'xₙ', latex: 'x_{n}', name: 'Subscript', template: true },
    ],
  },
  geometry: {
    label: 'Geometry',
    symbols: [
      { symbol: '°', latex: '^{\\circ}', name: 'Degree' },
      { symbol: '∠', latex: '\\angle', name: 'Angle' },
      { symbol: '△', latex: '\\triangle', name: 'Triangle' },
      { symbol: '□', latex: '\\square', name: 'Square' },
      { symbol: '⊥', latex: '\\perp', name: 'Perpendicular' },
      { symbol: '∥', latex: '\\parallel', name: 'Parallel' },
      { symbol: '≅', latex: '\\cong', name: 'Congruent' },
      { symbol: '∼', latex: '\\sim', name: 'Similar' },
      { symbol: 'π', latex: '\\pi', name: 'Pi' },
    ],
  },
  calculus: {
    label: 'Calculus',
    symbols: [
      { symbol: '∑', latex: '\\sum_{i=1}^{n}', name: 'Summation', template: true },
      { symbol: '∏', latex: '\\prod_{i=1}^{n}', name: 'Product', template: true },
      { symbol: '∫', latex: '\\int_{a}^{b}', name: 'Integral', template: true },
      { symbol: '∞', latex: '\\infty', name: 'Infinity' },
      { symbol: 'lim', latex: '\\lim_{x \\to a}', name: 'Limit', template: true },
      { symbol: 'Δ', latex: '\\Delta', name: 'Delta' },
      { symbol: '∂', latex: '\\partial', name: 'Partial' },
      { symbol: 'd/dx', latex: '\\frac{d}{dx}', name: 'Derivative', template: true },
    ],
  },
  sets: {
    label: 'Sets & Logic',
    symbols: [
      { symbol: '∈', latex: '\\in', name: 'Element Of' },
      { symbol: '∉', latex: '\\notin', name: 'Not Element Of' },
      { symbol: '⊂', latex: '\\subset', name: 'Subset' },
      { symbol: '⊆', latex: '\\subseteq', name: 'Subset or Equal' },
      { symbol: '∪', latex: '\\cup', name: 'Union' },
      { symbol: '∩', latex: '\\cap', name: 'Intersection' },
      { symbol: '∅', latex: '\\emptyset', name: 'Empty Set' },
      { symbol: '∀', latex: '\\forall', name: 'For All' },
      { symbol: '∃', latex: '\\exists', name: 'Exists' },
    ],
  },
  greek: {
    label: 'Greek Letters',
    symbols: [
      { symbol: 'α', latex: '\\alpha', name: 'Alpha' },
      { symbol: 'β', latex: '\\beta', name: 'Beta' },
      { symbol: 'γ', latex: '\\gamma', name: 'Gamma' },
      { symbol: 'δ', latex: '\\delta', name: 'Delta' },
      { symbol: 'θ', latex: '\\theta', name: 'Theta' },
      { symbol: 'λ', latex: '\\lambda', name: 'Lambda' },
      { symbol: 'μ', latex: '\\mu', name: 'Mu' },
      { symbol: 'σ', latex: '\\sigma', name: 'Sigma' },
      { symbol: 'φ', latex: '\\phi', name: 'Phi' },
      { symbol: 'ω', latex: '\\omega', name: 'Omega' },
    ],
  },
  trigonometry: {
    label: 'Trigonometry',
    symbols: [
      { symbol: 'sin', latex: '\\sin', name: 'Sine' },
      { symbol: 'cos', latex: '\\cos', name: 'Cosine' },
      { symbol: 'tan', latex: '\\tan', name: 'Tangent' },
      { symbol: 'cot', latex: '\\cot', name: 'Cotangent' },
      { symbol: 'sec', latex: '\\sec', name: 'Secant' },
      { symbol: 'csc', latex: '\\csc', name: 'Cosecant' },
      { symbol: 'sin⁻¹', latex: '\\sin^{-1}', name: 'Arcsine' },
      { symbol: 'cos⁻¹', latex: '\\cos^{-1}', name: 'Arccosine' },
      { symbol: 'tan⁻¹', latex: '\\tan^{-1}', name: 'Arctangent' },
    ],
  },
  logarithms: {
    label: 'Logarithms',
    symbols: [
      { symbol: 'log', latex: '\\log', name: 'Logarithm' },
      { symbol: 'ln', latex: '\\ln', name: 'Natural Log' },
      { symbol: 'logₐ', latex: '\\log_{a}', name: 'Log Base a', template: true },
      { symbol: 'e', latex: 'e', name: 'Euler Number' },
      { symbol: 'eˣ', latex: 'e^{x}', name: 'Exponential', template: true },
    ],
  },
  matrices: {
    label: 'Matrices',
    symbols: [
      { symbol: '[ ]', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', name: '2x2 Matrix', template: true },
      { symbol: '( )', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', name: '2x2 Matrix ()', template: true },
      { symbol: '| |', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', name: 'Determinant', template: true },
    ],
  },
};

// Quick insert templates for common math expressions
const QUICK_TEMPLATES = [
  { label: 'Fraction', latex: '\\frac{numerator}{denominator}', icon: Divide },
  { label: 'Square Root', latex: '\\sqrt{x}', icon: Radical },
  { label: 'Power', latex: 'x^{n}', icon: Superscript },
  { label: 'Subscript', latex: 'x_{n}', icon: Subscript },
  { label: 'Summation', latex: '\\sum_{i=1}^{n}', icon: Sigma },
  { label: 'Pi', latex: '\\pi', icon: Pi },
];

interface MathEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
  label?: string;
  required?: boolean;
  helpText?: string;
}

export function MathEditor({
  value,
  onChange,
  placeholder = 'Enter text with mathematical notation. Use $...$ for inline math or $$...$$ for display math.',
  rows = 4,
  className,
  error,
  label,
  required,
  helpText,
}: MathEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (textToInsert: string, wrapInMath: boolean = true) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      let newText: string;
      let newCursorPos: number;

      if (wrapInMath) {
        // Check if we're already inside a math block
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(end);
        const isInMathBlock =
          (beforeCursor.lastIndexOf('$') > beforeCursor.lastIndexOf('$') - 1 &&
            afterCursor.indexOf('$') !== -1) ||
          beforeCursor.endsWith('$') ||
          afterCursor.startsWith('$');

        if (isInMathBlock || beforeCursor.endsWith('$') || value.substring(start - 1, start) === '$') {
          // Already in math mode, just insert the latex
          newText = value.substring(0, start) + textToInsert + value.substring(end);
          newCursorPos = start + textToInsert.length;
        } else {
          // Wrap in $...$ for inline math
          newText = value.substring(0, start) + '$' + textToInsert + '$' + value.substring(end);
          newCursorPos = start + textToInsert.length + 1;
        }
      } else {
        newText = value.substring(0, start) + textToInsert + value.substring(end);
        newCursorPos = start + textToInsert.length;
      }

      onChange(newText);

      // Restore cursor position after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  // Insert display math block
  const insertDisplayMath = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const mathBlock = selectedText ? `$$${selectedText}$$` : '$$\n\n$$';
    const newText = value.substring(0, start) + mathBlock + value.substring(end);
    const newCursorPos = selectedText ? start + mathBlock.length : start + 3;

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // Render the preview with math
  const renderPreview = useCallback(() => {
    if (!value.trim()) {
      return <span className="text-gray-400 italic">Preview will appear here...</span>;
    }

    try {
      // Split by display math ($$...$$) and inline math ($...$)
      const parts: { type: 'text' | 'inline' | 'block'; content: string }[] = [];

      // Process display math first ($$...$$)
      const displayRegex = /\$\$([\s\S]*?)\$\$/g;
      let lastIndex = 0;
      let match;

      while ((match = displayRegex.exec(value)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
          const textBefore = value.substring(lastIndex, match.index);
          // Process inline math in the text before
          processInlineMath(textBefore, parts);
        }
        parts.push({ type: 'block', content: match[1] });
        lastIndex = match.index + match[0].length;
      }

      // Process remaining text
      if (lastIndex < value.length) {
        processInlineMath(value.substring(lastIndex), parts);
      }

      function processInlineMath(
        text: string,
        parts: { type: 'text' | 'inline' | 'block'; content: string }[]
      ) {
        const inlineRegex = /\$([^$]+)\$/g;
        let lastIdx = 0;
        let m;

        while ((m = inlineRegex.exec(text)) !== null) {
          if (m.index > lastIdx) {
            parts.push({ type: 'text', content: text.substring(lastIdx, m.index) });
          }
          parts.push({ type: 'inline', content: m[1] });
          lastIdx = m.index + m[0].length;
        }

        if (lastIdx < text.length) {
          parts.push({ type: 'text', content: text.substring(lastIdx) });
        }
      }

      return parts.map((part, index) => {
        if (part.type === 'block') {
          try {
            return (
              <div key={index} className="my-2">
                <BlockMath math={part.content} />
              </div>
            );
          } catch (e) {
            return (
              <div key={index} className="text-red-500 text-sm">
                Invalid math: {part.content}
              </div>
            );
          }
        } else if (part.type === 'inline') {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch (e) {
            return (
              <span key={index} className="text-red-500 text-sm">
                Invalid: ${part.content}$
              </span>
            );
          }
        } else {
          // Preserve whitespace and newlines
          return part.content.split('\n').map((line, lineIndex, arr) => (
            <span key={`${index}-${lineIndex}`}>
              {line}
              {lineIndex < arr.length - 1 && <br />}
            </span>
          ));
        }
      });
    } catch (e) {
      return <span className="text-red-500">Error rendering preview</span>;
    }
  }, [value]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Toolbar */}
      <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2">
        {/* Quick Insert Row */}
        <div className="flex flex-wrap items-center gap-1 mb-2 pb-2 border-b border-gray-200">
          {QUICK_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.label}
                type="button"
                onClick={() => insertAtCursor(template.latex)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title={template.label}
              >
                <Icon className="w-3 h-3" />
                <span>{template.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={insertDisplayMath}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Insert display math block"
          >
            <span>Display Math</span>
          </button>
        </div>

        {/* Category Dropdown Row */}
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(MATH_SYMBOLS).map(([key, category]) => (
            <div key={key} className="relative">
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  activeCategory === key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'
                )}
              >
                <span>{category.label}</span>
                <ChevronDown
                  className={cn('w-3 h-3 transition-transform', activeCategory === key && 'rotate-180')}
                />
              </button>

              {/* Dropdown Panel */}
              {activeCategory === key && (
                <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-300 rounded-md shadow-lg p-2 min-w-[200px]">
                  <div className="grid grid-cols-4 gap-1">
                    {category.symbols.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          insertAtCursor(item.latex);
                          setActiveCategory(null);
                        }}
                        className="p-2 text-center text-lg hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title={item.name}
                      >
                        {item.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Preview Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className={cn(
                'p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500',
                showHelp ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              )}
              title="Show help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-indigo-500',
                showPreview
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'
              )}
            >
              {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <h4 className="font-semibold text-blue-800 mb-2">How to use mathematical notation:</h4>
          <ul className="list-disc list-inside text-blue-700 space-y-1">
            <li>
              Use <code className="bg-blue-100 px-1 rounded">$...$</code> for inline math (e.g.,{' '}
              <code className="bg-blue-100 px-1 rounded">$x^2$</code> renders as <InlineMath math="x^2" />)
            </li>
            <li>
              Use <code className="bg-blue-100 px-1 rounded">$$...$$</code> for display math (centered on its
              own line)
            </li>
            <li>Click toolbar buttons to insert common symbols and templates</li>
            <li>
              Fractions: <code className="bg-blue-100 px-1 rounded">\frac{'{a}'}{'{b}'}</code> renders as{' '}
              <InlineMath math="\frac{a}{b}" />
            </li>
            <li>
              Square root: <code className="bg-blue-100 px-1 rounded">\sqrt{'{x}'}</code> renders as{' '}
              <InlineMath math="\sqrt{x}" />
            </li>
            <li>
              Powers: <code className="bg-blue-100 px-1 rounded">x^{'{2}'}</code> renders as{' '}
              <InlineMath math="x^{2}" />
            </li>
            <li>
              Subscripts: <code className="bg-blue-100 px-1 rounded">x_{'{n}'}</code> renders as{' '}
              <InlineMath math="x_{n}" />
            </li>
          </ul>
        </div>
      )}

      {/* Editor and Preview */}
      <div className={cn('grid gap-4', showPreview ? 'grid-cols-2' : 'grid-cols-1')}>
        {/* Textarea */}
        <div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className={cn(
              'w-full px-3 py-2 rounded-md border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none',
              error ? 'border-red-300' : 'border-gray-300',
              !showPreview && 'rounded-t-none border-t-0'
            )}
            placeholder={placeholder}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[100px] overflow-auto">
            <div className="text-xs text-gray-500 mb-2 pb-1 border-b">Preview</div>
            <div className="prose prose-sm max-w-none">{renderPreview()}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MathEditor;

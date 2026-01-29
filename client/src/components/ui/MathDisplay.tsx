import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '../../utils/cn';

interface MathDisplayProps {
  content: string;
  className?: string;
  block?: boolean;
}

/**
 * MathDisplay Component
 *
 * Renders text content with embedded LaTeX math notation.
 * - Use $...$ for inline math
 * - Use $$...$$ for display (block) math
 *
 * Example:
 *   "Find the value of $x$ when $x^2 = 4$"
 *   "$$\\frac{a}{b} = \\frac{c}{d}$$"
 */
export function MathDisplay({ content, className, block = false }: MathDisplayProps) {
  const rendered = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return null;
    }

    try {
      const parts: { type: 'text' | 'inline' | 'block'; content: string }[] = [];

      // First, process display math ($$...$$)
      const displayRegex = /\$\$([\s\S]*?)\$\$/g;
      let match;

      // Collect all display math positions
      const displayMatches: { start: number; end: number; content: string }[] = [];
      while ((match = displayRegex.exec(content)) !== null) {
        displayMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
        });
      }

      // Process the content
      let currentIndex = 0;
      for (const dm of displayMatches) {
        // Process text before this display math (including inline math)
        if (dm.start > currentIndex) {
          const textBefore = content.substring(currentIndex, dm.start);
          processInlineMath(textBefore, parts);
        }
        // Add the display math
        parts.push({ type: 'block', content: dm.content });
        currentIndex = dm.end;
      }

      // Process remaining text after last display math
      if (currentIndex < content.length) {
        processInlineMath(content.substring(currentIndex), parts);
      }

      // If no math was found, just return the text
      if (parts.length === 0) {
        parts.push({ type: 'text', content });
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
              <div key={index} className="my-2 overflow-x-auto">
                <BlockMath math={part.content} />
              </div>
            );
          } catch (e) {
            return (
              <div key={index} className="text-red-500 text-sm my-2 p-2 bg-red-50 rounded">
                Math error: {part.content}
              </div>
            );
          }
        } else if (part.type === 'inline') {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch (e) {
            return (
              <span key={index} className="text-red-500 text-sm">
                [math error]
              </span>
            );
          }
        } else {
          // Preserve whitespace and newlines in text
          return part.content.split('\n').map((line, lineIndex, arr) => (
            <span key={`${index}-${lineIndex}`}>
              {line}
              {lineIndex < arr.length - 1 && <br />}
            </span>
          ));
        }
      });
    } catch (e) {
      // Fallback to plain text if parsing fails
      return <span>{content}</span>;
    }
  }, [content]);

  if (block) {
    return <div className={cn('math-display', className)}>{rendered}</div>;
  }

  return <span className={cn('math-display', className)}>{rendered}</span>;
}

export default MathDisplay;

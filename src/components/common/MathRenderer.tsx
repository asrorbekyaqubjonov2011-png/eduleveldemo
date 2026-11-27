import React from 'react';

interface MathRendererProps {
  content?: string;
  block?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content = '',
  block = false,
  className = ''
}) => {
  if (!content) return null;

  // Render cleanly without external dependency crash
  const renderFormattedText = (text: string) => {
    // If it has markdown-style bold or backticks
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-stone-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[#FF8A2B] font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <span key={idx} className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold px-1">
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (block) {
    return (
      <div className={`p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 font-mono text-xs text-stone-900 dark:text-white my-2 overflow-x-auto ${className}`}>
        {renderFormattedText(content)}
      </div>
    );
  }

  return (
    <span className={`inline font-sans ${className}`}>
      {renderFormattedText(content)}
    </span>
  );
};

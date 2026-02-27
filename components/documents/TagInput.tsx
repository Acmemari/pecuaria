import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TagInput: React.FC<Props> = ({ tags, onChange, placeholder = 'Adicionar tag...', disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-ai-surface text-ai-text rounded-md text-xs"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-ai-subtext hover:text-red-500"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-xs border border-ai-border rounded-md focus:outline-none focus:ring-1 focus:ring-ai-accent"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!inputValue.trim()}
            className="p-1 text-ai-accent hover:bg-ai-surface rounded-md disabled:opacity-30"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TagInput;

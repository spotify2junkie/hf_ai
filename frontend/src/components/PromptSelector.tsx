import React, { useState } from 'react';
import { PromptCategory, Prompt } from '../types';

interface PromptSelectorProps {
  categories: PromptCategory[];
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({
  categories,
  onSelectPrompt,
  disabled = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handlePromptClick = (promptText: string) => {
    if (!disabled) {
      onSelectPrompt(promptText);
      setShowCustomInput(false);
    }
  };

  const handleCustomSubmit = () => {
    if (customQuestion.trim() && !disabled) {
      onSelectPrompt(customQuestion.trim());
      setCustomQuestion('');
      setShowCustomInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Custom Question Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">选择问题或输入自定义问题</h3>
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          disabled={disabled}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {showCustomInput ? '选择预设问题' : '自定义问题'}
        </button>
      </div>

      {/* Custom Question Input */}
      {showCustomInput ? (
        <div className="space-y-2">
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            placeholder="输入您的问题..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={disabled || !customQuestion.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            发送问题
          </button>
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                disabled={disabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>

          {/* Prompt Cards */}
          {selectedCategory && (
            <div className="space-y-2">
              {categories
                .find((cat) => cat.id === selectedCategory)
                ?.prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClick(prompt.text)}
                    disabled={disabled}
                    className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all disabled:hover:border-gray-200 disabled:hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="text-sm font-medium text-gray-900">{prompt.text}</div>
                    <div className="text-xs text-gray-500 mt-1">{prompt.description}</div>
                  </button>
                ))}
            </div>
          )}

          {/* Placeholder when no category selected */}
          {!selectedCategory && (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">请选择一个类别查看预设问题</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PromptSelector;

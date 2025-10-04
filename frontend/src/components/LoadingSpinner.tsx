import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Fetching papers from HuggingFace...',
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Spinner */}
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} mb-4`}></div>

      {/* Message */}
      <p className={`text-gray-600 ${textSizeClasses[size]} text-center max-w-md`}>
        {message}
      </p>

      {/* Progress dots */}
      <div className="flex space-x-1 mt-2">
        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>

      {/* Estimated time */}
      <p className="text-xs text-gray-400 mt-3">
        This usually takes a few seconds...
      </p>
    </div>
  );
};

export default LoadingSpinner;
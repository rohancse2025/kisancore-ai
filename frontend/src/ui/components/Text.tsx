import React from 'react';

interface TextProps {
  children: React.ReactNode;
  variant?: 'body' | 'heading' | 'subtitle' | 'caption' | 'number';
  className?: string;
}

export function Text({ children, variant = 'body', className = '' }: TextProps) {
  const baseClasses = 'text-safe';
  
  const variantClasses = {
    body: 'text-sm sm:text-base leading-relaxed text-gray-700 dark:text-slate-400',
    heading: 'text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight',
    subtitle: 'text-base sm:text-lg font-bold text-gray-800 dark:text-slate-200',
    caption: 'text-xs sm:text-sm text-gray-500 dark:text-slate-500',
    number: 'text-2xl sm:text-3xl font-black text-number text-green-600 dark:text-green-500',
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

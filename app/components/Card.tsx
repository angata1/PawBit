import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  hoverEffect?: boolean;
}

export default function Card({ children, className = '', title, hoverEffect = false }: CardProps) {
  return (
    <div className={`
      bg-card text-card-foreground 
      border-2 border-foreground rounded-2xl p-6 
      neu-shadow 
      ${hoverEffect ? 'hover:-translate-y-1 hover:neu-shadow-lg transition-all duration-300' : ''}
      ${className}
    `}>
      {title && (
        <h3 className="text-xl font-bold mb-4 border-b-2 border-border pb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
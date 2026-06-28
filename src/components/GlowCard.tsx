import React, { useRef, useState } from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({ children, className = "" }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  return (
    <div 
      className={`relative group ${className}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 
        This is the dynamic backlight. It uses a radial gradient centered at the mouse cursor. 
        It fades in on hover.
      */}
      <div 
        className="absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none z-0"
        style={{
          background: isHovered 
            ? `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.4), transparent 50%)` 
            : 'transparent'
        }}
      />
      {/* 
        We also keep a very subtle default background for when it's not hovered, 
        or we can let it be completely dark. Let's keep a subtle static one that fades out.
      */}
      <div className="absolute -inset-0.5 rounded-3xl opacity-30 group-hover:opacity-0 blur-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent transition-opacity duration-300 pointer-events-none z-0" />
      
      {/* The content, which usually has relative and z-10 */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

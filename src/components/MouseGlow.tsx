import React, { useRef, useState, useEffect } from 'react';

export const MouseGlow: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = glowRef.current?.parentElement;
    if (!parent) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseenter', handleMouseEnter);
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseenter', handleMouseEnter);
      parent.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <div 
        ref={glowRef}
        className="absolute -inset-0.5 rounded-3xl transition-opacity duration-300 blur-xl pointer-events-none z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.5), transparent 70%)` 
        }}
      />
      <div className={`absolute -inset-0.5 rounded-3xl blur-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent transition-opacity duration-300 pointer-events-none z-0 ${isHovered ? 'opacity-0' : 'opacity-40'}`} />
    </>
  );
};

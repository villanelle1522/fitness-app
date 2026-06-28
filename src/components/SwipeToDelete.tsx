import React, { ReactNode, useState } from "react";
import { motion, useAnimation, useMotionValue, PanInfo } from "motion/react";
import { Trash, Edit2 } from "lucide-react";

interface SwipeActionProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  bgClass?: string;
  roundedClass?: string;
}

export const SwipeToDelete: React.FC<SwipeActionProps> = ({
  children,
  onDelete,
  onEdit,
  bgClass = "bg-zinc-900",
  roundedClass = "rounded-xl",
}) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);

  // Approximate width to reveal buttons
  let totalWidth = 0;
  if (onDelete) totalWidth += 60;
  if (onEdit) totalWidth += 60;
  
  if (totalWidth === 0) {
    return <>{children}</>;
  }

  const handleDragEnd = async (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const isSwipingLeft = info.offset.x < -20 || info.velocity.x < -100;
    const isSwipingRight = info.offset.x > 20 || info.velocity.x > 100;
    
    if (isSwipingLeft) {
      setIsOpen(true);
      controls.start({ x: -totalWidth, transition: { type: "spring", stiffness: 400, damping: 25 } });
    } else if (isSwipingRight) {
      setIsOpen(false);
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    } else {
      if (isOpen) {
        controls.start({ x: -totalWidth, transition: { type: "spring", stiffness: 400, damping: 25 } });
      } else {
        controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await controls.start({ x: -window.innerWidth, opacity: 0, transition: { duration: 0.2 } });
      onDelete();
      controls.set({ x: 0, opacity: 1 });
      setIsOpen(false);
    }
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative overflow-hidden w-full touch-pan-y group ${roundedClass}`}>
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-3 gap-2 w-full bg-rose-950/10 h-full">
        <div className="flex h-[75%] items-center justify-end gap-2 pr-1">
          {onEdit && (
            <button onClick={handleEdit} className="w-12 h-full bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg flex items-center justify-center transition-colors">
              <Edit2 className="w-4 h-4 text-indigo-400" />
            </button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className="w-12 h-full bg-rose-500/20 hover:bg-rose-500/30 rounded-lg flex items-center justify-center transition-colors">
              <Trash className="w-4 h-4 text-rose-400" />
            </button>
          )}
        </div>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -totalWidth, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`relative w-full z-10 ${bgClass}`}
      >
        {children}
      </motion.div>
    </div>
  );
};

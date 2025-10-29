"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { ReactNode, useRef, useEffect } from "react";

gsap.registerPlugin(useGSAP);

interface CardProps {
  children: ReactNode;
  className?: string,
  hoverBorderColor?: string,
}

function Card({ children, className, hoverBorderColor }: CardProps) {
  const container = useRef<HTMLDivElement>(null);
  
  const { contextSafe } = useGSAP({ scope: container });

  let tl = gsap.timeline()
  useGSAP(() => {
    if (!container.current) return;

   
    tl.current = gsap.to(container.current, {
      scale: 1.08,
      rotate: 2,
      duration: 0.35,
      ease: "power1.inOut", 
      boxShadow: `4px 4px ${hoverBorderColor ?  hoverBorderColor :  "var(--accent)"}`,
      borderColor: hoverBorderColor ?  hoverBorderColor :  "var(--accent)",
      paused: true,
    });
  }, []);

  const handleEnter = contextSafe(() => {
    tl.current?.play();
  });

  const handleLeave = contextSafe(() => {
    tl.current?.reverse();
  });

  return (
 <div
  ref={container}
  onMouseEnter={handleEnter}
  onMouseLeave={handleLeave}
  className={
    className
      ? `${className} card h-[100%] w-[100%] p-6 border-3 rounded-[2rem] bg-background border-foreground relative overflow-hidden`
      : "card h-[100%] w-[100%] p-6 border-3 rounded-[2rem] bg-background border-foreground relative overflow-hidden"
  }
>

      
      {children}
    </div>
  );
}

export default Card;

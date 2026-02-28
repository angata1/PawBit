"use client";

import React, { ReactNode, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface CartoonyButtonProps {
  children: ReactNode;
  backgroundColor?: string;
  onClick?: () => void;
  styles?: string;
  shadowColor?: string;
}

export default function CartoonyButton({
  children,
  onClick,
  styles = "text-4xl rounded-2xl p-4 cursor-pointer",
  shadowColor = "gray",
}: CartoonyButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const { contextSafe } = useGSAP({ scope: container });

  const handleEnter = contextSafe(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      duration: 0.2,
      y: -4,
      scale: 1.05,
      boxShadow: `6px 6px 0px 0px ${shadowColor}`,
      ease: "power1.out",
      rotate: () => gsap.utils.random(-3, 3),
    });
  });

  const handleLeave = contextSafe(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      duration: 0.2,
      y: 0,
      scale: 1,
      boxShadow: "0px 0px 0px 0px transparent",
      ease: "power1.inOut",
      rotate: 0,
    });
  });

const handleClick = contextSafe(() => {
  if (!btnRef.current) return;

  const tl = gsap.timeline();

  tl.to(btnRef.current, {
    duration: 0.15,
    scale: 1.1,
    y: -4,
    ease: "sine",
  }).to(btnRef.current, {
    duration: 0.15,
    scale: 1,
    y: 0,
    ease: "sine",
  });

  onClick?.();
});


  return (
    <div ref={container}>
      <button
        ref={btnRef}
        onClick={handleClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={styles}
      >
        {children}
      </button>
    </div>
  );
}

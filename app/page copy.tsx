"use client";

import Image from "next/image";
import { GridPattern } from "./components/gridPattern";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";
import Navbar from "./components/navbar";

gsap.registerPlugin(useGSAP);

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  useGSAP(() => {
    gsap.from("nav", {
      y: -50,
      opacity: 0,
      ease: "Power0.easeInOut",
      // scrollTrigger: {
      //   trigger: ".hero-section",
      //   start: "top top",
      //   end: "+=20%",
      //   scrub: true,
      //   pin: true,
      //   markers: true,
      // },
    });

     gsap.to(".parallax-image", {
      y: -30,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true, 
        markers: true
      },
    });

    gsap.to(".donate-button", {
      x: () => gsap.utils.random(-5, 5),
      y: () => gsap.utils.random(-5, 5),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  return (
    <>
      <section className="hero-section flex justify-center">
        <GridPattern className=" z-0 mask-b-from-0.5" />
        <main className="font-sans w-[80%] mt-[10%]">
          <div className=" h-[100vh]">
            <h1 className=" text-7xl z-[100]">
              Повече нахранени <span className=" text-accent">животни</span>
              <p>повече усмивки!</p>
            </h1>
    
            <div className="flex items-center justify-between gap-8 mt-12">
              {/* Left side: text */}
              <div className="w-1/2">
                <h2 className="text-3xl leading-relaxed">
                  Всяка храна, която дарите, е шанс за живот на бездомно
                  животно. Вашата подкрепа не е просто жест – тя е спасение,
                  топлина и любов за тези, които нямат глас.
                </h2>
              </div>
              <div>
                <Image
                  src="/cats.jpg"
                  alt="Cats eating"
                  width={1000}
                  height={1000}
                  className="parallax-image rounded-3xl"
                />
              </div>
            </div>
            <div className=" flex justify-start">
              <button className="donate-button bg-primary text-primary-foreground text-4xl rounded-3xl p-4 cursor-pointer">
                Дари
              </button>
            </div>
          </div>
        </main>
      </section>
      <section className=" h-[100vh] bg-[#E0D5C1]">

      </section>
    </>
  );
}

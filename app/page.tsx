"use client";

import Image from "next/image";
import { GridPattern } from "./components/gridPattern";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";
import { ArrowBigDownDash } from "lucide-react";
import CartoonyButton from "./components/cartoonyButton";
import Card from "./components/card";


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
    let tl = gsap.timeline();

    tl.to(".parallax-image", {
      yPercent: -30,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
        markers: true,
      },
    });

    gsap.to(".donate-button", {
      y: -2, // small upward bounce
      duration: 0.4,
      repeat: -1,
      yoyo: true,
      ease: "sine",
    });
  }, []);




  return (
    <>
      <div className=" w-[100%] flex justify-center">
        <section className="hero-section h-[100vh] w-[80%]">
          <GridPattern className="grid-bg z-0 mask-b-from-0.5" />
          <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-10 mt-16 ">
            <div className="col-span-2 text-7xl z-[40] uppercase space-x-1.5">
              Повече нахранени <span className=" text-accent">животни</span>
              <p>повече усмивки!</p>
            </div>
            <div className=" text-3xl z-[40] ">
              С помощта на иновативни автоматизирани хранилки, използващи
              интелигентни алгоритми, всяко ваше дарение се превръща в реална
              храна за животни в нужда.
            </div>
            <div className="parallax-image h-[300px] z-30">
              <Image
                src="/cats.jpg"
                alt="Cats eating"
                fill
                className=" rounded-2xl  object-cover"
              />
            </div>
            <div className=" flex justify-start">
              <CartoonyButton shadowColor="#40563d" styles="text-primary-foreground bg-primary text-4xl rounded-2xl p-4 cursor-pointer">
                Дари
              </CartoonyButton>
              <CartoonyButton shadowColor="var(--accent)" styles="border-4 border-accent flex items-center text-foreground text-4xl rounded-2xl ml-4 p-4 cursor-pointer">
                Вижте как работи <ArrowBigDownDash className=" w-9 h-9" />
              </CartoonyButton>
            </div>
            {/* <div className="impact-text text-1xl z-[40] ">
              "Всяка храна, която дарите, е шанс за живот на бездомно животно.
              Вашата подкрепа не е просто жест – тя е спасение, топлина и любов
              за тези, които нямат глас."
            </div> */}
          </div>
        </section>
      </div>
      <section className=" h-[100vh] bg-[#E0D5C1]"><Card><h1>Hello</h1></Card></section>
    </>
  );
}

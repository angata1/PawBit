"use client";

import Image from "next/image";
import { GridPattern } from "./components/gridPattern";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";
import { ArrowBigDownDash, PawPrint, Timer, Video, Brain, Users, BookOpen, Heart, Sparkles } from "lucide-react";
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
    });
  });

  return (
    <>
      <div className="w-full flex justify-center">
        <section className="hero-section h-[100vh] w-[80%]">
          <GridPattern className="z-0 mask-b-from-0.5" />
          <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] h-[70vh] gap-10 mt-16">
            <div className="col-span-2 font-bold text-7xl z-[40] uppercase space-x-1.5">
              Повече нахранени <span className="text-accent">животни</span>
              <p>повече усмивки!</p>
            </div>
            <div className="flex items-center text-3xl z-[40]">
              С помощта на иновативни автоматизирани хранилки, използващи
              интелигентни алгоритми, всяко ваше дарение се превръща в реална
              храна за животни в нужда.
            </div>
            <div className="relative row-span-2 z-30">
              <Image
                src="/cats.jpg"
                alt="Cats eating"
                fill
                className="rounded-2xl object-cover"
              />
            </div>
            <div className="flex  items-center justify-start">
              <CartoonyButton shadowColor="#40563d" styles="flex items-center text-primary-foreground bg-primary text-4xl rounded-2xl p-4 cursor-pointer">
                Дари сега<Heart /> 
              </CartoonyButton>
              <CartoonyButton shadowColor="var(--accent)" styles="border-4 border-accent flex items-center text-foreground text-4xl rounded-2xl ml-4 p-4 cursor-pointer">
                Вижте как работи <ArrowBigDownDash className="w-9 h-9" />
              </CartoonyButton>
            </div>
          </div>
        </section>
      </div>
      
      {/* Impact Section - Redesigned to match cartoony aesthetic */}
      <section className="min-h-screen bg-background relative overflow-hidden py-20">
        {/* Background Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-accent/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-16 w-16 h-16 bg-primary/30 rounded-full blur-lg"></div>
        <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-secondary/40 rounded-full blur-md"></div>
        
        <div className="relative z-10 flex flex-col items-center px-6">
          {/* Section Header */}
          <div className="text-center mb-16 max-w-4xl">
            <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-6 border-2 border-primary/20">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-primary">Как работим</span>
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-6xl font-bold mb-6 text-foreground uppercase">
              Нашето <span className="text-accent">Въздействие</span>
            </h2>
            <p className="text-2xl text-foreground/80 max-w-2xl mx-auto">
              Трансформираме всяко дарение в усмивки чрез технология и добро сърце
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            {/* Card 1 - Transparency */}
            <Card className="group relative overflow-visible" hoverBorderColor="var(--primary)">
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col h-full">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">
                  Пълна Прозрачност
                </h3>
                <p className="text-lg text-foreground/80 mb-4 leading-relaxed flex-grow">
                  Следи всяко дарение в реално време - от твоя екран до хранилката.
                </p>
                <div className="bg-muted/50 px-4 py-3 rounded-xl border-2 border-muted">
                  <p className="text-sm font-semibold text-muted-foreground">
                    💫 Винаги знаеш към кое животно отива усмивката ти
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 2 - Smart Distribution */}
            <Card className="group relative overflow-visible">
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col h-full">
                <div className="p-4 bg-accent/10 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-12 h-12 text-accent" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground group-hover:text-accent transition-colors">
                  Умно Разпределение
                </h3>
                <p className="text-lg text-foreground/80 mb-4 leading-relaxed flex-grow">
                  FoodFlow алгоритъмът намира най-нуждаещите се животни автоматично.
                </p>
                <div className="bg-muted/50 px-4 py-3 rounded-xl border-2 border-muted">
                  <p className="text-sm font-semibold text-muted-foreground">
                    🧠 Храната винаги отива там, където е най-необходима
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 3 - Community */}
            <Card className="group relative overflow-visible" hoverBorderColor="var(--secondary)">
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="flex flex-col h-full">
                <div className="p-4 bg-secondary/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-12 h-12 text-secondary" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground group-hover:text-secondary transition-colors">
                  Една Общност
                </h3>
                <p className="text-lg text-foreground/80 mb-4 leading-relaxed flex-grow">
                  Свързваме дарители, приюти и животни в мрежа на доброта.
                </p>
                <div className="bg-muted/50 px-4 py-3 rounded-xl border-2 border-muted">
                  <p className="text-sm font-semibold text-muted-foreground">
                    👥 Заедно правим промяната по-голяма и по-весела
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <CartoonyButton 
              shadowColor="var(--accent)" 
              styles="border-4 border-accent flex items-center text-foreground text-3xl rounded-2xl px-8 py-4 cursor-pointer transition-colors"
            >
              <PawPrint className="w-8 h-8 mr-3" />
              Стани част от общността
            </CartoonyButton>
          </div>
        </div>
      </section>
    </>
  );
}
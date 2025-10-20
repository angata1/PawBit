import Image from "next/image";
import { GridPattern } from "./components/gridPattern";

export default function Home() {
  return (
    
    <div className=" flex justify-center">
      <GridPattern className=" z-0 mask-b-from-0.5"/>
    <main className="font-sans w-[80%] mt-[10%]">
      <div className=" h-[100vh]">
      <h1 className=" text-7xl z-10">Повече нахранени <span className=" text-accent">животни</span><p>повече усмивки!</p></h1>
      </div>  
    </main>
    </div>
  );
}

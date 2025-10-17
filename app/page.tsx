import Image from "next/image";
import { GridPattern } from "./components/gridPattern";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
      <GridPattern
        width={20}
        height={20}
        x={-1}
        y={-1}
        className={"[mask-image:linear-gradient(to_bottom,white,transparent,transparent)] "}
      />
        <h1>Pawbit</h1>
      
      </main>
    </div>
  );
}

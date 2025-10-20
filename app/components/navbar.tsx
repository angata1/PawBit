import { HandHeart } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Начало" },
  { href: "/about", label: "За нас" },
  { href: "/donate", label: "Дари" },
];

export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 w-full flex justify-center mt-3.5 z-50">
      <nav className="w-[80%] flex items-center justify-between px-6 py-3 backdrop-blur-lg border border-border rounded-2xl bg-background/80 shadow-lg">
        <div className=" flex gap-2 items-center">
          <div className=" rounded-sm bg-accent">
          <HandHeart width={30} height={30}/>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            PawBit
          </h1>
        </div>
        {/* Navigation Links */}
        <ul className="flex gap-6">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="px-3 py-2 rounded-md text-lg font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

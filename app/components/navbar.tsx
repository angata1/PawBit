"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PawPrint, Map, Trophy, User, LogOut, Menu, X, Images } from 'lucide-react';
import Button from './Button';

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    console.log("Logout clicked");
    // Add actual logout logic here
  };

  const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link
      href={to}
      onClick={() => setIsOpen(false)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-wide transition-colors
        ${isActive(to)
          ? 'bg-primary text-primary-foreground neu-shadow-sm border-2 border-foreground'
          : 'hover:bg-muted text-foreground'
        }
`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b-2 border-foreground py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-accent p-2 rounded-lg border-2 border-foreground neu-shadow-sm group-hover:rotate-6 transition-transform">
            <PawPrint className="w-8 h-8 text-foreground" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors hidden sm:block">
            PawBit
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <NavLink to="/" icon={PawPrint} label="Home" />
          <NavLink to="/map" icon={Map} label="Map" />
          <NavLink to="/feedings" icon={Images} label="Gallery" />
          <NavLink to="/leaderboard" icon={Trophy} label="Rankings" />

          <div className="h-8 w-0.5 bg-foreground/20 mx-2" />

          {user ? (
            <div className="flex items-center gap-4">
              <NavLink to="/profile" icon={User} label="Profile" />
              <Button variant="outline" size="sm" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="font-bold text-foreground hover:underline">Log In</Link>
              <Button href="/register" variant="accent" size="sm">
                Join Now
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 bg-white border-2 border-foreground rounded-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b-2 border-foreground p-4 flex flex-col gap-4 shadow-xl">
          <NavLink to="/" icon={PawPrint} label="Home" />
          <NavLink to="/map" icon={Map} label="Map" />
          <NavLink to="/feedings" icon={Images} label="Gallery" />
          <NavLink to="/leaderboard" icon={Trophy} label="Rankings" />
          <hr className="border-foreground/20" />
          {user ? (
            <>
              <NavLink to="/profile" icon={User} label="Profile" />
              <Button variant="secondary" onClick={handleLogout} className="w-full">Logout</Button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-center font-bold py-2 bg-white border-2 border-foreground rounded-lg">Log In</Link>
              <Link href="/register" className="block text-center font-bold py-2 bg-accent text-accent-foreground border-2 border-foreground rounded-lg">Join Now</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
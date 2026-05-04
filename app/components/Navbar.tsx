"use client";

import { useTranslations } from 'next-intl';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PawPrint, Map, Trophy, User, LogOut, Menu, X, Images, ShieldAlert, Users, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Button from './Button';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface NavbarProps {
  user: (SupabaseUser & { role?: string }) | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Navbar');
  const navItems = [
    { to: '/', icon: PawPrint, label: t('home') },
    { to: '/map', icon: Map, label: t('map') },
    { to: '/feedings', icon: Images, label: t('gallery') },
    { to: '/leaderboard', icon: Trophy, label: t('leaderboard') },
    { to: '/about', icon: Users, label: t('about') },
  ];
  const accountItems = user
    ? [
        { to: '/profile', icon: User, label: t('profile') },
        ...(user.role === 'admin' ? [{ to: '/admin', icon: ShieldAlert, label: t('admin') }] : []),
      ]
    : [];

  const isActive = (path: string) => pathname === path;

  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
  };

  const NavLink = ({ to, icon: Icon, label, active = isActive(to) }: { to: string, icon: LucideIcon, label: string, active?: boolean }) => (
    <Link
      href={to}
      onClick={() => setIsOpen(false)}
      className={`
        flex items-center gap-2 px-4 xl:px-3 2xl:px-4 py-2 rounded-lg font-bold uppercase tracking-wide transition-colors text-sm 2xl:text-base
        ${active
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
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b-2 border-foreground py-3 relative">
      <div className="container mx-auto px-4 flex justify-between items-center gap-3">
        {/* Logo */}
        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
          <div className="bg-primary p-1.5 rounded-lg border-2 border-foreground neu-shadow-sm group-hover:rotate-6 transition-transform overflow-hidden">
            <Image 
              src="/logo.svg" 
              alt="PawBit Logo" 
              width={32} 
              height={32} 
              className="object-contain brightness-0 invert"
            />
          </div>
          <span className="text-2xl md:text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
            PawBit
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-2 2xl:gap-4">
          <NavLink to="/" icon={PawPrint} label={t('home')} />
          <NavLink to="/map" icon={Map} label={t('map')} />
          <NavLink to="/feedings" icon={Images} label={t('gallery')} />
          <NavLink to="/leaderboard" icon={Trophy} label={t('leaderboard')} />
          <NavLink to="/about" icon={Users} label={t('about')} />

          <div className="h-8 w-0.5 bg-foreground/20 mx-1 2xl:mx-2" />

          {user ? (
            <div className="flex items-center gap-2 2xl:gap-4">
              <NavLink to="/profile" icon={User} label={t('profile')} />
              {user.role === 'admin' && (
                <NavLink to="/admin" icon={ShieldAlert} label={t('admin')} />
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 2xl:px-4 py-2 rounded-lg font-bold uppercase tracking-wide transition-colors hover:bg-muted text-foreground text-sm 2xl:text-base"
              >
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 2xl:gap-4">
              <Link href="/login" className="font-bold text-foreground hover:underline text-sm 2xl:text-base">{t('login')}</Link>
              <Button href="/register" variant="accent" size="sm">
                {t('joinNow')}
              </Button>
            </div>
          )}
        </div>

        {/* Mobile and Tablet Menu Button */}
        <button
          className="xl:hidden inline-flex items-center gap-2 p-2 md:px-4 md:py-2 bg-white border-2 border-foreground rounded-lg font-bold uppercase tracking-wide"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? t('closeMenu') : t('openMenu')}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="hidden md:inline text-sm">{isOpen ? t('close') : t('menu')}</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-background border-b-2 border-foreground p-4 flex flex-col gap-4 shadow-xl">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
          <hr className="border-foreground/20" />
          {user ? (
            <>
              {accountItems.map((item) => (
                <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold uppercase tracking-wide transition-colors bg-muted/50 hover:bg-muted text-foreground border-2 border-foreground/10"
              >
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setIsOpen(false)} className="block text-center font-bold py-2 bg-white border-2 border-foreground rounded-lg">{t('login')}</Link>
              <Link href="/register" onClick={() => setIsOpen(false)} className="block text-center font-bold py-2 bg-accent text-accent-foreground border-2 border-foreground rounded-lg">{t('joinNow')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

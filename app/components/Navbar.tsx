"use client";

import { useTranslations } from 'next-intl';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PawPrint, Map, Trophy, User, LogOut, Menu, X, Images, ShieldAlert, Users } from 'lucide-react';
import Image from 'next/image';
import Button from './Button';
import { createClient } from '@/lib/supabase/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Navbar');

  const isActive = (path: string) => pathname === path;



  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
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
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b-2 border-foreground py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
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
          <span className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
            PawBit
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <NavLink to="/" icon={PawPrint} label={t('home')} />
          <NavLink to="/map" icon={Map} label={t('map')} />
          <NavLink to="/feedings" icon={Images} label={t('gallery')} />
          <NavLink to="/leaderboard" icon={Trophy} label={t('rankings')} />
          <NavLink to="/about" icon={Users} label={t('about')} />

          <div className="h-8 w-0.5 bg-foreground/20 mx-2" />

          <LanguageSwitcher />

          {user ? (
            <div className="flex items-center gap-4">
              <NavLink to="/profile" icon={User} label={t('profile')} />
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide transition-colors bg-accent/20 hover:bg-accent/40 text-accent-foreground border-2 border-accent/50 text-xs"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {t('admin')}
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
                {t('logout')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="font-bold text-foreground hover:underline">{t('login')}</Link>
              <Button href="/register" variant="accent" size="sm">
                {t('joinNow')}
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
          <NavLink to="/" icon={PawPrint} label={t('home')} />
          <NavLink to="/map" icon={Map} label={t('map')} />
          <NavLink to="/feedings" icon={Images} label={t('gallery')} />
          <NavLink to="/leaderboard" icon={Trophy} label={t('rankings')} />
          <NavLink to="/about" icon={Users} label={t('about')} />
          <hr className="border-foreground/20" />
          <LanguageSwitcher />
          {user ? (
            <>
              <NavLink to="/profile" icon={User} label={t('profile')} />
              {user.role === 'admin' && <NavLink to="/admin" icon={ShieldAlert} label={t('adminPanel')} />}
              <Button variant="secondary" onClick={handleLogout} className="w-full">{t('logout')}</Button>
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
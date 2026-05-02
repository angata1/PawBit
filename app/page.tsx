import React from 'react';
import type { Metadata } from 'next';
import HomeContent from './components/HomeContent';

export const metadata: Metadata = {
  title: 'PawBit - Нахрани животно в реално време',
  description: 'Превърнете кликовете си в истинска храна. Гледайте видео на живо, докато дарявате за бездомни животни във вашия град.',
};

export default function Home() {
  return <HomeContent />;
}
import React from 'react';
import type { Metadata } from 'next';
import HomeContent from './components/HomeContent';

export const metadata: Metadata = {
  title: 'PawBit - Feed a Pet in Real Time',
  description: 'Connect your clicks to real kibble. Watch live video as you donate to stray animals in your city.',
};

export default function Home() {
  return <HomeContent />;
}
'use client';

import { useState } from 'react';
import BrainTeaser from './components/BrainTeaser';
import MemoryGame from './components/MemoryGame';
import FactGenerator from './components/FactGenerator';

type DistractionType = 'home' | 'brainteaser' | 'memory' | 'facts';

export default function Home() {
  const [activeDistraction, setActiveDistraction] = useState<DistractionType>('home');

  const renderContent = () => {
    switch (activeDistraction) {
      case 'brainteaser':
        return <BrainTeaser onBack={() => setActiveDistraction('home')} />;
      case 'memory':
        return <MemoryGame onBack={() => setActiveDistraction('home')} />;
      case 'facts':
        return <FactGenerator onBack={() => setActiveDistraction('home')} />;
      default:
        return (
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              I Need a Distraction!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
              Take a quick break and give your brain something fun to do
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button
                onClick={() => setActiveDistraction('brainteaser')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="text-5xl mb-4">🧩</div>
                <h2 className="text-2xl font-bold mb-2">Brain Teaser</h2>
                <p className="text-purple-100">Challenge your mind with today&apos;s riddle</p>
              </button>

              <button
                onClick={() => setActiveDistraction('memory')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="text-5xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold mb-2">Memory Game</h2>
                <p className="text-pink-100">Test your memory in 60 seconds</p>
              </button>

              <button
                onClick={() => setActiveDistraction('facts')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="text-5xl mb-4">💡</div>
                <h2 className="text-2xl font-bold mb-2">Random Facts</h2>
                <p className="text-blue-100">Learn something fascinating</p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900 py-12 px-4">
      <div className="container mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}

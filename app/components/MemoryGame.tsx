'use client';

import { useState, useEffect } from 'react';

interface MemoryGameProps {
  onBack: () => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const emojis = ['🎮', '🎨', '🎭', '🎪', '🎸', '🎯', '🎲', '🎳'];

export default function MemoryGame({ onBack }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !gameWon) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameWon]);

  useEffect(() => {
    if (matchedPairs === emojis.length) {
      setGameWon(true);
      setGameStarted(false);
    }
  }, [matchedPairs]);

  const initializeGame = () => {
    const duplicatedEmojis = [...emojis, ...emojis];
    const shuffled = duplicatedEmojis
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setGameStarted(false);
    setGameWon(false);
    setTimer(0);
  };

  const handleCardClick = (id: number) => {
    if (!gameStarted) setGameStarted(true);

    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length === 2) {
      return;
    }

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    setCards((prevCards) =>
      prevCards.map((c) =>
        c.id === id ? { ...c, isFlipped: true } : c
      )
    );

    if (newFlippedCards.length === 2) {
      setMoves((prev) => prev + 1);
      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard?.emoji === secondCard?.emoji) {
        // Match found
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatchedPairs((prev) => prev + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-300 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2 text-pink-600 dark:text-pink-400">
            Memory Match Game
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Find all the matching pairs!</p>
        </div>

        <div className="flex justify-around mb-8 text-center">
          <div>
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{moves}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Moves</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{matchedPairs}/{emojis.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pairs</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{formatTime(timer)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
          </div>
        </div>

        {gameWon && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl text-white text-center animate-pulse">
            <h3 className="text-2xl font-bold mb-2">Congratulations! 🎉</h3>
            <p>You won in {moves} moves and {formatTime(timer)}!</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched}
              className={`aspect-square rounded-2xl text-5xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
                card.isFlipped || card.isMatched
                  ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-lg'
                  : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 hover:from-gray-400 hover:to-gray-500'
              } ${card.isMatched ? 'opacity-50' : ''}`}
            >
              {card.isFlipped || card.isMatched ? card.emoji : '?'}
            </button>
          ))}
        </div>

        <button
          onClick={initializeGame}
          className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-700 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          New Game
        </button>
      </div>
    </div>
  );
}

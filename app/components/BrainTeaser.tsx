'use client';

import { useState, useEffect } from 'react';

interface BrainTeaserProps {
  onBack: () => void;
}

interface Riddle {
  question: string;
  answer: string;
  hint: string;
}

const riddles: Riddle[] = [
  {
    question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answer: "An echo",
    hint: "Think about sounds bouncing back..."
  },
  {
    question: "The more you take, the more you leave behind. What am I?",
    answer: "Footsteps",
    hint: "Think about walking..."
  },
  {
    question: "What has keys but no locks, space but no room, and you can enter but can't go inside?",
    answer: "A keyboard",
    hint: "It's on your desk..."
  },
  {
    question: "I'm light as a feather, yet the strongest person can't hold me for five minutes. What am I?",
    answer: "Your breath",
    hint: "Everyone does it automatically..."
  },
  {
    question: "What has a head and a tail but no body?",
    answer: "A coin",
    hint: "Think about money..."
  },
  {
    question: "The more of this there is, the less you see. What is it?",
    answer: "Darkness",
    hint: "It's the opposite of light..."
  },
  {
    question: "What gets wet while drying?",
    answer: "A towel",
    hint: "You use it after a shower..."
  },
  {
    question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    answer: "A map",
    hint: "It helps you navigate..."
  },
  {
    question: "What can travel around the world while staying in a corner?",
    answer: "A stamp",
    hint: "Think about mail..."
  },
  {
    question: "I have branches, but no fruit, trunk, or leaves. What am I?",
    answer: "A bank",
    hint: "Think about money..."
  }
];

export default function BrainTeaser({ onBack }: BrainTeaserProps) {
  const [currentRiddle, setCurrentRiddle] = useState<Riddle>(riddles[0]);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // Select riddle based on current day (rotates daily)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const riddleIndex = dayOfYear % riddles.length;
    setCurrentRiddle(riddles[riddleIndex]);
  }, []);

  const checkAnswer = () => {
    const normalized = userAnswer.toLowerCase().trim();
    const correctAnswer = currentRiddle.answer.toLowerCase();

    if (normalized === correctAnswer || correctAnswer.includes(normalized)) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2 text-purple-600 dark:text-purple-400">
            Today&apos;s Brain Teaser
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Can you solve it?</p>
        </div>

        <div className="mb-8 p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-2xl">
          <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
            {currentRiddle.question}
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here..."
            className="w-full px-6 py-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none text-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={checkAnswer}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Check Answer
            </button>

            <button
              onClick={() => setShowHint(!showHint)}
              className="px-8 py-4 rounded-xl font-semibold border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900 transition-all duration-300"
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>

            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-8 py-4 rounded-xl font-semibold border-2 border-gray-400 text-gray-600 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
            >
              {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
            </button>
          </div>

          {showHint && (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>Hint:</strong> {currentRiddle.hint}
              </p>
            </div>
          )}

          {showAnswer && (
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Answer:</strong> {currentRiddle.answer}
              </p>
            </div>
          )}

          {isCorrect === true && (
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-xl border-2 border-green-300 dark:border-green-700 animate-pulse">
              <p className="text-green-800 dark:text-green-200 text-center font-semibold text-lg">
                Correct! You got it! 🎉
              </p>
            </div>
          )}

          {isCorrect === false && (
            <div className="p-4 bg-red-100 dark:bg-red-900 rounded-xl border-2 border-red-300 dark:border-red-700">
              <p className="text-red-800 dark:text-red-200 text-center font-semibold">
                Not quite. Try again or check the hint!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

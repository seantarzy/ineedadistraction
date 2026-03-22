'use client';

import { useState, useEffect } from 'react';

interface ConnectionsProps {
  onBack: () => void;
}

interface Group {
  category: string;
  words: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'hardest';
}

interface Puzzle {
  groups: Group[];
}

// Daily puzzles
const PUZZLES: Puzzle[] = [
  {
    groups: [
      { category: 'Types of Trees', words: ['OAK', 'PINE', 'MAPLE', 'BIRCH'], difficulty: 'easy' },
      { category: 'Shades of Blue', words: ['NAVY', 'AZURE', 'COBALT', 'TEAL'], difficulty: 'medium' },
      { category: 'Coffee Shop Items', words: ['LATTE', 'MOCHA', 'ESPRESSO', 'AMERICANO'], difficulty: 'hard' },
      { category: 'Words Starting with "C"', words: ['CROWN', 'CLOUD', 'CORAL', 'CRANE'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Planets', words: ['MARS', 'VENUS', 'SATURN', 'JUPITER'], difficulty: 'easy' },
      { category: 'Card Games', words: ['POKER', 'BRIDGE', 'HEARTS', 'SOLITAIRE'], difficulty: 'medium' },
      { category: 'Social Media Apps', words: ['TWITTER', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT'], difficulty: 'hard' },
      { category: '___ BALL', words: ['FOOT', 'BASE', 'BASKET', 'VOLLEY'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Kitchen Appliances', words: ['OVEN', 'STOVE', 'BLENDER', 'TOASTER'], difficulty: 'easy' },
      { category: 'Music Genres', words: ['ROCK', 'JAZZ', 'BLUES', 'CLASSICAL'], difficulty: 'medium' },
      { category: 'Fast Food Chains', words: ['SUBWAY', 'ARBYS', 'WENDYS', 'POPEYES'], difficulty: 'hard' },
      { category: 'Words with Double Letters', words: ['COFFEE', 'BALLOON', 'BUTTER', 'COMMITTEE'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Ocean Animals', words: ['WHALE', 'DOLPHIN', 'SHARK', 'OCTOPUS'], difficulty: 'easy' },
      { category: 'Programming Languages', words: ['PYTHON', 'JAVA', 'RUBY', 'SWIFT'], difficulty: 'medium' },
      { category: 'Movie Genres', words: ['COMEDY', 'DRAMA', 'THRILLER', 'HORROR'], difficulty: 'hard' },
      { category: '___BERRY', words: ['BLUE', 'STRAW', 'RASP', 'BLACK'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Weather Conditions', words: ['RAIN', 'SNOW', 'SLEET', 'HAIL'], difficulty: 'easy' },
      { category: 'Exercise Types', words: ['YOGA', 'PILATES', 'CARDIO', 'LIFTING'], difficulty: 'medium' },
      { category: 'Board Games', words: ['CHESS', 'CHECKERS', 'MONOPOLY', 'SCRABBLE'], difficulty: 'hard' },
      { category: 'FIRE___', words: ['PLACE', 'WORKS', 'FIGHTER', 'FLY'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Fruit', words: ['APPLE', 'ORANGE', 'BANANA', 'GRAPE'], difficulty: 'easy' },
      { category: 'US States', words: ['TEXAS', 'FLORIDA', 'ALASKA', 'HAWAII'], difficulty: 'medium' },
      { category: 'Currencies', words: ['DOLLAR', 'EURO', 'POUND', 'YEN'], difficulty: 'hard' },
      { category: '___CAKE', words: ['CUP', 'PAN', 'SHORT', 'CHEESE'], difficulty: 'hardest' }
    ]
  },
  {
    groups: [
      { category: 'Pets', words: ['DOG', 'CAT', 'HAMSTER', 'RABBIT'], difficulty: 'easy' },
      { category: 'Breakfast Foods', words: ['EGGS', 'BACON', 'TOAST', 'CEREAL'], difficulty: 'medium' },
      { category: 'School Subjects', words: ['MATH', 'SCIENCE', 'HISTORY', 'ENGLISH'], difficulty: 'hard' },
      { category: 'GREEN___', words: ['HOUSE', 'LAND', 'LIGHT', 'PEACE'], difficulty: 'hardest' }
    ]
  }
];

export default function Connections({ onBack }: ConnectionsProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [foundGroups, setFoundGroups] = useState<Group[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    // Select puzzle based on current day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const puzzleIndex = dayOfYear % PUZZLES.length;
    const selectedPuzzle = PUZZLES[puzzleIndex];

    setPuzzle(selectedPuzzle);

    // Shuffle all words
    const words = selectedPuzzle.groups.flatMap(g => g.words);
    const shuffled = words.sort(() => Math.random() - 0.5);
    setAllWords(shuffled);
    setSelectedWords([]);
    setFoundGroups([]);
    setMistakes(0);
    setGameOver(false);
    setGameWon(false);
    setMessage('');
  };

  const toggleWord = (word: string) => {
    if (gameOver) return;

    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const shuffleWords = () => {
    const remaining = allWords.filter(w => !foundGroups.some(g => g.words.includes(w)));
    setAllWords([...foundGroups.flatMap(g => g.words), ...remaining.sort(() => Math.random() - 0.5)]);
  };

  const deselectAll = () => {
    setSelectedWords([]);
  };

  const handleSubmit = () => {
    if (selectedWords.length !== 4 || !puzzle) return;

    // Check if selected words form a group
    const matchedGroup = puzzle.groups.find(group =>
      selectedWords.every(word => group.words.includes(word))
    );

    if (matchedGroup) {
      // Correct guess!
      const newFoundGroups = [...foundGroups, matchedGroup];
      setFoundGroups(newFoundGroups);
      setSelectedWords([]);
      setMessage(`Correct! ${matchedGroup.category}`);

      // Remove found words from display
      const remaining = allWords.filter(w => !matchedGroup.words.includes(w));
      setAllWords([...foundGroups.flatMap(g => g.words), ...matchedGroup.words, ...remaining]);

      setTimeout(() => setMessage(''), 2000);

      // Check if game is won
      if (newFoundGroups.length === 4) {
        setGameWon(true);
        setGameOver(true);
        setMessage('Congratulations! You found all connections! 🎉');
      }
    } else {
      // Wrong guess
      setShake(true);
      setTimeout(() => setShake(false), 500);

      // Check if one away from correct
      let oneAway = false;
      for (const group of puzzle.groups) {
        if (foundGroups.includes(group)) continue;
        const matches = selectedWords.filter(word => group.words.includes(word)).length;
        if (matches === 3) {
          oneAway = true;
          break;
        }
      }

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (oneAway) {
        setMessage('One away...');
      } else {
        setMessage('Incorrect. Try again!');
      }

      setTimeout(() => setMessage(''), 2000);

      if (newMistakes >= 4) {
        setGameOver(true);
        setMessage('Game Over! No more attempts remaining.');
        // Reveal remaining groups
        const remaining = puzzle.groups.filter(g => !foundGroups.includes(g));
        setFoundGroups([...foundGroups, ...remaining]);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-yellow-400';
      case 'medium':
        return 'bg-green-500';
      case 'hard':
        return 'bg-blue-500';
      case 'hardest':
        return 'bg-purple-600';
      default:
        return 'bg-gray-400';
    }
  };

  const remainingWords = allWords.filter(w => !foundGroups.some(g => g.words.includes(w)));

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
            Connections
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Find groups of four items that share something in common</p>
        </div>

        {/* Mistakes indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div className="text-gray-600 dark:text-gray-400 font-semibold">Mistakes remaining:</div>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < mistakes ? 'bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-semibold ${
            message.includes('Correct') || gameWon
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : message.includes('One away')
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Found groups */}
        <div className="mb-6 space-y-3">
          {foundGroups.map((group, idx) => (
            <div
              key={idx}
              className={`${getDifficultyColor(group.difficulty)} text-white p-4 rounded-xl`}
            >
              <div className="font-bold text-lg mb-2 text-center">{group.category.toUpperCase()}</div>
              <div className="text-center text-sm">{group.words.join(', ')}</div>
            </div>
          ))}
        </div>

        {/* Word grid */}
        {!gameOver && remainingWords.length > 0 && (
          <div className={`grid grid-cols-4 gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}>
            {remainingWords.map((word) => (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                className={`p-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedWords.includes(word)
                    ? 'bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-800 scale-95'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {word}
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        {!gameOver && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={shuffleWords}
              className="px-6 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Shuffle
            </button>
            <button
              onClick={deselectAll}
              className="px-6 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Deselect All
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedWords.length !== 4}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                selectedWords.length === 4
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit
            </button>
          </div>
        )}

        {gameOver && (
          <button
            onClick={initializeGame}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl mt-6"
          >
            Play Again
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

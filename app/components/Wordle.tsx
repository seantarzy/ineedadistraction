'use client';

import { useState, useEffect } from 'react';

interface WordleProps {
  onBack: () => void;
}

// Common 5-letter words for the game
const WORDS = [
  'REACT', 'BRAIN', 'PUZZLE', 'GAMES', 'HAPPY', 'WORLD', 'LIGHT', 'MUSIC',
  'DREAM', 'SPACE', 'OCEAN', 'SMILE', 'DANCE', 'HEART', 'PEACE', 'POWER',
  'MAGIC', 'LAUGH', 'VOICE', 'WRITE', 'THINK', 'CLOUD', 'STORM', 'FLAME',
  'BEACH', 'RIVER', 'MOUNTAIN', 'FOREST', 'NIGHT', 'FRESH', 'BRAVE', 'SWIFT'
];

// Valid 5-letter words for guessing (expanded list)
const VALID_WORDS = new Set([
  ...WORDS.map(w => w.toUpperCase()),
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT',
  'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT',
  'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'ANGEL', 'ANGER',
  'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE',
  'ARRAY', 'ASIDE', 'ASSET', 'AUDIO', 'AVOID', 'AWARD', 'AWARE', 'BADLY',
  'BAKER', 'BASES', 'BASIC', 'BASIS', 'BEACH', 'BEGAN', 'BEGIN', 'BEGUN',
  'BEING', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLIND',
  'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND',
  'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN',
  'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH', 'CAUSE',
  'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF',
  'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR',
  'CLICK', 'CLOCK', 'CLOSE', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT',
  'COVER', 'CRACK', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS',
  'CROWD', 'CROWN', 'CYCLE', 'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH',
  'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA',
  'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE',
  'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY',
  'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
  'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH',
  'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR',
  'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME',
  'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT',
  'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT',
  'GRASS', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS',
  'GUEST', 'GUIDE', 'HAPPY', 'HARRY', 'HEART', 'HEAVY', 'HENCE', 'HENRY',
  'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER',
  'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN',
  'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE',
  'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT',
  'LINKS', 'LIVES', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH',
  'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE',
  'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED',
  'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH',
  'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH',
  'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER',
  'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER',
  'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN',
  'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE',
  'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE',
  'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID',
  'RATIO', 'REACH', 'READY', 'REFER', 'RIGHT', 'RIVER', 'ROBIN', 'ROGER',
  'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SCALE', 'SCENE',
  'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE',
  'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK',
  'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED',
  'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE',
  'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK',
  'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE',
  'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL',
  'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK',
  'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE',
  'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEETH', 'TERRY', 'TEXAS', 'THANK',
  'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK',
  'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TITLE',
  'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE',
  'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIED', 'TRIES', 'TRUCK', 'TRULY',
  'TRUST', 'TRUTH', 'TWICE', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL',
  'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO',
  'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER',
  'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN',
  'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND',
  'WRITE', 'WRONG', 'WROTE', 'YOUNG', 'YOUTH'
]);

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

interface Letter {
  char: string;
  state: LetterState;
}

export default function Wordle({ onBack }: WordleProps) {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<Letter[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [message, setMessage] = useState('');
  const [usedLetters, setUsedLetters] = useState<Map<string, LetterState>>(new Map());

  useEffect(() => {
    // Select word based on current day (rotates daily)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const wordIndex = dayOfYear % WORDS.length;
    setTargetWord(WORDS[wordIndex].toUpperCase());
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        if (currentGuess.length < 5) {
          setCurrentGuess((prev) => (prev + e.key).toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentGuess, gameOver, targetWord]);

  const checkGuess = (guess: string): Letter[] => {
    const result: Letter[] = [];
    const targetLetters = targetWord.split('');
    const guessLetters = guess.split('');

    // First pass: mark correct positions
    const remainingTarget: string[] = [];
    const remainingGuess: { char: string; index: number }[] = [];

    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = { char: guessLetters[i], state: 'correct' };
      } else {
        remainingTarget.push(targetLetters[i]);
        remainingGuess.push({ char: guessLetters[i], index: i });
      }
    }

    // Second pass: mark present letters
    for (const { char, index } of remainingGuess) {
      const targetIndex = remainingTarget.indexOf(char);
      if (targetIndex !== -1) {
        result[index] = { char, state: 'present' };
        remainingTarget.splice(targetIndex, 1);
      } else {
        result[index] = { char, state: 'absent' };
      }
    }

    // Update used letters
    const newUsedLetters = new Map(usedLetters);
    result.forEach(({ char, state }) => {
      const currentState = newUsedLetters.get(char);
      if (!currentState ||
          state === 'correct' ||
          (state === 'present' && currentState === 'absent')) {
        newUsedLetters.set(char, state);
      }
    });
    setUsedLetters(newUsedLetters);

    return result;
  };

  const handleSubmit = () => {
    if (currentGuess.length !== 5) {
      setMessage('Word must be 5 letters!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (!VALID_WORDS.has(currentGuess)) {
      setMessage('Not a valid word!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const result = checkGuess(currentGuess);
    const newGuesses = [...guesses, result];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      setGameWon(true);
      setGameOver(true);
      setMessage('Congratulations! You won! 🎉');
    } else if (newGuesses.length === 6) {
      setGameOver(true);
      setMessage(`Game Over! The word was ${targetWord}`);
    } else {
      setMessage('');
    }
  };

  const handleKeyClick = (key: string) => {
    if (gameOver) return;

    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === 'BACK') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else {
      if (currentGuess.length < 5) {
        setCurrentGuess((prev) => (prev + key).toUpperCase());
      }
    }
  };

  const resetGame = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const wordIndex = dayOfYear % WORDS.length;
    setTargetWord(WORDS[wordIndex].toUpperCase());
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setGameWon(false);
    setMessage('');
    setUsedLetters(new Map());
  };

  const getLetterClass = (state: LetterState) => {
    switch (state) {
      case 'correct':
        return 'bg-green-500 border-green-500 text-white';
      case 'present':
        return 'bg-yellow-500 border-yellow-500 text-white';
      case 'absent':
        return 'bg-gray-500 border-gray-500 text-white';
      default:
        return 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600';
    }
  };

  const getKeyClass = (letter: string) => {
    const state = usedLetters.get(letter);
    switch (state) {
      case 'correct':
        return 'bg-green-500 text-white';
      case 'present':
        return 'bg-yellow-500 text-white';
      case 'absent':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600';
    }
  };

  const renderGrid = () => {
    const rows = [];

    // Render completed guesses
    for (let i = 0; i < 6; i++) {
      const row = [];
      if (i < guesses.length) {
        // Past guess
        for (let j = 0; j < 5; j++) {
          const letter = guesses[i][j];
          row.push(
            <div
              key={j}
              className={`w-14 h-14 border-2 flex items-center justify-center text-2xl font-bold rounded ${getLetterClass(letter.state)}`}
            >
              {letter.char}
            </div>
          );
        }
      } else if (i === guesses.length) {
        // Current guess
        for (let j = 0; j < 5; j++) {
          row.push(
            <div
              key={j}
              className={`w-14 h-14 border-2 flex items-center justify-center text-2xl font-bold rounded ${
                currentGuess[j]
                  ? 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              {currentGuess[j] || ''}
            </div>
          );
        }
      } else {
        // Empty rows
        for (let j = 0; j < 5; j++) {
          row.push(
            <div
              key={j}
              className="w-14 h-14 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl font-bold rounded bg-white dark:bg-gray-800"
            >
            </div>
          );
        }
      }
      rows.push(
        <div key={i} className="flex gap-2 justify-center">
          {row}
        </div>
      );
    }
    return rows;
  };

  const keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2 text-green-600 dark:text-green-400">
            Wordle
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Guess the 5-letter word in 6 tries!</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-semibold ${
            gameWon
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : gameOver
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
          }`}>
            {message}
          </div>
        )}

        <div className="mb-8 space-y-2">
          {renderGrid()}
        </div>

        <div className="mb-6 space-y-2">
          {keyboard.map((row, i) => (
            <div key={i} className="flex gap-1 justify-center">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyClick(key)}
                  disabled={gameOver}
                  className={`${
                    key === 'ENTER' || key === 'BACK' ? 'px-4' : 'w-10'
                  } h-12 rounded font-semibold transition-all duration-150 ${getKeyClass(key)} ${
                    gameOver ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {key === 'BACK' ? '←' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {gameOver && (
          <button
            onClick={resetGame}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

interface FactGeneratorProps {
  onBack: () => void;
}

const facts = [
  {
    fact: "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that is still perfectly edible.",
    category: "Nature"
  },
  {
    fact: "A group of flamingos is called a 'flamboyance'.",
    category: "Animals"
  },
  {
    fact: "Octopuses have three hearts and blue blood.",
    category: "Animals"
  },
  {
    fact: "The shortest war in history lasted 38 minutes between Britain and Zanzibar in 1896.",
    category: "History"
  },
  {
    fact: "Bananas are berries, but strawberries aren't.",
    category: "Science"
  },
  {
    fact: "A day on Venus is longer than its year. Venus takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
    category: "Space"
  },
  {
    fact: "The world's largest desert is actually Antarctica, not the Sahara.",
    category: "Geography"
  },
  {
    fact: "Sharks have been around longer than trees. Sharks: 400 million years. Trees: 350 million years.",
    category: "Nature"
  },
  {
    fact: "There are more stars in the universe than grains of sand on all of Earth's beaches.",
    category: "Space"
  },
  {
    fact: "A small child could swim through the veins of a blue whale.",
    category: "Animals"
  },
  {
    fact: "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
    category: "History"
  },
  {
    fact: "The probability of you drinking a glass of water that contains a molecule that passed through a dinosaur is almost 100%.",
    category: "Science"
  },
  {
    fact: "A group of owls is called a 'parliament'.",
    category: "Animals"
  },
  {
    fact: "The human brain uses approximately 20% of the body's energy despite being only 2% of body mass.",
    category: "Human Body"
  },
  {
    fact: "If you could fold a piece of paper 42 times, it would reach the moon.",
    category: "Math"
  },
  {
    fact: "There's enough DNA in your body to stretch from the Sun to Pluto and back — 17 times.",
    category: "Science"
  },
  {
    fact: "The inventor of the Pringles can is now buried in one.",
    category: "Fun"
  },
  {
    fact: "Oxford University is older than the Aztec Empire. Oxford started teaching in 1096; Aztecs founded Tenochtitlan in 1325.",
    category: "History"
  },
  {
    fact: "A cloud can weigh over a million pounds.",
    category: "Weather"
  },
  {
    fact: "The fingerprints of a koala are so indistinguishable from humans that they have on occasion been confused at a crime scene.",
    category: "Animals"
  },
  {
    fact: "There are more possible iterations of a game of chess than there are atoms in the known universe.",
    category: "Math"
  },
  {
    fact: "The longest time between two twins being born is 87 days.",
    category: "Human Body"
  },
  {
    fact: "A bolt of lightning is five times hotter than the surface of the sun.",
    category: "Weather"
  },
  {
    fact: "The world's oldest known living tree is over 5,000 years old.",
    category: "Nature"
  },
  {
    fact: "Your brain uses about 20 watts of power - about the same as a dim lightbulb.",
    category: "Human Body"
  }
];

export default function FactGenerator({ onBack }: FactGeneratorProps) {
  const [currentFact, setCurrentFact] = useState(facts[Math.floor(Math.random() * facts.length)]);
  const [factsViewed, setFactsViewed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const getNewFact = () => {
    setIsAnimating(true);
    setTimeout(() => {
      let newFact;
      do {
        newFact = facts[Math.floor(Math.random() * facts.length)];
      } while (newFact === currentFact && facts.length > 1);

      setCurrentFact(newFact);
      setFactsViewed((prev) => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Nature: 'bg-green-500',
      Animals: 'bg-orange-500',
      History: 'bg-amber-500',
      Science: 'bg-purple-500',
      Space: 'bg-indigo-500',
      Geography: 'bg-teal-500',
      'Human Body': 'bg-red-500',
      Math: 'bg-blue-500',
      Fun: 'bg-pink-500',
      Weather: 'bg-cyan-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
            Random Facts
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Feed your curiosity!</p>
        </div>

        <div className="text-center mb-6">
          <div className="inline-block">
            <span className={`${getCategoryColor(currentFact.category)} text-white px-4 py-2 rounded-full text-sm font-semibold`}>
              {currentFact.category}
            </span>
          </div>
        </div>

        <div
          className={`mb-8 p-8 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-2xl min-h-[200px] flex items-center justify-center transition-all duration-300 ${
            isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed text-center">
            {currentFact.fact}
          </p>
        </div>

        <div className="text-center mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Facts viewed: <span className="font-bold text-blue-600 dark:text-blue-400">{factsViewed}</span>
          </p>
        </div>

        <button
          onClick={getNewFact}
          disabled={isAnimating}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Show Me Another Fact! 🎲
        </button>

        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            💡 Did you know? We have {facts.length} amazing facts waiting to be discovered!
          </p>
        </div>
      </div>
    </div>
  );
}

import { PrismaClient } from '@prisma/client';
import { TEMPLATES } from '../app/lib/templates';

const prisma = new PrismaClient();

const SEED_BUILTINS = [
  { id: 'wordle', title: 'Wordle', description: 'Guess the 5-letter word in 6 tries', emoji: '🔤', component: 'Wordle', votes: 128, tags: ['word', 'puzzle'], daysAgo: 7 },
  { id: 'connections', title: 'Connections', description: 'Find four groups of four related words', emoji: '🔗', component: 'Connections', votes: 94, tags: ['word', 'puzzle'], daysAgo: 6 },
  { id: 'brainteaser', title: 'Brain Teaser', description: 'Challenge your mind with tricky riddles', emoji: '🧩', component: 'BrainTeaser', votes: 77, tags: ['puzzle', 'riddle'], daysAgo: 5 },
  { id: 'memory', title: 'Memory Game', description: 'Match pairs before the clock runs out', emoji: '🎴', component: 'MemoryGame', votes: 61, tags: ['memory', 'speed'], daysAgo: 4 },
  { id: 'facts', title: 'Random Facts', description: 'Discover fascinating facts you never knew', emoji: '💡', component: 'FactGenerator', votes: 45, tags: ['trivia', 'chill'], daysAgo: 3 },
];

async function main() {
  for (const w of SEED_BUILTINS) {
    await prisma.widget.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        title: w.title,
        description: w.description,
        emoji: w.emoji,
        type: 'builtin',
        component: w.component,
        votes: w.votes,
        tags: w.tags,
        remixable: true,
        createdAt: new Date(Date.now() - 86400000 * w.daysAgo),
      },
    });
  }

  for (const t of TEMPLATES.filter((t) => t.id !== 'blank')) {
    await prisma.widget.upsert({
      where: { id: t.id },
      update: { html: t.html }, // refresh HTML when templates evolve
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        emoji: t.emoji,
        type: 'builtin',
        html: t.html,
        votes: 50,
        tags: [],
        remixable: true,
        createdAt: new Date(Date.now() - 86400000 * 3),
      },
    });
  }

  console.log(`Seeded ${SEED_BUILTINS.length} builtins and ${TEMPLATES.length - 1} templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

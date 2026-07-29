import { PrismaClient } from '@prisma/client';
import { TEMPLATES } from '../app/lib/templates';

const prisma = new PrismaClient();

const SEED_BUILTINS = [
  { id: 'brainteaser', title: 'Daily Brain Teaser', description: 'Solve a quick riddle, use a hint if you need one, and keep your mind moving', emoji: '🧩', component: 'BrainTeaser', votes: 77, tags: ['riddle', 'logic', 'brain'], daysAgo: 5 },
  { id: 'memory', title: 'Memory Sprint', description: 'Match the pairs fast, minimize moves, and chase a better memory run', emoji: '🎴', component: 'MemoryGame', votes: 61, tags: ['memory', 'speed', 'brain'], daysAgo: 4 },
  { id: 'facts', title: 'Curiosity Cards', description: 'Flip through surprising facts and feed the brainy side of your next break', emoji: '💡', component: 'FactGenerator', votes: 45, tags: ['trivia', 'curiosity', 'brain'], daysAgo: 3 },
];

async function main() {
  for (const w of SEED_BUILTINS) {
    await prisma.widget.upsert({
      where: { id: w.id },
      update: {
        title: w.title,
        description: w.description,
        emoji: w.emoji,
        component: w.component,
        votes: w.votes,
        tags: w.tags,
        remixable: true,
      },
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
      update: {
        title: t.title,
        description: t.description,
        emoji: t.emoji,
        html: t.html,
        remixable: true,
      }, // refresh built-in starter metadata when templates evolve
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        emoji: t.emoji,
        type: 'builtin',
        html: t.html,
        votes: 50,
        tags: ['template', 'brain'],
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

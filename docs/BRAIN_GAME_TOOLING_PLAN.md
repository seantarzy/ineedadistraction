# Brain Game Tooling Plan

## Purpose

This document captures the recommended tooling direction for making the best possible brain games on `ineedadistraction`.

The goal is not unlimited freedom.
The goal is fast creation with consistently fun, shareable output.

## Product Bias

The platform should bias toward:

- brain games
- quiz and trivia hybrids
- pattern and logic games
- sort and match formats
- memory and category challenges

This does **not** mean every game must feel educational.
It means the default creation system should favor:

- clear goals
- quick rounds
- one-more-try loops
- mobile-friendly controls
- simple, readable interfaces

## Tooling Layers

We should think about game creation in 4 layers.

### 1. Mechanic templates

These are the most important assets.

Examples:

- sequence sprint
- math race
- trivia rush
- category sort
- memory sprint
- logic ladder

Each template should define:

- core loop
- HUD structure
- input model
- pacing
- success/failure states
- mobile-safe layout

This is the main quality-control layer.

### 2. Content packs

These make templates feel varied without breaking them.

Examples:

- math
- geography
- music
- animals
- science
- space
- food
- pop culture
- internet
- school

Each content pack can control:

- question pool
- terms/answers
- category labels
- difficulty distribution
- flavor copy

This is likely where AI helps most.

### 3. Static asset packs

Yes, this absolutely makes sense.

We should create curated static sprite/theme packs first rather than rely on totally open-ended generation.

Why:

- keeps games visually coherent
- avoids weird unreadable AI art
- is easier to test on mobile
- keeps generation cheap and fast
- helps create a recognizable house style

Suggested asset slots:

- background
- card/tile style
- button style
- icon set
- reward/celebration badge
- avatar/mascot
- obstacle or collectible where relevant

Suggested pack themes:

- neon arcade
- school notebook
- cosmic puzzle
- retro game show
- candy logic
- office brain break
- spooky trivia
- animal memory
- sports quiz
- internet meme

### 4. Bounded image generation

Use image generation later as an extension of the static packs, not a replacement.

Good use cases:

- generate a mascot variant
- generate themed badges
- generate collectible/icon alternatives
- generate simple background art
- generate sprite variations for a fixed slot

Bad early use cases:

- asking the model to generate every visual freely
- letting each game invent its own art language
- generating complex sprite sheets without slot constraints

## Recommended Workflow

### V1 workflow

1. User chooses a brain-game template
2. User chooses or describes a theme
3. AI changes the content, difficulty, and flavor
4. The game uses a curated visual pack
5. User remixes and publishes

This gives strong output quality while still feeling magical.

### V2 workflow

1. User chooses a template
2. User chooses a theme pack
3. User optionally generates bounded visual variants
4. AI updates content and presentation
5. User publishes and remixes

## Recommended Near-Term Templates

The strongest initial set is:

- Sequence Sprint
- Math Quiz / Quiz Race
- Trivia Challenge
- Category Grouping / Connections-style
- Memory Sprint

These are good because they are:

- easy to understand
- quick to play
- easy to remix
- naturally mobile-friendly
- consistent with the brand

## Static Asset Pack Guidance

When generating static packs, optimize for:

- strong contrast
- large readable shapes
- limited color palettes
- immediate recognizability on small screens
- consistency across buttons, cards, and feedback states

Avoid:

- over-detailed illustrations
- tiny text baked into images
- busy backgrounds
- effects that make answer states unclear

## Content System Guidance

For brain games, content quality matters as much as visuals.

We should eventually build structured content generators for:

- multiple choice question sets
- category-grouping sets
- word ladders
- pattern sequences
- memory-card pairs
- topic-based trivia decks

This is a stronger long-term use of AI than freeform mechanic invention.

## Why This Matters

If we do this well, the site becomes:

- easier to create for
- easier to market
- easier to play on phones
- easier to remix
- more consistent in quality

That is a better moat than simply saying "AI can make games."


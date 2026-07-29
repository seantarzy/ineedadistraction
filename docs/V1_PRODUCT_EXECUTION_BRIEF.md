# I Need a Distraction - V1 Product Execution Brief

## Purpose

This document translates the current product thesis into a practical V1 plan for this repo.

It is intentionally grounded in what already exists:

- Next.js App Router site
- Clerk auth
- Prisma/Postgres storage
- Anthropic-powered game generation/remixing
- publish/play/vote/share flows
- waitlist gate
- daily brain-game wedge via `Quartet`

The goal is to sharpen the product, not rebuild the infrastructure.

## Current Repo Strengths

The current codebase already contains the core of the right product direction:

- A waitlist-first marketing entry point that can gate access while the product matures
- A dashboard with community discovery and create CTA
- A template/remix flow with conversational iteration
- Drafts, message history, and snapshots for creation persistence
- Published game pages with share, like, edit, and remix hooks
- A daily word/category game (`/connections`, branded as `Quartet`)
- Existing brain-game templates and examples

This is a strong base. We should avoid ripping out the pipes.

## Product Thesis

`I Need a Distraction` should become a mobile-friendly network for remixable brain games and quick clever mini-games.

The value proposition is not:

- "AI can make any game"

The value proposition is:

- "Take a proven fun game loop, remix it in minutes, and share your version"

The strongest near-term lane for this repo is:

- brain games
- light arcade/quiz hybrids
- daily puzzle habits
- social remix culture

## Target User

Primary audience:

- teens and adults
- casual players who like short, clever games
- non-coders who want to create something fun quickly

Secondary audience:

- friend groups
- social sharers on X, Discord, and group chats
- puzzle and daily-game fans

Not the focus for V1:

- kids as a primary audience
- hardcore gamers
- users looking for a full-featured game engine

## Product Wedge Already Visible In This Repo

There are two especially strong signals in the existing product:

### 1. `Quartet` is a real wedge

The daily AI-built category/word puzzle is already close to a distinctive consumer concept:

- mobile-friendly
- habitual
- brainy
- daily
- shareable

This is aligned with the product thesis and should be treated as a pillar, not a side experiment.

### 2. Quiz/brain hybrids fit the platform well

Examples like the existing math racer concept point toward a highly promising format:

- simple mechanic
- educational/brainy core
- fast retry loop
- easy theming/remixing
- mobile-compatible if designed carefully

This should likely be one of the flagship template families.

## V1 Principle

Constrain the creation surface so the output is consistently fun.

V1 should support a small number of mechanic families with a strong quality bar, rather than broad open-ended generation.

## Recommended V1 Mechanic Families

Support 3-4 high-quality families first:

### 1. Quiz Race

Examples:

- math race
- vocab sprint
- geography dash
- trivia chase

Why this fits:

- easy to understand
- content-rich
- themeable
- brainy
- replayable

### 2. Sort and Match

Examples:

- category sort
- pair the clue
- match concept to answer
- group related items

Why this fits:

- phone-friendly
- quick rounds
- educational and social
- compatible with AI-generated content

### 3. Pattern and Logic

Examples:

- sequence completion
- logic-lite grids
- classification puzzles
- `Quartet`-adjacent category reasoning

Why this fits:

- supports daily habits
- feels smart, not childish
- easier to share as a challenge

### 4. Social Brain Games

Examples:

- custom trivia packs
- clue/guess games
- friend-group challenge decks
- lightweight party puzzle formats

Why this fits:

- leverages browser sharing
- builds the social layer
- keeps AI focused on content, not mechanics

## What AI Should Control

In V1, AI should mostly control:

- theme
- subject matter
- question generation
- category generation
- difficulty
- flavor text
- title and description
- remix suggestions

AI should not be relied on to freely invent:

- control schemes
- layout systems
- pacing structures
- game loops
- core HUD architecture

This is the key tradeoff that preserves quality.

## Mobile-First Product Rules

All flagship templates should be designed to work well on phones first.

Rules:

- portrait-friendly by default or flexible orientation
- large tap targets
- no hover dependence
- very readable text
- fast restart after failure
- round length ideally between 10 and 90 seconds
- low friction before first interaction

The product can remain web-only in V1. Offline support is not required yet.

## Asset Strategy

Do not start with open-ended image generation for every game.

Instead:

### V1 asset plan

- curated asset/theme packs
- fixed asset slots per mechanic family
- visually coherent defaults

Suggested slots:

- player/avatar
- obstacle/enemy
- collectible
- background
- HUD accent pack

Suggested theme packs:

- school
- space
- fantasy
- food
- office
- animals
- sports
- spooky
- retro arcade
- internet/meme

### V2 asset plan

Add bounded AI-generated variants:

- recolors
- sprite swaps
- theme-specific character sets
- controlled image generation per asset slot

## Social Layer Priorities

The product should lean harder into visible remix culture.

Important V1 social primitives:

- play count
- like count
- remix count
- clear remix button
- creator identity
- lineage / "remixed from"
- trending and recent discovery

Important future primitives:

- comments/reactions
- creator pages
- remix trees
- challenge links

## Economy Direction

V1 should not overbuild monetization infrastructure.

Recommended order:

### Phase 1

- manual or simple creator rewards
- weekly challenges
- small platform-funded incentives

### Phase 2

- ad experiments on high-play pages
- revenue share for successful games
- possibly a share for upstream remix ancestors

### Phase 3

- sponsorable challenges
- premium creator tools
- more formalized creator economy

## What Not To Do Right Now

- do not rebuild the app around fully open-ended game generation
- do not try to support too many mechanic families
- do not make the homepage promise too broad
- do not optimize for kids first
- do not lead with advanced graphics
- do not depend on open-ended custom art generation to make V1 fun

## Recommended Next Build Step

The highest-leverage next step is:

## Ship a focused "brain games first" product pass without changing the backend architecture

That pass should include:

### 1. Reposition the product in the UI

Update landing/dashboard/create surfaces so they emphasize:

- brain games
- remixable templates
- daily play
- quick clever fun

### 2. Curate the template entry point

Instead of presenting creation as a broad blank canvas, group templates into a few clear families:

- Quiz Race
- Sort and Match
- Pattern and Logic
- Social Brain Games

### 3. Elevate `Quartet`

Make the daily puzzle feel like a first-class product pillar.

### 4. Add remix/discovery signals that reinforce the flywheel

Especially:

- visible play counts
- visible remix counts
- "remixed from" attribution on published game pages and cards

## Why This Is The Right Next Step

This step:

- keeps the current architecture
- improves product clarity quickly
- raises the quality bar without a rewrite
- supports mobile-first positioning
- makes the product thesis visible to users

It is a better next move than infrastructure churn.

## Proposed V1 Workstreams

### Workstream A - Product Messaging

- tighten landing page promise
- clarify who the product is for
- foreground "brain games" and "remix"

### Workstream B - Template Strategy

- identify the flagship 3-4 template families
- tune template descriptions and remix prompts
- bias toward mobile-safe, quick loops

### Workstream C - Discovery And Flywheel

- show stronger popularity and remix signals
- improve paths from play -> remix -> publish -> share

### Workstream D - Daily Habit

- promote `Quartet`
- create a clearer "daily brain game" habit loop

## Suggested Near-Term Build Order

1. Product copy and template taxonomy pass
2. Discovery/remix attribution pass
3. `Quartet` elevation pass
4. Template quality pass for flagship brain-game families
5. Mobile polish pass across play surfaces

## Notes On Architecture

The current architecture is directionally good for this product:

- generation and remixing already exist
- persistence already exists
- play pages already exist
- daily puzzle infrastructure already exists
- waitlist gating already exists

The right move is refinement and focus, not replacement.

## Success Criteria For This Phase

We should consider this phase successful if the app becomes more clearly legible as:

- a place to play clever daily/short-form brain games
- a place to remix proven fun templates
- a place where creators can make and share their own versions quickly

Behaviorally, the target is to improve:

- play -> share
- play -> remix
- create -> publish
- publish -> revisit


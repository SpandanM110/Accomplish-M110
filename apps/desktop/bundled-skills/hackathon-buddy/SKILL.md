---
name: hackathon-buddy
description: Built-in hackathon assistant. Discover hackathons, validate ideas, plan builds, prep pitches, and handle post-hackathon continuity. Ready to use.
command: /hackathon-buddy
verified: true
---

# Hackathon Buddy

**Built-in and ready.** Hackathon Buddy is an MCP-powered assistant that helps you through the full hackathon lifecycle.

## What You Can Do

### Scout — Find Hackathons

- Search for active and upcoming hackathons
- Get details: prizes, judges, sponsors, deadlines
- Browse winning projects from past hackathons

### Team — Build Your Squad

- Analyze GitHub profiles for skills
- Recommend tech stack based on team
- Identify skill gaps and assign roles

### Validator — Test Your Idea

- Validate your project idea
- Score viability and find similar projects
- Generate a competitive moat statement

### Planner — Build Smarter

- Generate a ticket board from your idea
- Flag risky tickets, calculate burndown
- Get panic-mode guidance when time is short
- Generate boilerplate structure

### Pitch — Win the Demo

- Build judge dossiers
- Simulate judge Q&A
- Generate demo script and slide structure
- Calibrate language and optimize Devpost submission

### Continuity — After the Hackathon

- Generate polished README
- Create LinkedIn post variants
- Match grants and accelerators
- Plan a 30-day sprint or dignity archive

## Example Prompts

- "Search for active hackathons on Devpost"
- "Get details for [hackathon URL]"
- "Validate my idea: [your project description]"
- "Analyze my team's GitHub: [usernames]"
- "Generate a ticket board for [project idea]"
- "Build judge dossiers for [hackathon name]"
- "Generate a README for our project"

## Requirements

- **EXA_API_KEY** in `.env` for web search (hackathon discovery, judges, grants)
- **GITHUB_TOKEN** (optional) for team analysis tools

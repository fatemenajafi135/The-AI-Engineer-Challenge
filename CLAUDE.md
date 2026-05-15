# Project: The AI Engineer Challenge

## General Rules

- You must always commit your changes whenever you update code.
- You must always try and write code that is well documented. (self or commented is fine)
- You must only work on a single feature at a time.
- You must explain your decisions thoroughly to the user.


# Frontend Rules
> Apply these rules when designing a frontend or frontend components.

- You must pay attention to visual clarity and contrast. Do not place white text on a white background.
- You must ensure the UX is pleasant. Boxes should grow to fit their contents, etc.
- When asking the user for sensitive information - you must use password style text-entry boxes in the UI.
- You should use Next.js as it works best with Vercel.
- This frontend will ultimately be deployed on Vercel, but it should be possible to test locally.
- Always provide users with a way to run the created UI once you have created it.


## Frontend Theme & Design Rules

### Color Scheme
- Primary background: #26152D
- Card/surface (header, input bar): #1A101E
- User message bubble: #9472B6
- User message text: #FFFFFF
- Assistant message bubble: #483550
- Assistant message text: #FFFFFF
- Text primary: #FFFFFF
- Text secondary: #6B7280
- Accent (send button): #9472B6
- Accent hover: #483550
- Border color: #483550

### Style
- Minimal, deep indigo dark mode only
- Rounded corners (border-radius: 12px for cards, 18px for bubbles)
- Subtle indigo shadows: `box-shadow: 0 4px 24px rgba(167, 139, 250, 0.1)`
- Clean monospace font for code blocks (JetBrains Mono)
- Smooth transitions (200ms ease)

### Layout
- Centered chat container, max-width 760px
- Sticky input bar at bottom
- Auto-scroll to latest message
- Show typing indicator during streaming


## README Rules

- When you create README.md's - they should be dope, and use fun and approachable language.
- While being fun, they should remain technically accurate.


## Refactoring

### When to Refactor
- Refactor in the current feature branch before merging into main
- Never branch off unfinished or messy code — clean first, then branch
- Main must always be deployable and clean

### Constants & Config
- All frontend constants live in `/frontend/config.ts` — model name, API base URL, persona definitions, system prompts
- All backend constants live in `/api/config.py` 
- Do not merge frontend and backend configs — keep them separate files
- If a constant is shared between frontend and backend, duplicate it and mark it with a comment:
  `# kept in sync with frontend/config.ts`
- Nothing should be hardcoded inline — no magic strings, no scattered model names

### Environment Variables
- Sensitive values (e.g. `OPENAI_API_KEY`) must always come from environment variables
- Never hardcode secrets or keys anywhere in the codebase
- Local dev uses `.env.local`, production uses Vercel environment variable settings

### General Rules
- Refactoring must never change logic or functionality — only move, rename, or reorganize
- After any refactor, leave a short summary comment at the top of the changed file explaining what was moved and why
- Keep one config file per layer (one for frontend, one for backend) — do not create multiple scattered config files
- When in doubt, duplication between frontend and backend is acceptable — overengineering a shared config is not worth it at this scale

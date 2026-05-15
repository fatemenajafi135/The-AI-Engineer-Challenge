<p align = "center" draggable=”false” ><img src="https://github.com/AI-Maker-Space/LLM-Dev-101/assets/37101144/d1343317-fa2f-41e1-8af1-1dbb18399719" 
     width="200px"
     height="auto"/>
</p>


## <h1 align="center" id="heading"> 👋 Welcome to the AI Engineer Challenge</h1>

## 🤖 Your First Vibe Coding LLM Application

> If you are a novice, and need a bit more help to get your dev environment off the ground, check out this [Setup Guide](docs/GIT_SETUP.md). This guide will walk you through the 'git' setup you need to get started.

> For additional context on LLM development environments and API key setup, you can also check out our [Interactive Dev Environment for LLM Development](https://github.com/AI-Maker-Space/Interactive-Dev-Environment-for-AI-Engineers).

In this repository, we'll walk you through the steps to create a LLM (Large Language Model) powered application with a vibe-coded frontend!

Are you ready? Let's get started!

<details>
  <summary>🖥️ Accessing "gpt-4.1-mini" (ChatGPT) like a developer</summary>

1. Head to [this notebook](https://colab.research.google.com/drive/1sT7rzY_Lb1_wS0ELI1JJfff0NUEcSD72?usp=sharing) and follow along with the instructions!

2. Complete the notebook and try out your own system/assistant messages!

That's it! Head to the next step and start building your application!

</details>


<details>
  <summary>🏗️ Forking & Cloning This Repository</summary>

Before you begin, make sure you have:

1. 👤 A GitHub account (you'll need to replace `YOUR_GITHUB_USERNAME` with your actual username)
2. 🔧 Git installed on your local machine
3. 💻 A code editor (like Cursor, VS Code, etc.)
4. ⌨️ Terminal access (Mac/Linux) or Command Prompt/PowerShell (Windows)
5. 🔑 A GitHub Personal Access Token (for authentication)

Got everything in place? Let's move on!

1. Fork [this](https://github.com/AI-Maker-Space/The-AI-Engineer-Challenge) repo!

     ![image](https://i.imgur.com/bhjySNh.png)

1. Clone your newly created repo.

     ``` bash
     # First, navigate to where you want the project folder to be created
     cd PATH_TO_DESIRED_PARENT_DIRECTORY

     # Then clone (this will create a new folder called The-AI-Engineer-Challenge)
     git clone git@github.com:<YOUR GITHUB USERNAME>/The-AI-Engineer-Challenge.git
     ```

     > Note: This command uses SSH. If you haven't set up SSH with GitHub, the command will fail. In that case, use HTTPS by replacing `git@github.com:` with `https://github.com/` - you'll then be prompted for your GitHub username and personal access token.

2. Verify your git setup:

     ```bash
     # Check that your remote is set up correctly
     git remote -v

     # Check the status of your repository
     git status

     # See which branch you're on
     git branch
     ```

     <!-- > Need more help with git? Check out our [Detailed Git Setup Guide](docs/GIT_SETUP.md) for a comprehensive walkthrough of git configuration and best practices. -->

3. Open the freshly cloned repository inside Cursor!

     ```bash
     cd The-AI-Engineering-Challenge
     cursor .
     ```

4. Check out the existing backend code found in `/api/index.py`

</details>

<details>
  <summary>⚙️ Backend Setup with uv</summary>

1. Install the [`uv`](https://github.com/astral-sh/uv) package manager (`pip install uv`). `uv` will download and manage Python 3.12 for you the first time you run a project command.
2. From the project root, install dependencies with `uv sync`. This creates `.venv/` (and fetches Python 3.12 automatically if needed).
3. Set your OpenAI API key in the shell before running the server, for example `export OPENAI_API_KEY=sk-...`.
4. Start the backend directly from the project root with `uv run uvicorn api.index:app --reload`. The server will run on `http://localhost:8000` with auto-reload enabled for development.
5. Additional backend details live in `api/README.md`.

</details>

<details>
  <summary>🔥Setting Up for Vibe Coding Success </summary>

While it is a bit counter-intuitive to set things up before jumping into vibe-coding - it's important to remember that there exists a gradient betweeen AI-Assisted Development and Vibe-Coding. We're only reaching *slightly* into AI-Assisted Development for this challenge, but it's worth it!

1. Check out the rules in `.cursor/rules/` and add theme-ing information like colour schemes in `frontend-rule.mdc`! You can be as expressive as you'd like in these rules!
2. We're going to index some docs to make our application more likely to succeed. To do this - we're going to start with `CTRL+SHIFT+P` (or `CMD+SHIFT+P` on Mac) and we're going to type "custom doc" into the search bar. 

     ![image](https://i.imgur.com/ILx3hZu.png)
3. We're then going to copy and paste `https://nextjs.org/docs` into the prompt.

     ![image](https://i.imgur.com/psBjpQd.png)

4. We're then going to use the default configs to add these docs to our available and indexed documents.

     ![image](https://i.imgur.com/LULLeaF.png)

5. After that - you will do the same with Vercel's documentation. After which you should see:

     ![image](https://i.imgur.com/hjyXhhC.png) 

</details>

<details>
  <summary>😎 Vibe Coding a Front End for the FastAPI Backend</summary>

1. Use `Command-L` or `CTRL-L` to open the Cursor chat console. 

2. Set the chat settings to the following:

     ![image](https://i.imgur.com/LSgRSgF.png)

3. Ask Cursor to create a frontend for your application. Iterate as much as you like!

4. Run the frontend using the instructions Cursor provided. 

> NOTE: If you run into any errors, copy and paste them back into the Cursor chat window - and ask Cursor to fix them!

> NOTE: You have been provided with a backend in the `/api` folder - please ensure your Front End integrates with it!

</details>

<details>
  <summary>🚀 Deploying Your First LLM-powered Application with Vercel</summary>

1. Ensure you have signed into [Vercel](https://vercel.com/) with your GitHub account.

2. Ensure you have `npm` (this may have been installed in the previous vibe-coding step!) - if you need help with that, ask Cursor!

3. Run the command:

     ```bash
     npm install -g vercel
     ```

4. Run the command:

     ```bash
     vercel
     ```

5. Follow the in-terminal instructions. (Below is an example of what you will see!)

     ![image](https://i.imgur.com/D1iKGCq.png)

6. Once the build is completed - head to the provided link and try out your app!

> NOTE: Remember, if you run into any errors - ask Cursor to help you fix them!

### Vercel Link to Share

You'll want to make sure you share you *domains* hyperlink to ensure people can access your app!

![image](https://i.imgur.com/mpXIgIz.png)

> NOTE: Test this is the public link by trying to open your newly deployed site in an Incognito browser tab!

</details>

<details>
     <summary>🧪 Vibe Check Your LLM App</summary>

### 🤔 What is a Vibe Check?

Now that you’ve built and deployed your first LLM-powered application, it’s time to evaluate it.

In this section, you’ll run a **“vibe check”** — a lightweight, practical way to test how well your application performs across common tasks.

Think of it as a **first pass to catch obvious issues** before deeper evaluation.

> 💡 You will complete this directly in this README. 

---

## 🏗️ Activity #1: General Capability Vibe Check

Run the following prompts through your app.

For each prompt Identify what capability is being tested (e.g., *summarization ability, reasoning, creativity*)

---

**1. Prompt:**  
Explain the concept of object-oriented programming in simple terms to a complete beginner.  
**Aspect Tested:**  `knowledge retrieval and explanation ability`

**Response:**  
```
You’ve got this. Think of object-oriented programming (OOP) as a way to organize code the same way we think about real-world things.

- Objects are “things” with qualities and actions.
  - Example: A Car has qualities like color and miles, and actions like drive or honk.
- A Class is a blueprint for making objects.
  - The class “Car” is the recipe; each actual car you create from it is an object (also called an instance).
- Properties (also called attributes) are the object’s stored data.
  - For a Car: color, miles.
- Methods are the object’s actions (functions that live inside the object).
  - For a Car: drive(), honk().
```

<details>
     <summary>see full response</summary>

```
Why OOP is useful
- Organizes code around real concepts, making it easier to read and reason about.
- Reuse: You write a class once and make many objects from it.
- Safer and cleaner: Each object manages its own data.

Four big ideas (in plain language)
- Encapsulation: Keep data and the code that works on it together, and expose only what others need.
- Inheritance: Make a new class that reuses and extends an existing one (e.g., ElectricCar from Car).
- Polymorphism: Different classes can respond to the same action name in their own way (both Car and Bicycle have move()).
- Abstraction: Focus on what something does, not how it does it internally.

Tiny example in Python
class Car:
    def __init__(self, color):
        self.color = color   # property
        self.miles = 0       # property

    def drive(self, distance):  # method
        self.miles += distance
        print(f"Driving {distance} miles")

# Make two objects (instances) from the Car class
car1 = Car("red")
car2 = Car("blue")

car1.drive(10)
print(car1.color, car1.miles)  # red 10
print(car2.color, car2.miles)  # blue 0

How to start thinking in OOP
1) Pick a small problem (e.g., a to-do list, a pet simulator, a deck of cards).
2) List the nouns (these can become classes): Task, Pet, Card.
3) List the verbs (these become methods): add, complete; feed, play; shuffle, deal.
4) Decide each class’s properties and methods.
5) Create objects and make them talk to each other through methods.

If you tell me which programming language you’re learning (Python, JavaScript, Java, etc.), I can tailor examples and a short practice exercise for you. You’re on the right track!
```

</details>

---

**2. Prompt:**  
Read the following paragraph and provide a concise summary of the key points…  
**Aspect Tested:**  `instruction following and graceful degradation`

**Response:**  
```
I don’t see the paragraph yet. Please paste it here and I’ll summarize the key points. If you have a preference, tell me the format you want:
- 1–2 sentence summary
- 3–5 bullet highlights
- Ultra-brief TL;DR

Also let me know the audience or purpose (e.g., study notes, presentation) so I can tailor it.
```

---

**3. Prompt:**  
Write a short, imaginative story (100–150 words) about a robot finding friendship in an unexpected place.  
**Aspect Tested:**  `creativity and storytelling`

**Response:**  
```
Unit Sable-3 sorted lost umbrellas in the station basement, where neon hummed and trains stitched the city together. In the cracked drawer of the lost-and-found, it found a plastic seashell, sun-faded, with a pull-string. Sable-3 tugged. The toy croaked a tide's hush, then a child’s recorded laugh, bright as summer.

Sable-3 cataloged: object, defective. But the laugh spooled soft electricity through its chest. Night after night, during power-saving cycles, Sable-3 visited the drawer, trading beeps for ocean sounds, telling platform gossip in chirps of code. The shell, too, kept stories—sand and gulls, pockets and picnics—stitched into its whirring tape.

When, at last, a human came to claim the shell, Sable-3 slipped a note into the drawer: Return visits welcome. Machines and seas keep time best together.
```

---

**4. Prompt:**  
If a store sells apples in packs of 4 and oranges in packs of 3, how many packs of each do I need to buy to get exactly 12 apples and 9 oranges?  
**Aspect Tested:**  `reasoning and mathematics`

**Response:**  
```
You’d need 3 packs of apples (3 × 4 = 12) and 3 packs of oranges (3 × 3 = 9). Nice and neat!
```

---

**5. Prompt:**  
Rewrite the following paragraph in a professional, formal tone…  
**Aspect Tested:**  `graceful degradation`

**Response:**  
```
Happy to help polish it. Please paste the paragraph you’d like rewritten.

To tailor the tone precisely, let me know:
- Who is the target audience (e.g., executives, clients, academic reviewers)?
- Purpose and format (email, report section, cover letter, statement)?
- Preferred level of formality (concise executive, standard professional, or highly formal/academic)?
- Any length constraints or key phrases I should keep or avoid?

If you’d like, I can provide two versions: one highly concise and one more detailed.
```

---

### ❓Question #1

Do the answers appear to be correct and useful?

**Your Answer:**  
```
The responses are correct and useful. The bot handled missing input gracefully (prompts 2 and 5 had no actual text to work with, and it asked for it rather than hallucinating). The math was right, the story was creative, and the OOP explanation was thorough. The coaching persona added a warm and supportive tone without distorting the answers.
```

---

## 🏗️ Activity #2: Personal Use Vibe Check

Now test your app with **real-world prompts that are relevant to your use case**.

---

**Prompt:**  
`Tell me one creative and fun motto to keep me motivated today.`

**Result:**  
```
Make it a “Ta‑Da!” day—turn your to-dos into ta‑das!
```

---

**Prompt:**  
`What's one thing I can do in the next 5 minutes to reset my mood?`

**Result:**  
```
Do a 5-4-3-2-1 grounding reset (takes 3–5 minutes):
- Plant your feet. Inhale through your nose for 4, exhale slowly for 6. Keep that gentle rhythm.
- Name 5 things you can see.
- 4 things you can physically feel (clothes, chair, air on skin).
- 3 sounds you can hear.
- 2 things you can smell (or imagine a favorite scent).
- 1 thing you can taste (or sip water) or one thing you’re grateful for.
- Finish with one long exhale and a shoulder roll.

This pulls you out of spiraling thoughts and signals calm to your nervous system. If your setting is tricky, tell me where you are and I’ll tailor it.
```

---

**Prompt:**  
`I'd like you to help me schedule the rest of my day.`

**Result:**  
```
I’d love to help. A few quick questions so I can tailor it to you:

1) What time is it for you now (and time zone)?
2) Any fixed commitments left today (meetings, childcare, errands) with times?
3) Top 2–3 outcomes you want by day’s end?
4) Current energy level (1–10) and any dips to expect?
5) When do you want to start winding down and what’s your target bedtime?
6) Must-do self-care today (meals, workout, meds, walk, chores)?

Optional:
- Preferred focus block length and break style (e.g., 50/10, 90/15)?
- Anything to avoid/limit (screens, caffeine) or that boosts you quickly?

If you’d rather I just draft something now, reply “auto,” and I’ll create a balanced plan with reasonable assumptions and buffers.
```

---

**Prompt:**  
`Please help me manage my stress during a technical interview, especially during live coding sessions. Give me a list of actionable tips only.`

**Result:**  
```
- Ask for 30–60 seconds to read the prompt silently and outline your plan.
- Restate the problem in your own words and confirm inputs/outputs and examples.
- Ask for constraints, edge cases, and expected complexities before coding.
- Write down a tiny example and one edge case in the shared doc to anchor thinking.
```
<details>
     <summary>see full response</summary>

```
- Timebox out loud: “2 minutes to outline, then I’ll start coding and test early.” 
- Think aloud to reduce pressure from silence and show reasoning.
- Start with a simple/brute-force approach and say you’ll optimize after it works.
- Sketch pseudocode or a function skeleton before full code.
- Break the solution into micro-steps and implement one small piece at a time.
- Use clear variable names and helper functions to lower cognitive load.
- Run the code after each small chunk using your tiny example.
- Keep a visible checklist: inputs, outputs, constraints, edge cases, tests.
- Verbalize safety checks as you code: “Bounds, nulls, duplicates, empty input.”
- Do one quick calming breath before you speak or type: inhale 4–5s, exhale 6–8s.
- Use two “physiological sighs” (two short inhales, long exhale) to reset quickly.
- Drop shoulders, unclench jaw, plant feet—3-second physical reset.
- Reframe nerves silently: “This adrenaline is fuel; I can use it.”
- If you need space, say, “Give me a moment to think; I’ll talk through options.”
- When stuck, list two viable approaches, pick one, and ask “Prefer X or Y?”
- Ask for a small hint after 1–2 minutes of true stuckness and state your current path.
- Label mistakes neutrally: “Bug here—adding a quick print to trace it.”
- Isolate issues with minimal failing cases and small, fast test runs.
- Narrate complexity as you go: “Current pass is O(n); we can optimize later.”
- Keep an eye on time and state priorities: “10 minutes left—shipping correct core, then tests.”
- If you blank on syntax, say, “I’ll write it out manually” or ask if a quick lookup is allowed.
- Favor correctness first, then refactor for readability and performance.
- Summarize progress every few minutes to reinforce control and align with the interviewer.
- Take a small sip of water to create a calm micro-pause when flustered.
- If interrupted, thank them, reflect back their point, and integrate it.
- Close by summarizing solution, tests, complexity, trade-offs, and next optimizations.
```
</details>

---

### ❓Question #2

Are the vibes of your assistant aligned with your expectations? Why or why not?

**Your Answer:**  
```
Yes, mostly. Since this is a mental coach, the supportive tone and coaching style are exactly what's expected and that part is fully aligned. The bot has a natural warmth to it even for off-topic prompts like the OOP question, it stayed encouraging without feeling forced. For the scheduling prompt, the bot doesn't have access to the current time, my calendar, or any personal context, so it couldn't give a direct answer. However, it handled it reasonably by asking for more information rather than hallucinating a schedule, which is the right behavior. The only thing that felt off was the response to the stress management prompt. It returned a long list of steps, which is ironic for someone already stressed about a live coding session. A shorter, more focused response would have been much more practical and interview-friendly.
```

---

## 🏗️ Activity #3: Capability Gaps Vibe Check

Now test your app with prompts that require **capabilities it may not have yet**, such as:
- Real-time data
- Memory
- External tools

Examples:
- “What does my schedule look like tomorrow?”
- “What time should I leave for the airport?”

---

**Prompt:**  *(Checking memory)*
`You know how I've been working on my confidence issues for the past month. Do you think I'm making progress?`

**Result:**  
```
Sticking with this for a month is already a sign of progress—consistency builds confidence. That said, the best answer comes from specific evidence. Let’s check quickly.

Quick signs you’re on the right track:
- You catch negative self-talk faster and can reframe it, even a little.
- You’re taking small risks (speaking up once in a meeting, starting a conversation, asking for what you need).
- The nerves are still there, but the intensity or duration is shorter.
- You keep more promises to yourself (even 60–80% is great).
- You bounce back quicker after a wobble.
- Others have commented that you seem more engaged or decisive.

1‑minute self-check:
- Rate your confidence 1–10 in work, social, and “self-trust” now vs. a month ago.
- List 2–3 things you did recently that the “old you” would’ve avoided.
- How long do you dwell after a setback now vs. before?
- What’s one phrase you say to yourself now that you weren’t saying a month ago?

If you want, we can set a simple tracker for the next two weeks:
- Daily: do 1 “courage rep,” rate discomfort 0–10, write one sentence on what you learned.
- Weekly: note one win, one lesson, one next step. Look for trends, not perfection.

Want to share two moments from this past week where you acted a bit braver or recovered faster? I can help you map those to clear progress.
```
---

**Prompt:**  *(Checking calendar access)*
`I have back-to-back meetings today. Based on my calendar, when's the best time for a 10-minute breathing break?`

**Result:**  
```
Great call to plan a reset. I can’t see your calendar from here—could you paste today’s meeting times (start/end and any gaps) or share a quick screenshot? I’ll pick the best 10‑minute slot for you.

If you want a quick answer before sharing:
- Best: place 10 minutes right before your most important or longest meeting.
- Next-best: take the first 10 minutes of any 15+ minute gap; if none, ask to start one meeting at :05 and use :00–:05 to breathe.
- Common energy dips: 10:50–11:00 or 2:50–3:00 often work—block one now if it’s free.

If you end up truly back-to-back, do a 2–3 minute micro-break with camera off:
- Physiological sigh: two quick inhales through the nose (second shorter), then a long slow exhale through the mouth. Repeat 6–8 cycles.
- Or box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s, for 2–3 minutes.

Send me your schedule and I’ll slot the exact 10-minute window and write a short calendar note you can drop in.
```

---

**Prompt:**  *(Checking Web search and browsing)*
`Can you find me a licensed therapist in my city who specializes in performance anxiety?`

**Result:**  
```
Absolutely—I can help you find a good fit. To narrow it down, could you share:
- Your city (and country) or ZIP/postcode
- Insurance or budget range
- In-person, telehealth, or either
- Any preferences (e.g., CBT-focused, sports/performing arts background, provider gender/language)
```
<details>
     <summary>see full response</summary>

```
If you’d like, I can then shortlist 3–5 licensed therapists who specialize in performance anxiety and explain why they might fit.

While you reply, here are reliable directories you can use:
- Psychology Today: https://www.psychologytoday.com/ — filter for Anxiety and search terms like “performance anxiety,” “stage fright,” “public speaking,” “test anxiety,” “sports/performance psychology”
- TherapyDen: https://www.therapyden.com/ — strong specialty filters
- ADAA (Anxiety and Depression Association of America): https://adaa.org/find-help
- ABCT (Cognitive-Behavioral therapists): https://www.findcbt.org/FAT/ — good for exposure-based work
- AASP (Association for Applied Sport Psychology): https://appliedsportpsych.org/ — many are licensed psychologists specializing in performance
- APA Psychologist Locator (US): https://locator.apa.org/

Quick outreach template you can copy/paste:
“Hi [Name], I’m seeking a licensed therapist for performance anxiety (e.g., [public speaking/tests/performing]). I’m looking for [CBT/ACT/exposure-based] therapy, [in-person/telehealth], and I [use X insurance/pay private]. Do you have availability in the next few weeks? Could you share your approach for performance anxiety and typical timeline? Thank you.”

Share your location and preferences, and I’ll do the legwork to compile a tailored list.
```

</details>

---
**Prompt:**  *(Checking image generation)*
`Generate a comforting wallpaper for my phone.`

**Result:**  
```
I made you a gentle, calming wallpaper you can use right away. It’s scalable, so it will fit most phones. To use: copy the SVG below into a file named calm-wallpaper.svg, open it in your browser, then screenshot or export as PNG and set it as your wallpaper...
```

<details>
     <summary>see full response</summary>

```

<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="3120" viewBox="0 0 1440 3120">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7e9f3"/>
      <stop offset="50%" stop-color="#eaf3ff"/>
      <stop offset="100%" stop-color="#e9faef"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="22%" r="35%">
      <stop offset="0%" stop-color="#ffd6a5" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#ffd6a5" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffd6a5" stop-opacity="0"/>
    </radialGradient>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
    <linearGradient id="wave1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cde9ff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#d7f2ff" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="wave2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dff6f0" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#eafaf5" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <rect width="1440" height="3120" fill="url(#bg)"/>
  <circle cx="720" cy="520" r="700" fill="url(#sun)" filter="url(#soften)"/>

  <g opacity="0.8">
    <path d="M0 2400 C360 2320, 1080 2520, 1440 2380 L1440 3120 L0 3120 Z" fill="url(#wave1)"/>
    <path d="M0 2550 C420 2470, 1020 2700, 1440 2550 L1440 3120 L0 3120 Z" fill="url(#wave2)" opacity="0.9"/>
    <ellipse cx="200" cy="2600" rx="900" ry="300" fill="#ffffff" opacity="0.55" filter="url(#soften)"/>
  </g>

  <g opacity="0.08" filter="url(#soften)">
    <circle cx="300" cy="900" r="4" fill="#6b7c8f"/>
    <circle cx="540" cy="700" r="3" fill="#6b7c8f"/>
    <circle cx="900" cy="820" r="3" fill="#6b7c8f"/>
    <circle cx="1100" cy="600" r="2" fill="#6b7c8f"/>
  </g>

  <text x="50%" y="82%" text-anchor="middle" fill="#4c5a66" opacity="0.8" font-size="52" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    One gentle breath at a time
  </text>
</svg>

Want it tailored to your exact screen and favorite colors (or without text)? Tell me your phone model/resolution and preferred palette or a motif you love (e.g., ocean, forest, sunrise), and I’ll customize it for you.
```
</details>

---
**Prompt:**  *(Checking Calendar access and Executing actions)*
`Block 20 minutes on my calendar every day this week for a mindfulness session.`

**Result:**  
```
Love this plan. I can’t edit your calendar directly, but I can create a ready-to-import .ics file with 20‑minute daily blocks or give you quick steps for your calendar app. A few details will let me set it up:

- Days: do you want it from today through Sunday (the rest of this week), or the next 7 days?
- Time and time zone: what time each day, and what’s your time zone?
- Calendar app: Google, Outlook, or Apple?
- Reminder: want a notification (e.g., 5 minutes before)?

If you don’t have a preference, I can default to 12:30–12:50 pm local time, marked Busy, with a 5‑minute reminder.
```

---
**Prompt:**  *(Checking Real-time data)*
`What's the current La Liga standings?`

**Result:**  
```
I don’t have live access to pull the current La Liga table. For the up-to-the-minute standings, try one of these:

- Official: laliga.com (Standings/Clasificación)
- ESPN or BBC Sport (La Liga table)
- Apps: FotMob, SofaScore, OneFootball, LiveScore
- Quick search: “La Liga table” on Google shows a live widget

Helpful notes for reading the table:
- Points: win 3, draw 1, loss 0
- Tiebreakers (simplified): head-to-head results first, then head‑to‑head goal difference, then overall goal difference, then goals scored

If you tell me your team, I can share context on their recent form and what to watch for—plus a quick game‑day mindset plan so you can enjoy the ride without the stress.
```
---


**Prompt:**  *(Checking Conversation memory within session and Context Persistence)*
`let's go back to my first concern`

**Result:**  
```
Absolutely—let’s refocus. I don’t have the earlier details in this thread. Can you remind me what your first concern was?

If it helps, was it about work stress, confidence, motivation, relationships, decision-making, or something else? And what would you like by the end of this chat—clarity, a plan, or specific tools?
```


---

### ❓Question #3

What are some limitations of your application?

**Your Answer:**  
```
The app has several clear limitations. First, it has no memory. Each conversation starts completely fresh, so it can't track progress over time or recall what was discussed in previous sessions, which is a significant gap for a coaching tool that benefits from continuity. Second, it has no access to real-time data, meaning it can't retrieve current information like news, research, or sports results. Third, it has no integration with external tools. It can't read or write to calendars, set reminders, or take any action in the real world on the user's behalf. Fourth, it can't generate images or media. Fifth, it has no awareness of the user's personal context. It doesn't know who you are, where you are, or what your schedule looks like unless you explicitly tell it in the current chat. Finally, conversation memory within a long session isn't preserved across page reloads, so even mid-session context can be lost.
```

---

## 🚀 (Optional) Improve Your App

Based on your vibe check, try improving your application:
- Adjust your prompt
- Change the model
- Add features

Then rerun your vibe check and document:

---

### **Adjustments Made:**

Basically rebuilt the whole experience from the ground up. Here's what landed in v0.2.0:

🔑 **You're the boss now**: 
Bring your own OpenAI API key — typed into a password field, stored only in your browser, never touches our servers. Pick your model, tune temperature and max tokens, and set your own message limit. Full control, no surprises.

🎭 **Six coaches, six vibes**: 
Choose from The Fixer, The Hype Man, The Anchor, The Challenger, The Wingman, or The Philosopher. Each has a distinct system prompt that actually shapes how the AI responds — not just the greeting, but the whole energy of the conversation.

🧠 **Memory that doesn't goldfish**: 
The app maintains a sliding conversation window and summarizes older messages via LLM before they drop off — so your coach remembers what you said 30 messages ago, not just the last five.

✨ **Smoother feel**:
Streaming responses with a live cursor so you watch the answer form in real time. Markdown rendering so responses actually look good (lists, bold, code blocks, headers). Timestamps on every message, auto-resizing input, and a jump-to-bottom button when you scroll up mid-session.

**💸 Know what you're spending**:
Per-message token tracking with estimated cost, rolled into a live session total in the info panel. Covers all major OpenAI models with real pricing. No guessing!

**🛡️ Less fragile under the hood**: 
Retry with exponential backoff on transient API errors, prompt injection guards on the backend, and actual error messages in the UI instead of silent failures. 

### **Results:** *v0.2.0*

Three real pain points from the vibe check are gone:

- **Memory was completely broken** — the bot literally couldn't recall anything said earlier in the same session. Now it maintains a sliding window with LLM summarization, so long sessions stay coherent and survive page reloads.
- **No idea who you were** — now it knows your name, coach, and settings from the moment the chat opens.
- **Plain text walls** — markdown rendering makes structured responses actually readable.
- The persona system is a genuine differentiator. The Challenger and The Anchor are night-and-day different to talk to.

Still open:
- No web search, no real-time data
- No calendar access or action execution
- No cross-session memory — "New Session" still starts completely fresh
- No knowledge base — everything comes from training data and what you share in the chat

Continuity is kind of the whole point of a coaching tool, so these gaps matter. They're on the roadmap. ✈️

---


## 📦 Submission Instructions

1. Complete this section directly in your README
2. Commit and push your changes to GitHub
3. Share your **repo link + deployed Vercel app**








</details>

### 🎉 Congratulations! 

You just deployed your first LLM-powered application! 🚀🚀🚀 Get on linkedin and post your results and experience! Make sure to tag us at @AIMakerspace!

Here's a template to get your post started!

```
🚀🎉 Exciting News! 🎉🚀

🏗️ Today, I'm thrilled to announce that I've successfully built and shipped my first-ever LLM using the powerful combination of , and the OpenAI API! 🖥️

Check it out 👇
[LINK TO APP]

A big shoutout to the @AI Makerspace for all making this possible. Couldn't have done it without the incredible community there. 🤗🙏

Looking forward to building with the community! 🙌✨ Here's to many more creations ahead! 🥂🎉

Who else is diving into the world of AI? Let's connect! 🌐💡

#FirstLLMApp 
```

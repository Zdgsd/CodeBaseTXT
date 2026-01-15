# ⚡ TXT Codebase Pro: The Vibe Coding Accelerator

**Stop pasting 50 files manually. Start Vibe Coding.**

TXT Codebase Pro is a client-side powerhouse that serializes your entire repository into a single, token-optimized context window for LLMs (Gemini, Claude, GPT-4). It's designed for the modern "Vibe Coding" workflow where you hand off high-level architecture to AI and let it handle the implementation details.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Tokens](https://img.shields.io/badge/tokens-optimized-success)

## 🚀 What is "Vibe Coding"?

Vibe coding is the art of coding at the speed of thought. You don't write the boilerplate; you direct the symphony. 

1. **Dump Context**: You give the LLM the *entire* relevant codebase structure.
2. **Prompt by "Vibe"**: "Make the UI pop more," "Refactor this to use the Strategy pattern," "Fix the race condition in the auth flow."
3. **Receive Magic**: Because the LLM "sees" everything, it writes code that actually compiles and imports correctly.

## 🌟 Key Features

*   **Context Compression**: 
    *   **Skeleton Mode**: Strips implementation logic, keeping only classes/types for massive architectural refactors.
    *   **Dense Format**: Removes Markdown/XML bloat for 30% token savings.
    *   **Smart Dedupe**: Automatically references repeated files instead of copying them.
*   **Privacy First**: 100% Client-side processing. Your code never leaves your browser.
*   **Mobile Ready**: Full PWA-like experience on mobile. Code review from the beach. 🏖️
*   **Binary Filtering**: Automatically nukes `node_modules`, lockfiles, and images.

## 🛠️ How to Use (The Vibe Workflow)

### Scenario A: The "Big Refactor"
*Goal: Move from Context API to Redux Toolkit.*
1. **Zip your `src` folder.**
2. Drop it into **TXT Codebase Pro**.
3. Select **"Skeleton Mode"** in Config. (This gives the AI the structure without the token cost of the logic).
4. Export using **"XML"** format (Claude loves XML tags).
5. **Prompt**: "Here is my app structure. Refactor the global state management from Context to Redux Toolkit. Create slice files for `auth` and `settings`."

### Scenario B: The "Bug Hunt"
*Goal: Fix a weird layout shift on mobile.*
1. Select only your `components` and `styles` folders in the file tree.
2. Use **"Standard"** preset.
3. Export to **"Markdown"**.
4. **Prompt**: "This component tree causes a layout shift on iOS. Identify the CSS conflict."

### Scenario C: The "Documentation Generator"
*Goal: Write a README for your legacy code.*
1. Drop the repo.
2. Select **"Source Only"** filter.
3. Use **"Token Diet"** preset.
4. **Prompt**: "Write a comprehensive README.md for this project explaining the architecture and setup."

## 📱 Mobile Experience
We overhauled the UI to be fluid on mobile devices.
*   **Tabs**: Switch between File Tree, Preview, and Config instantly.
*   **Touch Friendly**: Large hit targets for file toggling.
*   **Haptics**: Visual feedback on every interaction.

## 🤝 Contributing
Fork it, fix it, ship it. We love pull requests that reduce token usage or make the UI prettier.

---
*Built with React, Tailwind, and a lot of caffeine.*
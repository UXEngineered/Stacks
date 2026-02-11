# Designer Setup Guide — Cursor + Stacks Prototyping

A step-by-step guide for designers who want to use Cursor to build and modify prototypes in the Stacks codebase. No prior terminal experience required.

---

## What you'll have when done

- Cursor (AI-powered code editor) running on your Mac
- The Stacks codebase running locally in your browser
- Ability to ask Cursor's AI to make UI changes for you
- Git set up so you can push changes to the team repo
- (Optional) Figma-to-Cursor bridge for generating/reading Figma components

---

## Prerequisites

| What | Why you need it |
|---|---|
| macOS 13+ (Ventura or later) | Our setup is Mac-based |
| A TeamSparq GitLab account | To clone and push code |
| A Figma account | Only if using the Figma bridge |

---

## Step 1: Install Cursor

1. Go to [cursor.com](https://www.cursor.com/) and download the macOS version.
2. Open the `.dmg` file and drag Cursor to your Applications folder.
3. Launch Cursor. It will walk you through initial setup (sign in or create an account).
4. When prompted about AI model preferences, the defaults are fine.

---

## Step 2: Install Homebrew (package manager)

Open **Terminal** (search "Terminal" in Spotlight) and paste:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen prompts. When it finishes, close and reopen Terminal.

Verify it worked:

```bash
brew --version
```

You should see a version number like `Homebrew 4.x.x`.

---

## Step 3: Install Node.js and npm

```bash
brew install node
```

Verify:

```bash
node --version   # should show v22.x or similar
npm --version    # should show 11.x or similar
```

---

## Step 4: Install Bun (fast JS runtime)

```bash
curl -fsSL https://bun.sh/install | bash
```

Close and reopen Terminal, then verify:

```bash
bun --version   # should show 1.x
```

---

## Step 5: Install Git (usually pre-installed on Mac)

Check if you already have it:

```bash
git --version
```

If it prompts you to install Xcode Command Line Tools, say yes. Otherwise you're good.

---

## Step 6: Configure Git with your identity

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@teamsparq.com"
```

---

## Step 7: Clone the Stacks repo

Pick a folder where you want to keep the project (your home directory is fine):

```bash
cd ~
git clone https://git.teamsparq.com/james.williams1/stacks.git fieldbook
```

It will ask for your GitLab username and password (or access token). Enter your TeamSparq GitLab credentials.

---

## Step 8: Install project dependencies

```bash
cd ~/fieldbook/fieldbook
npm install
```

This downloads all the libraries the project needs. Takes 1-2 minutes.

---

## Step 9: Run the app locally

```bash
npm run dev
```

You should see output like:

```
▲ Next.js 15.x
- Local: http://localhost:3000
```

Open **http://localhost:3000** in your browser. You should see the Stacks Fieldbook app.

> **Tip**: Leave this terminal window running. Open a new terminal tab (Cmd+T) for other commands.

---

## Step 10: Open the project in Cursor

1. Open Cursor.
2. File → Open Folder → navigate to `~/fieldbook` → Open.
3. You should see the project file tree on the left.

---

## Working with Cursor AI

### Asking Cursor to make changes

- Press **Cmd+L** to open the AI chat panel.
- Describe what you want in plain language, e.g.:
  - "Make the primary button background purple"
  - "Add 8px more padding to the card component"
  - "Change the header font size to 18px"
- Cursor will suggest edits. Click **Accept** to apply them.
- Check your browser (localhost:3000) — changes appear instantly via hot reload.

### Using Agent mode

- Press **Cmd+I** to open Composer (agent mode).
- This gives Cursor more autonomy to make multi-file changes.
- Describe a bigger task like "Redesign the share modal with rounded corners and a subtle shadow."

---

## Pushing your changes (Git basics)

### Create a branch (do this before making changes)

```bash
git checkout -b your-name/what-you-changed
```

Example: `git checkout -b sarah/button-redesign`

### Save and push your work

After making changes in Cursor:

```bash
git add .
git commit -m "Brief description of what you changed"
git push -u origin HEAD
```

That's it. Your changes are now on GitLab and can be reviewed.

### Pulling the latest code

Before starting new work, get the latest from the team:

```bash
git checkout main
git pull
```

Then create a new branch for your next set of changes.

---

## (Optional) Figma Bridge Setup

This lets Cursor read from and write to Figma. Useful for generating Figma components from code or syncing styles.

### Install the Figma Plugin

1. Open Figma → Plugins → Development → Import plugin from manifest.
2. Or search the Figma Community for "Cursor Talk to Figma MCP."
3. Run the plugin in your Figma file. It will show a channel code.

### Configure Cursor's MCP

1. In Cursor, open Settings (Cmd+,) → search "MCP."
2. Or create/edit the file `~/.cursor/mcp.json` with this content:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

> **Note**: If Cursor can't find `bunx`, replace `"bunx"` with the full path. Find it by running `which bunx` in Terminal (likely `~/.bun/bin/bunx`).

3. Restart Cursor. The MCP server should show as green in Settings → MCP.
4. In Cursor's AI chat, type: `join channel <your-channel-code>` using the code from the Figma plugin.

---

## Installed tools reference

| Tool | Version | What it does |
|---|---|---|
| Cursor | Latest | AI code editor (like VS Code + AI) |
| Node.js | v22.x | Runs JavaScript/TypeScript |
| npm | v11.x | Installs project packages |
| Bun | v1.x | Fast JS runtime (used by Figma bridge) |
| Git | v2.50+ | Version control / pushing code |
| Next.js | v15.x | The web framework Stacks is built on |

## Project structure (what matters for UI)

```
fieldbook/
├── fieldbook/                  ← the actual app
│   ├── app/
│   │   ├── components/         ← UI components live here
│   │   │   ├── GlobalNav.tsx   ← top navigation bar
│   │   │   ├── ShareModal.tsx  ← sharing dialog
│   │   │   ├── MovementDrawer.tsx ← movement panel
│   │   │   └── spine/          ← main layout components
│   │   ├── lib/                ← utilities and data models
│   │   └── projects/           ← page routes
│   ├── public/                 ← static assets (images, etc.)
│   └── package.json            ← project dependencies
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `command not found: node` | Close and reopen Terminal after installing |
| `command not found: bun` | Close and reopen Terminal after installing |
| `npm install` fails | Try deleting `node_modules` folder and running `npm install` again |
| Browser shows error | Check the terminal where `npm run dev` is running for error messages |
| Git asks for credentials every time | Set up an SSH key or a GitLab personal access token |
| Cursor AI not responding | Check you're signed in (Cursor → Settings → Account) |
| Changes not showing in browser | Make sure `npm run dev` is still running |

---

## Getting help

- Ask in the team Slack channel
- Or open Cursor's AI chat and describe your problem — it can often diagnose and fix issues for you

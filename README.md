# 🤖 Cursor Smart Agent

AI-powered smart agent orchestrator for Cursor - automate error fixing with intelligence.

## ✨ Features

### 🎯 Core Features

- **Smart Analysis**: Automatically analyze TypeScript + ESLint errors
- **Dynamic Agent Calculation**: Auto-calculate optimal agent count
- **Multi-Model Strategy**: Use multiple AI models in parallel
- **Non-Stop Mode**: Work continuously without interruptions
- **Real-Time Dashboard**: Monitor progress live

### 🧠 Intelligent Modes

#### 1. Auto Mode
AI chooses the best strategy based on your history and preferences.

#### 2. Non-Stop Mode
Agents work continuously without asking questions - perfect for large projects.

#### 3. Learning Mode
Improves over time by learning from your fixes and preferences.

#### 4. Security Mode
Security-first approach with automatic vulnerability scanning.

#### 5. Simulation Mode
Preview all changes before applying - safe testing.

#### 6. Lazy Developer Mode
Minimal input, maximum output - describe your project and let AI build it.

#### 7. Smart Developer Mode
Context-aware suggestions and proactive error prevention.

#### 8. Super Developer Mode
Multi-project orchestration with DevOps integration.

## 🚀 Quick Start

1. **Install Extension**
   - Open VS Code
   - Search for "Cursor Smart Agent"
   - Click Install

2. **Analyze Your Project**
   - Press `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows)

3. **Quick Fix**
   - Press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows)

4. **Open Dashboard**
   - Press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows)

## 📊 How It Works

```
Analyze → Count all errors (TS + ESLint)
Calculate → Determine optimal agent count & models
Generate → Create smart Cursor prompt
Execute → Copy & paste into Cursor Composer
Monitor → Watch progress in real-time dashboard
```

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `smartAgent.defaultMode` | `auto` | Default mode |
| `smartAgent.nonStopMode` | `true` | No interruptions |
| `smartAgent.confidenceThreshold` | `0` | When to ask (0=never) |
| `smartAgent.defaultAgentCount` | `4` | Agent count |
| `smartAgent.gitIntegration` | `true` | Auto-branch & commit |
| `smartAgent.learningEnabled` | `true` | Learn over time |

## 📚 Modes Explained

### 🧠 Auto Mode
**When to use:** Always (recommended default)
**What it does:** Analyzes your history and auto-configures everything
**Best for:** Everyone

### 🤖 Non-Stop Mode
**When to use:** Large projects (500+ errors)
**What it does:** Agents work without stopping to ask questions
**Best for:** Time-sensitive fixes

### 🔒 Security Mode
**When to use:** Production code
**What it does:** Scans for vulnerabilities, enforces security
**Best for:** Security-critical projects

### 🎮 Simulation Mode
**When to use:** First time or risky changes
**What it does:** Preview all changes before applying
**Best for:** Testing strategies

### 😴 Lazy Developer Mode
**When to use:** New projects
**What it does:** Build entire project from description
**Example:** "E-commerce with Next.js + Stripe" → Full project

### 🎓 Smart Developer Mode
**When to use:** Daily development
**What it does:** Proactive suggestions, error prevention
**Best for:** Active development

### 🦸 Super Developer Mode
**When to use:** Multiple projects/monorepo
**What it does:** Orchestrate fixes across projects
**Best for:** Teams, large codebases

## 🎯 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Analyze Project | `Cmd+Shift+A` | Count all errors |
| Quick Fix | `Cmd+Shift+F` | Start auto-fix |
| Open Dashboard | `Cmd+Shift+D` | View progress |
| Switch Mode | - | Change mode |
| View History | - | See past fixes |
| Security Scan | - | Scan for vulnerabilities |
| Run Simulation | - | Preview changes |
| Generate Report | - | Export PDF report |

## 📈 Dashboard

Real-time monitoring with:

- ✅ Agent status cards (per-agent progress)
- 📊 Overall progress bar with ETA
- 📝 Live activity log (streaming)
- 📉 Error breakdown chart
- ⚡ Speed gauge (errors/minute)
- 💰 Cost tracker (real-time)
- 🎯 Milestone notifications

## 🔧 Advanced Features

### Learning System
Tracks your preferences and improves recommendations:
- Preferred agent counts
- Successful strategies
- Model performance
- Usage patterns

### Git Integration
Automatic version control:
- Create branches per agent
- Smart commit messages
- Auto-merge strategies
- Conflict detection

### Security Scanning
Detects:
- Hardcoded secrets
- SQL injection patterns
- XSS vulnerabilities
- Dangerous code patterns
- Dependency vulnerabilities

## 💡 Tips & Tricks

### Tip 1: Start Small
First time? Try analyzing a test project or use Simulation Mode.

### Tip 2: Use Non-Stop Mode
For 500+ errors, enable Non-Stop Mode to save hours.

### Tip 3: Review History
Check past successes to learn what works for your projects.

### Tip 4: Custom Decision Rules
Add custom rules in settings for project-specific patterns.

### Tip 5: Multi-Model Strategy
Large projects? Use 2-3 models for different tasks.

## 🐛 Troubleshooting

### Extension Not Working?
1. Check VS Code version (requires 1.80+)
2. Reload window: `Cmd+Shift+P` → "Reload Window"
3. Check Output panel: "Cursor Smart Agent"

### Analysis Failing?
1. Ensure `tsc` and `eslint` are installed
2. Check workspace has `package.json`
3. Verify TypeScript/ESLint configs exist

### Prompt Not Working?
1. Copy to clipboard
2. Open Cursor Composer (`Cmd+I`)
3. Paste and execute

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

MIT License - See [LICENSE](LICENSE)

## 🙏 Credits

Built with ❤️ for the developer community.

---

**Star ⭐ this repo if you find it helpful!**


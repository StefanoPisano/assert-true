# Assert.True - Markdown Test Suite Viewer

**Assert.True** is a lightweight, browser-based test suite management tool designed for QA engineers and developers who prefer Markdown for documenting test cases. It allows you to import Markdown files, execute tests interactively, track progress in real-time, and export results in multiple formats.

## 🚀 Key Features

- **Markdown-Driven**: Define your test suites using simple, human-readable Markdown.
- **Interactive Execution**: Toggle test statuses (Pass, Fail, Feedback) with a single click.
- **Real-Time Progress**: Visual progress bars for individual test cases and the entire suite.
- **Local Persistence**: Automatically saves your progress and recently opened files in the browser.
- **Multi-Format Export**: Download your results as Markdown (preserving state), Excel (XLSX), or PDF.
- **Tagging & Filtering**: Organize your test suites with tags and filter them instantly on the dashboard.
- **URL-Based Sharing**: Generate a shareable link that encodes the entire test suite, allowing instant collaboration without a database.
- **Privacy Focused**: Everything runs locally in your browser. No data is sent to any server.

## 📖 How to Use

1.  **Prepare your file**: Create a Markdown file (max 15KB) following the specific formatting rules.
2.  **Upload**: Click the upload area or drag-and-drop your `.md` file onto the home page.
3.  **Execute**: Run through your tests and update their statuses.
4.  **Export**: Once finished, download the results for reporting or to resume later.

### 📝 Formatting Rules

To ensure your test cases are correctly parsed, you must follow the formatting rules. Detailed documentation and examples can be found in the included **[rules.html](rules.html)** file.

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 (Tailwind CSS), and JavaScript (ES6+).
- **Architecture**: Modular "Classic Namespace" pattern for offline/local compatibility.
- **Libraries**:
    - [SheetJS](https://sheetjs.com/) for Excel exports.
    - [jsPDF](https://github.com/parallax/jsPDF) for PDF generation.
    - [Canvas Confetti](https://github.com/catdad/canvas-confetti) for celebratory feedback.


## 💡 AI Experimentation

This project was developed as an experiment in AI-assisted coding and context prompt engineering. The entire codebase, including logic and styling, was built by an AI agent (Antigravity) collaborating with a human user, demonstrating the power of highly contextualized prompts and agentic workflows in software development. This is part of a series of experiments to test the capabilities of AI in software development.

## 📜 License

This project is licensed under the GPLv3 License.

---
Created by [Stefano Pisano](https://stefanopisano.github.io) © 2026

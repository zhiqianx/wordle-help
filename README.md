<div align="center">
  <img src="assets/icon.png" alt="Wordle Helper logo" width="150" />
  <h1>Wordle Helper</h1>
  <p><strong>A fast, mobile-friendly Wordle assistant powered by exact filtering, information entropy, and a lightweight local answer model.</strong></p>
  <p>
    <a href="https://zhiqianx.github.io/wordle-help/">Try the live app</a>
    ·
    <a href="https://github.com/zhiqianx/wordle-help">View the repository</a>
  </p>
</div>

---

## About

Wordle Helper turns the color feedback from each guess into a smaller set of valid words, then recommends the next move based on how much information it is expected to reveal.

Everything runs in the browser. The project uses plain HTML, CSS, and JavaScript, so it can be hosted directly on GitHub Pages without a backend, database, API key, or downloaded ML model.

## Highlights

| Feature | What it does |
| --- | --- |
| Exact Wordle filtering | Reproduces green, yellow, and gray feedback, including repeated-letter edge cases. |
| Entropy-based suggestions | Simulates feedback patterns and favors guesses that best divide the remaining possibilities. |
| Local answer-likelihood model | Learns spelling patterns from historical answers to reduce the influence of obscure valid guesses. |
| Conflict detection | Warns when combined feedback leaves no possible word. |
| Historical answer awareness | Gives previously used Wordle answers lower priority. |
| Mobile-first interface | Provides responsive layouts, large touch targets, collapsible sections, and optional haptic feedback. |
| No tracking or accounts | Processes guesses in memory and only loads the static files included in this repository. |

## How to Use

1. Open the [live app](https://zhiqianx.github.io/wordle-help/) and select **Start Solving**.
2. Enter the five-letter word you played in Wordle.
3. Tap each letter until its color matches Wordle:
   - 🟩 **Green** — correct letter and position
   - 🟨 **Yellow** — correct letter, wrong position
   - ⬜ **Gray** — letter is not present in that occurrence
4. Select **Add Guess**.
5. Choose a suggested next guess or inspect the complete filtered word list.
6. Repeat until the answer is determined.

### Suggestion Labels

| Label | Meaning |
| --- | --- |
| Up-arrow tile | Curated opening word |
| Five-bar tile | Possible word with five unique letters |
| Magnifier tile | Exploratory guess selected primarily for information gain |
| Calendar tile | Previously used Wordle answer |

Suggestions are not always predicted answers. An exploratory guess may be recommended because its letters separate the remaining candidates more efficiently.

## How the Solver Works

The solver combines deterministic Wordle logic with lightweight statistical ranking:

1. **Generate exact feedback** — `getFeedbackPattern()` uses a two-pass process: greens are consumed first, then yellows. This correctly handles words with repeated letters.
2. **Filter candidates** — a word remains only when it would produce exactly the feedback entered for every previous guess.
3. **Build a shortlist** — positional and letter-presence frequencies identify promising guesses without exhaustively scoring every word.
4. **Measure information gain** — each shortlisted guess is evaluated by the entropy of its possible feedback patterns, expected candidates remaining, and worst-case bucket size.
5. **Apply an answer prior** — a small Naive Bayes-style model learns character-position, pair, triple, vowel, and repetition patterns from historical answers.
6. **Rank the results** — information gain remains the primary signal, while answer likelihood, answer viability, and historical usage refine close choices.

The shortlist keeps the browser responsive while preserving strong strategic recommendations. Unusual answers retain a small probability floor, so the statistical model never removes them outright.

## Architecture

```text
Browser
├── index.html                    Landing page
├── game.html                     Solver interface
├── css/
│   └── styles.css                Responsive application styles
├── js/
│   ├── app.js                    UI state, events, history, and pagination
│   └── wordle-solver.js          Feedback, filtering, entropy, and local model
├── data/
│   ├── words.json                Accepted five-letter guesses
│   ├── past-words.json           Historical Wordle answers
│   ├── starting-words.json       Curated opening guesses
│   └── valid-wordle-words.txt    Source-format word list
├── assets/
│   ├── icon.png                  Application icon
│   └── icons/                    Reusable Wordle-style SVG interface icons
└── scripts/
    ├── serve_verbose.py          Local static server helper
    └── trans.py                  Word-list conversion utility
```

### Technology

- Semantic HTML and responsive CSS
- Vanilla JavaScript with no runtime dependencies
- Static JSON data loaded with `fetch()`
- GitHub Pages-compatible relative paths
- Browser APIs for optional vibration and smooth scrolling

## Run Locally

Because the application fetches JSON files, serve it over HTTP instead of opening `index.html` directly.

```bash
git clone https://github.com/zhiqianx/wordle-help.git
cd wordle-help
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can also use the included verbose server:

```bash
python3 scripts/serve_verbose.py
```

## Deploy to GitHub Pages

1. Fork or push the project to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the branch containing the project and the repository root (`/`).
5. Save and open the URL provided by GitHub Pages.

No build command or environment variables are required.

## Data

| File | Purpose |
| --- | --- |
| `data/words.json` | Main accepted-guess dictionary used for validation and filtering. |
| `data/past-words.json` | Historical answers used for repeat penalties and local model training. |
| `data/starting-words.json` | Small curated pool evaluated for the opening recommendation. |

The historical answer list is based on the maintained [wordlelist archive](https://github.com/eithan/wordlelist/blob/main/words.txt) and should be refreshed periodically as new puzzles are published.

## Customize the Project

### Change the opening words

Edit `data/starting-words.json`:

```json
[
  "raise",
  "slate",
  "crane"
]
```

### Change the word database

Update `data/words.json` with lowercase five-letter words. Keep the file as a JSON array so the application can load it directly.

### Tune the solver

The ranking entry point is `WordleSolver.rankGuesses()` in `js/wordle-solver.js`:

```javascript
WordleSolver.rankGuesses({
    candidates: possibleWords,
    allowedGuesses: allWords,
    historicalAnswers: pastWords,
    limit: 20,
    shortlistSize: 400
});
```

`shortlistSize` controls the main quality/performance tradeoff: larger values evaluate more guesses, while smaller values finish faster on lower-powered devices.

## Contributing

Contributions are welcome. For substantial changes, open an issue first so the approach can be discussed.

1. Fork the repository.
2. Create a focused branch: `git switch -c feature/my-change`.
3. Make and test your changes on both desktop and mobile layouts.
4. Commit with a clear message.
5. Push the branch and open a pull request.

When changing solver behavior, include repeated-letter cases and compare the resulting recommendation quality and runtime.

## Credits

- Inspired by Wordle, created by Josh Wardle.
- Accepted-word data draws from community-maintained Wordle lists, including [Draco's valid Wordle words](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93).
- Historical answers are synchronized from the [wordlelist archive](https://github.com/eithan/wordlelist).

---

<div align="center">
  <p>Built for quick, thoughtful Wordle solving.</p>
</div>

class WordleHelper {
    constructor() {
        // Only initialize if we're on the game page
        if (!document.querySelector('.game-page')) return;
        
        this.guesses = [];
        this.currentFeedback = ['', '', '', '', ''];
        this.wordList = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadWordsAndInit();
    }

    initializeElements() {
        this.guessInput = document.getElementById('guessInput');
        this.addGuessBtn = document.getElementById('addGuessBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.quickResetBtn = document.getElementById('quickResetBtn');
        this.feedbackGrid = document.getElementById('feedbackGrid');
        this.guessesList = document.getElementById('guessesList');
        this.guessesSection = document.getElementById('guessesSection');
        this.wordsContainer = document.getElementById('wordsContainer');
        this.suggestionsContainer = document.getElementById('suggestionsContainer');
        this.wordCount = document.getElementById('wordCount');
        this.guessNumber = document.getElementById('guessNumber');
        
        // Collapsible sections
        this.toggleWordsBtn = document.getElementById('toggleWordsBtn');
        this.toggleHelpBtn = document.getElementById('toggleHelpBtn');
        this.helpContent = document.getElementById('helpContent');
    }

    async loadWordsAndInit() {
        try {
            this.showLoading();
            
            // Load words from JSON file
            const response = await fetch('words.json');
            if (!response.ok) {
                throw new Error(`Failed to load words: ${response.status}`);
            }
            
            this.wordList = await response.json();
            console.log(`Loaded ${this.wordList.length} words from words.json`);
            
            // Initialize the game with loaded words
            this.loadInitialData();
            
        } catch (error) {
            console.error('Error loading words:', error);
            this.showError('Failed to load word database. Please check that words.json exists.');
        }
    }

    attachEventListeners() {
        // Guess input handling
        this.guessInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            this.updateFeedbackGrid();
            this.validateInput();
        });

        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.addGuessBtn.disabled) {
                this.addGuess();
            }
        });

        // Feedback grid handling
        this.feedbackGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('feedback-cell')) {
                this.toggleFeedback(parseInt(e.target.dataset.index));
                // Add haptic feedback on mobile
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        });

        // Button handlers
        this.addGuessBtn.addEventListener('click', () => this.addGuess());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.quickResetBtn.addEventListener('click', () => this.resetGame());
        
        // Collapsible sections
        this.toggleWordsBtn.addEventListener('click', () => this.toggleWordsSection());
        this.toggleHelpBtn.addEventListener('click', () => this.toggleHelpSection());
        
        // Suggestion click handling
        this.suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                const word = e.target.textContent.replace('⭐', '').trim().toLowerCase();
                this.selectSuggestion(word);
            }
        });
    }

    updateFeedbackGrid() {
        const guess = this.guessInput.value;
        const cells = this.feedbackGrid.querySelectorAll('.feedback-cell');
        
        cells.forEach((cell, index) => {
            cell.textContent = guess[index] || '';
        });
    }

    toggleFeedback(index) {
        const states = ['', 'green', 'yellow', 'gray'];
        const currentIndex = states.indexOf(this.currentFeedback[index]);
        this.currentFeedback[index] = states[(currentIndex + 1) % states.length];
        
        const cell = this.feedbackGrid.children[index];
        // Remove all state classes
        cell.classList.remove('green', 'yellow', 'gray');
        // Add new state class if not empty
        if (this.currentFeedback[index]) {
            cell.classList.add(this.currentFeedback[index]);
        }
        
        this.validateInput();
    }

    validateInput() {
        const guess = this.guessInput.value;
        const hasValidLength = guess.length === 5;
        const hasAllFeedback = this.currentFeedback.every(f => f !== '');
        
        this.addGuessBtn.disabled = !(hasValidLength && hasAllFeedback);
    }

    selectSuggestion(word) {
        this.guessInput.value = word.toUpperCase();
        this.updateFeedbackGrid();
        this.validateInput();
        
        // Scroll to input
        this.guessInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.guessInput.focus();
        
        // Add haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }

    async addGuess() {
        const word = this.guessInput.value.toLowerCase();
        const feedback = [...this.currentFeedback];
        
        // Add guess to list
        this.guesses.push({ word, feedback });
        
        // Update display
        this.updateGuessesDisplay();
        this.updateGuessCounter();
        
        // Clear input
        this.guessInput.value = '';
        this.currentFeedback = ['', '', '', '', ''];
        this.clearFeedbackGrid();
        this.validateInput();
        
        // Filter words
        this.updateWordList();
        
        // Add success haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    updateGuessCounter() {
        this.guessNumber.textContent = this.guesses.length + 1;
    }

    updateGuessesDisplay() {
        if (this.guesses.length > 0) {
            this.guessesSection.style.display = 'block';
        }
        
        this.guessesList.innerHTML = this.guesses.map((guess, index) => {
            const letters = guess.word.split('').map((letter, letterIndex) => {
                const feedbackClass = guess.feedback[letterIndex];
                return `<div class="guess-letter ${feedbackClass}">${letter.toUpperCase()}</div>`;
            }).join('');
            
            return `<div class="guess-row">${letters}</div>`;
        }).join('');
    }

    clearFeedbackGrid() {
        const cells = this.feedbackGrid.querySelectorAll('.feedback-cell');
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('green', 'yellow', 'gray');
        });
    }

    toggleWordsSection() {
        const isHidden = this.wordsContainer.style.display === 'none';
        const icon = this.toggleWordsBtn.querySelector('.toggle-icon');
        
        if (isHidden) {
            this.wordsContainer.style.display = 'block';
            icon.classList.add('open');
            this.toggleWordsBtn.querySelector('span').textContent = 'Hide All Possible Words';
        } else {
            this.wordsContainer.style.display = 'none';
            icon.classList.remove('open');
            this.toggleWordsBtn.querySelector('span').textContent = 'Show All Possible Words';
        }
    }

    toggleHelpSection() {
        const isHidden = this.helpContent.style.display === 'none';
        const icon = this.toggleHelpBtn.querySelector('.toggle-icon');
        
        if (isHidden) {
            this.helpContent.style.display = 'block';
            icon.classList.add('open');
        } else {
            this.helpContent.style.display = 'none';
            icon.classList.remove('open');
        }
    }

    filterWords(words, guess, feedback) {
        /**
         * Filter words based on guess and feedback
         * feedback: list of 5 strings, each being 'green', 'yellow', or 'gray'
         */
        const filtered = [];
        
        for (const word of words) {
            const wordArray = word.split('');
            const guessArray = guess.toLowerCase().split('');
            let valid = true;
            
            // Check each position
            for (let i = 0; i < 5; i++) {
                const letter = guessArray[i];
                const status = feedback[i];
                
                if (status === 'green') {
                    // Letter must be in this exact position
                    if (wordArray[i] !== letter) {
                        valid = false;
                        break;
                    }
                } else if (status === 'yellow') {
                    // Letter must be in word but not in this position
                    if (wordArray[i] === letter) {
                        valid = false;
                        break;
                    }
                    if (!wordArray.includes(letter)) {
                        valid = false;
                        break;
                    }
                } else if (status === 'gray') {
                    // Letter must not be in word (unless it's green/yellow elsewhere)
                    const hasGreenOrYellow = feedback.some((f, idx) => 
                        f !== 'gray' && guessArray[idx] === letter
                    );
                    if (!hasGreenOrYellow && wordArray.includes(letter)) {
                        valid = false;
                        break;
                    }
                }
            }
            
            if (valid) {
                filtered.push(word);
            }
        }
        
        return filtered;
    }

    getTopSuggestions(words, limit = 8) {
        /**
         * Get top word suggestions based on common letters and unique letter strategy
         */
        const commonLetters = ['e', 'a', 'r', 'i', 'o', 't', 'n', 's', 'l', 'c', 'u', 'm', 'd', 'p', 'h'];
        
        // Separate words with unique letters from those with repeated letters
        const uniqueLetterWords = [];
        const repeatedLetterWords = [];
        
        for (const word of words) {
            if (new Set(word).size === 5) {  // All letters are unique
                uniqueLetterWords.push(word);
            } else {
                repeatedLetterWords.push(word);
            }
        }
        
        const scoreWord = (word) => {
            // Base score from common letters
            const commonScore = word.split('').reduce((score, letter) => 
                score + (commonLetters.includes(letter) ? 1 : 0), 0);
            
            // Bonus for vowels (a, e, i, o, u)
            const vowelScore = word.split('').reduce((score, letter) => 
                score + ('aeiou'.includes(letter) ? 1 : 0), 0);
            
            // Bonus for consonant diversity
            const consonants = word.split('').filter(letter => !'aeiou'.includes(letter));
            const consonantScore = new Set(consonants).size;
            
            return commonScore + (vowelScore * 0.5) + (consonantScore * 0.3);
        };
        
        // Score and sort unique letter words first (they're strategically better)
        const scoredUnique = uniqueLetterWords.map(word => ({ word, score: scoreWord(word) }));
        const scoredRepeated = repeatedLetterWords.map(word => ({ word, score: scoreWord(word) }));
        
        // Sort both lists by score (descending)
        scoredUnique.sort((a, b) => b.score - a.score);
        scoredRepeated.sort((a, b) => b.score - a.score);
        
        // Prioritize unique letter words, then add repeated letter words if needed
        const suggestions = [];
        
        // Add unique letter words first
        for (const { word } of scoredUnique) {
            if (suggestions.length >= limit) break;
            suggestions.push(word);
        }
        
        // Fill remaining slots with repeated letter words if needed
        for (const { word } of scoredRepeated) {
            if (suggestions.length >= limit) break;
            suggestions.push(word);
        }
        
        return suggestions;
    }

    updateWordList() {
        try {
            // Start with all words
            let possibleWords = [...this.wordList];
            
            // Apply each guess filter
            for (const guessData of this.guesses) {
                const { word, feedback } = guessData;
                
                if (word.length === 5 && feedback.length === 5) {
                    possibleWords = this.filterWords(possibleWords, word, feedback);
                }
            }
            
            // Get suggestions
            const suggestions = this.getTopSuggestions(possibleWords, 8);
            
            const data = {
                possible_words: possibleWords.slice(0, 30),  // Limit for mobile
                total_count: possibleWords.length,
                suggestions: suggestions
            };
            
            this.displayResults(data);
            
        } catch (error) {
            this.showError('Failed to filter words: ' + error.message);
        }
    }

    loadInitialData() {
        try {
            const suggestions = this.getTopSuggestions(this.wordList, 8);
            
            const data = {
                possible_words: this.wordList.slice(0, 30),
                total_count: this.wordList.length,
                suggestions: suggestions
            };
            
            this.displayResults(data);
            
        } catch (error) {
            this.showError('Failed to load initial data: ' + error.message);
        }
    }

    displayResults(data) {
        // Update word count
        this.wordCount.textContent = data.total_count;
        
        // Display suggestions with indicators for unique letter words
        if (data.suggestions.length > 0) {
            const suggestionsHtml = data.suggestions.map(word => {
                const hasUniqueLetters = new Set(word).size === 5;
                const indicator = hasUniqueLetters ? '<span class="unique-indicator">⭐</span>' : '';
                return `<div class="suggestion-item ${hasUniqueLetters ? 'unique-letters' : ''}">${indicator}${word.toUpperCase()}</div>`;
            }).join('');
            
            this.suggestionsContainer.innerHTML = suggestionsHtml;
        } else {
            this.suggestionsContainer.innerHTML = '<div class="loading">No suggestions available</div>';
        }
        
        // Display possible words (in collapsible section)
        if (data.possible_words.length === 0) {
            this.wordsContainer.innerHTML = '<div class="error">No possible words found. Check your feedback!</div>';
        } else {
            const wordsHtml = data.possible_words.map(word => 
                `<div class="word-item">${word.toUpperCase()}</div>`
            ).join('');
            
            let displayHtml = `<div class="word-grid">${wordsHtml}</div>`;
            
            if (data.total_count > 30) {
                displayHtml = `<p style="margin-bottom: 15px; color: #666; font-size: 0.9rem;">Showing first 30 of ${data.total_count} words</p>` + displayHtml;
            }
            
            this.wordsContainer.innerHTML = displayHtml;
        }
        
        // Show success state if we found a small number of words
        if (data.total_count <= 3 && data.total_count > 0) {
            this.showSuccessMessage();
        }
    }

    showSuccessMessage() {
        // Create a temporary success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #27ae60, #2ecc71);
            color: white;
            padding: 20px 30px;
            border-radius: 16px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: successPulse 0.6s ease-out;
        `;
        successMsg.innerHTML = '🎉 You\'re close to the answer!';
        
        document.body.appendChild(successMsg);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes successPulse {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successMsg.remove();
            style.remove();
        }, 3000);
        
        // Add celebration haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }

    showLoading() {
        this.suggestionsContainer.innerHTML = '<div class="loading">Loading suggestions...</div>';
        this.wordsContainer.innerHTML = '<div class="loading">Loading words...</div>';
    }

    showError(message) {
        this.suggestionsContainer.innerHTML = `<div class="error">${message}</div>`;
        this.wordsContainer.innerHTML = `<div class="error">${message}</div>`;
    }

    resetGame() {
        // Confirm reset if there are guesses
        if (this.guesses.length > 0) {
            if (!confirm('Are you sure you want to start a new game?')) {
                return;
            }
        }
        
        this.guesses = [];
        this.currentFeedback = ['', '', '', '', ''];
        this.guessInput.value = '';
        this.clearFeedbackGrid();
        this.validateInput();
        this.updateGuessCounter();
        
        // Hide guesses section
        this.guessesSection.style.display = 'none';
        this.guessesList.innerHTML = '';
        
        // Reset collapsible sections
        this.wordsContainer.style.display = 'none';
        this.helpContent.style.display = 'none';
        this.toggleWordsBtn.querySelector('.toggle-icon').classList.remove('open');
        this.toggleHelpBtn.querySelector('.toggle-icon').classList.remove('open');
        this.toggleWordsBtn.querySelector('span').textContent = 'Show All Possible Words';
        
        // Reset to initial data
        this.loadInitialData();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Focus input
        this.guessInput.focus();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WordleHelper();
    
    // Add some mobile-specific enhancements
    if ('serviceWorker' in navigator) {
        // Future: Could add PWA functionality here
    }
    
    // Prevent zoom on double tap for iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});
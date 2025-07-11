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
        this.pastWords = [];
        this.loadWordsAndInit();
        this.currentPage = 1;
        this.wordsPerPage = 30;
        this.allPossibleWords = [];
        this.startingWords = [];
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
            const wordsResponse = await fetch('words.json');
            if (!wordsResponse.ok) {
                throw new Error(`Failed to load words: ${wordsResponse.status}`);
            }
            this.wordList = await wordsResponse.json();

            // Load starting words
            try {
                const startingResponse = await fetch('starting-words.json');
                if (startingResponse.ok) {
                    this.startingWords = await startingResponse.json();
                    console.log(`Loaded ${this.startingWords.length} starting words`);
                }
            } catch (e) {
                console.log('No starting words file found');
                this.startingWords = [];
            }
            
            // Load past words
            try {
                const pastResponse = await fetch('past-words.json');
                if (pastResponse.ok) {
                    this.pastWords = await pastResponse.json();
                    console.log(`Loaded ${this.pastWords.length} past words`);
                }
            } catch (e) {
                console.log('No past words file found, continuing without it');
                this.pastWords = [];
            }
            
            console.log(`Loaded ${this.wordList.length} words from words.json`);
            this.loadInitialData();
            
        } catch (error) {
            console.error('Error loading words:', error);
            this.showError('Failed to load word database.');
        }
    }

    attachEventListeners() {
        // Guess input handling
        this.guessInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            
            // Show validation for complete words
            if (e.target.value.length === 5) {
                const isValid = this.wordList.includes(e.target.value.toLowerCase());
                this.showWordValidation(isValid, e.target.value);
            } else {
                // Clear validation message for incomplete words
                this.showWordValidation(true);
            }
            
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
                const word = e.target.textContent.replace('⭐', '').replace('📅', '').replace('🚀', '').trim().toLowerCase();
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
        const isValidWord = this.wordList.includes(guess.toLowerCase());
        
        // Show validation feedback
        if (hasValidLength && !isValidWord) {
            this.guessInput.style.borderColor = '#e74c3c';
            this.guessInput.style.backgroundColor = '#fdf2f2';
        } else {
            this.guessInput.style.borderColor = hasValidLength ? '#27ae60' : '#ddd';
            this.guessInput.style.backgroundColor = hasValidLength ? '#f8fff8' : '#f8f9fa';
        }
        
        this.addGuessBtn.disabled = !(hasValidLength && hasAllFeedback && isValidWord);
    }

    validateGuessConflicts(newWord, newFeedback) {
        const conflicts = [];
        
        for (let i = 0; i < this.guesses.length; i++) {
            const prevGuess = this.guesses[i];
            const prevWord = prevGuess.word;
            const prevFeedback = prevGuess.feedback;
            
            // Check each letter in the new guess
            for (let pos = 0; pos < 5; pos++) {
                const newLetter = newWord[pos];
                const newStatus = newFeedback[pos];
                
                // Check against each letter in previous guesses
                for (let prevPos = 0; prevPos < 5; prevPos++) {
                    const prevLetter = prevWord[prevPos];
                    const prevStatus = prevFeedback[prevPos];
                    
                    if (newLetter === prevLetter) {
                        // Conflict 1: Letter was gray before, now it's yellow/green
                        if (prevStatus === 'gray' && (newStatus === 'yellow' || newStatus === 'green')) {
                            conflicts.push({
                                type: 'gray_to_color',
                                letter: newLetter.toUpperCase(),
                                prevGuess: i + 1,
                                message: `"${newLetter.toUpperCase()}" was marked as NOT in word (gray) in guess ${i + 1}, but now it's marked as in the word.`
                            });
                        }
                        
                        // Conflict 2: Letter was yellow/green before, now it's gray
                        if ((prevStatus === 'yellow' || prevStatus === 'green') && newStatus === 'gray') {
                            conflicts.push({
                                type: 'color_to_gray',
                                letter: newLetter.toUpperCase(),
                                prevGuess: i + 1,
                                message: `"${newLetter.toUpperCase()}" was marked as in the word in guess ${i + 1}, but now it's marked as NOT in word (gray).`
                            });
                        }
                        
                        // Conflict 3: Same position, different green status
                        if (pos === prevPos && prevStatus === 'green' && newStatus !== 'green') {
                            conflicts.push({
                                type: 'green_position',
                                letter: newLetter.toUpperCase(),
                                position: pos + 1,
                                prevGuess: i + 1,
                                message: `"${newLetter.toUpperCase()}" was marked as correct position (green) in guess ${i + 1}, but now it's different.`
                            });
                        }
                    }
                }
            }
        }
        
        return conflicts;
    }

    checkAllGuessesForConflicts() {
        const allConflicts = [];
        
        for (let i = 0; i < this.guesses.length; i++) {
            for (let j = i + 1; j < this.guesses.length; j++) {
                const conflict = this.validateGuessConflicts(
                    this.guesses[i].word, this.guesses[i].feedback,
                    this.guesses[j].word, this.guesses[j].feedback
                );
                
                if (conflict) {
                    allConflicts.push(`Guess ${i + 1} vs Guess ${j + 1}: ${conflict}`);
                }
            }
        }
        
        return allConflicts;
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
        
        // Validate word exists in word list
        if (!this.wordList.includes(word)) {
            alert(`"${word.toUpperCase()}" is not a valid Wordle word. Please try another word.`);
            this.guessInput.focus();
            return;
        }

        // Check for conflicts
        const conflicts = this.validateGuessConflicts(word, feedback);
        
        if (conflicts.length > 0) {
            this.showConflictWarning(conflicts, word, feedback);
            return;
        }
        
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

    showWordValidation(isValid, word = '') {
        const inputSection = document.querySelector('.input-section');
        
        // Remove existing validation message
        const existingMsg = document.querySelector('.validation-message');
        if (existingMsg) existingMsg.remove();
        
        if (!isValid && word) {
            const validationMsg = document.createElement('div');
            validationMsg.className = 'validation-message';
            validationMsg.innerHTML = `❌ "${word.toUpperCase()}" is not a valid Wordle word`;
            inputSection.appendChild(validationMsg);
            
            // Remove message after 3 seconds
            setTimeout(() => {
                if (validationMsg.parentNode) {
                    validationMsg.remove();
                }
            }, 3000);
        }
    }

    showConflictWarning(conflicts, word, feedback) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease-out;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.3s ease-out;
        `;
        
        const conflictMessages = conflicts.map(conflict => 
            `<div style="margin: 10px 0; padding: 12px; background: #fee; border-radius: 8px; text-align: left;">
                <strong>⚠️ ${conflict.letter}:</strong><br>
                <span style="font-size: 0.9rem; color: #666;">${conflict.message}</span>
            </div>`
        ).join('');
        
        modalContent.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 15px;">🚨</div>
            <h3 style="color: #e74c3c; margin-bottom: 15px;">Guess Conflict Detected!</h3>
            <p style="margin-bottom: 20px; color: #666;">Your guess conflicts with previous feedback:</p>
            
            <div style="margin: 20px 0;">
                ${conflictMessages}
            </div>
            
            <p style="margin: 20px 0; font-size: 0.9rem; color: #666;">
                Please check your colors or delete previous guesses if needed.
            </p>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="dismissConflict" style="
                    padding: 12px 24px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                ">Fix Colors</button>
                
                <button id="addAnyway" style="
                    padding: 12px 24px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                ">Add Anyway</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        // Event listeners
        document.getElementById('dismissConflict').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });
        
        document.getElementById('addAnyway').addEventListener('click', () => {
            modal.remove();
            style.remove();
            
            // Force add the guess
            this.guesses.push({ word, feedback });
            this.updateGuessesDisplay();
            this.updateGuessCounter();
            this.guessInput.value = '';
            this.currentFeedback = ['', '', '', '', ''];
            this.clearFeedbackGrid();
            this.validateInput();
            this.updateWordList();
            
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                style.remove();
            }
        });
        
        // Haptic feedback for warning
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
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

        // Add delete button if there are guesses
        if (this.guesses.length > 0) {
            this.guessesList.innerHTML += `
                <div style="text-align: center; margin-top: 15px;">
                    <button id="deleteLastBtn" class="delete-last-btn">
                        🗑️ Delete Last Guess
                    </button>
                </div>
            `;
            
            // Add event listener for delete button
            const deleteBtn = document.getElementById('deleteLastBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteLastGuess());
            }
        }
    }

    deleteLastGuess() {
        if (this.guesses.length === 0) return;
        
        // Show custom confirmation modal
        this.showDeleteConfirmation();
    }
    
    showDeleteConfirmation() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'delete-modal-overlay';
        modal.innerHTML = `
            <div class="delete-modal">
                <div class="delete-modal-header">
                    <h3>🗑️ Delete Last Guess</h3>
                </div>
                <div class="delete-modal-body">
                    <p>Are you sure you want to delete your last guess?</p>
                    <div class="last-guess-preview">
                        ${this.guesses[this.guesses.length - 1].word.split('').map((letter, index) => {
                            const feedbackClass = this.guesses[this.guesses.length - 1].feedback[index];
                            return `<div class="preview-letter ${feedbackClass}">${letter.toUpperCase()}</div>`;
                        }).join('')}
                    </div>
                    <p class="delete-warning">This action cannot be undone.</p>
                </div>
                <div class="delete-modal-actions">
                    <button class="cancel-btn" id="cancelDelete">Cancel</button>
                    <button class="delete-btn" id="confirmDelete">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('cancelDelete').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        document.getElementById('confirmDelete').addEventListener('click', () => {
            // Perform the deletion
            this.guesses.pop();
            this.updateGuessCounter();
            this.updateGuessesDisplay();
            
            if (this.guesses.length === 0) {
                this.guessesSection.style.display = 'none';
            }
            
            this.updateWordList();
            
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            // Remove modal
            document.body.removeChild(modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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

    getTopSuggestions(words, limit = 20) {
        // First guess: use starting words list
        if (this.guesses.length === 0 && this.startingWords.length > 0) {
            return this.startingWords
                .filter(word => words.includes(word)) // Only show if word is in possible words
                .slice(0, limit);
        }
        
        // After first guess: use smart filtering
        const commonLetters = ['e', 'a', 'r', 'i', 'o', 't', 'n', 's', 'l', 'c', 'u', 'm', 'd', 'p', 'h'];
        
        // Separate words by type
        const uniqueLetterWords = [];
        const repeatedLetterWords = [];
        const pastWords = [];
        
        for (const word of words) {
            if (this.pastWords.includes(word)) {
                pastWords.push(word);
            } else if (new Set(word).size === 5) {
                uniqueLetterWords.push(word);
            } else {
                repeatedLetterWords.push(word);
            }
        }
        
        const scoreWord = (word) => {
            const commonScore = word.split('').reduce((score, letter) => 
                score + (commonLetters.includes(letter) ? 1 : 0), 0);
            const vowelScore = word.split('').reduce((score, letter) => 
                score + ('aeiou'.includes(letter) ? 1 : 0), 0);
            const consonants = word.split('').filter(letter => !'aeiou'.includes(letter));
            const consonantScore = new Set(consonants).size;
            
            return commonScore + (vowelScore * 0.5) + (consonantScore * 0.3);
        };
        
        // Score and sort each category
        const scoredUnique = uniqueLetterWords.map(word => ({ word, score: scoreWord(word) }));
        const scoredRepeated = repeatedLetterWords.map(word => ({ word, score: scoreWord(word) }));
        const scoredPast = pastWords.map(word => ({ word, score: scoreWord(word) }));
        
        scoredUnique.sort((a, b) => b.score - a.score);
        scoredRepeated.sort((a, b) => b.score - a.score);
        scoredPast.sort((a, b) => b.score - a.score);
        
        // Priority: unique letters → repeated letters → past words
        const suggestions = [];
        
        for (const { word } of scoredUnique) {
            if (suggestions.length >= limit) break;
            suggestions.push(word);
        }
        
        for (const { word } of scoredRepeated) {
            if (suggestions.length >= limit) break;
            suggestions.push(word);
        }
        
        for (const { word } of scoredPast) {
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
            
            // Store all possible words for pagination
            this.allPossibleWords = possibleWords;
            this.currentPage = 1; // Reset to first page
            
            // Get suggestions (still limited to 8)
            const suggestions = this.getTopSuggestions(possibleWords, 20);
            
            const data = {
                possible_words: possibleWords, // Don't slice here anymore
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
            const suggestions = this.getTopSuggestions(this.wordList, 20);
            
            // Store all words for pagination
            this.allPossibleWords = [...this.wordList];
            this.currentPage = 1;
            
            const data = {
                possible_words: this.wordList, // Don't slice here
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
        
        // Display suggestions (unchanged)
        if (data.suggestions.length > 0) {
            const suggestionsHtml = data.suggestions.map(word => {
                const hasUniqueLetters = new Set(word).size === 5;
                const isPastWord = this.pastWords.includes(word);
                const isStartingWord = this.startingWords.includes(word) && this.guesses.length === 0;
                
                let indicator = '';
                let extraClass = '';
                
                if (isStartingWord) {
                    indicator = '<span class="starting-indicator">🚀</span>';
                    extraClass = 'starting-word';
                } else if (isPastWord) {
                    indicator = '<span class="past-indicator">📅</span>';
                    extraClass = 'past-word';
                } else if (hasUniqueLetters) {
                    indicator = '<span class="unique-indicator">⭐</span>';
                    extraClass = 'unique-letters';
                }
                
                return `<div class="suggestion-item ${extraClass}">${word.toUpperCase()}${indicator}</div>`;
            }).join('');
            
            this.suggestionsContainer.innerHTML = suggestionsHtml;
        } else {
            this.suggestionsContainer.innerHTML = '<div class="loading">No suggestions available</div>';
        }
        
        // Display paginated possible words
        this.displayPaginatedWords();
        
        // Show success state if we found a small number of words
        if (data.total_count <= 3 && data.total_count > 0) {
            this.showSuccessMessage();
        }
    }

    displayPaginatedWords() {
        if (this.allPossibleWords.length === 0) {
            this.wordsContainer.innerHTML = '<div class="error">No possible words found. Check your feedback!</div>';
            return;
        }
        
        const totalPages = Math.ceil(this.allPossibleWords.length / this.wordsPerPage);
        const startIndex = (this.currentPage - 1) * this.wordsPerPage;
        const endIndex = startIndex + this.wordsPerPage;
        const currentWords = this.allPossibleWords.slice(startIndex, endIndex);
        
        const wordsHtml = currentWords.map(word => {
            const isPastWord = this.pastWords.includes(word);
            const extraClass = isPastWord ? 'past-word' : '';
            return `<div class="word-item ${extraClass}">${word.toUpperCase()}</div>`;
        }).join('');
        
        let displayHtml = '';
        
        // Page info
        if (totalPages > 1) {
            displayHtml += `
                <div class="pagination-info">
                    <span>Page ${this.currentPage} of ${totalPages}</span>
                    <span>(${startIndex + 1}-${Math.min(endIndex, this.allPossibleWords.length)} of ${this.allPossibleWords.length} words)</span>
                </div>
            `;
        }
        
        // Words grid
        displayHtml += `<div class="word-grid">${wordsHtml}</div>`;
        
        // Pagination controls
        if (totalPages > 1) {
            displayHtml += `
                <div class="pagination-controls">
                    <button id="prevPageBtn" ${this.currentPage === 1 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <span class="page-numbers">
                        ${this.generatePageNumbers(totalPages)}
                    </span>
                    <button id="nextPageBtn" ${this.currentPage === totalPages ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            `;
        }
        
        this.wordsContainer.innerHTML = displayHtml;
        
        // Attach pagination event listeners
        if (totalPages > 1) {
            this.attachPaginationListeners();
        }
    }

    generatePageNumbers(totalPages) {
        let pages = '';
        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        if (start > 1) {
            pages += '<button class="page-btn" data-page="1">1</button>';
            if (start > 2) pages += '<span class="page-dots">...</span>';
        }
        
        for (let i = start; i <= end; i++) {
            const active = i === this.currentPage ? 'active' : '';
            pages += `<button class="page-btn ${active}" data-page="${i}">${i}</button>`;
        }
        
        if (end < totalPages) {
            if (end < totalPages - 1) pages += '<span class="page-dots">...</span>';
            pages += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        return pages;
    }
    
    attachPaginationListeners() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageButtons = document.querySelectorAll('.page-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.displayPaginatedWords();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.allPossibleWords.length / this.wordsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.displayPaginatedWords();
                }
            });
        }
        
        pageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.dataset.page);
                this.displayPaginatedWords();
            });
        });
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
        this.currentPage = 1;
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
(function (root, factory) {
    const solver = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = solver;
    }

    root.WordleSolver = solver;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const WORD_LENGTH = 5;
    const DEFAULT_SHORTLIST_SIZE = 400;

    /**
     * Return a compact Wordle feedback pattern for a guess and an answer.
     * 2 = green, 1 = yellow, 0 = gray.
     *
     * Greens are consumed first, followed by yellows. This two-pass approach
     * is important for guesses containing a letter more times than the answer.
     */
    function getFeedbackPattern(guess, answer) {
        const normalizedGuess = guess.toLowerCase();
        const normalizedAnswer = answer.toLowerCase();
        const pattern = ['0', '0', '0', '0', '0'];
        const consumed = [false, false, false, false, false];

        for (let index = 0; index < WORD_LENGTH; index++) {
            if (normalizedGuess[index] === normalizedAnswer[index]) {
                pattern[index] = '2';
                consumed[index] = true;
            }
        }

        for (let guessIndex = 0; guessIndex < WORD_LENGTH; guessIndex++) {
            if (pattern[guessIndex] === '2') continue;

            for (let answerIndex = 0; answerIndex < WORD_LENGTH; answerIndex++) {
                if (!consumed[answerIndex]
                    && normalizedGuess[guessIndex] === normalizedAnswer[answerIndex]) {
                    pattern[guessIndex] = '1';
                    consumed[answerIndex] = true;
                    break;
                }
            }
        }

        return pattern.join('');
    }

    function feedbackToPattern(feedback) {
        const statusCodes = { green: '2', yellow: '1', gray: '0' };
        return feedback.map(status => statusCodes[status] ?? '').join('');
    }

    function filterWords(words, guess, feedback) {
        const expectedPattern = feedbackToPattern(feedback);

        if (expectedPattern.length !== WORD_LENGTH) return [];

        return words.filter(answer => getFeedbackPattern(guess, answer) === expectedPattern);
    }

    function buildCandidateFrequencies(candidates) {
        const positionCounts = Array.from({ length: WORD_LENGTH }, () => Object.create(null));
        const presenceCounts = Object.create(null);

        for (const word of candidates) {
            const seen = new Set();

            for (let index = 0; index < WORD_LENGTH; index++) {
                const letter = word[index];
                positionCounts[index][letter] = (positionCounts[index][letter] || 0) + 1;
                seen.add(letter);
            }

            for (const letter of seen) {
                presenceCounts[letter] = (presenceCounts[letter] || 0) + 1;
            }
        }

        return { positionCounts, presenceCounts };
    }

    function getWordFeatures(word) {
        const features = [];

        for (let index = 0; index < WORD_LENGTH; index++) {
            features.push(`position:${index}:${word[index]}`);
        }

        for (let index = 0; index < WORD_LENGTH - 1; index++) {
            features.push(`pair:${index}:${word.slice(index, index + 2)}`);
        }

        for (let index = 0; index < WORD_LENGTH - 2; index++) {
            features.push(`triple:${index}:${word.slice(index, index + 3)}`);
        }

        const uniqueLetters = new Set(word).size;
        const vowelCount = [...word].filter(letter => 'aeiou'.includes(letter)).length;
        features.push(`unique:${uniqueLetters}`);
        features.push(`vowels:${vowelCount}`);
        features.push(`ending:${word.slice(-2)}`);

        return features;
    }

    // A small Naive Bayes-style spelling model learned locally from historical
    // Wordle answers. It helps prefer answer-like words over obscure valid
    // guesses without requiring an API or a server-hosted model.
    function buildAnswerProfile(historicalAnswers, allowedGuesses) {
        if (!historicalAnswers || historicalAnswers.length === 0) return null;

        const historicalSet = new Set(historicalAnswers);
        const positiveCounts = Object.create(null);
        const negativeCounts = Object.create(null);
        const negatives = (allowedGuesses || []).filter(word => !historicalSet.has(word));

        for (const word of historicalAnswers) {
            for (const feature of getWordFeatures(word)) {
                positiveCounts[feature] = (positiveCounts[feature] || 0) + 1;
            }
        }

        for (const word of negatives) {
            for (const feature of getWordFeatures(word)) {
                negativeCounts[feature] = (negativeCounts[feature] || 0) + 1;
            }
        }

        return {
            positiveCounts,
            negativeCounts,
            positiveTotal: historicalAnswers.length,
            negativeTotal: Math.max(negatives.length, 1)
        };
    }

    function scoreAnswerLikelihood(word, profile) {
        if (!profile) return 0;

        let logOdds = 0;

        for (const feature of getWordFeatures(word)) {
            const positiveProbability = ((profile.positiveCounts[feature] || 0) + 1)
                / (profile.positiveTotal + 2);
            const negativeProbability = ((profile.negativeCounts[feature] || 0) + 1)
                / (profile.negativeTotal + 2);
            logOdds += Math.log(positiveProbability / negativeProbability);
        }

        return logOdds;
    }

    function getShortlistScore(word, frequencies, candidateSet, historicalSet, answerProfile) {
        let score = 0;
        const seen = new Set();

        for (let index = 0; index < WORD_LENGTH; index++) {
            const letter = word[index];
            score += frequencies.positionCounts[index][letter] || 0;

            if (!seen.has(letter)) {
                score += (frequencies.presenceCounts[letter] || 0) * 1.75;
                seen.add(letter);
            }
        }

        if (candidateSet.has(word)) score += frequencies.presenceCounts[word[0]] || 0;
        if (historicalSet.has(word) && !candidateSet.has(word)) score *= 0.9;

        score += scoreAnswerLikelihood(word, answerProfile) * 0.01;
        return score;
    }

    function buildGuessShortlist(
        candidates,
        allowedGuesses,
        historicalAnswers,
        shortlistSize,
        answerProfile
    ) {
        const candidateSet = new Set(candidates);

        // When only one or two answers remain, guessing an answer is preferable
        // to spending a turn on another information-only word.
        if (candidates.length <= 2) return [...candidates];

        const historicalSet = new Set(historicalAnswers || []);
        const frequencies = buildCandidateFrequencies(candidates);
        const scored = allowedGuesses.map(word => ({
            word,
            score: getShortlistScore(
                word,
                frequencies,
                candidateSet,
                historicalSet,
                answerProfile
            )
        }));

        scored.sort((left, right) => right.score - left.score || left.word.localeCompare(right.word));

        const shortlist = scored.slice(0, shortlistSize).map(item => item.word);

        // Keep every remaining answer in consideration once the set is small.
        if (candidates.length <= 200) {
            const included = new Set(shortlist);
            for (const candidate of candidates) {
                if (!included.has(candidate)) shortlist.push(candidate);
            }
        }

        return shortlist;
    }

    function scoreGuessByEntropy(guess, candidates, candidateWeights = null) {
        const buckets = Object.create(null);
        let totalWeight = 0;

        for (let index = 0; index < candidates.length; index++) {
            const answer = candidates[index];
            const weight = candidateWeights ? candidateWeights[index] : 1;
            const pattern = getFeedbackPattern(guess, answer);
            const bucket = buckets[pattern] || { count: 0, weight: 0 };
            bucket.count++;
            bucket.weight += weight;
            buckets[pattern] = bucket;
            totalWeight += weight;
        }

        let entropy = 0;
        let expectedRemaining = 0;
        let worstCase = 0;

        for (const bucket of Object.values(buckets)) {
            const probability = bucket.weight / totalWeight;
            entropy -= probability * Math.log2(probability);
            expectedRemaining += probability * bucket.count;
            worstCase = Math.max(worstCase, bucket.count);
        }

        return { entropy, expectedRemaining, worstCase };
    }

    function rankGuesses({
        candidates,
        allowedGuesses,
        historicalAnswers = [],
        limit = 20,
        shortlistSize = DEFAULT_SHORTLIST_SIZE
    }) {
        if (!candidates || candidates.length === 0) return [];

        const candidateSet = new Set(candidates);
        const historicalSet = new Set(historicalAnswers);
        const answerProfile = buildAnswerProfile(historicalAnswers, allowedGuesses);
        const candidateWeights = candidates.map(word => {
            if (!answerProfile) return 1;

            const likelihood = scoreAnswerLikelihood(word, answerProfile);
            const scaledLikelihood = Math.max(-20, Math.min(20, likelihood / 4));
            const answerProbability = 1 / (1 + Math.exp(-scaledLikelihood));
            const repeatPenalty = historicalSet.has(word) ? 0.15 : 1;

            // Keep a small floor so unusual answers are never discarded.
            return (0.05 + answerProbability) * repeatPenalty;
        });
        const shortlist = buildGuessShortlist(
            candidates,
            allowedGuesses,
            historicalAnswers,
            shortlistSize,
            answerProfile
        );

        const ranked = shortlist.map(word => ({
            word,
            ...scoreGuessByEntropy(word, candidates, candidateWeights),
            isPossibleAnswer: candidateSet.has(word),
            wasHistoricalAnswer: historicalSet.has(word),
            answerLikelihood: scoreAnswerLikelihood(word, answerProfile)
        }));

        const likelihoods = ranked.map(result => result.answerLikelihood);
        const minimumLikelihood = Math.min(...likelihoods);
        const maximumLikelihood = Math.max(...likelihoods);
        const likelihoodRange = maximumLikelihood - minimumLikelihood;

        for (const result of ranked) {
            const normalizedLikelihood = likelihoodRange === 0
                ? 0
                : (result.answerLikelihood - minimumLikelihood) / likelihoodRange;

            // Information gain leads. The learned prior only separates guesses
            // whose entropy is close, preventing obscure dictionary entries
            // from dominating recommendations for tiny mathematical gains.
            result.strategyScore = result.entropy
                + (normalizedLikelihood * 0.15)
                + (result.isPossibleAnswer ? 0.03 : 0)
                - (result.wasHistoricalAnswer ? 0.08 : 0);
        }

        ranked.sort((left, right) =>
            right.strategyScore - left.strategyScore
            || right.entropy - left.entropy
            || left.expectedRemaining - right.expectedRemaining
            || left.worstCase - right.worstCase
            || Number(right.isPossibleAnswer) - Number(left.isPossibleAnswer)
            || Number(left.wasHistoricalAnswer) - Number(right.wasHistoricalAnswer)
            || right.answerLikelihood - left.answerLikelihood
            || left.word.localeCompare(right.word)
        );

        return ranked.slice(0, limit);
    }

    return {
        feedbackToPattern,
        filterWords,
        getFeedbackPattern,
        rankGuesses,
        scoreGuessByEntropy
    };
}));

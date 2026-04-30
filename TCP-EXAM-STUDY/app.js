// --- STATE MANAGEMENT ---
let allQuestions = [];
let currentSession = [];
let currentIndex = 0;
let sessionTimer = null;
let secondsElapsed = 0;

// Default User Stats Structure
let userStats = {
    xp: 0,
    streak: 0,
    lastPlayed: null,
    blueprintStats: {
        "Area I: Individual Planning": { correct: 0, total: 0 },
        "Area II: Entity Compliance": { correct: 0, total: 0 },
        "Area III: Entity Planning": { correct: 0, total: 0 },
        "Area IV: Property Transactions": { correct: 0, total: 0 }
    }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    loadUserStats();
    fetchQuestions();
});

function loadUserStats() {
    const savedStats = localStorage.getItem('tcp_cpa_stats');
    if (savedStats) {
        userStats = JSON.parse(savedStats);
    }
    checkStreak();
    updateDashboard();
}

function saveUserStats() {
    localStorage.setItem('tcp_cpa_stats', JSON.stringify(userStats));
    updateDashboard();
}

function fetchQuestions() {
    // Fetching the JSON database we built
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            allQuestions = data;
            console.log(`[System Ready] Loaded ${allQuestions.length} TCP items.`);
        })
        .catch(error => console.error("Error loading IRS archives:", error));
}

// --- UI & TAB NAVIGATION ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- GAMIFICATION LOGIC ---
function checkStreak() {
    const today = new Date().toDateString();
    if (userStats.lastPlayed) {
        const lastDate = new Date(userStats.lastPlayed);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
            // Played yesterday, streak continues (updated on session end)
        } else if (diffDays > 1) {
            // Missed a day, reset streak
            userStats.streak = 0;
            saveUserStats();
        }
    }
}

function getRank(xp) {
    if (xp < 500) return "Junior Staff";
    if (xp < 1500) return "Senior Associate";
    if (xp < 5000) return "Tax Manager";
    return "Managing Partner";
}

function updateDashboard() {
    // Top KPI Cards
    document.getElementById('stat-streak').innerText = `${userStats.streak} Days`;
    document.getElementById('stat-xp').innerText = `${userStats.xp} XP`;
    document.getElementById('stat-rank').innerText = getRank(userStats.xp);

    // Blueprint Mastery Bars
    const areas = [
        { key: "Area I: Individual Planning", id: 1 },
        { key: "Area II: Entity Compliance", id: 2 },
        { key: "Area III: Entity Planning", id: 3 },
        { key: "Area IV: Property Transactions", id: 4 }
    ];

    areas.forEach(area => {
        const stats = userStats.blueprintStats[area.key];
        let pct = 0;
        if (stats && stats.total > 0) {
            pct = Math.round((stats.correct / stats.total) * 100);
        }
        
        const pctText = document.getElementById(`pct-area-${area.id}`);
        const bar = document.getElementById(`bar-area-${area.id}`);
        
        if (pctText && bar) {
            pctText.innerText = `${pct}%`;
            bar.style.width = `${pct}%`;
            
            // Color code based on proficiency
            if (pct >= 80) bar.style.backgroundColor = 'var(--success-green)';
            else if (pct >= 60) bar.style.backgroundColor = 'var(--gold-accent)';
            else bar.style.backgroundColor = '#e74c3c'; // Red for needs work
        }
    });
}

// --- STUDY MODE (QUIZ ENGINE) ---
function startSession() {
    if (allQuestions.length === 0) {
        alert("Still loading questions from the server. Please try again in a second.");
        return;
    }
    
    // Grab 5 random questions for a "Quick Audit"
    let shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    currentSession = shuffled.slice(0, 5);
    currentIndex = 0;
    secondsElapsed = 0;

    // Switch to Study Tab programmatically
    document.querySelector('.tab-btn:nth-child(2)').click();
    
    startTimer();
    loadQuestion();
}

function startTimer() {
    clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
        secondsElapsed++;
        const minutes = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
        document.getElementById('q-timer').innerText = `${minutes}:${seconds}`;
    }, 1000);
}

function loadQuestion() {
    const qData = currentSession[currentIndex];
    
    // Setup UI
    document.getElementById('q-category').innerText = qData.blueprint_area;
    document.getElementById('question-text').innerText = qData.question;
    document.getElementById('feedback-box').classList.add('hidden');
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Clear previous

    // Create buttons for each option
    qData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn, qData);
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selected, btn, qData) {
    // Disable all buttons so user can't double click
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    
    const isCorrect = (selected === qData.correct_answer);
    const feedbackBox = document.getElementById('feedback-box');
    const feedbackMsg = document.getElementById('feedback-message');
    const explanationText = document.getElementById('explanation-text');
    
    // Update Stats
    const areaStats = userStats.blueprintStats[qData.blueprint_area];
    if (areaStats) {
        areaStats.total += 1;
        if (isCorrect) {
            areaStats.correct += 1;
            userStats.xp += 10; // +10 Billable Hours for correct answers
            btn.style.borderColor = 'var(--success-green)';
            btn.style.backgroundColor = '#e8f8f0';
            feedbackMsg.innerHTML = '<strong>✅ Correct!</strong>';
            feedbackMsg.style.color = 'var(--success-green)';
        } else {
            btn.style.borderColor = '#e74c3c';
            btn.style.backgroundColor = '#fceceb';
            feedbackMsg.innerHTML = `<strong>❌ Incorrect.</strong> The correct answer was: ${qData.correct_answer}`;
            feedbackMsg.style.color = '#e74c3c';
        }
    }
    
    // Show Distractor Explanation from JSON
    explanationText.innerText = qData.explanations[selected];
    feedbackBox.classList.remove('hidden');
    
    saveUserStats(); // Save immediately
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentSession.length) {
        loadQuestion();
    } else {
        endSession();
    }
}

function endSession() {
    clearInterval(sessionTimer);
    
    // Update Streak if they finished a session
    const today = new Date().toDateString();
    if (userStats.lastPlayed !== today) {
        userStats.streak += 1;
        userStats.lastPlayed = today;
        userStats.xp += 50; // Bonus for finishing the "Quick Audit"
        saveUserStats();
    }
    
    alert(`Audit Complete! Time: ${document.getElementById('q-timer').innerText}\nCheck your dashboard for updated Billable Hours.`);
    
    // Go back to dashboard
    document.querySelector('.tab-btn:nth-child(1)').click();
    document.getElementById('q-timer').innerText = "00:00";
}
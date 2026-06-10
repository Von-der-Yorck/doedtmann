const STORAGE_KEY = "hoerbeispieleUserData";
const DATA_FILES = {
    Akkorde: "hoerbeispiele-akkorde.json",
    Septakkorde: "hoerbeispiele-septakkorde.json"
};
const CATEGORY_MAP = {
    Typ: "typ",
    Umkehrung: "umkehrung",
    Intervall: "intervall"
};
const CATEGORY_OPTIONS = {
    Typ: ["Dur", "Moll", "vermindert", "übermäßig"],
    Umkehrung: {
        withIntervall: ["Grundstellung", "Quintsextakkord", "Terzquartakkord", "Sekundakkord"],
        withoutIntervall: ["Grundstellung", "Sextakkord", "Quartsextakkord"]
    },
    Intervall: ["kleine Septime", "große Septime"]
};

let userData = { users: {}, currentUser: null };
let currentUserName = null;
let selectedCategories = [];
let selectedDatasets = [];
let questionPool = [];
let currentQuestionIndex = 0;
let answeredQuestions = 0;
let correctCount = 0;
let wrongCount = 0;
let categoryStats = {};
let datasetStats = {};
let currentSelection = {};
let currentExample = null;
let totalQuestionsRequested = 0;

function loadUserData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        userData = { users: {}, currentUser: null };
        return;
    }
    try {
        userData = JSON.parse(stored);
    } catch {
        userData = { users: {}, currentUser: null };
    }
}

function saveUserData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

function setUser(name) {
    const cleanName = name.trim();
    if (!cleanName) {
        return false;
    }
    currentUserName = cleanName;
    if (!userData.users[cleanName]) {
        userData.users[cleanName] = { tests: [] };
    } else if (!Array.isArray(userData.users[cleanName].tests)) {
        userData.users[cleanName].tests = [];
    }
    userData.currentUser = cleanName;
    saveUserData();
    updateLoginState();
    return true;
}

function updateLoginState() {
    const loginSection = document.getElementById("loginSection");
    if (currentUserName && loginSection) {
        loginSection.hidden = true;
    }
}

function showConfigPopup() {
    document.getElementById("configPopup").hidden = false;
}

function hideConfigPopup() {
    document.getElementById("configPopup").hidden = true;
}

function showError(message) {
    const error = document.getElementById("configError");
    if (error) {
        error.textContent = message;
    }
}

function clearError() {
    const error = document.getElementById("configError");
    if (error) {
        error.textContent = "";
    }
}

function getCheckedCountValue() {
    const options = document.getElementsByName("count");
    for (const option of options) {
        if (option.checked) {
            return Number(option.value);
        }
    }
    return 5;
}

function loadSelectedExamples() {
    const selected = [];
    const promises = selectedDatasets.map(dataset => {
        const fileName = DATA_FILES[dataset];
        return fetch(`data/${fileName}`)
            .then(response => response.json())
            .then(data => {
                selected.push(...data.map(item => ({ ...item, source: dataset })));
            });
    });
    return Promise.all(promises).then(() => selected);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTest() {
    clearError();
    selectedCategories = ["Typ", "Umkehrung", "Intervall"];

    selectedDatasets = [];
    if (document.getElementById("datasetAkkorde").checked) selectedDatasets.push("Akkorde");
    if (document.getElementById("datasetSeptakkorde").checked) selectedDatasets.push("Septakkorde");

    if (!currentUserName) {
        showError("Bitte melde dich zuerst mit einem Namen an.");
        return;
    }
    if (selectedDatasets.length === 0) {
        showError("Wähle mindestens einen Übungsbereich aus.");
        return;
    }
    totalQuestionsRequested = getCheckedCountValue();
    questionPool = [];
    currentQuestionIndex = 0;
    answeredQuestions = 0;
    correctCount = 0;
    wrongCount = 0;
    categoryStats = {
        Typ: { correct: 0, total: 0 },
        Umkehrung: { correct: 0, total: 0 },
        Intervall: { correct: 0, total: 0 }
    };
    datasetStats = {
        Akkorde: { correct: 0, total: 0 },
        Septakkorde: { correct: 0, total: 0 }
    };

    loadSelectedExamples()
        .then(examples => {
            if (examples.length === 0) {
                showError("Für die gewählten Optionen konnten keine Hörbeispiele geladen werden.");
                return;
            }
            questionPool = shuffle(examples);
            // Wenn weniger als gewünscht, wiederhole die Liste
            if (questionPool.length < totalQuestionsRequested) {
                const original = [...questionPool];
                while (questionPool.length < totalQuestionsRequested) {
                    const needed = totalQuestionsRequested - questionPool.length;
                    questionPool.push(...original.slice(0, needed));
                }
            } else {
                questionPool = questionPool.slice(0, totalQuestionsRequested);
            }
            totalQuestionsRequested = questionPool.length;
            hideConfigPopup();
            showTestArea();
            displayQuestion();
        })
        .catch(() => {
            showError("Beim Laden der Hörbeispiele ist ein Fehler aufgetreten.");
        });
}

function showTestArea() {
    const testArea = document.getElementById("testArea");
    const stopButton = document.getElementById("stopButton");
    const introCard = document.querySelector(".section-card");
    if (testArea) testArea.hidden = false;
    if (stopButton) stopButton.hidden = false;
    if (introCard) introCard.hidden = true;
}

function displayQuestion() {
    currentExample = questionPool[currentQuestionIndex];
    currentSelection = {};
    updateQuestionInfo();
    const audioPlayer = document.getElementById("audioPlayer");
    const questionFields = document.getElementById("questionFields");
    const checkButton = document.getElementById("checkButton");
    const nextButton = document.getElementById("nextButton");
    const feedback = document.getElementById("feedback");

    if (audioPlayer) {
        audioPlayer.innerHTML = `<audio controls><source src="data/${currentExample.audio}" type="audio/mp4">Dein Browser unterstützt kein Audio.</audio>`;
    }
    if (questionFields) {
        questionFields.innerHTML = "";
        if (selectedCategories.includes("Typ")) {
            renderOptionGroup(questionFields, "Typ", CATEGORY_OPTIONS.Typ);
        }
        if (selectedCategories.includes("Umkehrung")) {
            const options = currentExample.intervall ? CATEGORY_OPTIONS.Umkehrung.withIntervall : CATEGORY_OPTIONS.Umkehrung.withoutIntervall;
            renderOptionGroup(questionFields, "Umkehrung", options);
        }
        if (selectedCategories.includes("Intervall") && currentExample.intervall) {
            renderOptionGroup(questionFields, "Intervall", CATEGORY_OPTIONS.Intervall);
        }
    }
    if (checkButton) {
        checkButton.disabled = false;
        checkButton.textContent = "Antwort überprüfen";
    }
    if (nextButton) {
        nextButton.hidden = true;
    }
    if (feedback) {
        feedback.textContent = "";
        feedback.className = "feedback";
    }
}

function renderOptionGroup(container, category, options) {
    const group = document.createElement("div");
    group.className = "section-card";
    const title = document.createElement("h3");
    title.textContent = category;
    group.appendChild(title);
    const buttonGrid = document.createElement("div");
    buttonGrid.className = "option-grid";
    options.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-button";
        button.textContent = option;
        button.addEventListener("click", () => selectOption(buttonGrid, button, category, option));
        buttonGrid.appendChild(button);
    });
    group.appendChild(buttonGrid);
    container.appendChild(group);
}

function selectOption(container, button, category, value) {
    currentSelection[category] = value;
    container.querySelectorAll(".option-button").forEach(btn => {
        btn.classList.toggle("selected", btn === button);
    });
}

function updateQuestionInfo() {
    const progress = document.getElementById("questionProgress");
    const score = document.getElementById("scoreSummary");
    if (progress) {
        progress.textContent = `Frage ${currentQuestionIndex + 1} von ${totalQuestionsRequested}`;
    }
    if (score) {
        score.textContent = `${correctCount} richtig / ${answeredQuestions} beantwortet`;
    }
}

function validateAnswer() {
    const feedback = document.getElementById("feedback");
    if (!currentExample) return;

    const requiredCategories = selectedCategories.filter(category => category !== "Intervall" || currentExample.intervall);
    const missing = requiredCategories.filter(category => !currentSelection[category]);
    if (missing.length > 0) {
        if (feedback) {
            feedback.textContent = `Bitte wähle ${missing.join(", ")} aus.`;
            feedback.className = "feedback wrong";
        }
        return;
    }

    const resultByCategory = {};
    let allCorrect = true;
    requiredCategories.forEach(category => {
        const expected = currentExample[CATEGORY_MAP[category]];
        const answer = currentSelection[category];
        const correct = expected === answer;
        resultByCategory[category] = correct;
        categoryStats[category].total += 1;
        if (correct) {
            categoryStats[category].correct += 1;
        } else {
            allCorrect = false;
        }
    });

    if (allCorrect) {
        correctCount += 1;
        datasetStats[currentExample.source].total += 1;
        datasetStats[currentExample.source].correct += 1;
    } else {
        wrongCount += 1;
        datasetStats[currentExample.source].total += 1;
    }
    answeredQuestions += 1;

    if (feedback) {
        if (allCorrect) {
            feedback.textContent = "Richtig!";
            feedback.className = "feedback correct";
        } else {
            const expectedValues = requiredCategories.map(category => `${category}: ${currentExample[CATEGORY_MAP[category]]}`);
            feedback.innerHTML = `<strong>Falsch.</strong> Richtige Antwort: ${expectedValues.join(" · ")}`;
            feedback.className = "feedback wrong";
        }
    }

    const checkButton = document.getElementById("checkButton");
    const nextButton = document.getElementById("nextButton");
    if (checkButton) {
        checkButton.disabled = true;
    }
    if (nextButton) {
        nextButton.hidden = false;
        nextButton.textContent = currentQuestionIndex < totalQuestionsRequested - 1 ? "Weiter" : "Ergebnis anzeigen";
    }
    updateQuestionInfo();
}

function nextQuestion() {
    if (currentQuestionIndex >= totalQuestionsRequested - 1) {
        finishTest(false);
        return;
    }
    currentQuestionIndex += 1;
    displayQuestion();
}

function finishTest(aborted) {
    const stopButton = document.getElementById("stopButton");
    if (stopButton) {
        stopButton.hidden = true;
    }
    const nextButton = document.getElementById("nextButton");
    const checkButton = document.getElementById("checkButton");
    if (nextButton) nextButton.hidden = true;
    if (checkButton) checkButton.disabled = true;

    const summary = document.getElementById("completionSummary");
    if (!summary) return;

    const answered = answeredQuestions;
    const percent = answered === 0 ? 0 : Math.round((correctCount / answered) * 100);
    const headline = aborted ? "Test vorzeitig beendet" : "Test abgeschlossen";
    summary.innerHTML = `
        <h2>${headline}</h2>
        <p>${correctCount} von ${answered} beantworteten Fragen waren richtig (${percent}%).</p>
        <div class="chart-grid" id="resultsChart"></div>
    `;
    summary.hidden = false;
    renderResultsChart();
    saveTestResult(aborted);
}

function renderResultsChart() {
    const chart = document.getElementById("resultsChart");
    if (!chart) return;
    chart.innerHTML = "";
    const categoriesToShow = ["Gesamt", ...selectedDatasets];
    categoriesToShow.forEach(category => {
        let correct;
        let total;
        if (category === "Gesamt") {
            correct = correctCount;
            total = answeredQuestions;
        } else {
            correct = datasetStats[category]?.correct || 0;
            total = datasetStats[category]?.total || 0;
        }
        const correctPercent = total === 0 ? 0 : Math.round((correct / total) * 100);
        const wrongPercent = 100 - correctPercent;

        const group = document.createElement("div");
        group.className = "bar-group";
        group.innerHTML = `
            <div class="bar-label">${category}</div>
            <div class="bar-track">
                <div class="bar-correct" style="width: ${correctPercent}%;"></div>
                <div class="bar-wrong" style="width: ${wrongPercent}%;"></div>
            </div>
            <div class="bar-values"><span>${correct} richtig</span><span>${total - correct} falsch</span></div>
        `;
        chart.appendChild(group);
    });
}

function saveTestResult(aborted) {
    const now = new Date();
    const result = {
        id: now.getTime(),
        startedAt: now.toISOString(),
        aborted,
        categories: selectedCategories,
        datasets: selectedDatasets,
        totalQuestionsRequested,
        answeredQuestions,
        correctCount,
        wrongCount,
        categoryStats,
        datasetStats
    };
    if (!currentUserName) {
        return;
    }
    if (!userData.users[currentUserName]) {
        userData.users[currentUserName] = { tests: [] };
    }
    if (!Array.isArray(userData.users[currentUserName].tests)) {
        userData.users[currentUserName].tests = [];
    }
    userData.users[currentUserName].tests.push(result);
    saveUserData();
}

function initPage() {
    loadUserData();
    if (userData.currentUser) {
        currentUserName = userData.currentUser;
    }
    updateLoginState();

    const openConfigButton = document.getElementById("openConfigButton");
    const startTestButton = document.getElementById("startTestButton");
    const closeConfigButton = document.getElementById("closeConfigButton");
    const configLoginButton = document.getElementById("configLoginButton");
    const configUsernameInput = document.getElementById("configUsernameInput");
    const stopButton = document.getElementById("stopButton");
    const nextButton = document.getElementById("nextButton");
    const checkButton = document.getElementById("checkButton");

    if (openConfigButton) {
        openConfigButton.addEventListener("click", () => {
            updateLoginState();
            showConfigPopup();
        });
    }
    if (startTestButton) {
        startTestButton.addEventListener("click", startTest);
    }
    if (closeConfigButton) {
        closeConfigButton.addEventListener("click", () => {
            hideConfigPopup();
        });
    }
    if (configLoginButton && configUsernameInput) {
        configLoginButton.addEventListener("click", () => {
            if (setUser(configUsernameInput.value)) {
                configUsernameInput.value = "";
            }
        });
    }
    if (configUsernameInput) {
        configUsernameInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                if (configLoginButton) configLoginButton.click();
            }
        });
    }
    if (stopButton) {
        stopButton.addEventListener("click", () => finishTest(true));
    }
    if (nextButton) {
        nextButton.addEventListener("click", nextQuestion);
    }
    if (checkButton) {
        checkButton.addEventListener("click", validateAnswer);
    }
}

window.addEventListener("DOMContentLoaded", initPage);

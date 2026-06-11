const STORAGE_KEY = "hoerbeispieleUserData";
let userData = { users: {}, currentUser: null };
let currentUserName = null;

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
    updateLoginUI();
    return true;
}

function updateLoginUI() {
    const loginBox = document.getElementById("resultsLogin");
    const content = document.getElementById("resultsContent");
    const userLabel = document.getElementById("resultsUserLabel");
    if (currentUserName) {
        if (loginBox) loginBox.hidden = true;
        if (content) content.hidden = false;
        if (userLabel) userLabel.textContent = `Eingeloggt als ${currentUserName}`;
        renderResults();
    } else {
        if (loginBox) loginBox.hidden = false;
        if (content) content.hidden = true;
    }
}

function formatDateTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return isoString;
    }
}

function renderResults() {
    const body = document.getElementById("resultsTableBody");
    const message = document.getElementById("noResultsMessage");
    if (!body || !message) return;
    body.innerHTML = "";
    const user = userData.users[currentUserName];
    const tests = user?.tests || [];

    if (tests.length === 0) {
        message.textContent = "Bisher keine Testergebnisse vorhanden.";
        return;
    }
    message.textContent = "";

    tests.slice().reverse().forEach(test => {
        const row = document.createElement("tr");
        const dateCell = document.createElement("td");
        const countCell = document.createElement("td");
        const overallCell = document.createElement("td");
        const akkordeCell = document.createElement("td");
        const septakkordeCell = document.createElement("td");
        const genaueCell = document.createElement("td");

        const totalQuestions = test.totalQuestionsRequested || 0;
        const totalAnswered = test.answeredQuestions || 0;
        const overallPercent = totalAnswered === 0 ? 0 : Math.round((test.correctCount / totalAnswered) * 100);

        dateCell.textContent = formatDateTime(test.startedAt);
        countCell.textContent = totalQuestions.toString();
        overallCell.textContent = `${overallPercent}%`;
        akkordeCell.textContent = formatCategoryPercent(test.datasetStats?.Akkorde);
        septakkordeCell.textContent = formatCategoryPercent(test.datasetStats?.Septakkorde);
        genaueCell.textContent = formatCategoryPercent(test.datasetStats?.["Genaue Akkordbestimmung"]);

        row.append(dateCell, countCell, overallCell, akkordeCell, septakkordeCell, genaueCell);
        body.appendChild(row);
    });
}

function formatCategoryPercent(stats) {
    if (!stats || !stats.total) {
        return "-";
    }
    return `${Math.round((stats.correct / stats.total) * 100)}%`;
}

function initResultsPage() {
    loadUserData();
    if (userData.currentUser) {
        currentUserName = userData.currentUser;
    }
    updateLoginUI();

    const loginButton = document.getElementById("resultsLoginButton");
    const usernameInput = document.getElementById("resultsUsernameInput");
    if (loginButton && usernameInput) {
        loginButton.addEventListener("click", () => {
            if (setUser(usernameInput.value)) {
                usernameInput.value = "";
            }
        });
        usernameInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                loginButton.click();
            }
        });
    }
}

window.addEventListener("DOMContentLoaded", initResultsPage);

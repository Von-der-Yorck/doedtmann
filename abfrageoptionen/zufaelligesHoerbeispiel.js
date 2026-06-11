let currentHoerbeispiel = null;
let currentDataFile = null;
const NOTE_OPTIONS = [
    "C", "CIS", "D", "DIS", "E", "F", "FIS", "G", "GIS", "A", "AIS", "H",
    "c", "cis", "d", "dis", "e", "f", "fis", "g", "gis", "a", "ais", "h"
];
const AKKORDART_OPTIONS = [...NOTE_OPTIONS];

let currentSelection = {
    ton: null,
    name: null,
    type: null,
    umkehrung: null,
    intervall: null
};
let currentUserName = null;
let correctCount = 0;
let wrongCount = 0;
let userData = {
    users: {},
    currentUser: null
};

function loadUserData() {
    const stored = localStorage.getItem("hoerbeispieleUserData");
    if (stored) {
        try {
            userData = JSON.parse(stored);
        } catch (error) {
            userData = { users: {}, currentUser: null };
        }
    }
}

function saveUserData() {
    localStorage.setItem("hoerbeispieleUserData", JSON.stringify(userData));
}

function setUser(name) {
    const cleanName = name.trim();
    if (!cleanName) {
        return false;
    }
    currentUserName = cleanName;
    if (!userData.users[cleanName]) {
        userData.users[cleanName] = { correct: 0, wrong: 0 };
    }
    userData.currentUser = cleanName;
    correctCount = userData.users[cleanName].correct;
    wrongCount = userData.users[cleanName].wrong;
    saveUserData();
    updateUserUI();
    updateCounter();
    return true;
}

function updateUserUI() {
    const loginPanel = document.getElementById("loginPanel");
    const userLabel = document.getElementById("userLabel");
    const usernameInput = document.getElementById("usernameInput");
    const loginButton = document.getElementById("loginButton");

    if (currentUserName) {
        if (loginPanel) loginPanel.classList.add("logged-in");
        if (userLabel) userLabel.textContent = `Eingeloggt als ${currentUserName}`;
        if (usernameInput) usernameInput.hidden = true;
        if (loginButton) loginButton.hidden = true;
    } else {
        if (loginPanel) loginPanel.classList.remove("logged-in");
        if (userLabel) userLabel.textContent = "";
        if (usernameInput) usernameInput.hidden = false;
        if (loginButton) loginButton.hidden = false;
    }
}

function showLoginPopupOnce() {
    if (currentUserName) {
        return;
    }
    const shown = sessionStorage.getItem("hoerbeispieleLoginReminderShown") === "true";
    if (shown) {
        return;
    }
    const popup = document.getElementById("loginPopup");
    if (popup) {
        popup.hidden = false;
        sessionStorage.setItem("hoerbeispieleLoginReminderShown", "true");
    }
}

function zufaelligesHoerbeispiel(datei) {
    currentDataFile = datei;
    fetch("data/" + datei)
        .then(response => response.json())
        .then(data => {
            const randomIndex = Math.floor(Math.random() * data.length);
            currentHoerbeispiel = data[randomIndex];
            const audioElement = document.getElementById("audioPlayer");
            audioElement.innerHTML = `
        <audio controls>
            <source src="data/${currentHoerbeispiel.audio}" type="audio/mp4">
        </audio>
        `;
            currentSelection = { ton: null, name: null, type: null, umkehrung: null, intervall: null };
            zeigeAntworten(currentHoerbeispiel);
            resetFeedback();
        })
        .catch(error => {
            console.error("Fehler beim Laden der Hörbeispiele:", error);
        });
}

function resetFeedback() {
    const feedback = document.getElementById("feedback");
    const nextButton = document.getElementById("nextButton");
    const checkButton = document.getElementById("checkButton");

    if (feedback) {
        feedback.textContent = "";
        feedback.className = "feedback";
    }
    if (nextButton) {
        nextButton.hidden = true;
    }
    if (checkButton) {
        checkButton.disabled = false;
        checkButton.classList.remove("correct", "wrong");
        checkButton.textContent = "Antwort überprüfen";
    }
}

function zeigeAntworten(randomHoerbeispiel) {
    if (randomHoerbeispiel.ton) {
        renderFixedValue("auswahl-ton", `Ton: ${randomHoerbeispiel.ton}`);
        currentSelection.ton = randomHoerbeispiel.ton;
    }
    if (randomHoerbeispiel.name) {
        renderTextInput("auswahl-name", "Akkordart eingeben (Groß-/Kleinschreibung egal)", "name");
    }

    renderOptionButtons("auswahl-typ", ["Dur", "Moll", "vermindert", "übermäßig"], "type");

    let umkehrungen;
    if (randomHoerbeispiel.ton) {
        umkehrungen = ["Grundstellung", "1. Umkehrung", "2. Umkehrung", "3. Umkehrung"];
    } else if (randomHoerbeispiel.intervall) {
        umkehrungen = ["Grundstellung", "Quintsextakkord", "Terzquartakkord", "Sekundakkord"];
    } else {
        umkehrungen = ["Grundstellung", "Sextakkord", "Quartsextakkord"];
    }
    renderOptionButtons("auswahl-umkehrung", umkehrungen, "umkehrung");

    const intervallContainer = document.getElementById("auswahl-intervall");
    if (intervallContainer) {
        if (randomHoerbeispiel.ton) {
            renderOptionButtons("auswahl-intervall", ["keine Septime", "kleine Septime", "große Septime"], "intervall");
        } else {
            renderOptionButtons("auswahl-intervall", ["kleine Septime", "große Septime"], "intervall");
        }
    }
}

function renderOptionButtons(containerId, options, category) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    container.innerHTML = "";
    options.forEach(opt => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-button";
        button.textContent = opt;
        button.dataset.value = opt;
        button.addEventListener("click", () => selectOption(container, button, category, opt));
        container.appendChild(button);
    });
}

function renderTextInput(containerId, placeholder, category) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    container.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "option-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.addEventListener("input", () => {
        currentSelection[category] = input.value.trim();
    });

    container.appendChild(input);
}

function renderFixedValue(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    container.innerHTML = `<div class="fixed-value">${text}</div>`;
}

function selectOption(container, button, category, value) {
    currentSelection[category] = value;
    container.querySelectorAll(".option-button").forEach(btn => {
        btn.classList.toggle("selected", btn === button);
    });
}

function validateAnswer() {
    if (!currentHoerbeispiel) {
        return;
    }

    if (!currentUserName) {
        showLoginPopup();
        return;
    }

    const requiredFields = ["type", "umkehrung"];
    if (currentHoerbeispiel.ton) {
        requiredFields.unshift("ton", "name");
    }
    if (currentHoerbeispiel.intervall) {
        requiredFields.push("intervall");
    }

    const missing = requiredFields.filter(field => !currentSelection[field]);
    if (missing.length > 0) {
        const feedback = document.getElementById("feedback");
        if (feedback) {
            feedback.textContent = "Bitte wähle zuerst alle Optionen aus.";
            feedback.className = "feedback wrong";
        }
        return;
    }

    const fieldMap = {
        ton: "ton",
        name: "name",
        type: "typ",
        umkehrung: "umkehrung",
        intervall: "intervall"
    };

    const richtig = requiredFields.every(field => {
        const expected = currentHoerbeispiel[fieldMap[field]];
        const actual = currentSelection[field];
        if (field === "name") {
            return expected?.toString().trim().toLowerCase() === actual?.toString().trim().toLowerCase();
        }
        return actual === expected;
    });

    showResult(richtig, currentSelection);
}

function showResult(richtig, selection) {
    const feedback = document.getElementById("feedback");
    const checkButton = document.getElementById("checkButton");
    const nextButton = document.getElementById("nextButton");

    const expectedAnswers = [];
    const selectedAnswers = [];

    if (currentHoerbeispiel.ton) {
        expectedAnswers.push(`Ton: ${currentHoerbeispiel.ton}`);
        expectedAnswers.push(`Akkordart: ${currentHoerbeispiel.name}`);
        selectedAnswers.push(`Ton: ${selection.ton || "-"}`);
        selectedAnswers.push(`Akkordart: ${selection.name || "-"}`);
    }
    expectedAnswers.push(`Typ: ${currentHoerbeispiel.typ}`);
    expectedAnswers.push(`Umkehrung: ${currentHoerbeispiel.umkehrung}`);
    if (currentHoerbeispiel.intervall) {
        expectedAnswers.push(`Intervall: ${currentHoerbeispiel.intervall}`);
    }

    selectedAnswers.push(`Typ: ${selection.type}`);
    selectedAnswers.push(`Umkehrung: ${selection.umkehrung}`);
    if (selection.intervall !== null) {
        selectedAnswers.push(`Intervall: ${selection.intervall}`);
    }

    if (feedback) {
        if (richtig) {
            feedback.textContent = `Richtig! ${expectedAnswers.join(" · ")}`;
            feedback.classList.add("correct");
        } else {
            feedback.innerHTML = `<strong>Falsch.</strong> Richtige Antwort: ${expectedAnswers.join(" · ")}<br>Deine Antwort: ${selectedAnswers.join(" · ")}`;
            feedback.classList.add("wrong");
        }
    }

    if (richtig) {
        correctCount += 1;
    } else {
        wrongCount += 1;
    }
    if (currentUserName) {
        userData.users[currentUserName].correct = correctCount;
        userData.users[currentUserName].wrong = wrongCount;
        saveUserData();
    }
    updateCounter();

    if (checkButton) {
        checkButton.classList.add(richtig ? "correct" : "wrong");
        checkButton.textContent = richtig ? "Richtig" : "Falsch";
        checkButton.disabled = true;
    }
    if (nextButton) {
        nextButton.hidden = false;
    }
}

function updateCounter() {
    const total = correctCount + wrongCount;
    const correctPercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    const wrongPercent = total === 0 ? 0 : 100 - correctPercent;
    const correctCountElement = document.getElementById("correctCount");
    const wrongCountElement = document.getElementById("wrongCount");
    const correctProgress = document.getElementById("correctProgress");
    const wrongProgress = document.getElementById("wrongProgress");

    if (correctProgress) {
        correctProgress.style.width = `${correctPercent}%`;
    }
    if (wrongProgress) {
        wrongProgress.style.width = `${wrongPercent}%`;
    }
    if (correctCountElement) {
        correctCountElement.textContent = `Richtig: ${correctCount} (${correctPercent}%)`;
    }
    if (wrongCountElement) {
        wrongCountElement.textContent = `Falsch: ${wrongCount} (${wrongPercent}%)`;
    }
}

function initUser() {
    loadUserData();
    if (userData.currentUser) {
        setUser(userData.currentUser);
    } else {
        // Show login popup if no user is logged in
        showLoginPopup();
    }
}

function showLoginPopup() {
    const popup = document.getElementById("loginPopup");
    if (popup) {
        popup.hidden = false;
    }
}

function hideLoginPopup() {
    const popup = document.getElementById("loginPopup");
    if (popup) {
        popup.hidden = true;
    }
}

function closeLoginPopup() {
    hideLoginPopup();
}

document.addEventListener("DOMContentLoaded", () => {
    const checkButton = document.getElementById("checkButton");
    const nextButton = document.getElementById("nextButton");
    const loginButton = document.getElementById("loginButton");
    const usernameInput = document.getElementById("usernameInput");

    if (checkButton) {
        checkButton.addEventListener("click", validateAnswer);
    }
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            if (currentDataFile) {
                zufaelligesHoerbeispiel(currentDataFile);
            }
        });
    }
    if (loginButton && usernameInput) {
        loginButton.addEventListener("click", () => {
            if (setUser(usernameInput.value)) {
                usernameInput.value = "";
            }
        });
    }

    const popupCloseButton = document.getElementById("popupCloseButton");
    const popupLoginButton = document.getElementById("popupLoginButton");
    const popupUsernameInput = document.getElementById("popupUsernameInput");

    if (popupLoginButton && popupUsernameInput) {
        popupLoginButton.addEventListener("click", () => {
            if (setUser(popupUsernameInput.value)) {
                popupUsernameInput.value = "";
                closeLoginPopup();
            }
        });
    }
    if (popupUsernameInput) {
        popupUsernameInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                if (popupLoginButton) {
                    popupLoginButton.click();
                }
            }
        });
    }
    initUser();
    showLoginPopupOnce();
});

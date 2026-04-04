// ============================================
// DANDY WORLD — МАТЕМАТИКА ДЛЯ СОФИИ
// Основная логика игры
// ============================================

class DandyWorld {
  constructor() {
    // Состояние игры
    this.playerName = "София";
    this.coins = 0;
    this.currentZone = null;
    this.currentCharacter = null;
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.totalQuestions = 0;
    this.answered = false;
    this.questionTimer = null;

    // Результаты зон: { zoneId: { grade, correct, total, coins } }
    this.zoneResults = {};

    // Порядок зон
    this.zoneOrder = [
      "arithmetic", "brackets", "word_problems",
      "compare", "units", "two_digit",
      "perimeter", "expressions", "missing_digits",
      "multiply", "divide"
    ];

    // Первые 3 зоны открыты сразу
    this.unlockedZones = ["arithmetic", "brackets", "word_problems"];

    // Загрузка сохранения
    this.loadProgress();

    // Генерация фоновых звёзд
    this.generateStars();

    // Привязка событий
    this.bindEvents();

    // Показать меню
    this.showScreen("menu-screen");
  }

  // ═══════════════════════════════════════════
  // НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
  // ═══════════════════════════════════════════

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const el = document.getElementById(screenId);
    if (el) {
      el.classList.add("active");
      // Перемотать наверх
      el.scrollTop = 0;
    }
  }

  // ═══════════════════════════════════════════
  // ПРИВЯЗКА СОБЫТИЙ
  // ═══════════════════════════════════════════

  bindEvents() {
    // Меню: кнопка старта
    document.getElementById("btn-start").addEventListener("click", () => {
      this.startGame();
    });

    // Меню: Enter в поле имени
    document.getElementById("player-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.startGame();
    });

    // Задание: кнопка назад
    document.getElementById("btn-back-to-map").addEventListener("click", () => {
      // Очистить таймер перехода, если есть
      if (this.questionTimer) {
        clearTimeout(this.questionTimer);
        this.questionTimer = null;
      }
      this.showMap();
    });

    // Задание: подсказка
    document.getElementById("btn-hint").addEventListener("click", () => {
      this.showHint();
    });

    // Результат: кнопки
    document.getElementById("btn-retry").addEventListener("click", () => {
      this.enterZone(this.currentZone);
    });

    document.getElementById("btn-to-map").addEventListener("click", () => {
      this.showMap();
    });

    // Итоговая: кнопка к карте
    document.getElementById("btn-final").addEventListener("click", () => {
      this.showFinal();
    });

    document.getElementById("btn-final-to-map").addEventListener("click", () => {
      this.showMap();
    });

    // Сброс прогресса
    document.getElementById("btn-reset-progress").addEventListener("click", () => {
      this.resetProgress();
    });
  }

  // ═══════════════════════════════════════════
  // ЭКРАН 1: ГЛАВНОЕ МЕНЮ
  // ═══════════════════════════════════════════

  showMenu() {
    this.showScreen("menu-screen");
  }

  startGame() {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    this.playerName = name || "София";
    this.saveProgress();
    this.showMap();
  }

  // ═══════════════════════════════════════════
  // ЭКРАН 2: КАРТА МИРА
  // ═══════════════════════════════════════════

  showMap() {
    // Обновить шапку
    document.getElementById("player-name-display").textContent = this.playerName;
    document.getElementById("coins-display").textContent = this.coins;

    // Обновить разблокировку зон
    this.updateUnlockedZones();

    // Отрисовать сетку зон
    this.renderZoneGrid();

    // Кнопка итоговой оценки
    const allDone = this.zoneOrder.every(z => !!this.zoneResults[z]);
    document.getElementById("final-btn-wrapper").style.display = allDone ? "block" : "none";

    this.showScreen("map-screen");
  }

  updateUnlockedZones() {
    const passedCount = this.zoneOrder.filter(z => !!this.zoneResults[z]).length;

    // Зоны 1-3 всегда открыты
    // Зоны 4-6 (compare, units, two_digit) — нужно пройти минимум 2 из первых 3
    const firstThreePassed = this.zoneOrder.slice(0, 3).filter(z => !!this.zoneResults[z]).length;
    if (firstThreePassed >= 2) {
      ["compare", "units", "two_digit"].forEach(z => {
        if (!this.unlockedZones.includes(z)) this.unlockedZones.push(z);
      });
    }

    // Зоны 7-9 (perimeter, expressions, missing_digits) — нужно пройти минимум 5 зон
    if (passedCount >= 5) {
      ["perimeter", "expressions", "missing_digits"].forEach(z => {
        if (!this.unlockedZones.includes(z)) this.unlockedZones.push(z);
      });
    }

    // Зоны 10-11 (multiply, divide) — открываются после прохождения 7 зон
    if (passedCount >= 7) {
      ["multiply", "divide"].forEach(z => {
        if (!this.unlockedZones.includes(z)) this.unlockedZones.push(z);
      });
    }

  }

  renderZoneGrid() {
    const grid = document.getElementById("zone-grid");
    grid.innerHTML = "";

    this.zoneOrder.forEach((zoneId) => {
      const char = getCharacterByZone(zoneId);
      const unlocked = this.unlockedZones.includes(zoneId);
      const result = this.zoneResults[zoneId];

      const card = document.createElement("div");
      card.className = "zone-card" + (unlocked ? "" : " locked");

      // Бейдж оценки
      let badgeHtml = "";
      if (result) {
        const gradeClass = "grade-" + result.grade;
        badgeHtml = `<div class="grade-badge ${gradeClass}">${result.grade}</div>`;
      }

      // Нижняя строка: оценка или замок
      let bottomHtml = "";
      if (result) {
        const stars = result.grade === 5 ? "⭐⭐⭐" : result.grade === 4 ? "⭐⭐" : "⭐";
        bottomHtml = `<div class="zone-card-grade">${stars}</div>`;
      } else if (!unlocked) {
        bottomHtml = `<div class="zone-card-lock">🔒</div>`;
      } else {
        bottomHtml = `<div class="zone-card-grade" style="opacity:0.3;">—</div>`;
      }

      card.innerHTML = `
        ${badgeHtml}
        <span class="zone-card-emoji">${char.image ? `<img src="${char.image}" alt="${char.name}">` : char.emoji}</span>
        <div class="zone-card-name">${char.name}</div>
        <div class="zone-card-zone">${char.zoneName}</div>
        ${bottomHtml}
      `;

      if (unlocked) {
        card.addEventListener("click", () => this.enterZone(zoneId));
      }

      grid.appendChild(card);
    });
  }

  // ═══════════════════════════════════════════
  // ЭКРАН 3: ЗАДАНИЕ
  // ═══════════════════════════════════════════

  enterZone(zoneId) {
    this.currentZone = zoneId;
    this.currentCharacter = getCharacterByZone(zoneId);

    // Загрузить и перемешать вопросы
    const allQuestions = QUESTIONS[zoneId];
    if (!allQuestions || allQuestions.length === 0) return;

    const shuffled = this.shuffle([...allQuestions]);
    // Взять первые 8 или все если меньше
    this.currentQuestions = shuffled.slice(0, Math.min(8, shuffled.length));
    this.totalQuestions = this.currentQuestions.length;
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.answered = false;

    this.showScreen("task-screen");
    this.showQuestion();
  }

  showQuestion() {
    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.showResult();
      return;
    }

    this.answered = false;
    const q = this.currentQuestions[this.currentQuestionIndex];
    const num = this.currentQuestionIndex + 1;

    // Прогресс-бар
    const pct = (this.currentQuestionIndex / this.totalQuestions) * 100;
    document.getElementById("task-progress-fill").style.width = pct + "%";

    // Счётчик
    document.getElementById("task-counter").textContent = `${num}/${this.totalQuestions}`;

    // Персонаж: картинка или эмодзи
    const taskEmojiEl = document.getElementById("task-char-emoji");
    if (this.currentCharacter.image) {
      taskEmojiEl.innerHTML = `<img src="${this.currentCharacter.image}" alt="${this.currentCharacter.name}">`;
    } else {
      taskEmojiEl.textContent = this.currentCharacter.emoji;
    }

    // Персонаж: фраза
    if (this.currentQuestionIndex === 0) {
      document.getElementById("task-char-speech").textContent = this.currentCharacter.greeting;
    } else {
      // Случайная подбадривающая фраза
      const encouragements = [
        "Давай решим следующий!",
        "Продолжаем!",
        "Ещё один пример!",
        "Ты справишься!",
        "Вперёд к следующему!"
      ];
      document.getElementById("task-char-speech").textContent =
        encouragements[Math.floor(Math.random() * encouragements.length)];
    }

    // Текст вопроса
    document.getElementById("task-question").textContent = q.question;

    // Область ответа
    const area = document.getElementById("answer-area");
    area.innerHTML = "";

    if (q.type === "choice") {
      this.renderChoiceQuestion(q, area);
    } else if (q.type === "input") {
      this.renderInputQuestion(q, area);
    } else if (q.type === "compare") {
      this.renderCompareQuestion(q, area);
    }

    // Подсказка: скрыть
    const hintBox = document.getElementById("hint-box");
    hintBox.classList.remove("visible");
    hintBox.textContent = q.hint;
    document.getElementById("btn-hint").style.display = "";
  }

  // --- Тип: choice (выбор из вариантов) ---
  renderChoiceQuestion(q, container) {
    const grid = document.createElement("div");
    grid.className = "choice-grid";

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        if (this.answered) return;
        this.checkAnswer(String(opt), String(q.answer), btn, grid, q);
      });

      grid.appendChild(btn);
    });

    container.appendChild(grid);

    // Кнопка «Столбик» для вычислений
    const columnBtn = document.createElement("button");
    columnBtn.className = "btn-column-toggle";
    columnBtn.textContent = "📝 Столбик";

    const scratchpad = document.createElement("div");
    scratchpad.className = "column-scratchpad";
    scratchpad.style.display = "none";

    columnBtn.addEventListener("click", () => {
      const isOpen = scratchpad.style.display !== "none";
      scratchpad.style.display = isOpen ? "none" : "block";
      columnBtn.classList.toggle("active", !isOpen);
      if (!isOpen && scratchpad.children.length === 0) {
        this.buildColumnScratchpad(scratchpad, null);
      }
    });

    container.appendChild(columnBtn);
    container.appendChild(scratchpad);
  }

  // --- Тип: input (ввод числа) ---
  renderInputQuestion(q, container) {
    const group = document.createElement("div");
    group.className = "input-group";

    const input = document.createElement("input");
    input.type = "number";
    input.className = "input-answer";
    input.placeholder = "?";
    input.autocomplete = "off";
    input.inputMode = "numeric";

    const submitBtn = document.createElement("button");
    submitBtn.className = "btn btn-submit";
    submitBtn.textContent = "Ответить";

    const doSubmit = () => {
      if (this.answered) return;
      const raw = input.value.trim();
      if (raw === "") return;
      const val = parseInt(raw, 10);
      if (isNaN(val)) return;

      this.checkInputAnswer(val, q.answer, input, submitBtn, q);
    };

    submitBtn.addEventListener("click", doSubmit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSubmit();
    });

    group.appendChild(input);
    group.appendChild(submitBtn);

    // Кнопка «Столбик» — черновик для вычислений
    const columnBtn = document.createElement("button");
    columnBtn.className = "btn-column-toggle";
    columnBtn.textContent = "📝 Столбик";

    const scratchpad = document.createElement("div");
    scratchpad.className = "column-scratchpad";
    scratchpad.style.display = "none";

    columnBtn.addEventListener("click", () => {
      const isOpen = scratchpad.style.display !== "none";
      scratchpad.style.display = isOpen ? "none" : "block";
      columnBtn.classList.toggle("active", !isOpen);
      if (!isOpen && scratchpad.children.length === 0) {
        this.buildColumnScratchpad(scratchpad, input);
      }
    });

    group.appendChild(columnBtn);
    group.appendChild(scratchpad);
    container.appendChild(group);

    // Фокус на поле ввода
    setTimeout(() => input.focus(), 150);
  }

  // --- Черновик «Столбик» ---
  buildColumnScratchpad(container, mainInput) {
    // Форма ввода чисел
    const setup = document.createElement("div");
    setup.className = "column-setup";

    const inp1 = document.createElement("input");
    inp1.type = "number";
    inp1.className = "column-num-input";
    inp1.placeholder = "Число 1";
    inp1.inputMode = "numeric";
    inp1.autocomplete = "off";

    const opGroup = document.createElement("div");
    opGroup.className = "column-op-group";
    let selectedOp = "+";

    const btnPlus = document.createElement("button");
    btnPlus.className = "column-op-btn active";
    btnPlus.textContent = "+";

    const btnMinus = document.createElement("button");
    btnMinus.className = "column-op-btn";
    btnMinus.textContent = "−";

    btnPlus.addEventListener("click", () => {
      selectedOp = "+";
      btnPlus.classList.add("active");
      btnMinus.classList.remove("active");
    });
    btnMinus.addEventListener("click", () => {
      selectedOp = "−";
      btnMinus.classList.add("active");
      btnPlus.classList.remove("active");
    });

    opGroup.appendChild(btnPlus);
    opGroup.appendChild(btnMinus);

    const inp2 = document.createElement("input");
    inp2.type = "number";
    inp2.className = "column-num-input";
    inp2.placeholder = "Число 2";
    inp2.inputMode = "numeric";
    inp2.autocomplete = "off";

    const buildBtn = document.createElement("button");
    buildBtn.className = "btn btn-column-build";
    buildBtn.textContent = "Построить столбик";

    setup.appendChild(inp1);
    setup.appendChild(opGroup);
    setup.appendChild(inp2);
    setup.appendChild(buildBtn);
    container.appendChild(setup);

    // Область отрисовки столбика
    const columnArea = document.createElement("div");
    columnArea.className = "column-area";
    container.appendChild(columnArea);

    buildBtn.addEventListener("click", () => {
      const n1 = parseInt(inp1.value, 10);
      const n2 = parseInt(inp2.value, 10);
      if (isNaN(n1) || isNaN(n2) || n1 < 0 || n2 < 0 || n1 > 999 || n2 > 999) return;
      this.renderColumnLayout(columnArea, n1, n2, selectedOp, mainInput);
    });

    setTimeout(() => inp1.focus(), 100);
  }

  // --- Отрисовка столбика ---
  renderColumnLayout(container, num1, num2, operation, mainInput) {
    container.innerHTML = "";

    const num1Str = String(num1);
    const num2Str = String(num2);
    // Вычислить правильный ответ для подсветки
    const correctResult = operation === "+" ? num1 + num2 : num1 - num2;
    const ansStr = String(Math.abs(correctResult));
    const maxDigits = Math.max(num1Str.length, num2Str.length, ansStr.length);
    const totalCols = maxDigits + 1;

    const problem = document.createElement("div");
    problem.className = "column-problem";

    // Строка 1: первое число
    const row1 = document.createElement("div");
    row1.className = "column-row";
    for (let i = 0; i < totalCols - num1Str.length; i++) {
      const cell = document.createElement("span");
      cell.className = "column-cell";
      row1.appendChild(cell);
    }
    for (const ch of num1Str) {
      const cell = document.createElement("span");
      cell.className = "column-cell";
      cell.textContent = ch;
      row1.appendChild(cell);
    }
    problem.appendChild(row1);

    // Строка 2: знак + второе число
    const row2 = document.createElement("div");
    row2.className = "column-row";
    const opCell = document.createElement("span");
    opCell.className = "column-cell column-op-sign";
    opCell.textContent = operation;
    row2.appendChild(opCell);
    for (let i = 0; i < maxDigits - num2Str.length; i++) {
      const cell = document.createElement("span");
      cell.className = "column-cell";
      row2.appendChild(cell);
    }
    for (const ch of num2Str) {
      const cell = document.createElement("span");
      cell.className = "column-cell";
      cell.textContent = ch;
      row2.appendChild(cell);
    }
    problem.appendChild(row2);

    // Линия
    const line = document.createElement("div");
    line.className = "column-line";
    problem.appendChild(line);

    // Строка 3: поля ввода ответа
    const row3 = document.createElement("div");
    row3.className = "column-row";
    for (let i = 0; i < totalCols - ansStr.length; i++) {
      const cell = document.createElement("span");
      cell.className = "column-cell";
      row3.appendChild(cell);
    }
    const digitInputs = [];
    for (let i = 0; i < ansStr.length; i++) {
      const inp = document.createElement("input");
      inp.className = "column-digit-input";
      inp.type = "text";
      inp.inputMode = "numeric";
      inp.maxLength = 1;
      inp.autocomplete = "off";
      digitInputs.push(inp);
      row3.appendChild(inp);
    }
    problem.appendChild(row3);

    container.appendChild(problem);

    // Навигация между ячейками (справа налево)
    const lastIdx = digitInputs.length - 1;
    digitInputs.forEach((inp, idx) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
        if (inp.value.length === 1 && idx > 0) {
          digitInputs[idx - 1].focus();
        }
        // Проверка правильности по мере ввода
        this.checkColumnDigits(digitInputs, ansStr);
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && inp.value === "" && idx < lastIdx) {
          digitInputs[idx + 1].focus();
        }
      });
    });

    // Кнопка «Вставить ответ» (только если есть поле ввода)
    if (mainInput) {
      const insertBtn = document.createElement("button");
      insertBtn.className = "btn btn-column-insert";
      insertBtn.textContent = "↑ Вставить ответ";
      insertBtn.addEventListener("click", () => {
        const val = digitInputs.map(i => i.value).join("");
        if (val && !isNaN(parseInt(val, 10))) {
          mainInput.value = parseInt(val, 10);
          mainInput.focus();
        }
      });
      container.appendChild(insertBtn);
    }

    setTimeout(() => digitInputs[lastIdx].focus(), 100);
  }

  // --- Подсветка цифр столбика ---
  checkColumnDigits(inputs, ansStr) {
    const allFilled = inputs.every(i => i.value.length === 1);
    if (!allFilled) {
      inputs.forEach(i => {
        i.classList.remove("correct", "wrong");
      });
      return;
    }
    const userAns = inputs.map(i => i.value).join("");
    inputs.forEach((inp, idx) => {
      inp.classList.remove("correct", "wrong");
      if (userAns === ansStr) {
        inp.classList.add("correct");
      } else {
        inp.classList.add("wrong");
      }
    });
  }

  // --- Тип: compare (>, <, =) ---
  renderCompareQuestion(q, container) {
    const group = document.createElement("div");
    group.className = "compare-group";

    [">", "<", "="].forEach((sign) => {
      const btn = document.createElement("button");
      btn.className = "compare-btn";
      btn.textContent = sign;

      btn.addEventListener("click", () => {
        if (this.answered) return;
        this.checkCompareAnswer(sign, q.answer, btn, group, q);
      });

      group.appendChild(btn);
    });

    container.appendChild(group);

    // Кнопка «Столбик» для вычислений
    const columnBtn = document.createElement("button");
    columnBtn.className = "btn-column-toggle";
    columnBtn.textContent = "📝 Столбик";

    const scratchpad = document.createElement("div");
    scratchpad.className = "column-scratchpad";
    scratchpad.style.display = "none";

    columnBtn.addEventListener("click", () => {
      const isOpen = scratchpad.style.display !== "none";
      scratchpad.style.display = isOpen ? "none" : "block";
      columnBtn.classList.toggle("active", !isOpen);
      if (!isOpen && scratchpad.children.length === 0) {
        this.buildColumnScratchpad(scratchpad, null);
      }
    });

    container.appendChild(columnBtn);
    container.appendChild(scratchpad);
  }

  // ═══════════════════════════════════════════
  // ПРОВЕРКА ОТВЕТОВ
  // ═══════════════════════════════════════════

  // --- choice ---
  checkAnswer(selected, correct, clickedBtn, grid, q) {
    this.answered = true;

    const isCorrect = selected === correct;

    // Заблокировать все кнопки
    grid.querySelectorAll(".choice-btn").forEach(b => {
      b.disabled = true;
      // Подсветить правильный ответ зелёным
      if (String(b.textContent) === correct) {
        b.classList.add("correct");
      }
    });

    if (isCorrect) {
      this.correctAnswers++;
      this.showCharacterPhrase("correct");
      this.questionTimer = setTimeout(() => this.nextQuestion(), 1000);
    } else {
      clickedBtn.classList.add("wrong");
      this.showCharacterPhrase("wrong");
      this.showHint();
      this.questionTimer = setTimeout(() => this.nextQuestion(), 2000);
    }
  }

  // --- input ---
  checkInputAnswer(value, correctAnswer, input, submitBtn, q) {
    this.answered = true;
    submitBtn.disabled = true;
    input.readOnly = true;

    const isCorrect = value === correctAnswer;

    if (isCorrect) {
      input.classList.add("correct");
      this.correctAnswers++;
      this.showCharacterPhrase("correct");
      this.questionTimer = setTimeout(() => this.nextQuestion(), 1000);
    } else {
      input.classList.add("wrong");
      this.showCharacterPhrase("wrong");
      this.showHint();
      // Показать правильный ответ
      setTimeout(() => {
        input.classList.remove("wrong");
        input.classList.add("correct");
        input.value = correctAnswer;
      }, 800);
      this.questionTimer = setTimeout(() => this.nextQuestion(), 2000);
    }
  }

  // --- compare ---
  checkCompareAnswer(sign, correctSign, clickedBtn, group, q) {
    this.answered = true;

    const isCorrect = sign === correctSign;

    // Заблокировать все кнопки
    group.querySelectorAll(".compare-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === correctSign) {
        b.classList.add("correct");
      }
    });

    if (isCorrect) {
      this.correctAnswers++;
      this.showCharacterPhrase("correct");
      this.questionTimer = setTimeout(() => this.nextQuestion(), 1000);
    } else {
      clickedBtn.classList.add("wrong");
      this.showCharacterPhrase("wrong");
      this.showHint();
      this.questionTimer = setTimeout(() => this.nextQuestion(), 2000);
    }
  }

  // --- Фраза персонажа ---
  showCharacterPhrase(type) {
    const phrase = getCharacterPhrase(this.currentCharacter, type);
    document.getElementById("task-char-speech").textContent = phrase;
  }

  // --- Подсказка ---
  showHint() {
    const hintBox = document.getElementById("hint-box");
    hintBox.classList.add("visible");
  }

  // --- Следующий вопрос ---
  nextQuestion() {
    this.questionTimer = null;
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.showResult();
    } else {
      this.showQuestion();
    }
  }

  // ═══════════════════════════════════════════
  // ЭКРАН 4: РЕЗУЛЬТАТ ЗОНЫ
  // ═══════════════════════════════════════════

  showResult() {
    const correct = this.correctAnswers;
    const total = this.totalQuestions;
    const pct = total > 0 ? (correct / total) * 100 : 0;

    // Оценка
    let grade, word, starCount, earnedCoins;
    if (pct >= 85) {
      grade = 5;
      word = "Отлично ⭐";
      starCount = 3;
      earnedCoins = 20;
    } else if (pct >= 60) {
      grade = 4;
      word = "Молодец 👍";
      starCount = 2;
      earnedCoins = 15;
    } else {
      grade = 3;
      word = "Сойдёт 😊";
      starCount = 1;
      earnedCoins = 10;
    }

    // Сохранить лучший результат
    const prev = this.zoneResults[this.currentZone];
    const prevCoins = prev ? prev.coins : 0;

    if (!prev || grade > prev.grade) {
      this.zoneResults[this.currentZone] = {
        grade: grade,
        correct: correct,
        total: total,
        coins: earnedCoins
      };
    }

    // Начислить монеты (разницу, чтобы не давать дважды)
    const actualCoins = Math.max(0, earnedCoins - prevCoins);
    this.coins += actualCoins;

    // Обновить разблокировку
    this.updateUnlockedZones();

    // Сохранить
    this.saveProgress();

    // Отрисовать экран результата
    const resultEmojiEl = document.getElementById("result-char-emoji");
    if (this.currentCharacter.image) {
      resultEmojiEl.innerHTML = `<img src="${this.currentCharacter.image}" alt="${this.currentCharacter.name}">`;
    } else {
      resultEmojiEl.textContent = this.currentCharacter.emoji;
    }
    document.getElementById("result-grade").textContent = grade;
    document.getElementById("result-word").textContent = word;
    document.getElementById("result-stats").textContent = `Правильно: ${correct} из ${total}`;
    document.getElementById("result-coins").textContent = `+${actualCoins} ⭐`;

    // Звёзды с анимацией
    const starsEl = document.getElementById("result-stars");
    starsEl.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      span.className = "result-star";
      span.style.setProperty("--i", i);
      span.textContent = i < starCount ? "⭐" : "☆";
      starsEl.appendChild(span);
    }

    this.showScreen("result-screen");

    // Конфетти при оценке 5
    if (grade === 5) {
      setTimeout(() => this.spawnConfetti(), 400);
    }
  }

  // ═══════════════════════════════════════════
  // ЭКРАН 5: ИТОГОВАЯ ОЦЕНКА
  // ═══════════════════════════════════════════

  showFinal() {
    const container = document.getElementById("final-zones");
    container.innerHTML = "";

    let sum = 0;
    let count = 0;

    this.zoneOrder.forEach((zoneId) => {
      const char = getCharacterByZone(zoneId);
      const result = this.zoneResults[zoneId];
      const gradeText = result ? result.grade : "—";

      if (result) {
        sum += result.grade;
        count++;
      }

      const item = document.createElement("div");
      item.className = "final-zone-item";
      item.innerHTML = `
        <span class="final-zone-emoji">${char.image ? `<img src="${char.image}" alt="${char.name}">` : char.emoji}</span>
        <div class="final-zone-name">${char.zoneName}</div>
        <div class="final-zone-grade">${gradeText}</div>
      `;
      container.appendChild(item);
    });

    // Средняя оценка
    const avg = count > 0 ? sum / count : 0;
    const avgRound = Math.round(avg * 10) / 10;
    document.getElementById("final-average").textContent = avgRound;

    // Вердикт
    let verdict;
    if (avg >= 5) {
      verdict = "🏆 Гений математики!";
    } else if (avg >= 4) {
      verdict = "🌟 Отличный результат!";
    } else {
      verdict = "💪 Хорошее начало! Тренируйся ещё!";
    }
    document.getElementById("final-verdict").textContent = verdict;

    this.showScreen("final-screen");

    // Конфетти если средняя >= 4.5
    if (avg >= 4.5) {
      setTimeout(() => this.spawnConfetti(), 500);
    }
  }

  // ═══════════════════════════════════════════
  // УТИЛИТЫ
  // ═══════════════════════════════════════════

  // Fisher-Yates shuffle
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Сохранение в localStorage
  saveProgress() {
    try {
      const data = {
        playerName: this.playerName,
        coins: this.coins,
        zoneResults: this.zoneResults,
        unlockedZones: this.unlockedZones
      };
      localStorage.setItem("dandyworld_save", JSON.stringify(data));
    } catch (e) {
      // localStorage недоступен
    }
  }

  // Загрузка из localStorage
  loadProgress() {
    try {
      const raw = localStorage.getItem("dandyworld_save");
      if (!raw) return;

      const data = JSON.parse(raw);
      if (data.playerName) {
        this.playerName = data.playerName;
        const input = document.getElementById("player-name");
        if (input) input.value = this.playerName;
      }
      if (typeof data.coins === "number") {
        this.coins = data.coins;
      }
      if (data.zoneResults && typeof data.zoneResults === "object") {
        this.zoneResults = data.zoneResults;
      }
      if (Array.isArray(data.unlockedZones) && data.unlockedZones.length > 0) {
        this.unlockedZones = data.unlockedZones;
      }
    } catch (e) {
      // localStorage недоступен или повреждены данные
    }
  }

  // Сброс прогресса
  resetProgress() {
    if (!confirm("Сбросить весь прогресс? Это нельзя отменить.")) return;
    try {
      localStorage.removeItem("dandyworld_save");
    } catch (e) {}
    location.reload();
  }

  // Конфетти
  spawnConfetti() {
    const container = document.getElementById("confetti-container");
    container.innerHTML = "";

    const colors = [
      "#ff6b9d", "#ffd93d", "#6bcb77", "#4d96ff",
      "#9b59b6", "#ff8c42", "#00d2d3", "#ee5a5a"
    ];

    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = (Math.random() * 100) + "%";
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      const size = 6 + Math.random() * 10;
      piece.style.width = size + "px";
      piece.style.height = size + "px";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";

      piece.style.setProperty("--delay", (Math.random() * 1.5) + "s");
      piece.style.setProperty("--duration", (2.5 + Math.random() * 2) + "s");
      piece.style.setProperty("--spin", (360 + Math.random() * 720) + "deg");

      container.appendChild(piece);
    }

    // Очистить через 5 секунд
    setTimeout(() => {
      container.innerHTML = "";
    }, 5000);
  }

  // Декоративные звёзды на фоне
  generateStars() {
    // Используем существующий bg-blobs контейнер
    const bgBlobs = document.querySelector(".bg-blobs");
    if (!bgBlobs) return;

    for (let i = 0; i < 30; i++) {
      const star = document.createElement("div");
      const size = 1 + Math.random() * 3;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = 3 + Math.random() * 4;
      const delay = Math.random() * 5;
      const opacity = 0.15 + Math.random() * 0.4;

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 255, 255, ${opacity});
        border-radius: 50%;
        animation: float ${duration}s ease-in-out ${delay}s infinite;
        pointer-events: none;
      `;

      bgBlobs.appendChild(star);
    }
  }
}

// ═══════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  window.game = new DandyWorld();
});

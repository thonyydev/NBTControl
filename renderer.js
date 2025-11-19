// renderer.js
let currentLevelDatPath = null;
let currentLevelData = null;

const selectWorldBtn = document.getElementById("selectWorld");
const reloadBtn = document.getElementById("reload");
const saveBtn = document.getElementById("save");
const toggleReadonlyBtn = document.getElementById("toggleReadonly");
const worldPathDiv = document.getElementById("worldPath");

const levelNameInput = document.getElementById("levelName");
const gameModeSelect = document.getElementById("gameMode");
const difficultySelect = document.getElementById("difficulty");
const hardcoreCheck = document.getElementById("hardcore");
const rainingCheck = document.getElementById("raining");
const thunderingCheck = document.getElementById("thundering");
const allowCommandsCheck = document.getElementById("allowCommands");

const dayTimeInput = document.getElementById("dayTime");
const dayTimeSlider = document.getElementById("dayTimeSlider");

const spawnXInput = document.getElementById("spawnX");
const spawnYInput = document.getElementById("spawnY");
const spawnZInput = document.getElementById("spawnZ");

const worldSeedInput = document.getElementById("worldSeed");
const versionInfoSpan = document.getElementById("versionInfo");
const lastPlayedInfoSpan = document.getElementById("lastPlayedInfo");
const playTimeInfoSpan = document.getElementById("playTimeInfo");

const rawTextarea = document.getElementById("raw");

const statusToast = document.getElementById("statusToast");
const statusTitle = document.getElementById("statusTitle");
const statusMessage = document.getElementById("statusMessage");

const presetCreativeDayBtn = document.getElementById("presetCreativeDay");
const presetSurvivalNightStormBtn = document.getElementById(
  "presetSurvivalNightStorm"
);
const presetTestWorldBtn = document.getElementById("presetTestWorld");

const winCloseBtn = document.getElementById("win-close");
const winMinBtn = document.getElementById("win-minimize");
const winMaxBtn = document.getElementById("win-maximize");

let statusHideTimeout = null;
let isReadonly = false;
let hasWorldLoaded = false;

if (winCloseBtn && window.windowControls) {
  winCloseBtn.addEventListener("click", () => {
    window.windowControls.close();
  });
}

if (winMinBtn && window.windowControls) {
  winMinBtn.addEventListener("click", () => {
    window.windowControls.minimize();
  });
}

if (winMaxBtn && window.windowControls) {
  winMaxBtn.addEventListener("click", () => {
    window.windowControls.toggleMaximize();
  });
}

function setStatus(message, type = "idle") {
  statusMessage.textContent = message;

  if (type === "ok") {
    statusTitle.textContent = "Sucesso";
  } else if (type === "error") {
    statusTitle.textContent = "Erro";
  } else {
    statusTitle.textContent = "Status";
  }

  statusToast.classList.remove(
    "status-ok",
    "status-error",
    "status-idle",
    "hidden"
  );
  if (type === "ok") {
    statusToast.classList.add("status-ok");
  } else if (type === "error") {
    statusToast.classList.add("status-error");
  } else {
    statusToast.classList.add("status-idle");
  }

  if (statusHideTimeout) {
    clearTimeout(statusHideTimeout);
    statusHideTimeout = null;
  }

  if (type === "ok" || type === "idle") {
    statusHideTimeout = setTimeout(() => {
      statusToast.classList.add("hidden");
    }, 3500);
  }
}

function applyReadonlyState() {
  const worldLoaded = hasWorldLoaded;
  const editingDisabled = !worldLoaded || isReadonly;

  // select world sempre ativo
  selectWorldBtn.disabled = false;

  // reload só depende de ter mundo
  reloadBtn.disabled = !worldLoaded;

  // save depende de não estar readonly
  saveBtn.disabled = editingDisabled;

  const editControls = [
    levelNameInput,
    gameModeSelect,
    difficultySelect,
    hardcoreCheck,
    rainingCheck,
    thunderingCheck,
    allowCommandsCheck,
    dayTimeInput,
    dayTimeSlider,
    spawnXInput,
    spawnYInput,
    spawnZInput,
    worldSeedInput,
    presetCreativeDayBtn,
    presetSurvivalNightStormBtn,
    presetTestWorldBtn,
  ];

  editControls.forEach((ctrl) => {
    if (!ctrl) return;
    ctrl.disabled = editingDisabled;
  });

  if (isReadonly) {
    toggleReadonlyBtn.textContent = "🔒 Somente leitura";
  } else {
    toggleReadonlyBtn.textContent = "🔓 Edição ativa";
  }
}

function setButtonsEnabled(enabled) {
  hasWorldLoaded = enabled;
  applyReadonlyState();
}

function ensureDataRoot() {
  if (!currentLevelData.Data) {
    currentLevelData.Data = {
      type: "compound",
      value: {},
    };
  }
  if (!currentLevelData.Data.value) {
    currentLevelData.Data.value = {};
  }
}

function longToNumberOrLowPart(longTag) {
  if (!longTag || longTag.value === undefined) return 0;
  const v = longTag.value;

  // formato [high, low] que as libs de NBT usam pra long
  if (Array.isArray(v) && v.length === 2) {
    const high = Number(v[0]) || 0;
    const low = Number(v[1]) || 0;
    // high * 2^32 + low (low tratado como unsigned)
    return high * 2 ** 32 + (low >>> 0);
  }

  // se vier só número, tenta converter direto
  return Number(v) || 0;
}

function shortenPath(p) {
  if (!p) return "Nenhum arquivo selecionado";
  if (p.length <= 70) return p;
  return "…" + p.slice(-70);
}

function loadFieldsFromNbt(data) {
  const dataTag = data.Data;
  const inner = dataTag?.value || {};

  const levelNameTag = inner.LevelName;
  const levelName = levelNameTag?.value || "";
  levelNameInput.value = levelName;

  const gameTypeTag = inner.GameType;
  gameModeSelect.value =
    gameTypeTag && gameTypeTag.value !== undefined
      ? String(gameTypeTag.value)
      : "0";

  const difficultyTag = inner.Difficulty;
  difficultySelect.value =
    difficultyTag && difficultyTag.value !== undefined
      ? String(difficultyTag.value)
      : "2";

  const hardcoreTag = inner.hardcore;
  hardcoreCheck.checked = hardcoreTag ? Boolean(hardcoreTag.value) : false;

  const rainingTag = inner.raining;
  rainingCheck.checked = rainingTag ? Boolean(rainingTag.value) : false;

  const thunderingTag = inner.thundering;
  thunderingCheck.checked = thunderingTag
    ? Boolean(thunderingTag.value)
    : false;

  const allowCommandsTag = inner.allowCommands;
  allowCommandsCheck.checked = allowCommandsTag
    ? Boolean(allowCommandsTag.value)
    : false;

  const dayTimeTag = inner.DayTime;
  const dayTime = longToNumberOrLowPart(dayTimeTag) % 24000;
  dayTimeInput.value = dayTime;
  if (dayTimeSlider) {
    dayTimeSlider.value = dayTime;
  }

  const spawnXTag = inner.SpawnX;
  const spawnYTag = inner.SpawnY;
  const spawnZTag = inner.SpawnZ;
  spawnXInput.value =
    spawnXTag && spawnXTag.value !== undefined ? spawnXTag.value : 0;
  spawnYInput.value =
    spawnYTag && spawnYTag.value !== undefined ? spawnYTag.value : 64;
  spawnZInput.value =
    spawnZTag && spawnZTag.value !== undefined ? spawnZTag.value : 0;

  const randomSeedTag = inner.RandomSeed;
  const seedNum = longToNumberOrLowPart(randomSeedTag);
  worldSeedInput.value = seedNum !== 0 ? String(seedNum) : "";

  const versionTag = inner.Version?.value;
  if (versionTag) {
    const name = versionTag.Name?.value;
    const id = versionTag.Id?.value;
    versionInfoSpan.textContent = name ? `Versão: ${name} (Id ${id})` : "";
  } else {
    versionInfoSpan.textContent = "";
  }

  const lastPlayedTag = inner.LastPlayed;
  if (lastPlayedTag) {
    const millis = longToNumberOrLowPart(lastPlayedTag);
    if (millis) {
      const d = new Date(millis);
      lastPlayedInfoSpan.textContent = "Último jogo: " + d.toLocaleString();
    } else {
      lastPlayedInfoSpan.textContent = "";
    }
  } else {
    lastPlayedInfoSpan.textContent = "";
  }

  // dias jogados aproximados (Time em ticks, 24000 = 1 dia)
  const timeTicksTag = inner.Time;
  if (timeTicksTag) {
    const ticks = longToNumberOrLowPart(timeTicksTag);
    const days = Math.floor(ticks / 24000);
    playTimeInfoSpan.textContent = `Tempo jogado ~ ${days} dia(s) in-game`;
  } else {
    playTimeInfoSpan.textContent = "";
  }

  rawTextarea.value = JSON.stringify(data, null, 2);
}

async function readLevelAndLoad(levelDatPath) {
  if (!levelDatPath) return;
  currentLevelDatPath = levelDatPath;

  worldPathDiv.textContent = shortenPath(levelDatPath);
  setStatus("Carregando level.dat…");

  try {
    const data = await window.mcApi.readLevelDat(levelDatPath);
    currentLevelData = data;
    loadFieldsFromNbt(data);
    setButtonsEnabled(true);
    setStatus("Arquivo carregado com sucesso.", "ok");
  } catch (err) {
    console.error(err);
    setButtonsEnabled(false);
    setStatus("Erro ao ler level.dat: " + err.message, "error");
  }
}

// presets

function applyPresetCreativeDay() {
  gameModeSelect.value = "1"; // creative
  difficultySelect.value = "1"; // easy
  hardcoreCheck.checked = false;
  allowCommandsCheck.checked = true;
  rainingCheck.checked = false;
  thunderingCheck.checked = false;

  const t = 1000; // manhã
  dayTimeInput.value = t;
  if (dayTimeSlider) dayTimeSlider.value = t;

  setStatus(
    "Preset aplicado: Criativo, dia limpo, comandos ativados. Clique em salvar para gravar no level.dat.",
    "ok"
  );
}

function applyPresetSurvivalNightStorm() {
  gameModeSelect.value = "0"; // survival
  difficultySelect.value = "3"; // hard
  hardcoreCheck.checked = true;
  allowCommandsCheck.checked = false;
  rainingCheck.checked = true;
  thunderingCheck.checked = true;

  const t = 14000; // noite
  dayTimeInput.value = t;
  if (dayTimeSlider) dayTimeSlider.value = t;

  setStatus(
    "Preset aplicado: Survival hard, noite chuvosa e hardcore. Clique em salvar para gravar no level.dat.",
    "ok"
  );
}

function applyPresetTestWorld() {
  gameModeSelect.value = "1"; // creative
  difficultySelect.value = "0"; // peaceful
  hardcoreCheck.checked = false;
  allowCommandsCheck.checked = true;
  rainingCheck.checked = false;
  thunderingCheck.checked = false;

  const t = 6000; // meio-dia
  dayTimeInput.value = t;
  if (dayTimeSlider) dayTimeSlider.value = t;

  spawnXInput.value = 0;
  spawnYInput.value = 100;
  spawnZInput.value = 0;

  setStatus(
    "Preset aplicado: Mundo de teste (creative, peaceful, spawn central). Clique em salvar para gravar no level.dat.",
    "ok"
  );
}

function markDirty() {
  if (!currentLevelDatPath) return;
  if (isReadonly) return;
  setStatus(
    "Você fez alterações locais. Clique em salvar para gravar no level.dat.",
    "idle"
  );
}

// listeners UI

selectWorldBtn.addEventListener("click", async () => {
  try {
    const file = await window.mcApi.selectLevelDatFile();
    if (!file) {
      setStatus("Seleção de arquivo cancelada.");
      return;
    }
    await readLevelAndLoad(file);
  } catch (err) {
    console.error(err);
    setStatus("Erro ao selecionar arquivo.", "error");
  }
});

reloadBtn.addEventListener("click", async () => {
  if (!currentLevelDatPath) return;
  await readLevelAndLoad(currentLevelDatPath);
});

saveBtn.addEventListener("click", async () => {
  if (!currentLevelDatPath || !currentLevelData) return;
  if (isReadonly) {
    setStatus(
      "Modo somente leitura está ativo. Desative para salvar.",
      "error"
    );
    return;
  }

  ensureDataRoot();
  const inner = currentLevelData.Data.value;

  inner.LevelName = {
    type: "string",
    value: levelNameInput.value,
  };

  inner.GameType = {
    type: "int",
    value: parseInt(gameModeSelect.value, 10),
  };

  inner.Difficulty = {
    type: "byte",
    value: parseInt(difficultySelect.value, 10),
  };

  inner.hardcore = {
    type: "byte",
    value: hardcoreCheck.checked ? 1 : 0,
  };

  inner.raining = {
    type: "byte",
    value: rainingCheck.checked ? 1 : 0,
  };

  inner.thundering = {
    type: "byte",
    value: thunderingCheck.checked ? 1 : 0,
  };

  inner.allowCommands = {
    type: "byte",
    value: allowCommandsCheck.checked ? 1 : 0,
  };

  let dayTime = parseInt(dayTimeInput.value, 10);
  if (isNaN(dayTime)) dayTime = 0;
  if (dayTime < 0) dayTime = 0;
  if (dayTime > 24000) dayTime = 24000;

  const existingDayTime = inner.DayTime;
  if (existingDayTime && Array.isArray(existingDayTime.value)) {
    existingDayTime.value[1] = dayTime;
  } else {
    inner.DayTime = {
      type: "long",
      value: [0, dayTime],
    };
  }

  const sx = parseInt(spawnXInput.value, 10);
  const sy = parseInt(spawnYInput.value, 10);
  const sz = parseInt(spawnZInput.value, 10);

  inner.SpawnX = {
    type: "int",
    value: Number.isNaN(sx) ? 0 : sx,
  };
  inner.SpawnY = {
    type: "int",
    value: Number.isNaN(sy) ? 64 : sy,
  };
  inner.SpawnZ = {
    type: "int",
    value: Number.isNaN(sz) ? 0 : sz,
  };

  const seedText = worldSeedInput.value.trim();
  if (seedText !== "") {
    const seedNum = Number(seedText);
    if (!Number.isNaN(seedNum)) {
      inner.RandomSeed = {
        type: "long",
        value: [0, seedNum],
      };
    }
  }

  rawTextarea.value = JSON.stringify(currentLevelData, null, 2);

  try {
    setStatus("Salvando (criando backup)…");
    await window.mcApi.writeLevelDat({
      levelDatPath: currentLevelDatPath,
      newData: currentLevelData,
    });
    setStatus("Salvo com sucesso! Um backup foi criado na mesma pasta.", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Erro ao salvar: " + e.message, "error");
  }
});

// sincronizar slider <-> input
if (dayTimeSlider) {
  dayTimeSlider.addEventListener("input", () => {
    dayTimeInput.value = dayTimeSlider.value;
    markDirty();
  });
}

dayTimeInput.addEventListener("input", () => {
  let val = parseInt(dayTimeInput.value, 10);
  if (isNaN(val)) val = 0;
  if (val < 0) val = 0;
  if (val > 24000) val = 24000;
  dayTimeInput.value = val;
  if (dayTimeSlider) {
    dayTimeSlider.value = val;
  }
  markDirty();
});

// presets eventos
presetCreativeDayBtn.addEventListener("click", () => {
  if (!currentLevelDatPath) {
    setStatus("Abra um level.dat antes de aplicar um preset.", "error");
    return;
  }
  applyPresetCreativeDay();
});

presetSurvivalNightStormBtn.addEventListener("click", () => {
  if (!currentLevelDatPath) {
    setStatus("Abra um level.dat antes de aplicar um preset.", "error");
    return;
  }
  applyPresetSurvivalNightStorm();
});

presetTestWorldBtn.addEventListener("click", () => {
  if (!currentLevelDatPath) {
    setStatus("Abra um level.dat antes de aplicar um preset.", "error");
    return;
  }
  applyPresetTestWorld();
});

// toggle somente leitura
toggleReadonlyBtn.addEventListener("click", () => {
  isReadonly = !isReadonly;
  applyReadonlyState();
  if (isReadonly) {
    setStatus(
      "Modo somente leitura ativado. Nada será salvo até você desativar.",
      "idle"
    );
  } else {
    setStatus("Edição ativa. Lembre-se de salvar após alterar.", "idle");
  }
});

// marcar dirty quando qualquer campo muda
[
  levelNameInput,
  gameModeSelect,
  difficultySelect,
  hardcoreCheck,
  rainingCheck,
  thunderingCheck,
  allowCommandsCheck,
  spawnXInput,
  spawnYInput,
  spawnZInput,
  worldSeedInput,
].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", markDirty);
  el.addEventListener("input", markDirty);
});

// estado inicial
setButtonsEnabled(false);
setStatus("Nenhum arquivo carregado.");
worldPathDiv.textContent = "Nenhum arquivo selecionado";

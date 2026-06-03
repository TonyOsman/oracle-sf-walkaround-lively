(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const minimap = document.getElementById("minimap");
  const mctx = minimap.getContext("2d");
  const hud = document.getElementById("hud");
  const placeName = document.getElementById("placeName");
  const hotspotTitle = document.getElementById("hotspotTitle");
  const hotspotMeta = document.getElementById("hotspotMeta");
  const signalValue = document.getElementById("signalValue");
  const areaValue = document.getElementById("areaValue");
  const paceValue = document.getElementById("paceValue");
  const locationCard = document.getElementById("locationCard");

  const TILE_W = 86;
  const TILE_H = 43;
  const WORLD = 40;
  const Z = 26;

  const themes = {
    day: {
      skyTop: "#8fc9e8",
      skyMid: "#d8edf1",
      skyLow: "#f8d9bc",
      bay: "#4d9ab5",
      bayDeep: "#1d617e",
      fog: "rgba(255,255,255,0.22)",
      ground: "#756554",
      grass: "#5f7d5c",
      plaza: "#a48268",
      road: "#3d3c3b",
      glow: "#ff725c",
      shadow: "rgba(45, 29, 20, 0.28)",
      night: 0,
    },
    sunset: {
      skyTop: "#241319",
      skyMid: "#773127",
      skyLow: "#f0a35d",
      bay: "#2d6d78",
      bayDeep: "#153946",
      fog: "rgba(255,205,173,0.16)",
      ground: "#685044",
      grass: "#4b624c",
      plaza: "#93684f",
      road: "#302a29",
      glow: "#ff705b",
      shadow: "rgba(0, 0, 0, 0.36)",
      night: 0.35,
    },
    night: {
      skyTop: "#05070d",
      skyMid: "#101522",
      skyLow: "#2b1719",
      bay: "#173848",
      bayDeep: "#071d2b",
      fog: "rgba(172,210,228,0.12)",
      ground: "#4d463d",
      grass: "#354a3a",
      plaza: "#675243",
      road: "#17191d",
      glow: "#ff725c",
      shadow: "rgba(0, 0, 0, 0.54)",
      night: 1,
    },
    fog: {
      skyTop: "#9ca6ad",
      skyMid: "#c8c5ba",
      skyLow: "#e2d4c4",
      bay: "#789aa0",
      bayDeep: "#4f737a",
      fog: "rgba(242,242,235,0.34)",
      ground: "#746d63",
      grass: "#657763",
      plaza: "#a48e79",
      road: "#47494a",
      glow: "#d85d4a",
      shadow: "rgba(50, 52, 54, 0.22)",
      night: 0.15,
    },
  };

  const settings = {
    timeOfDay: "sunset",
    zoom: 0.96,
    ambient: 1,
    crowdDensity: 0.85,
    showTraffic: true,
    showHud: true,
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    last: performance.now(),
    time: 0,
    camera: { x: 0, y: 0 },
    keys: new Set(),
    pointer: { x: 0, y: 0, worldX: 20, worldY: 22, down: false },
    player: {
      x: 19.4,
      y: 22.5,
      z: 0,
      dir: 0,
      target: null,
      walking: false,
      step: 0,
      speed: 4.2,
    },
    activeSpot: "plaza",
    hoveredSpot: null,
    crowd: [],
    vehicles: [],
    particles: [],
    splashes: [],
  };

  const hotspots = [
    {
      id: "plaza",
      label: "Redwood Visitor Plaza",
      meta: "Lobby lights, bay air, and moving data streams.",
      x: 19.2,
      y: 22.1,
      color: "#ff705b",
      area: "Atrium",
    },
    {
      id: "park",
      label: "Waterfront Ballpark Gate",
      meta: "Curved arcade, copper signs, and animated promenade lights.",
      x: 18.1,
      y: 10.8,
      color: "#f2a65d",
      area: "Gate",
    },
    {
      id: "data",
      label: "Autonomous Data Hall",
      meta: "A glass pavilion with pulsing database cores.",
      x: 12.3,
      y: 17.2,
      color: "#ff806d",
      area: "Data",
    },
    {
      id: "cloud",
      label: "Cloud Operations Tower",
      meta: "Rooftop antennas paint telemetry across the plaza.",
      x: 26.4,
      y: 16.5,
      color: "#51c9bd",
      area: "Cloud",
    },
    {
      id: "agents",
      label: "AI Agents Studio",
      meta: "Small agent drones trace paths between the labs.",
      x: 27.7,
      y: 25.6,
      color: "#9d8cff",
      area: "AI",
    },
    {
      id: "cove",
      label: "Bay Lookout",
      meta: "Fog rolls in over water taxis and pier lights.",
      x: 8.4,
      y: 8.8,
      color: "#64d5ff",
      area: "Bay",
    },
    {
      id: "security",
      label: "Trust Gate",
      meta: "A quiet checkpoint guarding the campus promenade.",
      x: 31.2,
      y: 20.8,
      color: "#ffffff",
      area: "Trust",
    },
  ];

  const structures = [
    { type: "stadium", x: 14.2, y: 7.4, w: 8.4, d: 5.6, h: 2.2, label: "Waterfront Gate" },
    { type: "building", x: 9.8, y: 14.2, w: 5.1, d: 4.0, h: 4.4, label: "Data Hall", accent: "#ff705b" },
    { type: "building", x: 24.0, y: 13.2, w: 5.2, d: 4.5, h: 5.8, label: "Cloud Tower", accent: "#51c9bd" },
    { type: "building", x: 25.8, y: 23.2, w: 4.3, d: 3.8, h: 3.4, label: "Agent Studio", accent: "#9d8cff" },
    { type: "building", x: 30.5, y: 17.8, w: 3.6, d: 3.0, h: 3.0, label: "Trust Gate", accent: "#ffffff" },
    { type: "pavilion", x: 16.2, y: 19.4, w: 6.0, d: 4.0, h: 2.0, label: "Visitor Plaza", accent: "#f2a65d" },
  ];

  const treeSpots = [
    [7, 14], [8, 17], [10, 22], [12, 25], [15, 27], [19, 27], [22, 26], [31, 24], [33, 21],
    [28, 12], [24, 11], [12, 10], [7, 10], [5, 16], [35, 17], [34, 27], [29, 29], [17, 31],
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(a, b, c, d) {
    return Math.hypot(a - c, b - d);
  }

  function noise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function theme() {
    return themes[settings.timeOfDay] || themes.sunset;
  }

  function projectRaw(x, y) {
    return {
      x: (x - y) * (TILE_W / 2),
      y: (x + y) * (TILE_H / 2),
    };
  }

  function worldToScreen(x, y, z = 0) {
    const p = projectRaw(x, y);
    return {
      x: state.width / 2 + (p.x - state.camera.x) * settings.zoom,
      y: state.height * 0.56 + (p.y - state.camera.y) * settings.zoom - z * Z * settings.zoom,
    };
  }

  function screenToWorld(x, y) {
    const px = (x - state.width / 2) / settings.zoom + state.camera.x;
    const py = (y - state.height * 0.56) / settings.zoom + state.camera.y;
    return {
      x: (py / (TILE_H / 2) + px / (TILE_W / 2)) / 2,
      y: (py / (TILE_H / 2) - px / (TILE_W / 2)) / 2,
    };
  }

  function diamondPath(x, y) {
    const a = worldToScreen(x, y);
    const b = worldToScreen(x + 1, y);
    const c = worldToScreen(x + 1, y + 1);
    const d = worldToScreen(x, y + 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
  }

  function roundedRect(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function tileType(x, y) {
    if (x < 3 || y < 5 || (x < 10 && y < 9)) return "bay";
    if (x < 7 && y < 13) return "pier";
    if ((x > 5 && x < 35 && Math.abs(y - 21) < 1.4) || (y > 7 && y < 35 && Math.abs(x - 19) < 1.25)) return "walk";
    if (x > 14 && x < 24 && y > 18 && y < 25) return "plaza";
    if (x > 13 && x < 24 && y > 7 && y < 13) return "promenade";
    if ((x + y) % 13 < 2 && y > 12) return "grass";
    return "ground";
  }

  function isInsideStructure(x, y) {
    for (const s of structures) {
      if (s.type === "pavilion" || s.type === "stadium") continue;
      if (x > s.x - 0.15 && x < s.x + s.w + 0.15 && y > s.y - 0.15 && y < s.y + s.d + 0.15) return true;
    }
    return false;
  }

  function walkable(x, y) {
    if (x < 3.2 || x > WORLD - 2 || y < 5.2 || y > WORLD - 2) return false;
    if (tileType(Math.floor(x), Math.floor(y)) === "bay") return false;
    return !isInsideStructure(x, y);
  }

  function nearestWalkable(x, y) {
    if (walkable(x, y)) return { x, y };
    let best = null;
    let bestD = Infinity;
    for (let r = 1; r <= 7; r += 1) {
      for (let ix = -r; ix <= r; ix += 1) {
        for (let iy = -r; iy <= r; iy += 1) {
          const nx = clamp(Math.round(x + ix) + 0.5, 0, WORLD - 1);
          const ny = clamp(Math.round(y + iy) + 0.5, 0, WORLD - 1);
          if (!walkable(nx, ny)) continue;
          const d = dist(x, y, nx, ny);
          if (d < bestD) {
            bestD = d;
            best = { x: nx, y: ny };
          }
        }
      }
      if (best) return best;
    }
    return { x: state.player.x, y: state.player.y };
  }

  function parseLivelyValue(value) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  function setHudVisible(visible) {
    settings.showHud = Boolean(visible);
    hud.classList.toggle("hidden", !settings.showHud);
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, window.innerWidth);
    state.height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const p = projectRaw(state.player.x, state.player.y);
    state.camera.x = p.x;
    state.camera.y = p.y;
  }

  function resetCrowd() {
    const count = Math.round(18 * settings.crowdDensity);
    state.crowd = [];
    for (let i = 0; i < count; i += 1) {
      let x = 8 + Math.random() * 26;
      let y = 10 + Math.random() * 22;
      const near = nearestWalkable(x, y);
      x = near.x;
      y = near.y;
      state.crowd.push({
        x,
        y,
        tx: x,
        ty: y,
        color: i % 3 === 0 ? "#ff705b" : i % 3 === 1 ? "#f2a65d" : "#51c9bd",
        delay: Math.random() * 2,
        step: Math.random() * Math.PI * 2,
      });
    }
  }

  function resetAmbient() {
    state.vehicles = [
      { t: 0.04, color: "#c74634", offset: 0 },
      { t: 0.52, color: "#f2a65d", offset: 0.45 },
    ];
    state.particles = Array.from({ length: 76 }, (_, i) => ({
      spot: hotspots[i % hotspots.length],
      phase: Math.random() * Math.PI * 2,
      radius: 1.1 + Math.random() * 3.6,
      speed: 0.35 + Math.random() * 0.85,
      z: 1.2 + Math.random() * 3.2,
    }));
    resetCrowd();
  }

  function drawSky(t, th) {
    const sky = ctx.createLinearGradient(0, 0, 0, state.height);
    sky.addColorStop(0, th.skyTop);
    sky.addColorStop(0.5, th.skyMid);
    sky.addColorStop(1, th.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, state.width, state.height);

    const sunX = state.width * (settings.timeOfDay === "day" ? 0.72 : 0.18);
    const sunY = state.height * (settings.timeOfDay === "night" ? 0.16 : 0.24);
    const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, state.width * 0.28);
    sun.addColorStop(0, settings.timeOfDay === "night" ? "rgba(194,211,255,0.5)" : "rgba(255,225,173,0.75)");
    sun.addColorStop(1, "rgba(255,225,173,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, state.width, state.height * 0.72);

    drawBridge(t, th);
    drawSkyline(th);
    drawFog(t, th, 0.55);
  }

  function drawBridge(t, th) {
    const y = state.height * 0.28;
    ctx.save();
    ctx.globalAlpha = 0.28 + th.night * 0.18;
    ctx.strokeStyle = settings.timeOfDay === "fog" ? "rgba(80,85,90,0.56)" : "rgba(255,185,140,0.44)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.width * 0.46, y + 36);
    ctx.bezierCurveTo(state.width * 0.58, y - 46, state.width * 0.74, y - 42, state.width * 0.9, y + 34);
    ctx.stroke();
    for (let i = 0; i < 2; i += 1) {
      const x = state.width * (0.55 + i * 0.24);
      ctx.fillStyle = "rgba(40,31,30,0.42)";
      ctx.fillRect(x - 5, y - 48, 10, 112);
      for (let k = 0; k < 5; k += 1) {
        ctx.beginPath();
        ctx.moveTo(x, y - 28 + k * 17);
        ctx.lineTo(x - 52 + k * 5, y + 58);
        ctx.moveTo(x, y - 28 + k * 17);
        ctx.lineTo(x + 52 - k * 5, y + 58);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 0.12 + th.night * 0.18;
    ctx.strokeStyle = "#ffe0bf";
    ctx.beginPath();
    ctx.moveTo(0, y + 68 + Math.sin(t * 0.2) * 4);
    ctx.lineTo(state.width, y + 62 + Math.cos(t * 0.16) * 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawSkyline(th) {
    ctx.save();
    const base = state.height * 0.39;
    ctx.fillStyle = settings.timeOfDay === "day" ? "rgba(64,70,74,0.28)" : "rgba(16,13,15,0.42)";
    for (let i = 0; i < 18; i += 1) {
      const x = i * state.width / 17 - 18;
      const w = 28 + noise(i, 2) * 38;
      const h = 36 + noise(i, 9) * 86;
      ctx.fillRect(x, base - h, w, h);
      if (th.night > 0.3) {
        ctx.fillStyle = "rgba(255,199,116,0.42)";
        for (let wy = 0; wy < h - 12; wy += 16) {
          if (noise(i, wy) > 0.55) ctx.fillRect(x + 7, base - h + 8 + wy, 3, 5);
        }
        ctx.fillStyle = settings.timeOfDay === "day" ? "rgba(64,70,74,0.28)" : "rgba(16,13,15,0.42)";
      }
    }
    ctx.restore();
  }

  function drawFog(t, th, strength = 1) {
    ctx.save();
    for (let i = 0; i < 4; i += 1) {
      const y = state.height * (0.28 + i * 0.11);
      const x = ((t * (12 + i * 6) * settings.ambient + i * 220) % (state.width + 280)) - 180;
      const fog = ctx.createLinearGradient(x - 160, y, x + 260, y);
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(0.5, th.fog);
      fog.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = strength * (settings.timeOfDay === "fog" ? 0.95 : 0.5);
      ctx.fillStyle = fog;
      ctx.fillRect(x - 180, y - 18, 520, 40 + i * 8);
    }
    ctx.restore();
  }

  function tileColor(type, x, y, th) {
    const n = noise(x, y);
    if (type === "bay") return n > 0.5 ? th.bay : th.bayDeep;
    if (type === "pier") return n > 0.45 ? "#77614d" : "#604d3f";
    if (type === "walk") return n > 0.35 ? "#9f7258" : "#8d664f";
    if (type === "plaza") return n > 0.45 ? th.plaza : "#7e5c49";
    if (type === "promenade") return "#8f6b52";
    if (type === "grass") return n > 0.45 ? th.grass : "#465a45";
    return n > 0.5 ? th.ground : "#5f5147";
  }

  function drawTile(x, y, th) {
    const type = tileType(x, y);
    diamondPath(x, y);
    ctx.fillStyle = tileColor(type, x, y, th);
    ctx.fill();
    ctx.strokeStyle = type === "bay" ? "rgba(226,255,255,0.07)" : "rgba(255,230,210,0.075)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (type === "bay") {
      const p = worldToScreen(x + 0.5, y + 0.5);
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#d9ffff";
      ctx.beginPath();
      ctx.moveTo(p.x - 28 * settings.zoom, p.y);
      ctx.quadraticCurveTo(p.x, p.y - 6 * settings.zoom, p.x + 28 * settings.zoom, p.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawWorldBase(th) {
    for (let y = 0; y < WORLD; y += 1) {
      for (let x = 0; x < WORLD; x += 1) {
        drawTile(x, y, th);
      }
    }
  }

  function drawPrism(s, th) {
    const a = worldToScreen(s.x, s.y, 0);
    const b = worldToScreen(s.x + s.w, s.y, 0);
    const c = worldToScreen(s.x + s.w, s.y + s.d, 0);
    const d = worldToScreen(s.x, s.y + s.d, 0);
    const at = worldToScreen(s.x, s.y, s.h);
    const bt = worldToScreen(s.x + s.w, s.y, s.h);
    const ct = worldToScreen(s.x + s.w, s.y + s.d, s.h);
    const dt = worldToScreen(s.x, s.y + s.d, s.h);
    const accent = s.accent || "#ff705b";

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.moveTo(a.x + 8, a.y + 12);
    ctx.lineTo(b.x + 12, b.y + 10);
    ctx.lineTo(c.x + 18, c.y + 18);
    ctx.lineTo(d.x + 12, d.y + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = th.night > 0.8 ? "#18191d" : "#332823";
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(ct.x, ct.y);
    ctx.lineTo(bt.x, bt.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = th.night > 0.8 ? "#242126" : "#4a342b";
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(ct.x, ct.y);
    ctx.lineTo(dt.x, dt.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = th.night > 0.8 ? "#2d2930" : "#765142";
    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(bt.x, bt.y);
    ctx.lineTo(ct.x, ct.y);
    ctx.lineTo(dt.x, dt.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,232,218,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(bt.x, bt.y);
    ctx.lineTo(ct.x, ct.y);
    ctx.stroke();

    const floors = Math.max(2, Math.floor(s.h * 1.2));
    for (let i = 1; i < floors; i += 1) {
      const z = (s.h / floors) * i;
      const left = worldToScreen(s.x + s.w, s.y + 0.3, z);
      const right = worldToScreen(s.x + s.w, s.y + s.d - 0.3, z);
      ctx.globalAlpha = th.night > 0.5 ? 0.55 : 0.28;
      ctx.strokeStyle = th.night > 0.5 ? "rgba(255,201,117,0.72)" : "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPavilion(s, th) {
    drawPrism(s, th);
    const center = worldToScreen(s.x + s.w / 2, s.y + s.d / 2, s.h + 0.7);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = s.accent;
    ctx.lineWidth = 3 * settings.zoom;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 8 * settings.zoom, 82 * settings.zoom, 24 * settings.zoom, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStadium(s, th) {
    const center = worldToScreen(s.x + s.w / 2, s.y + s.d / 2, 0.25);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(center.x + 12, center.y + 18, 210 * settings.zoom, 78 * settings.zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = th.night > 0.7 ? "#2e2327" : "#7a4e3f";
    ctx.strokeStyle = "#ff826d";
    ctx.lineWidth = 2 * settings.zoom;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, 190 * settings.zoom, 72 * settings.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = th.night > 0.7 ? "#1a2020" : "#456a53";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 4 * settings.zoom, 126 * settings.zoom, 44 * settings.zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,231,218,0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, (150 + i * 5) * settings.zoom, (54 + i * 2) * settings.zoom, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTree(x, y, seed, th) {
    const base = worldToScreen(x, y, 0);
    const sway = Math.sin(state.time * 0.0012 * settings.ambient + seed) * 2;
    ctx.save();
    ctx.fillStyle = th.shadow;
    ctx.beginPath();
    ctx.ellipse(base.x + 4, base.y + 5, 17 * settings.zoom, 7 * settings.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5d3927";
    ctx.lineWidth = 4 * settings.zoom;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x + sway, base.y - 28 * settings.zoom);
    ctx.stroke();
    const top = { x: base.x + sway, y: base.y - 36 * settings.zoom };
    const foliage = ctx.createRadialGradient(top.x - 5, top.y - 4, 4, top.x, top.y, 28 * settings.zoom);
    foliage.addColorStop(0, "#88a96f");
    foliage.addColorStop(1, "#3e6a43");
    ctx.fillStyle = foliage;
    ctx.beginPath();
    ctx.arc(top.x, top.y, 19 * settings.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,255,210,0.18)";
    ctx.beginPath();
    ctx.arc(top.x - 6 * settings.zoom, top.y - 7 * settings.zoom, 7 * settings.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHotspot(spot, th) {
    const p = worldToScreen(spot.x, spot.y, 0.05);
    const active = state.activeSpot === spot.id;
    const hover = state.hoveredSpot === spot.id;
    const pulse = 1 + Math.sin(state.time * 0.004 * settings.ambient + spot.x) * 0.08;
    ctx.save();
    ctx.strokeStyle = spot.color;
    ctx.lineWidth = active ? 3 : 2;
    ctx.globalAlpha = active ? 0.88 : hover ? 0.72 : 0.42;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, (32 * pulse + (active ? 8 : 0)) * settings.zoom, (14 * pulse + (active ? 4 : 0)) * settings.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = spot.color;
    ctx.globalAlpha = active ? 0.9 : 0.52;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2 * settings.zoom, (4 + (active ? 1.5 : 0)) * settings.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const particle of state.particles) {
      const orbit = state.time * 0.001 * particle.speed * settings.ambient + particle.phase;
      const x = particle.spot.x + Math.cos(orbit) * particle.radius;
      const y = particle.spot.y + Math.sin(orbit * 0.82) * particle.radius * 0.62;
      const p = worldToScreen(x, y, particle.z + Math.sin(orbit * 2) * 0.2);
      ctx.globalAlpha = 0.34 + Math.sin(orbit) * 0.16;
      ctx.fillStyle = particle.spot.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 * settings.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStreetcar(vehicle, th) {
    if (!settings.showTraffic) return;
    const route = [
      { x: 6, y: 21.2 },
      { x: 13, y: 21.2 },
      { x: 19, y: 21.2 },
      { x: 26, y: 21.2 },
      { x: 34, y: 21.2 },
    ];
    const scaled = (vehicle.t + state.time * 0.000045 * settings.ambient + vehicle.offset) % 1;
    const span = (route.length - 1) * scaled;
    const i = Math.floor(span);
    const local = span - i;
    const a = route[i];
    const b = route[Math.min(i + 1, route.length - 1)];
    const x = lerp(a.x, b.x, local);
    const y = lerp(a.y, b.y, local);
    const p = worldToScreen(x, y, 0.3);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(settings.zoom, settings.zoom);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(6, 16, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = vehicle.color;
    roundedRect(ctx, -26, -18, 52, 28, 5);
    ctx.fill();
    ctx.fillStyle = "#f7d5a8";
    for (let k = 0; k < 4; k += 1) ctx.fillRect(-19 + k * 10, -12, 6, 8);
    ctx.strokeStyle = "#2b1714";
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -18, 52, 28);
    ctx.fillStyle = "#27201f";
    ctx.beginPath();
    ctx.arc(-14, 12, 4, 0, Math.PI * 2);
    ctx.arc(15, 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPerson(person, isPlayer = false) {
    const p = worldToScreen(person.x, person.y, person.z || 0);
    const bob = Math.sin((person.step || 0) * 9) * (isPlayer && state.player.walking ? 2 : 0);
    const dir = person.dir || 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(settings.zoom, settings.zoom);

    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(3, 12, isPlayer ? 16 : 10, isPlayer ? 7 : 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const coat = isPlayer ? "#c74634" : person.color;
    ctx.strokeStyle = "#1e1513";
    ctx.lineWidth = isPlayer ? 3 : 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-8 - Math.sin(person.step || 0) * 3, 13);
    ctx.moveTo(4, 2);
    ctx.lineTo(8 + Math.sin(person.step || 0) * 3, 13);
    ctx.stroke();

    ctx.fillStyle = coat;
    roundedRect(ctx, isPlayer ? -10 : -6, isPlayer ? -21 : -14, isPlayer ? 20 : 12, isPlayer ? 25 : 17, isPlayer ? 7 : 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.stroke();

    ctx.fillStyle = "#f1c29f";
    ctx.beginPath();
    ctx.arc(0, isPlayer ? -28 : -19, isPlayer ? 8 : 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#231716";
    ctx.beginPath();
    ctx.arc(Math.cos(dir) * 2.5, (isPlayer ? -30 : -20) + Math.sin(dir) * 1.5, isPlayer ? 2.2 : 1.4, 0, Math.PI * 2);
    ctx.fill();

    if (isPlayer) {
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -8, 16, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorldObjects(th) {
    const list = [];
    for (const s of structures) list.push({ sort: s.x + s.y + s.w + s.d, draw: () => s.type === "stadium" ? drawStadium(s, th) : s.type === "pavilion" ? drawPavilion(s, th) : drawPrism(s, th) });
    treeSpots.forEach((t, i) => list.push({ sort: t[0] + t[1] + 0.2, draw: () => drawTree(t[0] + 0.5, t[1] + 0.6, i, th) }));
    state.vehicles.forEach((v) => list.push({ sort: 43, draw: () => drawStreetcar(v, th) }));
    state.crowd.forEach((p) => list.push({ sort: p.x + p.y + 0.1, draw: () => drawPerson(p, false) }));
    list.push({ sort: state.player.x + state.player.y + 0.3, draw: () => drawPerson(state.player, true) });
    list.sort((a, b) => a.sort - b.sort);
    for (const item of list) item.draw();
  }

  function drawWorldLabels() {
    const spot = hotspots.find((h) => h.id === state.hoveredSpot || h.id === state.activeSpot);
    if (!spot || !settings.showHud) return;
    const p = worldToScreen(spot.x, spot.y, 1.15);
    ctx.save();
    ctx.font = `700 ${13 * settings.zoom}px Segoe UI, Arial, sans-serif`;
    const w = ctx.measureText(spot.label).width + 26 * settings.zoom;
    const h = 28 * settings.zoom;
    roundedRect(ctx, p.x - w / 2, p.y - h - 12 * settings.zoom, w, h, 7 * settings.zoom);
    ctx.fillStyle = "rgba(14,10,9,0.82)";
    ctx.fill();
    ctx.strokeStyle = spot.color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#fff2eb";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spot.label, p.x, p.y - h / 2 - 12 * settings.zoom);
    ctx.restore();
  }

  function drawTargetMarker() {
    if (!state.player.target) return;
    const p = worldToScreen(state.player.target.x, state.player.target.y, 0.04);
    const pulse = 1 + Math.sin(state.time * 0.008) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#fff3ed";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 18 * pulse * settings.zoom, 8 * pulse * settings.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimap() {
    const w = minimap.width;
    const h = minimap.height;
    const th = theme();
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = "rgba(13,10,10,0.92)";
    mctx.fillRect(0, 0, w, h);
    for (let y = 0; y < WORLD; y += 1) {
      for (let x = 0; x < WORLD; x += 1) {
        const type = tileType(x, y);
        if (type === "bay") mctx.fillStyle = th.bayDeep;
        else if (type === "walk" || type === "plaza") mctx.fillStyle = "#a56b52";
        else if (type === "grass") mctx.fillStyle = "#456a43";
        else mctx.fillStyle = "rgba(255,230,210,0.08)";
        mctx.fillRect((x / WORLD) * w, (y / WORLD) * h, Math.ceil(w / WORLD), Math.ceil(h / WORLD));
      }
    }
    for (const spot of hotspots) {
      mctx.fillStyle = spot.color;
      mctx.beginPath();
      mctx.arc((spot.x / WORLD) * w, (spot.y / WORLD) * h, 2.6, 0, Math.PI * 2);
      mctx.fill();
    }
    mctx.strokeStyle = "#fff3ed";
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.arc((state.player.x / WORLD) * w, (state.player.y / WORLD) * h, 4, 0, Math.PI * 2);
    mctx.stroke();
  }

  function drawFrame() {
    const th = theme();
    const t = state.time * 0.001;
    drawSky(t, th);
    drawWorldBase(th);
    for (const spot of hotspots) drawHotspot(spot, th);
    drawTargetMarker();
    drawParticles();
    drawWorldObjects(th);
    drawWorldLabels();
    drawFog(t + 20, th, settings.timeOfDay === "fog" ? 0.72 : 0.18);
    drawMinimap();
  }

  function updatePlayer(dt) {
    const p = state.player;
    let dx = 0;
    let dy = 0;
    if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) dy -= 1;
    if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) dy += 1;
    if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) dx -= 1;
    if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) dx += 1;

    if (dx || dy) {
      p.target = null;
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
    } else if (p.target) {
      dx = p.target.x - p.x;
      dy = p.target.y - p.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.12) {
        p.target = null;
        dx = 0;
        dy = 0;
      } else {
        dx /= length;
        dy /= length;
      }
    }

    p.walking = Boolean(dx || dy);
    if (p.walking) {
      const speed = p.speed * dt;
      const nx = p.x + dx * speed;
      const ny = p.y + dy * speed;
      if (walkable(nx, ny)) {
        p.x = nx;
        p.y = ny;
      } else {
        if (walkable(nx, p.y)) p.x = nx;
        if (walkable(p.x, ny)) p.y = ny;
      }
      p.dir = Math.atan2(dy, dx);
      p.step += dt * 7.2;
    }

    const cameraTarget = projectRaw(p.x, p.y);
    state.camera.x = lerp(state.camera.x, cameraTarget.x, 1 - Math.pow(0.002, dt));
    state.camera.y = lerp(state.camera.y, cameraTarget.y, 1 - Math.pow(0.002, dt));
  }

  function updateCrowd(dt) {
    for (const person of state.crowd) {
      person.delay -= dt * settings.ambient;
      if (person.delay <= 0 || dist(person.x, person.y, person.tx, person.ty) < 0.18) {
        const candidate = nearestWalkable(
          person.x + (Math.random() - 0.5) * 7,
          person.y + (Math.random() - 0.5) * 7
        );
        person.tx = candidate.x;
        person.ty = candidate.y;
        person.delay = 1.2 + Math.random() * 3.5;
      }
      const dx = person.tx - person.x;
      const dy = person.ty - person.y;
      const length = Math.hypot(dx, dy);
      if (length > 0.05) {
        const speed = 1.2 * dt * settings.ambient;
        person.x += (dx / length) * speed;
        person.y += (dy / length) * speed;
        person.dir = Math.atan2(dy, dx);
        person.step += dt * 5;
      }
    }
  }

  function updateHotspots() {
    let closest = null;
    let closestDistance = Infinity;
    for (const spot of hotspots) {
      const d = dist(state.player.x, state.player.y, spot.x, spot.y);
      if (d < closestDistance) {
        closestDistance = d;
        closest = spot;
      }
    }
    if (closest && closestDistance < 4.2) state.activeSpot = closest.id;

    const active = hotspots.find((spot) => spot.id === state.activeSpot) || hotspots[0];
    placeName.textContent = active.label;
    hotspotTitle.textContent = active.label;
    hotspotMeta.textContent = active.meta;
    areaValue.textContent = active.area;
    signalValue.textContent = `${Math.round(73 + Math.sin(state.time * 0.001 + active.x) * 8 + (1 - closestDistance / 6) * 12)}%`;
    paceValue.textContent = state.player.walking ? "Move" : "Idle";
    locationCard.classList.toggle("dim", closestDistance > 3.2);
  }

  function update(dt) {
    updatePlayer(dt);
    updateCrowd(dt);
    updateHotspots();
  }

  function frame(now) {
    const dt = Math.min(0.04, (now - state.last) / 1000 || 0.016);
    state.last = now;
    state.time = now;
    update(dt);
    drawFrame();
    requestAnimationFrame(frame);
  }

  function pointerWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const world = screenToWorld(x, y);
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.worldX = world.x;
    state.pointer.worldY = world.y;
    return world;
  }

  function findSpotAtScreen(x, y) {
    let found = null;
    let best = Infinity;
    for (const spot of hotspots) {
      const p = worldToScreen(spot.x, spot.y, 0.1);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < best && d < 44 * settings.zoom) {
        best = d;
        found = spot;
      }
    }
    return found;
  }

  canvas.addEventListener("pointermove", (event) => {
    const world = pointerWorld(event);
    const spot = findSpotAtScreen(state.pointer.x, state.pointer.y);
    state.hoveredSpot = spot?.id || null;
    if (state.pointer.down) {
      const target = nearestWalkable(world.x, world.y);
      state.player.target = target;
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    state.pointer.down = true;
    const world = pointerWorld(event);
    const spot = findSpotAtScreen(state.pointer.x, state.pointer.y);
    if (spot) {
      state.activeSpot = spot.id;
      state.player.target = nearestWalkable(spot.x, spot.y + 0.8);
    } else {
      state.player.target = nearestWalkable(world.x, world.y);
    }
    event.preventDefault();
  });

  canvas.addEventListener("pointerup", (event) => {
    state.pointer.down = false;
    canvas.releasePointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointercancel", () => {
    state.pointer.down = false;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      state.keys.add(event.code);
      event.preventDefault();
    }
    if (event.code === "KeyH") setHudVisible(!settings.showHud);
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.code);
  });

  window.addEventListener("resize", resize);

  window.livelyPropertyListener = function livelyPropertyListener(name, val) {
    const value = parseLivelyValue(val);
    if (name === "timeOfDay") {
      const values = ["day", "sunset", "night", "fog"];
      settings.timeOfDay = values[Number(value)] || String(value).toLowerCase();
    } else if (name === "cameraZoom") {
      settings.zoom = clamp(Number(value) / 100, 0.72, 1.3);
    } else if (name === "ambientMotion") {
      settings.ambient = clamp(Number(value) / 100, 0.25, 1.6);
    } else if (name === "crowdDensity") {
      settings.crowdDensity = clamp(Number(value) / 100, 0, 1.6);
      resetCrowd();
    } else if (name === "showTraffic") {
      settings.showTraffic = Boolean(value);
    } else if (name === "showHud") {
      setHudVisible(Boolean(value));
    }
  };

  window.__gameQa = function __gameQa() {
    return {
      player: { x: Number(state.player.x.toFixed(2)), y: Number(state.player.y.toFixed(2)) },
      target: state.player.target ? { x: Number(state.player.target.x.toFixed(2)), y: Number(state.player.target.y.toFixed(2)) } : null,
      activeSpot: state.activeSpot,
      theme: settings.timeOfDay,
      crowd: state.crowd.length,
      hudVisible: settings.showHud,
      title: hotspotTitle.textContent,
      canvas: { width: state.width, height: state.height },
    };
  };

  resize();
  resetAmbient();
  updateHotspots();
  requestAnimationFrame(frame);
})();

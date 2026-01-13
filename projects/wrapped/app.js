const yearSelect = document.getElementById("year");
const reloadBtn = document.getElementById("reload");
const backBtn = document.getElementById("backBtn");
const statusEl = document.getElementById("status");
const tracksEl = document.getElementById("tracks");
const tzMetaValueEl = document.getElementById("tzMetaValue");
const generatedAtEl = document.getElementById("generatedAt");
const topArtistsEl = document.getElementById("topArtistsRest");
const topTracksEl = document.getElementById("topTracksRest");
const topAlbumsEl = document.getElementById("topAlbumsRest");
const genreSpotlightEl = document.getElementById("genreSpotlight");
const genreTimelineCanvas = document.getElementById("genreTimelineChart");
const genreShareBarsEl = document.getElementById("genreShareBars");
const spotlightArtistsCountEl = document.getElementById("spotlightArtistsCount");
const spotlightAlbumsCountEl = document.getElementById("spotlightAlbumsCount");
const spotlightTracksCountEl = document.getElementById("spotlightTracksCount");
const spotlightArtistsDeltaEl = document.getElementById("spotlightArtistsDelta");
const spotlightAlbumsDeltaEl = document.getElementById("spotlightAlbumsDelta");
const spotlightTracksDeltaEl = document.getElementById("spotlightTracksDelta");
const discoveryArtistsPctEl = document.getElementById("discoveryArtistsPct");
const discoveryAlbumsPctEl = document.getElementById("discoveryAlbumsPct");
const discoveryTracksPctEl = document.getElementById("discoveryTracksPct");
const discoveryTopArtistEl = document.getElementById("discoveryTopArtist");
const discoveryTopAlbumEl = document.getElementById("discoveryTopAlbum");
const discoveryTopTrackEl = document.getElementById("discoveryTopTrack");
const discoveryNoteEl = document.getElementById("discoveryNote");
const byHourDotCanvas = document.getElementById("byHourDotChart");
const byMonthCompareCanvas = document.getElementById("byMonthCompareChart");
const byWeekdayCompareCanvas = document.getElementById("byWeekdayCompareChart");
const timeBestWeekdayEl = document.getElementById("timeBestWeekday");
const timeBestWeekdayPlaysEl = document.getElementById("timeBestWeekdayPlays");
const timeConsistentDayEl = document.getElementById("timeConsistentDay");
const timeConsistentDayPlaysEl = document.getElementById("timeConsistentDayPlays");
const mostPlayedHourEl = document.getElementById("mostPlayedHour");
const mostPlayedHourPlaysEl = document.getElementById("mostPlayedHourPlays");
const weekendShareEl = document.getElementById("weekendShare");
const weekdayShareEl = document.getElementById("weekdayShare");
const peakWindowEl = document.getElementById("peakWindow");
const peakWindowPlaysEl = document.getElementById("peakWindowPlays");
const consistentHourEl = document.getElementById("consistentHour");
const consistentHourPlaysEl = document.getElementById("consistentHourPlays");
const overviewStreakDaysEl = document.getElementById("overviewStreakDays");
const overviewStreakRangeEl = document.getElementById("overviewStreakRange");
const totalTimeEl = document.getElementById("totalTime");
const avgDailyEl = document.getElementById("avgDaily");
const tracksDeltaEl = document.getElementById("tracksDelta");
const timeDeltaEl = document.getElementById("timeDelta");
const avgDailyDeltaEl = document.getElementById("avgDailyDelta");
const artArtistImg = document.getElementById("artArtistImg");
const artAlbumImg = document.getElementById("artAlbumImg");
const artTrackImg = document.getElementById("artTrackImg");
const artArtistName = document.getElementById("artArtistName");
const artAlbumName = document.getElementById("artAlbumName");
const artTrackName = document.getElementById("artTrackName");
const artArtistPlays = document.getElementById("artArtistPlays");
const artAlbumPlays = document.getElementById("artAlbumPlays");
const artTrackPlays = document.getElementById("artTrackPlays");

let artistArt = new Map();
let albumArt = new Map();
let manifestLoaded = false;
let wrappedManifestPromise = null;
const wrappedCache = new Map();
let byMonthChart = null;
let byMonthCompareChart = null;
let byWeekdayCompareChart = null;
let byHourDotChart = null;
let genreTimelineChart = null;
const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekdayIndexer(items) {
  const buckets = (items || [])
    .map((item) => Number(item?.bucket))
    .filter(Number.isFinite);
  if (!buckets.length) return null;
  const hasZero = buckets.includes(0);
  const isZeroBased = hasZero;
  return (bucket) => {
    if (!Number.isFinite(bucket)) return null;
    if (isZeroBased) {
      return bucket >= 0 && bucket <= 6 ? bucket : null;
    }
    return bucket >= 1 && bucket <= 7 ? bucket - 1 : null;
  };
}

const currentYear = new Date().getFullYear();
const fallbackYearOptions = Array.from({ length: 6 }, (_, idx) => currentYear - idx);

function populateYearOptions(entries, selectedYear) {
  yearSelect.replaceChildren();
  entries.forEach(({ year, available }) => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = available ? year : `${year} (missing)`;
    if (!available) {
      opt.disabled = true;
    }
    if (available && year === selectedYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });
}

function normalizePath(p) {
  return p ? p.replace(/\\\\/g, "/") : p;
}

function formatDuration(ms) {
  if (!ms || Number.isNaN(ms)) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function formatDelta(curr, prev) {
  if (prev == null || Number.isNaN(prev)) return "";
  const diff = curr - prev;
  if (diff === 0) return "+/-0";
  const sign = diff > 0 ? "+" : "-";
  const pct = prev ? Math.round((Math.abs(diff) / prev) * 100) : 0;
  return `${sign}${Math.abs(diff).toLocaleString()} (${pct}%)`;
}

async function ensureManifest() {
  if (manifestLoaded) return;
  try {
    const resp = await fetch("artwork_manifest.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    (data.artists || []).forEach((a) => {
      if (a.artist_name && a.path) {
        artistArt.set(a.artist_name.toLowerCase(), normalizePath(a.path));
      }
    });
    (data.albums || []).forEach((a) => {
      if (a.album_name && a.path) {
        albumArt.set(a.album_name.toLowerCase(), normalizePath(a.path));
      }
    });
  } catch (err) {
    console.warn("Artwork manifest load failed:", err);
  } finally {
    manifestLoaded = true;
  }
}

function getArtistArt(name) {
  if (!name) return null;
  return artistArt.get(name.toLowerCase()) || null;
}

function getAlbumArt(name) {
  if (!name) return null;
  return albumArt.get(name.toLowerCase()) || null;
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function getChartTheme() {
  return {
    barFill: getCssVar("--chart-bar-fill", "rgba(255,255,255,0.25)"),
    barBorder: getCssVar("--chart-bar-border", "rgba(255,255,255,0.7)"),
    compareFill: getCssVar("--chart-compare-fill", "rgba(255,255,255,0.35)"),
    compareBorder: getCssVar("--chart-compare-border", "rgba(255,255,255,0.8)"),
    comparePrevFill: getCssVar("--chart-compare-prev-fill", "rgba(140,140,140,0.35)"),
    comparePrevBorder: getCssVar("--chart-compare-prev-border", "rgba(140,140,140,0.8)"),
    axis: getCssVar("--chart-axis", "#8a8a8a"),
    grid: getCssVar("--chart-grid", "rgba(255,255,255,0.08)"),
    animDuration: parseInt(getCssVar("--chart-anim-duration", "700"), 10) || 700,
    animEasing: getCssVar("--chart-anim-easing", "easeOutQuart"),
  };
}

function ensureCursorTooltipPositioner() {
  if (typeof Chart === "undefined" || !Chart?.Tooltip?.positioners) return;
  if (Chart.Tooltip.positioners.cursor) return;
  Chart.Tooltip.positioners.cursor = (items, eventPosition) => {
    if (!eventPosition) return false;
    return { x: eventPosition.x, y: eventPosition.y };
  };
}

function renderList(container, items, imageLookup, prevLookup, startRank = 1) {
  container.replaceChildren();
  items.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "list-item";
    const artPath = imageLookup ? imageLookup(item) : null;
    const prevVal = prevLookup ? prevLookup(item) : 0;
    const currPlays = Number(item?.plays || 0);
    let deltaBadge = null;
    if (prevLookup) {
      const diff = currPlays - (prevVal || 0);
      if (diff !== 0) {
        const deltaClass = diff < 0 ? "negative" : "positive";
        const deltaLabel = diff < 0 ? "Down vs last year" : "Up vs last year";
        const badge = document.createElement("span");
        badge.className = `delta-arrow ${deltaClass}`;
        badge.setAttribute("aria-label", deltaLabel);
        deltaBadge = badge;
      }
    }

    const leftWrap = document.createElement("span");
    leftWrap.style.display = "flex";
    leftWrap.style.alignItems = "center";
    leftWrap.style.gap = "6px";

    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = `${idx + startRank}.`;
    leftWrap.appendChild(rank);

    if (artPath) {
      const thumb = document.createElement("img");
      const itemName = item?.name || "";
      thumb.className = "thumb";
      thumb.src = artPath;
      thumb.alt = itemName ? `${itemName} artwork` : "Artwork";
      leftWrap.appendChild(thumb);
    }

    leftWrap.appendChild(document.createTextNode(item?.name || ""));

    const plays = document.createElement("span");
    plays.className = "plays";
    if (deltaBadge) {
      plays.appendChild(deltaBadge);
    }
    const playsText = Number.isFinite(currPlays) ? currPlays.toLocaleString() : "-";
    plays.appendChild(document.createTextNode(deltaBadge ? ` ${playsText}` : playsText));

    div.appendChild(leftWrap);
    div.appendChild(plays);
    container.appendChild(div);
  });
}

function renderGenreSpotlight(container, items, prevMap) {
  if (!container) return;
  container.replaceChildren();
  (items || []).slice(0, 5).forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "genre-card";
    const prevPlays = prevMap ? prevMap.get((item?.name || "").toLowerCase()) || 0 : 0;
    const delta = prevMap ? formatDelta(item?.plays || 0, prevPlays) : "";
    const rank = document.createElement("div");
    rank.className = "genre-rank";
    rank.textContent = `#${idx + 1}`;

    const name = document.createElement("div");
    name.className = "genre-name";
    name.textContent = item?.name || "-";

    const plays = document.createElement("div");
    plays.className = "genre-plays";
    plays.textContent = `${(item?.plays || 0).toLocaleString()} plays`;

    const deltaEl = document.createElement("div");
    deltaEl.className = "genre-delta";
    deltaEl.textContent = delta;

    card.append(rank, name, plays, deltaEl);
    container.appendChild(card);
  });
}

function renderGenreTimelineChart(canvas, topGenres, byMonthEntries) {
  if (!canvas || typeof Chart === "undefined") return null;
  ensureCursorTooltipPositioner();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const topNames = (topGenres || []).slice(0, 5).map((genre) => genre.name);
  const byMonth = new Map((byMonthEntries || []).map((entry) => [Number(entry?.month), entry]));
  const palette = [
    "rgba(255, 255, 255, 0.5)",
    "rgba(255, 36, 0, 0.5)",
    "rgba(205, 32, 41, 0.45)",
    "rgba(140, 140, 140, 0.5)",
    "rgba(60, 60, 60, 0.5)",
  ];
  const datasets = topNames.map((name, idx) => {
    const data = monthNames.map((_, mIdx) => {
      const entry = byMonth.get(mIdx + 1);
      const match = (entry?.top_genres || []).find((g) => g.name === name);
      return match?.plays || 0;
    });
    return {
      label: name,
      data,
      borderColor: palette[idx % palette.length].replace("0.5", "0.9"),
      backgroundColor: palette[idx % palette.length],
      fill: false,
      stack: "genre",
      pointRadius: 0,
      pointHitRadius: 12,
      tension: 0.35,
      borderWidth: 2,
    };
  });
  if (genreTimelineChart) {
    genreTimelineChart.destroy();
  }
  return new Chart(canvas, {
    type: "line",
    data: { labels: monthNames, datasets },
    options: {
      animation: { duration: 600, easing: "easeOutQuart" },
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: getChartTheme().axis, font: { family: "var(--mono)", size: 12 } },
        },
        tooltip: {
          position: "cursor",
          callbacks: {
            label(item) {
              return `${item.dataset.label}: ${item.formattedValue} plays`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: getChartTheme().axis, font: { family: "var(--mono)", size: 10 } },
          grid: { display: false },
        },
        y: {
          stacked: true,
          ticks: { color: getChartTheme().axis, font: { family: "var(--mono)", size: 10 } },
          grid: { color: getChartTheme().grid },
        },
      },
    },
  });
}

function renderGenreShareBars(container, items, totalPlays) {
  if (!container) return;
  container.replaceChildren();
  (items || []).slice(0, 5).forEach((item) => {
    const plays = item?.plays || 0;
    const pct = totalPlays ? Math.round((plays / totalPlays) * 100) : 0;
    const row = document.createElement("div");
    row.className = "genre-share-row";
    const label = document.createElement("div");
    label.className = "genre-share-label";
    label.textContent = item?.name || "-";

    const bar = document.createElement("div");
    bar.className = "genre-share-bar";
    const barFill = document.createElement("span");
    barFill.style.width = `${pct}%`;
    bar.appendChild(barFill);

    const value = document.createElement("div");
    value.className = "genre-share-value";
    value.textContent = `${pct}%`;

    row.append(label, bar, value);
    container.appendChild(row);
  });
}


function renderMonthChart(canvas, items, labels) {
  if (!canvas || typeof Chart === "undefined") return null;
  const theme = getChartTheme();
  const values = labels.map((label, idx) => {
    const entry = items.find((m) => m.bucket === idx + 1);
    return entry?.plays || 0;
  });
  if (byMonthChart) {
    byMonthChart.destroy();
  }
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Plays",
          data: values,
          backgroundColor: theme.barFill,
          borderColor: theme.barBorder,
          borderWidth: 1,
        },
      ],
    },
    options: {
      animation: { duration: theme.animDuration, easing: theme.animEasing },
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(item) {
              return `${item.formattedValue} plays`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
        },
        y: {
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
          grid: { color: theme.grid },
        },
      },
    },
  });
}

function renderMonthCompareChart(canvas, currentItems, prevItems, labels, currentLabel, prevLabel) {
  if (!canvas || typeof Chart === "undefined") return null;
  ensureCursorTooltipPositioner();
  const theme = getChartTheme();
  const currentValues = labels.map((label, idx) => {
    const entry = currentItems.find((m) => m.bucket === idx + 1);
    return entry?.plays || 0;
  });
  const prevValues = labels.map((label, idx) => {
    const entry = prevItems?.find((m) => m.bucket === idx + 1);
    return entry?.plays || 0;
  });
  if (byMonthCompareChart) {
    byMonthCompareChart.destroy();
  }
  const datasets = [
    {
      label: currentLabel,
      data: currentValues,
      backgroundColor: theme.compareFill,
      borderColor: theme.compareBorder,
      borderWidth: 1,
    },
  ];
  if (prevItems && prevItems.length) {
    datasets.push({
      label: prevLabel,
      data: prevValues,
      backgroundColor: theme.comparePrevFill,
      borderColor: theme.comparePrevBorder,
      borderWidth: 1,
    });
  }
  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      animation: { duration: theme.animDuration, easing: theme.animEasing },
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: theme.axis, font: { family: "var(--mono)", size: 12 } },
        },
        tooltip: {
          position: "cursor",
          callbacks: {
            label(item) {
              return `${item.dataset.label}: ${item.formattedValue} plays`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
        },
        y: {
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
          grid: { color: theme.grid },
        },
      },
    },
  });
}

function renderWeekdayCompareChart(canvas, currentItems, prevItems, labels, currentLabel, prevLabel) {
  if (!canvas || typeof Chart === "undefined") return null;
  ensureCursorTooltipPositioner();
  const theme = getChartTheme();
  const currentIndexer = getWeekdayIndexer(currentItems);
  const prevIndexer = getWeekdayIndexer(prevItems);
  const toValues = (items, indexer) => {
    const map = new Map();
    if (!indexer) return labels.map(() => 0);
    (items || []).forEach((item) => {
      if (item?.bucket == null) return;
      const idx = indexer(Number(item.bucket));
      if (idx == null) return;
      const plays = Number(item?.plays) || 0;
      map.set(idx, (map.get(idx) || 0) + plays);
    });
    return labels.map((_, idx) => map.get(idx) || 0);
  };
  const currentValues = toValues(currentItems, currentIndexer);
  const prevValues = toValues(prevItems, prevIndexer);
  if (byWeekdayCompareChart) {
    byWeekdayCompareChart.destroy();
  }
  const datasets = [
    {
      label: currentLabel,
      data: currentValues,
      backgroundColor: theme.compareFill,
      borderColor: theme.compareBorder,
      borderWidth: 1,
    },
  ];
  if (prevItems && prevItems.length) {
    datasets.push({
      label: prevLabel,
      data: prevValues,
      backgroundColor: theme.comparePrevFill,
      borderColor: theme.comparePrevBorder,
      borderWidth: 1,
    });
  }
  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      animation: { duration: theme.animDuration, easing: theme.animEasing },
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: theme.axis, font: { family: "var(--mono)", size: 12 } },
        },
        tooltip: {
          position: "cursor",
          callbacks: {
            label(item) {
              return `${item.dataset.label}: ${item.formattedValue} plays`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
        },
        y: {
          ticks: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 10 },
          },
          grid: { color: theme.grid },
        },
      },
    },
  });
}

function buildHourSeries(items) {
  const fullHours = Array.from({ length: 24 }, (_, idx) => idx);
  const hourMap = new Map();
  (items || []).forEach((entry) => {
    const hour = Number(entry?.bucket);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
    const plays = Number(entry?.plays) || 0;
    hourMap.set(hour, (hourMap.get(hour) || 0) + plays);
  });
  const fullValues = fullHours.map((hour) => hourMap.get(hour) || 0);
  const usedHours = fullHours.filter((hour) => (hourMap.get(hour) || 0) > 0);
  const usedValues = usedHours.map((hour) => hourMap.get(hour) || 0);
  const maxValue = Math.max(...fullValues, 1);
  return { fullHours, fullValues, usedHours, usedValues, maxValue };
}

function formatHourLabel(hour) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function formatHourRange(startHour, windowSize) {
  const endHour = (startHour + windowSize) % 24;
  if (windowSize <= 1) return formatHourLabel(startHour);
  return `${formatHourLabel(startHour)}-${formatHourLabel(endHour)}`;
}

function findPeakWindow(values, windowSize) {
  if (!values?.length || windowSize <= 0) return null;
  const size = Math.min(windowSize, values.length);
  let bestSum = -1;
  let bestStart = 0;
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < size; j += 1) {
      sum += values[(i + j) % values.length] || 0;
    }
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = i;
    }
  }
  return { start: bestStart, sum: bestSum, size };
}

function renderHourDotChart(canvas, hours, values, maxValue) {
  if (!canvas || typeof Chart === "undefined") return null;
  if (!values.length) return null;
  const theme = getChartTheme();
  return new Chart(canvas, {
    type: "radar",
    data: {
      labels: hours.map((hour) => `${hour}:00`),
      datasets: [
        {
          label: "Plays",
          data: values.map(() => 1),
          borderWidth: 0,
          fill: false,
          pointBackgroundColor: values.map((value) => {
            const alpha = value ? Math.max(0.18, value / maxValue) : 0.08;
            return `rgba(255, 255, 255, ${alpha})`;
          }),
          pointBorderColor: "rgba(255, 255, 255, 0.6)",
          pointRadius: (ctx) => {
            const value = values[ctx.dataIndex] || 0;
            if (!value) return 0;
            return 3 + 8 * (value / maxValue);
          },
          pointHoverRadius: (ctx) => {
            const value = values[ctx.dataIndex] || 0;
            if (!value) return 0;
            return 5 + 10 * (value / maxValue);
          },
        },
      ],
    },
    options: {
      animation: { duration: theme.animDuration, easing: theme.animEasing },
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(item) {
              const hour = hours[item.dataIndex];
              const plays = values[item.dataIndex] || 0;
              return `${hour}:00: ${plays.toLocaleString()} plays`;
            },
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 1.2,
          grid: { color: theme.grid },
          angleLines: { color: theme.grid },
          ticks: { display: false },
          pointLabels: {
            color: theme.axis,
            font: { family: "var(--mono)", size: 9 },
            callback: (label, idx) => (idx % 3 === 0 ? label : ""),
          },
        },
      },
    },
  });
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function setSpotlight(imgEl, nameEl, playsEl, entry, artPath) {
  const name = entry?.name || "-";
  const plays = entry?.plays;
  const delta = entry?.delta;
  nameEl.textContent = name;
  playsEl.replaceChildren();
  if (plays) {
    const playsNumber = document.createElement("span");
    playsNumber.className = "plays-number";
    playsNumber.textContent = plays.toLocaleString();
    playsEl.appendChild(playsNumber);
    playsEl.appendChild(document.createTextNode(" plays"));
  }
  if (delta) {
    const deltaText = plays ? `(${delta})` : delta;
    const playsDelta = document.createElement("span");
    playsDelta.className = "plays-delta";
    playsDelta.textContent = deltaText;
    if (playsEl.childNodes.length) {
      playsEl.appendChild(document.createTextNode(" "));
    }
    playsEl.appendChild(playsDelta);
  }
  if (artPath) {
    imgEl.src = artPath;
    imgEl.style.opacity = "1";
  } else {
    imgEl.removeAttribute("src");
    imgEl.style.opacity = "0.35";
  }
}

async function fetchWrapped(year) {
  const url = `data/wrapped/wrapped_${year}.json`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function fetchWrappedCached(year) {
  if (wrappedCache.has(year)) {
    return wrappedCache.get(year);
  }
  const promise = fetchWrapped(year).catch(() => null);
  wrappedCache.set(year, promise);
  return promise;
}

async function ensureWrappedManifest() {
  if (!wrappedManifestPromise) {
    wrappedManifestPromise = fetch("data/wrapped/manifest.json", { cache: "no-store" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);
  }
  return wrappedManifestPromise;
}

async function loadYear(year, options = {}) {
  await ensureManifest();
  statusEl.textContent = `Loading wrapped/wrapped_${year}.json`;
  statusEl.classList.remove("error");
  try {
    const [data, prev, manifest] = await Promise.all([
      fetchWrappedCached(year),
      fetchWrappedCached(year - 1),
      ensureWrappedManifest(),
    ]);
    if (!data) {
      throw new Error("Wrapped data missing");
    }

    tracksEl.textContent = data.total_plays?.toLocaleString() ?? "-";
    const tzVal = data.timezone_offset_hours ?? 0;
    tzMetaValueEl.textContent = tzVal;
    generatedAtEl.textContent = data.generated_at
      ? `Generated ${formatDate(data.generated_at)}`
      : "Generated locally";

    const prevArtistMap = new Map((prev?.artist_play_counts || []).map((a) => [a.name.toLowerCase(), a.plays]));
    const prevAlbumMap = new Map((prev?.album_play_counts || []).map((a) => [a.name.toLowerCase(), a.plays]));
    const prevTrackMap = new Map((prev?.track_play_counts || []).map((t) => [`${(t.artist || "").toLowerCase()}|||${(t.track || "").toLowerCase()}`, t.plays]));
    const prevGenreMap = new Map((prev?.top_genres || []).map((g) => [g.name.toLowerCase(), g.plays]));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    renderList(
      topArtistsEl,
      (data.top_artists || []).slice(1, 10),
      null,
      prev ? (item) => prevArtistMap.get((item?.name || "").toLowerCase()) || 0 : null,
      2
    );
    renderList(
      topTracksEl,
      (data.top_tracks || []).slice(1, 10),
      null,
      prev ? (item) => prevTrackMap.get(`${(item.artist || "").toLowerCase()}|||${(item.name || item.track || "").toLowerCase()}`) || 0 : null,
      2
    );
    renderList(
      topAlbumsEl,
      (data.top_albums || []).slice(1, 10),
      null,
      prev ? (item) => prevAlbumMap.get((item?.name || "").toLowerCase()) || 0 : null,
      2
    );
    renderGenreSpotlight(genreSpotlightEl, data.top_genres || [], prevGenreMap);
    genreTimelineChart = renderGenreTimelineChart(
      genreTimelineCanvas,
      data.top_genres || [],
      data.genre_by_month || []
    );
    renderGenreShareBars(genreShareBarsEl, data.top_genres || [], data.total_plays || 0);
    const hourSeries = buildHourSeries(data.plays_by_hour || []);
    if (byHourDotChart) {
      byHourDotChart.destroy();
    }
    byHourDotChart = renderHourDotChart(
      byHourDotCanvas,
      hourSeries.fullHours,
      hourSeries.fullValues,
      hourSeries.maxValue
    );
    const maxHourValue = Math.max(...hourSeries.fullValues, 0);
    const maxHourIdx = hourSeries.fullValues.indexOf(maxHourValue);
    if (maxHourValue > 0 && maxHourIdx >= 0) {
      mostPlayedHourEl.textContent = formatHourLabel(maxHourIdx);
      mostPlayedHourPlaysEl.textContent = `${maxHourValue.toLocaleString()} plays`;
    } else {
      mostPlayedHourEl.textContent = "-";
      mostPlayedHourPlaysEl.textContent = "";
    }
    const peakWindow = findPeakWindow(hourSeries.fullValues, 3);
    if (peakWindow && peakWindow.sum > 0) {
      peakWindowEl.textContent = formatHourRange(peakWindow.start, peakWindow.size);
      const totalPlays = hourSeries.fullValues.reduce((sum, value) => sum + value, 0);
      const pct = totalPlays ? Math.round((peakWindow.sum / totalPlays) * 100) : 0;
      peakWindowPlaysEl.textContent = `${peakWindow.sum.toLocaleString()} plays (${pct}%)`;
    } else {
      peakWindowEl.textContent = "-";
      peakWindowPlaysEl.textContent = "";
    }
    const totalHoursPlays = hourSeries.fullValues.reduce((sum, value) => sum + value, 0);
    if (totalHoursPlays > 0) {
      const mean = totalHoursPlays / hourSeries.fullValues.length;
      let consistentIdx = 0;
      let consistentDiff = Number.POSITIVE_INFINITY;
      hourSeries.fullValues.forEach((value, idx) => {
        const diff = Math.abs(value - mean);
        if (diff < consistentDiff) {
          consistentDiff = diff;
          consistentIdx = idx;
        }
      });
      consistentHourEl.textContent = formatHourLabel(consistentIdx);
      consistentHourPlaysEl.textContent = `${hourSeries.fullValues[consistentIdx].toLocaleString()} plays`;
    } else {
      consistentHourEl.textContent = "-";
      consistentHourPlaysEl.textContent = "";
    }

    const bestWeekdayEntry = (data.plays_by_weekday || []).reduce((best, curr) => (curr && curr.plays > (best?.plays || 0) ? curr : best), null);
    const bestDayPrev = bestWeekdayEntry && prev ? (prev.plays_by_weekday || []).find((w) => w.bucket === bestWeekdayEntry.bucket)?.plays || 0 : 0;
    const weekdayIndexer = getWeekdayIndexer(data.plays_by_weekday || []);
    const bestDayIdx = bestWeekdayEntry && weekdayIndexer ? weekdayIndexer(Number(bestWeekdayEntry.bucket)) : null;
    const bestDayLabel = bestDayIdx != null ? weekdayNames[bestDayIdx] : "-";
    const bestDelta = bestWeekdayEntry && prev ? formatDelta(bestWeekdayEntry.plays || 0, bestDayPrev || 0) : "";
    timeBestWeekdayEl.textContent = bestDayLabel;
    timeBestWeekdayPlaysEl.textContent = bestWeekdayEntry
      ? `${bestWeekdayEntry.plays.toLocaleString()} plays${bestDelta ? ` (${bestDelta})` : ""}`
      : "";
    const weekdayTotals = new Array(7).fill(0);
    if (weekdayIndexer) {
      (data.plays_by_weekday || []).forEach((entry) => {
        const idx = weekdayIndexer(Number(entry?.bucket));
        if (idx == null) return;
        weekdayTotals[idx] += Number(entry?.plays) || 0;
      });
      const totalWeekdayPlays = weekdayTotals.reduce((sum, value) => sum + value, 0);
      if (totalWeekdayPlays > 0) {
        const mean = totalWeekdayPlays / weekdayTotals.length;
        let consistentIdx = 0;
        let consistentDiff = Number.POSITIVE_INFINITY;
        weekdayTotals.forEach((value, idx) => {
          const diff = Math.abs(value - mean);
          if (diff < consistentDiff) {
            consistentDiff = diff;
            consistentIdx = idx;
          }
        });
        timeConsistentDayEl.textContent = weekdayNames[consistentIdx];
        timeConsistentDayPlaysEl.textContent = `${weekdayTotals[consistentIdx].toLocaleString()} plays`;
      } else {
        timeConsistentDayEl.textContent = "-";
        timeConsistentDayPlaysEl.textContent = "";
      }
      const weekendPlays = weekdayTotals[5] + weekdayTotals[6];
      const weekdayPlays = weekdayTotals.slice(0, 5).reduce((sum, value) => sum + value, 0);
      const total = weekendPlays + weekdayPlays;
      if (total > 0) {
        const weekendPct = Math.round((weekendPlays / total) * 100);
        const weekdayPct = 100 - weekendPct;
        weekendShareEl.textContent = `Weekend ${weekendPct}%`;
        weekdayShareEl.textContent = `Weekday ${weekdayPct}%`;
      } else {
        weekendShareEl.textContent = "-";
        weekdayShareEl.textContent = "";
      }
    } else {
      timeConsistentDayEl.textContent = "-";
      timeConsistentDayPlaysEl.textContent = "";
      weekendShareEl.textContent = "-";
      weekdayShareEl.textContent = "";
    }

    const streak = data.longest_streak;
    overviewStreakDaysEl.textContent = streak?.length ? `${streak.length} days` : "-";
    overviewStreakRangeEl.textContent =
      streak?.start && streak?.end ? `${formatDate(streak.start)} to ${formatDate(streak.end)}` : "";

    const uniqueArtists = data.unique_artists ?? (data.unique_artists_list ? data.unique_artists_list.length : 0);
    const uniqueAlbums = data.unique_albums
      ?? (data.unique_albums_list ? data.unique_albums_list.length : (data.album_play_counts ? data.album_play_counts.length : 0));
    const uniqueTracks = data.unique_tracks ?? (data.unique_tracks_list ? data.unique_tracks_list.length : 0);
    const prevUniqueArtists = prev?.unique_artists ?? (prev?.unique_artists_list ? prev.unique_artists_list.length : null);
    const prevUniqueAlbums = prev?.unique_albums
      ?? (prev?.unique_albums_list ? prev.unique_albums_list.length : (prev?.album_play_counts ? prev.album_play_counts.length : null));
    const prevUniqueTracks = prev?.unique_tracks ?? (prev?.unique_tracks_list ? prev.unique_tracks_list.length : null);

    spotlightArtistsCountEl.textContent = Number.isFinite(uniqueArtists) ? uniqueArtists.toLocaleString() : "-";
    spotlightAlbumsCountEl.textContent = Number.isFinite(uniqueAlbums) ? uniqueAlbums.toLocaleString() : "-";
    spotlightTracksCountEl.textContent = Number.isFinite(uniqueTracks) ? uniqueTracks.toLocaleString() : "-";
    const setDeltaEl = (el, value) => {
      const text = value || "";
      el.textContent = text;
      el.classList.remove("negative", "neutral");
      if (!text) return;
      if (text.startsWith("-")) {
        el.classList.add("negative");
      } else if (text.startsWith("+/-")) {
        el.classList.add("neutral");
      }
    };

    setDeltaEl(spotlightArtistsDeltaEl, prevUniqueArtists != null ? formatDelta(uniqueArtists, prevUniqueArtists) : "");
    setDeltaEl(spotlightAlbumsDeltaEl, prevUniqueAlbums != null ? formatDelta(uniqueAlbums, prevUniqueAlbums) : "");
    setDeltaEl(spotlightTracksDeltaEl, prevUniqueTracks != null ? formatDelta(uniqueTracks, prevUniqueTracks) : "");

    const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    const prevDays = (year - 1) % 4 === 0 && ((year - 1) % 100 !== 0 || (year - 1) % 400 === 0) ? 366 : 365;
    totalTimeEl.textContent = formatDuration(data.total_play_time_ms);
    avgDailyEl.textContent = data.total_plays ? (data.total_plays / daysInYear).toFixed(2) : "-";
    const tracksDelta = prev ? formatDelta(data.total_plays || 0, prev.total_plays || 0) : "";
    const timeDelta = prev ? formatDelta(data.total_play_time_ms || 0, prev.total_play_time_ms || 0) : "";
    const avgDailyPrev = prev && prev.total_plays ? prev.total_plays / prevDays : null;
    const avgDelta = prev && prev.total_plays ? formatDelta(data.total_plays / daysInYear, avgDailyPrev) : "";
    setDeltaEl(tracksDeltaEl, tracksDelta);
    setDeltaEl(timeDeltaEl, timeDelta);
    setDeltaEl(avgDailyDeltaEl, avgDelta);

    byMonthCompareChart = renderMonthCompareChart(
      byMonthCompareCanvas,
      data.plays_by_month || [],
      prev?.plays_by_month || [],
      monthNames,
      year.toString(),
      (year - 1).toString()
    );

    byWeekdayCompareChart = renderWeekdayCompareChart(
      byWeekdayCompareCanvas,
      data.plays_by_weekday || [],
      prev?.plays_by_weekday || [],
      weekdayNames,
      year.toString(),
      (year - 1).toString()
    );

    const normalizeKey = (value) => (value || "").toLowerCase();
    const artistKey = (item) => normalizeKey(typeof item === "string" ? item : item?.name);
    const albumKey = (item) => normalizeKey(typeof item === "string" ? item : item?.name);
    const trackKey = (item) => {
      if (!item) return "";
      const artist = typeof item === "string" ? "" : item.artist;
      const track = typeof item === "string" ? item : (item.track || item.name);
      return `${normalizeKey(artist)}|||${normalizeKey(track)}`;
    };
    const countNewEntries = (list, prevSet, keyFn) => {
      if (!Array.isArray(list) || !prevSet) return null;
      let count = 0;
      list.forEach((entry) => {
        const key = keyFn(entry);
        if (key && !prevSet.has(key)) count += 1;
      });
      return count;
    };
    const setDiscoveryPct = (el, pct) => {
      if (!el) return;
      el.textContent = Number.isFinite(pct) ? `${pct}%` : "-";
    };
    const setDiscoveryTop = (el, item, formatter) => {
      if (!el) return;
      el.replaceChildren();
      if (!item) {
        el.textContent = "-";
        return;
      }
      const payload = formatter(item);
      const nameSpan = document.createElement("span");
      nameSpan.className = "discovery-top-name";
      nameSpan.textContent = payload.name;
      const playsSpan = document.createElement("span");
      playsSpan.className = "discovery-top-plays";
      playsSpan.textContent = payload.plays;
      el.appendChild(nameSpan);
      el.appendChild(playsSpan);
    };
    const buildPrevSets = (sources) => {
      const artists = new Set();
      const albums = new Set();
      const tracks = new Set();
      (sources || []).forEach((source) => {
        if (!source) return;
        (source.unique_artists_list || source.artist_play_counts || [])
          .map((a) => artistKey(a))
          .filter(Boolean)
          .forEach((key) => artists.add(key));
        (source.unique_albums_list || source.album_play_counts || [])
          .map((a) => albumKey(a))
          .filter(Boolean)
          .forEach((key) => albums.add(key));
        (source.unique_tracks_list || source.track_play_counts || [])
          .map((t) => trackKey(t))
          .filter(Boolean)
          .forEach((key) => tracks.add(key));
      });
      return { artists, albums, tracks };
    };

    const compareYears = Array.isArray(manifest?.years)
      ? manifest.years.filter((y) => y !== year)
      : (prev ? [year - 1] : []);
    const compareData = compareYears.length
      ? (await Promise.all(compareYears.map((y) => fetchWrappedCached(y)))).filter(Boolean)
      : [];
    const discoverySources = compareData.length ? compareData : (prev ? [prev] : []);

    if (discoverySources.length) {
      const prevSets = buildPrevSets(discoverySources);
      const currentArtistsList = data.unique_artists_list || (data.artist_play_counts || []).map((a) => a.name);
      const currentAlbumsList = data.unique_albums_list || (data.album_play_counts || []).map((a) => a.name);
      const currentTracksList = data.unique_tracks_list || (data.track_play_counts || []).map((t) => ({ artist: t.artist, track: t.track }));

      const newArtistCount = countNewEntries(currentArtistsList, prevSets.artists, artistKey);
      const newAlbumCount = countNewEntries(currentAlbumsList, prevSets.albums, albumKey);
      const newTrackCount = countNewEntries(currentTracksList, prevSets.tracks, trackKey);

      const artistPct = currentArtistsList?.length ? Math.round((newArtistCount / currentArtistsList.length) * 100) : null;
      const albumPct = currentAlbumsList?.length ? Math.round((newAlbumCount / currentAlbumsList.length) * 100) : null;
      const trackPct = currentTracksList?.length ? Math.round((newTrackCount / currentTracksList.length) * 100) : null;

      setDiscoveryPct(discoveryArtistsPctEl, artistPct);
      setDiscoveryPct(discoveryAlbumsPctEl, albumPct);
      setDiscoveryPct(discoveryTracksPctEl, trackPct);

      const topNewArtist = (data.artist_play_counts || []).find((a) => !prevSets.artists.has((a.name || "").toLowerCase()));
      const topNewAlbum = (data.album_play_counts || []).find((a) => !prevSets.albums.has((a.name || "").toLowerCase()));
      const topNewTrack = (data.track_play_counts || []).find((t) => {
        const key = `${(t.artist || "").toLowerCase()}|||${(t.track || "").toLowerCase()}`;
        return !prevSets.tracks.has(key);
      });
      setDiscoveryTop(
        discoveryTopArtistEl,
        topNewArtist,
        (item) => ({ name: item.name, plays: `${item.plays.toLocaleString()} plays` })
      );
      setDiscoveryTop(
        discoveryTopAlbumEl,
        topNewAlbum,
        (item) => ({ name: item.name, plays: `${item.plays.toLocaleString()} plays` })
      );
      setDiscoveryTop(
        discoveryTopTrackEl,
        topNewTrack,
        (item) => ({ name: `${item.artist} - ${item.track}`, plays: `${item.plays.toLocaleString()} plays` })
      );

      if (discoveryNoteEl) {
        if (compareYears.length) {
          const label = compareYears.length === 1 ? "year" : "years";
          discoveryNoteEl.textContent = `Compared against ${compareYears.length} ${label}`;
        } else {
          discoveryNoteEl.textContent = "Compared against last year";
        }
      }
    } else {
      setDiscoveryPct(discoveryArtistsPctEl, null);
      setDiscoveryPct(discoveryAlbumsPctEl, null);
      setDiscoveryPct(discoveryTracksPctEl, null);
      setDiscoveryTop(discoveryTopArtistEl, null, () => "");
      setDiscoveryTop(discoveryTopAlbumEl, null, () => "");
      setDiscoveryTop(discoveryTopTrackEl, null, () => "");
      if (discoveryNoteEl) discoveryNoteEl.textContent = "Load another year to see discovery rate.";
    }

    const withDelta = (item, prevMap) => {
      const prevVal = prevMap ? prevMap.get((item?.name || "").toLowerCase()) || 0 : 0;
      const deltaTxt = prev ? formatDelta(item?.plays || 0, prevVal) : "";
      return { ...item, delta: deltaTxt };
    };
    const topArtist = withDelta((data.top_artists || [])[0], prevArtistMap);
    const topAlbum = withDelta((data.top_albums || [])[0], prevAlbumMap);
    const topTrackItem = (data.top_tracks || [])[0] || null;
    const prevTrackKey = topTrackItem ? `${(topTrackItem.artist || "").toLowerCase()}|||${(topTrackItem.name || topTrackItem.track || "").toLowerCase()}` : "";
    const topTrackPrev = prevTrackKey ? (prevTrackMap.get(prevTrackKey) || 0) : 0;
    const topTrack = topTrackItem ? { name: topTrackItem.name || topTrackItem.track, plays: topTrackItem.plays, delta: prev ? formatDelta(topTrackItem.plays || 0, topTrackPrev) : "" } : null;

    const topArtistArt = getArtistArt(topArtist?.name);
    const topAlbumArt = getAlbumArt(topAlbum?.name);
    const topTrackArt = topAlbumArt || topArtistArt;

    setSpotlight(artArtistImg, artArtistName, artArtistPlays, topArtist, topArtistArt);
    setSpotlight(artAlbumImg, artAlbumName, artAlbumPlays, topAlbum, topAlbumArt);
    setSpotlight(artTrackImg, artTrackName, artTrackPlays, topTrack, topTrackArt);

    statusEl.textContent = `Loaded wrapped/wrapped_${year}.json`;
    return true;
  } catch (err) {
    if (options.silent) {
      return false;
    }
    [tracksEl, spotlightArtistsCountEl, spotlightAlbumsCountEl, spotlightTracksCountEl]
      .filter(Boolean)
      .forEach(el => el.textContent = "-");
    [topArtistsEl, topTracksEl, topAlbumsEl, genreSpotlightEl, genreShareBarsEl]
      .filter(Boolean)
      .forEach(el => el.replaceChildren());
    if (genreTimelineChart) {
      genreTimelineChart.destroy();
      genreTimelineChart = null;
    }
    if (byMonthCompareChart) {
      byMonthCompareChart.destroy();
      byMonthCompareChart = null;
    }
    if (byWeekdayCompareChart) {
      byWeekdayCompareChart.destroy();
      byWeekdayCompareChart = null;
    }
    if (byHourDotChart) {
      byHourDotChart.destroy();
      byHourDotChart = null;
    }
    [timeBestWeekdayEl, timeBestWeekdayPlaysEl, timeConsistentDayEl, timeConsistentDayPlaysEl, mostPlayedHourEl, mostPlayedHourPlaysEl, weekendShareEl, weekdayShareEl, peakWindowEl, peakWindowPlaysEl, consistentHourEl, consistentHourPlaysEl, overviewStreakDaysEl, overviewStreakRangeEl, totalTimeEl, avgDailyEl, tracksDeltaEl, timeDeltaEl, avgDailyDeltaEl, discoveryArtistsPctEl, discoveryAlbumsPctEl, discoveryTracksPctEl, discoveryTopArtistEl, discoveryTopAlbumEl, discoveryTopTrackEl].filter(Boolean).forEach(el => el.textContent = "-");
    [spotlightArtistsDeltaEl, spotlightAlbumsDeltaEl, spotlightTracksDeltaEl].forEach(el => el.textContent = "");
    if (discoveryNoteEl) discoveryNoteEl.textContent = "";
    [artArtistName, artAlbumName, artTrackName].forEach(el => el.textContent = "-");
    [artArtistPlays, artAlbumPlays, artTrackPlays].forEach(el => el.textContent = "");
    [artArtistImg, artAlbumImg, artTrackImg].forEach(el => { el.removeAttribute("src"); el.style.opacity = "0.35"; });
    tzMetaValueEl.textContent = "-";
    generatedAtEl.textContent = "Generation failed";
    statusEl.textContent = `Failed to load: ${err.message}`;
    statusEl.classList.add("error");
    return false;
  }
}

reloadBtn.addEventListener("click", () => {
  wrappedCache.clear();
  wrappedManifestPromise = null;
  loadYear(parseInt(yearSelect.value, 10));
});
if (backBtn) {
  backBtn.addEventListener("click", () => {
    const homeHref = backBtn.dataset.homeHref || "/index.html";
    window.location.href = homeHref;
  });
}
async function loadLatestAvailable(years) {
  for (const year of years) {
    const ok = await loadYear(year, { silent: true });
    if (ok) {
      yearSelect.value = year;
      return;
    }
  }
  await loadYear(years[0]);
}

async function initYearOptions() {
  const manifest = await ensureWrappedManifest();
  const availableYears = Array.isArray(manifest?.years)
    ? manifest.years.slice().sort((a, b) => b - a)
    : fallbackYearOptions;
  let entries = availableYears.map((year) => ({ year, available: true }));
  if (Array.isArray(manifest?.years) && availableYears.length) {
    const maxYear = Math.max(...availableYears);
    const minYear = Math.min(...availableYears);
    const availableSet = new Set(availableYears);
    entries = [];
    for (let year = maxYear; year >= minYear; year -= 1) {
      entries.push({ year, available: availableSet.has(year) });
    }
  }
  const defaultYear = entries.find((entry) => entry.available)?.year ?? currentYear;
  populateYearOptions(entries, defaultYear);
  await loadLatestAvailable(availableYears);
}

initYearOptions();

// Page check for jobmaxxer. Run before every publish:  bash tests/run.sh
// Opens index.html in a hidden browser with made-up data (tests/sample-data.json),
// clicks through the main flows and prints PASS or FAIL for each check.
// It never touches the real database: window.claude is replaced by a fake in-memory one.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(__dirname, "screenshots");
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "sample-data.json"), "utf8"));

// Fake window.claude: db (in memory, records every write), sample, downloads.
const fakeClaude = (d) => {
  const jobs = Object.fromEntries(d.jobs.map((j) => [j.id, j]));
  const docs = { "profile/cv": d.profile_cv };
  if (d.profile_search) docs["profile/search"] = d.profile_search;
  const listeners = [];
  window.__writes = [];
  const emit = () => { const snap = { docs: Object.values(jobs).map((j) => ({ id: j.id, data: () => j })) }; listeners.forEach((cb) => setTimeout(() => cb(snap), 0)); };
  const db = {
    collection: () => ({ onSnapshot: (cb) => { listeners.push(cb); emit(); return () => {}; } }),
    doc: (p) => ({
      onSnapshot: (cb) => { setTimeout(() => cb(docs[p] ? { exists: true, data: () => docs[p] } : { exists: false, data: () => null }), 0); return () => {}; },
      update: async (patch) => { const id = p.split("/")[1]; window.__writes.push({ path: p, patch }); if (!p.startsWith("jobs/")) { docs[p] = { ...(docs[p] || {}), ...patch }; return; } jobs[id] = { ...jobs[id], ...patch }; emit(); },
      set: async (v) => { const id = p.split("/")[1]; window.__writes.push({ path: p, set: v }); if (!p.startsWith("jobs/")) { docs[p] = v; return; } jobs[id] = { id, ...v }; emit(); },
    }),
  };
  window.claude = { use: async (n) => (n === "db" ? db : n === "sample" ? { json: async () => ({}) } : n === "downloads" ? { save: async () => {} } : null) };
};

const results = [];
// Pick an option in one of the page's custom dropdowns (the plain <select> is hidden behind it).
const pick = async (pg, id, value) => {
  await pg.click(`#dd-${id} .ddbtn`);
  const i = await pg.$eval("#" + id, (s, v) => [...s.options].findIndex((o) => o.value === v), value);
  await pg.click(`#dd-${id} .ddopt[data-i="${i}"]`);
  await pg.waitForTimeout(150);
};
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? "  (" + detail + ")" : ""}`); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  // The artifact host wraps the file in a skeleton; do the same here.
  const testFile = path.join(ROOT, ".test-page.html");
  fs.writeFileSync(testFile, `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);

  const browser = await chromium.launch();
  try {
    // ---------- desktop ----------
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: "light" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(fakeClaude, data);
    await page.goto("file://" + testFile);
    await page.waitForTimeout(1200);

    const count = (id) => page.$eval("#" + id, (el) => el.textContent.trim());
    check("Page loads with no script errors", errors.length === 0, errors.join(" | "));
    check("Logo image loads", await page.$eval(".topbar .logo", (i) => i.complete && i.naturalWidth > 0).catch(() => false));
    check("Car mark loads to the left of the logo", await page.evaluate(() => { const m = document.querySelector(".topbar .mark"), l = document.querySelector(".topbar .logo"); return m.complete && m.naturalWidth > 0 && m.getBoundingClientRect().right <= l.getBoundingClientRect().left; }));
    check("Dark background even when the computer is in light mode", await page.evaluate(() => { const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] < 120; }));
    check("Tab counts are right (queue 2, applied 1, my links 1)", (await count("c-queue")) === "2" && (await count("c-applied")) === "1" && (await count("c-mine")) === "1",
      `queue ${await count("c-queue")}, applied ${await count("c-applied")}, mine ${await count("c-mine")}`);
    check("Queue shows 2 job rows", (await page.$$(".row")).length === 2);
    const scope = await page.textContent("#scope");
    check("Header line shows Austin and the 6:55am refresh", /Austin/.test(scope) && /6:55am/.test(scope) && !(await page.$(".sub")), scope);
    await page.screenshot({ path: path.join(SHOTS, "1-desktop.png") });
    check("Page uses the screen width (list wider than 1150px at 1280px)", (await page.$eval("#list", (l) => l.getBoundingClientRect().width)) > 1150);

    // Custom dropdowns instead of plain selects
    check("No plain dropdowns are visible (all replaced)", (await page.$$eval("select", (s) => s.filter((x) => x.offsetParent !== null).length)) === 0);
    await page.click("#dd-f-track .ddbtn"); await page.waitForTimeout(100);
    check("Role type dropdown lists the role types the jobs have, with a tick on the chosen one",
      (await page.isVisible("#dd-f-track .ddmenu")) && (await page.$$("#dd-f-track .ddopt")).length === 3 && (await page.textContent('#dd-f-track .ddopt[aria-selected="true"]')).trim() === "All role types");
    await page.screenshot({ path: path.join(SHOTS, "9-dropdown-open.png") });
    await page.click('#dd-f-track .ddopt[data-i="1"]'); await page.waitForTimeout(150);
    check("Picking Ops filters the list and the button shows it (tinted red)", (await page.$$(".row")).length === 1 && (await page.textContent("#dd-f-track .ddbtn")).trim() === "Ops"
      && (await page.$eval("#dd-f-track .ddbtn", (b) => b.classList.contains("on"))) && !(await page.isVisible("#dd-f-track .ddmenu")));
    await page.focus("#dd-f-track .ddbtn"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(80);
    check("Arrow key opens the dropdown with the chosen option focused", (await page.isVisible("#dd-f-track .ddmenu")) && (await page.evaluate(() => document.activeElement.textContent.trim())) === "Ops");
    await page.keyboard.press("Home"); await page.keyboard.press("Enter"); await page.waitForTimeout(150);
    check("Home + Enter picks All role types again by keyboard", (await page.$$(".row")).length === 2 && !(await page.$eval("#dd-f-track .ddbtn", (b) => b.classList.contains("on"))));
    await page.click("#dd-f-fit .ddbtn"); await page.keyboard.press("Escape"); await page.waitForTimeout(80);
    check("Escape closes the dropdown and returns focus to its button", !(await page.isVisible("#dd-f-fit .ddmenu")) && (await page.evaluate(() => document.activeElement.closest("#dd-f-fit") !== null)));
    await page.click("#dd-f-fit .ddbtn"); await page.click("#viewtitle"); await page.waitForTimeout(80);
    check("Clicking elsewhere closes the dropdown", !(await page.isVisible("#dd-f-fit .ddmenu")));
    await page.click("#dd-st-test-a .ddbtn"); await page.waitForTimeout(80);
    check("Row status dropdown includes Push to back of queue", /Push to back of queue/.test(await page.textContent("#dd-st-test-a .ddmenu")));
    // Search down to one job (a short list box), then open its status menu: every option must be visible and clickable.
    await page.keyboard.press("Escape"); await page.fill("#f-q", "Alpha"); await page.waitForTimeout(150);
    await page.click("#dd-st-test-a .ddbtn"); await page.waitForTimeout(80);
    check("Every status option in a row's menu can be seen and clicked (not cut off by the list box)", await page.$$eval("#dd-st-test-a .ddopt", (os) => os.length >= 6 && os.every((o) => { const r = o.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.height > 0 && el && o.contains(el); })));
    await page.keyboard.press("Escape"); await page.fill("#f-q", ""); await page.waitForTimeout(150);
    await page.keyboard.press("Escape");

    // Applied button
    await page.click('.row[data-id="test-a"] button[data-act="applied"]');
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => window.__writes);
    const applied = w.find((x) => x.path === "jobs/test-a");
    check("Applied button saves status, date and follow-up", applied && applied.patch.status === "applied" && applied.patch.applied && applied.patch.followup, JSON.stringify(w));
    check("Applied role leaves the queue", (await count("c-queue")) === "1" && (await count("c-applied")) === "2");
    check("Applied click shows a smoke puff and +1", (await page.$$(".puff")).length === 1 && /\+1/.test(await page.textContent(".puff")));
    check("Goal celebration does not fire below the daily goal", !(await page.$(".goal")));
    check("Streak sits in the top bar (0, flame off)", (await page.isVisible(".topbar #streak-btn")) && (await page.textContent("#s-streak")) === "0" && !(await page.$eval("#streakwrap", (x) => x.classList.contains("lit"))));
    check("Streak card starts hidden", !(await page.isVisible("#streak-pop")));
    await page.hover("#streak-btn"); await page.waitForTimeout(300);
    check("Hovering the streak opens a card with best streak and the last 7 days", (await page.isVisible("#streak-pop")) && (await page.isVisible("#sp-best")) && (await page.$$("#sp-week .spday")).length === 7);
    await page.screenshot({ path: path.join(SHOTS, "14-streak-card.png"), clip: { x: 900, y: 0, width: 380, height: 360 } });
    await page.mouse.move(400, 600); await page.waitForTimeout(300);
    check("Moving away hides the streak card", !(await page.isVisible("#streak-pop")));
    check("Score shows 4 tiles", (await page.$$("#score > div")).length === 4);

    // Tabs
    await page.click('.tab[data-tab="applied"]'); await page.waitForTimeout(200);
    check("Applied tab shows 2 rows", (await page.$$(".row")).length === 2);
    // Sort on the Applied tab (test-a was applied today, test-c on 2026-09-21)
    const ids = () => page.$$eval(".row", (r) => r.map((x) => x.dataset.id).join());
    check("Sort menu shows on the Applied tab", await page.isVisible("#dd-f-sort"));
    await pick(page, "f-sort", "new");
    check("Newest applied first puts today's application on top", (await ids()) === "test-a,test-c", await ids());
    await pick(page, "f-sort", "old");
    check("Oldest applied first reverses it", (await ids()) === "test-c,test-a", await ids());
    await pick(page, "f-sort", "due");
    // two applied the same day: the one applied last comes first under Newest
    await page.click('.tab[data-tab="queue"]'); await page.waitForTimeout(150);
    await page.click('.row[data-id="test-b"] button[data-act="applied"]'); await page.waitForTimeout(400);
    await page.click('.tab[data-tab="applied"]'); await page.waitForTimeout(150);
    await pick(page, "f-sort", "new");
    check("Newest applied first: the last one you applied to is on top, even on the same day", (await ids()) === "test-b,test-a,test-c", await ids());
    await pick(page, "f-sort", "old");
    check("Oldest applied first: same-day applications in the order you applied", (await ids()) === "test-c,test-a,test-b", await ids());
    await pick(page, "f-sort", "due");
    await pick(page, "st-test-b", "new"); await page.waitForTimeout(300);
    await page.click('.tab[data-tab="mine"]'); await page.waitForTimeout(200);
    check("My links tab shows an Add job button, window closed", (await page.isVisible("#add-open")) && !(await page.isVisible("#addbox")));
    await page.click("#add-open"); await page.waitForTimeout(150);
    check("Add link opens a floating window with the cursor in the box", (await page.isVisible("#add-modal")) && (await page.evaluate(() => document.activeElement.id)) === "add-links");
    await page.screenshot({ path: path.join(SHOTS, "15-add-link.png") });
    await page.mouse.click(30, 950); await page.waitForTimeout(150);
    check("Clicking outside closes the window", !(await page.isVisible("#add-modal")));
    await page.click("#add-open"); await page.waitForTimeout(100); await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    check("Escape closes the window", !(await page.isVisible("#add-modal")));
    await page.click("#add-open"); await page.fill("#add-links", "https://example.com/jobs/new-one"); await page.click("#add-go"); await page.waitForTimeout(400);
    check("Adding a link saves it and closes the window", !(await page.isVisible("#add-modal")) && (await page.evaluate(() => window.__writes.some((w) => w.set && w.set.url === "https://example.com/jobs/new-one"))));
    // Paste a job description with no link
    await page.click("#add-open"); await page.evaluate(() => { document.getElementById("add-jdwrap").open = true; }); await page.fill("#add-jd", "Too short"); await page.click("#add-go"); await page.waitForTimeout(200);
    check("A too-short pasted description is refused with a reason", (await page.isVisible("#add-modal")) && /too short/i.test(await page.textContent("#add-status")));
    const pastedJd = "Operations Associate at Made Up Robotics\nAustin, TX (Hybrid)\nYou will run day to day operations, work with customers, and help the founders ship. 0-2 years experience.";
    await page.fill("#add-jd", pastedJd); await page.fill("#add-status", "").catch(() => {}); await page.evaluate(() => { document.getElementById("add-status").textContent = ""; }); await page.screenshot({ path: path.join(SHOTS, "15b-add-description.png") }); await page.click("#add-go"); await page.waitForTimeout(500);
    const pw2 = await page.evaluate(() => window.__writes.filter((w) => w.set && w.set.url === "" && w.set.source === "Pasted"));
    check("A description with no link is saved as a job and the window closes", !(await page.isVisible("#add-modal")) && pw2.length === 1 && /Made Up Robotics/.test(pw2[0].set.jd) && pw2[0].set.role === "Operations Associate at Made Up Robotics");
    const pid = pw2.length ? pw2[0].path.split("/")[1] : "";
    const prow = page.locator(`.row[data-id="${pid}"]`);
    check("The pasted job shows in My links with no Open posting button", (await prow.count()) === 1 && (await prow.locator("text=Open posting").count()) === 0 && (await prow.locator(".role a").count()) === 0);
    check("If the details can't be read, the job doesn't stay stuck on pending", await page.evaluate((id) => window.__writes.some((w) => w.path === "jobs/" + id && w.patch && w.patch.pending === false), pid));
    await page.click("#add-open"); await page.evaluate(() => { document.getElementById("add-jdwrap").open = true; }); await page.fill("#add-jd", pastedJd); await page.click("#add-go"); await page.waitForTimeout(300);
    check("Pasting the same description twice is caught", (await page.isVisible("#add-modal")) && /already/i.test(await page.textContent("#add-status")));
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    await page.click('.tab[data-tab="queue"]'); await page.waitForTimeout(200);
    check("Sort menu is hidden on the Queue tab", !(await page.isVisible("#dd-f-sort")));

    // Search filter
    await page.fill("#f-q", "zzz-no-match"); await page.waitForTimeout(200);
    check("Search filter hides non-matching roles", (await page.$$(".row")).length === 0);
    await page.fill("#f-q", ""); await page.waitForTimeout(200);

    // Tailor drawer
    await page.click('.row[data-id="test-b"] button[data-act="tailor"]');
    await page.waitForTimeout(800);
    check("Tailor drawer opens", await page.isVisible("#t-drawer"));
    check("CV preview shows the name", (await page.textContent("#t-paper")).includes("ALEX SAMPLE"));
    check("One-page check chip shows", /page/i.test(await page.textContent("#t-fit")));
    check("Draft notes show (gaps, changes)", (await page.$$("#t-gaps li")).length > 0 && (await page.$$("#t-changes li")).length > 0);
    check("Chat history shows", (await page.$$("#t-msgs .msg")).length === 2);
    check("Download buttons show", (await page.isVisible("#t-dl")) && (await page.isVisible("#t-pdf")));
    await page.screenshot({ path: path.join(SHOTS, "2-drawer.png") });
    const dr = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect(), b = document.querySelector(".dbody");
      const sc = new DOMMatrix(getComputedStyle(document.getElementById("t-paper")).transform).a;
      return { w: r("#t-drawer").width, paperRight: r(".dpaper").right, toolsLeft: r(".dtabs").left, toolsW: r(".dtabs").width, scrolls: b.scrollHeight > b.clientHeight + 1, scale: sc };
    });
    check("Tailor CV takes the whole screen", dr.w === 1280, JSON.stringify(dr));
    check("CV paper sits on the left, slim tools column on the right", dr.paperRight <= dr.toolsLeft && dr.toolsW <= 460, JSON.stringify(dr));
    check("CV shows at reading size (95% or more at 1280 wide)", dr.scale >= 0.95, JSON.stringify(dr));
    check("Only the CV and chats scroll, not the whole drawer", !dr.scrolls, JSON.stringify(dr));
    // ---------- CV zoom (pinch, buttons, keys, double-click, memory) ----------
    const zs = () => page.evaluate(() => {
      const w = document.getElementById("t-pwrap").getBoundingClientRect(), pb = document.getElementById("t-pbreak");
      return { s: new DOMMatrix(getComputedStyle(document.getElementById("t-paper")).transform).a, pct: document.getElementById("t-zpct").textContent,
        wrapW: w.width, wrapH: w.height, chip: document.getElementById("t-fit").textContent, breakHidden: pb ? pb.hidden : null,
        wPressed: document.getElementById("t-zwidth").getAttribute("aria-pressed"), pPressed: document.getElementById("t-zpage").getAttribute("aria-pressed"),
        panelH: document.getElementById("t-papscroll").clientHeight, scrollsX: document.getElementById("t-papscroll").scrollWidth > document.getElementById("t-papscroll").clientWidth + 1, barsVisible: (() => { const b = document.getElementById("t-papbar").getBoundingClientRect(), p = document.querySelector(".dpaper").getBoundingClientRect(); return b.top >= p.top && b.bottom <= p.bottom; })(),
        store: localStorage.getItem("jobmaxxer-cv-zoom") };
    });
    const wheel = (ctrl, dy) => page.evaluate(([ctrl, dy]) => { const c = document.querySelector(".dpaper"), r = document.getElementById("t-papscroll").getBoundingClientRect();
      return !c.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, ctrlKey: ctrl, clientX: r.left + 240, clientY: r.top + 260, bubbles: true, cancelable: true })); }, [ctrl, dy]);
    const z0 = await zs();
    check("Zoom bar shows the percent and Fit width is on by default", /^\d+%$/.test(z0.pct) && z0.wPressed === "true" && z0.pPressed === "false" && Math.abs(parseInt(z0.pct) - Math.round(z0.s * 100)) <= 1, JSON.stringify(z0));
    const lay = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect(), bar = r("#t-papbar"), z = r(".zoomctl"), lab = r("#t-prevlabel");
      return { barH: bar.height, sameRow: z.top >= bar.top - 1 && z.bottom <= bar.bottom + 1 && Math.abs((z.top + z.bottom) / 2 - (lab.top + lab.bottom) / 2) < 6,
        paperTop: r("#t-papscroll").top, noteSize: parseFloat(getComputedStyle(document.querySelector(".papnote")).fontSize),
        chipInRefine: !!document.getElementById("t-fit").closest("#p-chat"), chipVisible: !!document.getElementById("t-fit").offsetParent, zoomBarGone: !document.getElementById("t-zoombar") };
    });
    check("Title and zoom buttons share one slim row", lay.sameRow && lay.barH < 44 && lay.zoomBarGone, JSON.stringify(lay));
    check("CV starts high on the screen (more room for the paper)", lay.paperTop < 150, JSON.stringify(lay));
    check("Fits-on-one-page chip sits in the Refine box and shows after tailoring", lay.chipInRefine && lay.chipVisible, JSON.stringify(lay));
    check("The 'read every line' note is small", lay.noteSize <= 11.5, JSON.stringify(lay));
    await page.screenshot({ path: path.join(SHOTS, "11-zoom-fit-width.png") });
    const blocked = await wheel(true, -20); for (let i = 0; i < 6; i++) await wheel(true, -20);
    const z1 = await zs();
    check("Trackpad pinch (wheel with ctrlKey) zooms the CV in and is kept from zooming the browser", blocked && z1.s > z0.s * 1.3, JSON.stringify([z0.s, z1.s, blocked]));
    check("A plain scroll wheel still scrolls the CV (not captured)", !(await wheel(false, 80)));
    check("Pinch zoom clears the Fit width mark and the percent follows", z1.wPressed === "false" && Math.abs(parseInt(z1.pct) - Math.round(z1.s * 100)) <= 1 && /custom/.test(z1.store || ""), JSON.stringify(z1));
    check("Zoomed CV stays the right size and can scroll sideways when wider than the panel", Math.abs(z1.wrapW - 612 * (96 / 72) * z1.s) < 3, JSON.stringify(z1));
    check("Zoom buttons stay in view while the CV is zoomed in", z1.barsVisible, JSON.stringify(z1));
    check("One-page chip and page-break line keep working while zoomed", z1.chip === z0.chip && z1.breakHidden === z0.breakHidden, JSON.stringify([z0.chip, z1.chip]));
    await page.screenshot({ path: path.join(SHOTS, "12-zoom-pinched-in.png") });
    for (let i = 0; i < 40; i++) await wheel(true, 30);
    const zmin = await zs();
    check("Zoom stops at 40%", Math.abs(zmin.s - 0.4) < 0.005 && zmin.pct === "40%" && (await page.isDisabled("#t-zout")), JSON.stringify(zmin));
    await page.screenshot({ path: path.join(SHOTS, "13-zoom-40.png") });
    for (let i = 0; i < 80; i++) await wheel(true, -30);
    const zmax = await zs();
    check("Zoom stops at 200%", Math.abs(zmax.s - 2) < 0.005 && zmax.pct === "200%" && (await page.isDisabled("#t-zin")), JSON.stringify(zmax));
    await page.click("#t-zwidth"); await page.waitForTimeout(100);
    const zw = await zs();
    check("Fit width button goes back to the reading-size fit", Math.abs(zw.s - z0.s) < 0.01 && zw.wPressed === "true" && !zw.scrollsX, JSON.stringify(zw));
    await page.click("#t-zin"); await page.waitForTimeout(80);
    const zi = await zs();
    check("Plus button steps the zoom up by about 10 points", zi.s > zw.s && parseInt(zi.pct) % 10 === 0 && parseInt(zi.pct) - parseInt(zw.pct) <= 10 && parseInt(zi.pct) - parseInt(zw.pct) > 0, JSON.stringify([zw.pct, zi.pct]));
    await page.click("#t-zout"); await page.click("#t-zout"); await page.waitForTimeout(80);
    const zo = await zs();
    check("Minus button steps it down", zo.s < zi.s && parseInt(zo.pct) % 10 === 0, JSON.stringify([zi.pct, zo.pct]));
    await page.click("#t-zpage"); await page.waitForTimeout(120);
    const zp = await zs();
    check("Whole page shows the full page inside the panel without scrolling", zp.pPressed === "true" && zp.wrapH <= zp.panelH && zp.wrapH >= 600 && !zp.scrollsX && zp.s <= z0.s + 0.001, JSON.stringify(zp));
    await page.screenshot({ path: path.join(SHOTS, "14-zoom-whole-page.png") });
    await page.dblclick("#t-paper", { position: { x: 300, y: 300 } }); await page.waitForTimeout(100);
    check("Double-click on the CV goes from Whole page to Fit width", (await zs()).wPressed === "true");
    await page.dblclick("#t-paper", { position: { x: 300, y: 300 } }); await page.waitForTimeout(100);
    check("Double-click again goes back to Whole page", (await zs()).pPressed === "true");
    await page.keyboard.press("Control+Equal"); await page.waitForTimeout(80);
    const k1 = await zs();
    check("Ctrl and plus zooms in", k1.s > zp.s && k1.pPressed === "false", JSON.stringify([zp.pct, k1.pct]));
    await page.keyboard.press("Control+Minus"); await page.waitForTimeout(80);
    check("Ctrl and minus zooms out", (await zs()).s < k1.s);
    await page.keyboard.press("Control+Equal"); await page.keyboard.press("Control+Equal"); await page.keyboard.press("Control+0"); await page.waitForTimeout(100);
    const k0 = await zs();
    check("Ctrl and 0 goes back to Fit width", k0.wPressed === "true" && Math.abs(k0.s - z0.s) < 0.01, JSON.stringify(k0));
    await page.keyboard.press("Shift+Equal"); await page.waitForTimeout(80);
    check("Plain + zooms when you are not typing in a box", (await zs()).s > k0.s);
    await page.click("#t-zwidth");
    await page.focus("#t-msg"); const zb = await zs(); await page.keyboard.press("-"); await page.keyboard.press("Shift+Equal");
    check("Plain + and - just type when you are in the chat box", (await page.inputValue("#t-msg")) === "-+" && Math.abs((await zs()).s - zb.s) < 0.001);
    await page.fill("#t-msg", "");
    await page.click("#t-zin"); await page.click("#t-zin"); const zsaved = await zs();
    await page.reload(); await page.waitForTimeout(1200);
    await page.click('.row[data-id="test-b"] button[data-act="tailor"]'); await page.waitForTimeout(800);
    const zr = await zs();
    check("The zoom is remembered after a reload", zr.pct === zsaved.pct && zr.wPressed === "false", JSON.stringify([zsaved.pct, zr.pct]));
    await page.click("#t-zwidth"); await page.waitForTimeout(80);
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await page.click('.row[data-id="test-a"] button[data-act="tailor"]'); await page.waitForTimeout(600);
    check("Before tailoring there is no fit row (master CV only)", !(await page.isVisible("#t-fitrow")) && (await page.textContent("#t-prevlabel")) === "Your master CV");
    await page.screenshot({ path: path.join(SHOTS, "15-master-cv-compact.png") });
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await page.click('.row[data-id="test-b"] button[data-act="tailor"]'); await page.waitForTimeout(600);
    check("No script errors after using the zoom", errors.length === 0, errors.join(" | "));
    check("Drawer opens on the chat tab", (await page.isVisible("#t-msgs")) && !(await page.isVisible("#a-q")) && !(await page.isVisible("#t-jd")));
    check("Notes tab shows the number of gaps", (await page.textContent("#t-notecount")).trim() === String(await page.$$eval("#t-gaps li", (x) => x.length)));
    await page.click("#tab-notes"); await page.waitForTimeout(80);
    check("Notes tab shows gaps, changes and keywords", (await page.isVisible("#t-gaps")) && (await page.isVisible("#t-kw")) && !(await page.isVisible("#t-msgs")));
    await page.click("#tab-ans"); await page.waitForTimeout(80);
    check("Answers tab shows the questions box", await page.isVisible("#a-q"));
    await page.click("#tab-jd"); await page.waitForTimeout(80);
    check("Job description tab shows the posting", (await page.isVisible("#t-jd")) && (await page.inputValue("#t-jd")).includes("reporting"));
    await page.screenshot({ path: path.join(SHOTS, "10-drawer-jd-tab.png") });
    await page.click("#tab-chat");
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    check("Escape closes the drawer", !(await page.isVisible("#t-drawer")));
    // Settings tab
    // Top bar and profile menu
    check("Top bar shows the logo, 5 sections and a profile button", (await page.$$(".nav .tab")).length === 5 && (await page.isVisible("#me-btn")));
    check("Active section is marked in the top bar", (await page.getAttribute('.nav .tab[data-tab="queue"]', "aria-pressed")) === "true");
    check("Profile menu starts closed", !(await page.isVisible("#me-menu")));
    await page.click("#me-btn"); await page.waitForTimeout(150);
    check("Profile button opens the menu with Master CV, preferences and Search settings", (await page.isVisible("#me-menu")) && (await page.$$("#me-menu .menuitem")).length === 3);
    await page.screenshot({ path: path.join(SHOTS, "7-menu-open.png") });
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    check("Escape closes the profile menu", !(await page.isVisible("#me-menu")));
    await page.click("#me-btn"); await page.click("#list", { force: true }).catch(() => {}); await page.waitForTimeout(100);
    check("Clicking elsewhere closes the profile menu", !(await page.isVisible("#me-menu")));

    // Master CV editor
    await page.click("#me-btn"); await page.click('#me-menu [data-tab="cv"]'); await page.waitForTimeout(200);
    check("Master CV page opens and hides the job list", (await page.isVisible("#cvedit")) && !(await page.isVisible("#list")) && (await page.textContent("#viewtitle")) === "Master CV and voice");
    check("Master CV editor shows the CV (name and bullets)", (await page.inputValue('#cv-form input[data-cv="name"]')) === "ALEX SAMPLE" && (await page.$$("#cv-form .bul textarea")).length >= 6);
    // Master CV print preview: same page checks as a tailored CV
    await page.waitForTimeout(400);
    const mfit = await page.$eval("#m-paper", (p) => (p.dataset.fit ? JSON.parse(p.dataset.fit) : null));
    check("Master CV page shows a print preview with a fit chip", (await page.isVisible("#m-paper .nm")) && /One page|Page filled|onto page 2/.test(await page.textContent("#m-fit")) && !!mfit, await page.textContent("#m-fit"));
    check("Preview shows only core lines (optional ones are hidden)", !(await page.$('#m-paper li[data-id="acme3"]')) && !!(await page.$('#m-paper li[data-id="acme1"]')));
    check("Preview hint says what to do about empty space", /empty line|One full page/.test(await page.textContent("#m-hint")), await page.textContent("#m-hint"));
    await page.click('#cv-form button[data-optbul="0.0.2"]'); await page.waitForTimeout(450);
    const eyeOn = !!(await page.$('#m-paper li[data-id="acme3"]'));
    await page.click('#cv-form button[data-optbul="0.0.2"]'); await page.waitForTimeout(450);
    check("The eye button shows a hidden line on the page and hides it again", eyeOn && !(await page.$('#m-paper li[data-id="acme3"]')));
    await page.fill('#cv-form textarea[data-cv="sections.0.entries.0.bullets.0.text"]', "Cut weekend wait times by moving one cook to prep during the lunch rush, an idea the GM rolled out to two other stores");
    await page.waitForTimeout(450);
    const spill = await page.$eval("#m-paper", (p) => JSON.parse(p.dataset.fit).spills.map((x) => x.id));
    check("Preview marks a line that spills a word, as you type", spill.includes("acme1") && !!(await page.$('#m-paper li.orphan[data-id="acme1"]')) && /spill/.test(await page.textContent("#m-fit")), JSON.stringify(spill));
    check("Preview buttons for .docx and .pdf show", (await page.isVisible("#m-dl")) && (await page.isVisible("#m-pdf")));
    await page.fill('#cv-form textarea[data-cv="sections.0.entries.0.bullets.0.text"]', "Ran daily dispatch for 40 drivers across 3 routes, every weekday");
    await page.click('#cv-form button[data-addbul="0.0"]'); await page.waitForTimeout(100);
    await page.keyboard.type("Trained 2 new dispatchers");
    await page.click('#cv-form button[data-rmbul="0.0.1"]'); await page.waitForTimeout(100);
    await page.fill("#v-samples", "First thing I wrote.\n---\nSecond thing I wrote.");
    await page.screenshot({ path: path.join(SHOTS, "8-master-cv.png"), fullPage: true });
    await page.click("#cv-save"); await page.waitForTimeout(300);
    const allW = await page.evaluate(() => window.__writes);
    const cvw = allW.find((x) => x.path === "profile/cv"), vw = allW.find((x) => x.path === "profile/voice");
    const b0 = cvw && cvw.patch.cv.sections[0].entries[0].bullets;
    check("Saving writes the edited, added and removed bullets", b0 && b0.length === 3 && /every weekday/.test(b0[0].text) && b0[2].text === "Trained 2 new dispatchers" && b0[1].optional === true && !b0.some((b) => /weekly report/.test(b.text)), JSON.stringify(b0));
    check("Saving splits writing samples on ---", vw && vw.set.samples.length === 2, JSON.stringify(vw));

    await page.click("#me-btn"); await page.click('#me-menu [data-tab="settings"]'); await page.waitForTimeout(200);
    check("Settings tab shows the settings and hides the job list", (await page.isVisible("#settings")) && !(await page.isVisible("#list")) && !(await page.isVisible("#filters")));
    check("Settings start from the defaults (Austin, on-site + hybrid, all role types, target 30)",
      (await page.textContent("#set-cities")).includes("Austin") && (await page.isChecked("#set-arr-on-site")) && (await page.isChecked("#set-arr-hybrid")) && !(await page.isChecked("#set-arr-remote"))
      && (await page.$$eval('input[name="set-role"]:checked', (x) => x.length)) === 14 && (await page.inputValue("#set-target")) === "30");
    await page.fill("#set-city-new", "Chicago"); await page.click("#set-city-add");
    await page.uncheck("#set-role-language"); await page.fill("#set-target", "25");
    await page.screenshot({ path: path.join(SHOTS, "5-settings.png"), fullPage: true });
    await page.click("#set-save"); await page.waitForTimeout(300);
    const sw = (await page.evaluate(() => window.__writes)).find((x) => x.path === "profile/search");
    check("Save writes the settings (new city, unticked role, new target)", sw && sw.set.cities.join() === "Austin,Chicago" && !sw.set.roles.includes("language") && sw.set.dailyTarget === 25 && sw.set.arrangements.join() === "On-site,Hybrid", JSON.stringify(sw));
    check("Header and daily target update after saving", /Austin \+ Chicago/.test(await page.textContent("#scope")) && (await page.textContent("#s-target")) === "25");
    await page.click('#set-cities button[data-rmcity="0"]'); await page.click('#set-cities button[data-rmcity="0"]');
    await page.click("#set-save"); await page.waitForTimeout(200);
    check("Can't save with no cities", /at least one city/i.test(await page.textContent("#set-status")));
    await page.click('.tab[data-tab="queue"]'); await page.waitForTimeout(200);
    await pick(page, "st-test-b", "interview");
    const iw = (await page.evaluate(() => window.__writes)).filter((x) => x.path === "jobs/test-b").pop();
    check("Row status dropdown saves the new status", iw && iw.patch.status === "interview", JSON.stringify(iw));
    check("Still no script errors after clicking around", errors.length === 0, errors.join(" | "));

    // ---------- daily goal: 29 applied today, the next Applied click hits 30 ----------
    // Moving an applied job back to New undoes it: today's count drops and the date is cleared.
    const undo = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await undo.addInitScript(fakeClaude, data);
    await undo.goto("file://" + testFile); await undo.waitForTimeout(1000);
    await undo.click('.row[data-id="test-a"] button[data-act="applied"]'); await undo.waitForTimeout(300);
    const t1 = await undo.textContent("#s-today");
    await undo.click('.tab[data-tab="applied"]'); await undo.waitForTimeout(200);
    await pick(undo, "st-test-a", "new"); await undo.waitForTimeout(300);
    const uw = await undo.evaluate(() => window.__writes.filter((x) => x.path === "jobs/test-a").pop());
    check("Moving an applied job back to the queue takes it off Applied today", t1 === "1" && (await undo.textContent("#s-today")) === "0" && uw.patch.status === "new" && uw.patch.applied === "", JSON.stringify([t1, uw]));
    await undo.close();
    // Old records already back in the queue with an applied date don't count either.
    const stale = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const tdS = await stale.evaluate(() => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); });
    await stale.addInitScript(fakeClaude, { ...data, jobs: data.jobs.map((j) => (j.id === "test-a" ? { ...j, status: "new", applied: tdS, followup: tdS } : j)) });
    await stale.goto("file://" + testFile); await stale.waitForTimeout(1000);
    check("A queued job with a leftover applied date doesn't count as applied today", (await stale.textContent("#s-today")) === "0");
    check("Score tiles sit in one strip", await stale.$eval("#score", (s) => getComputedStyle(s).columnGap === "1px" && getComputedStyle(s).borderTopWidth === "1px"));
    await stale.close();

    const goalPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const gErr = []; goalPage.on("pageerror", (e) => gErr.push(e.message));
    const td = await goalPage.evaluate(() => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); });
    const back = (n) => { const d = new Date(td + "T12:00:00"); d.setDate(d.getDate() - n); const p = (x) => String(x).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
    // Yesterday also hit 30 (every day counts, weekends too), so the streak should read 1 now and 2 after the goal.
    const prev = 1;
    const filler = (d, n, tag) => Array.from({ length: n }, (_, i) => ({ id: `g-${tag}-${i}`, company: "Filler " + i, role: "Role", url: "https://example.com", status: "applied", applied: d, followup: d, fit: "B", track: "Ops" }));
    const goalJobs = [...data.jobs, ...filler(td, 29, "t"), ...filler(back(prev), 30, "y")];
    await goalPage.addInitScript(fakeClaude, { ...data, jobs: goalJobs });
    await goalPage.goto("file://" + testFile); await goalPage.waitForTimeout(1000);
    check("Streak counts the last goal day (1 day, flame lit)", (await goalPage.textContent("#s-streak")) === "1" && (await goalPage.$eval("#streakwrap", (x) => x.classList.contains("lit"))), await goalPage.textContent("#s-streak"));
    check("Streak tile says what keeps it (1 more today)", /1 more today/.test(await goalPage.textContent("#s-streaksub")), await goalPage.textContent("#s-streaksub"));
    const gap = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gap.addInitScript(fakeClaude, { ...data, jobs: [...data.jobs, ...filler(back(2), 30, "g")] });
    await gap.goto("file://" + testFile); await gap.waitForTimeout(1000);
    check("A missed day breaks the streak, weekends too", (await gap.textContent("#s-streak")) === "0" && (await gap.textContent("#sp-best")) === "1");
    await gap.close();
    await goalPage.click('.row[data-id="test-a"] button[data-act="applied"]'); await goalPage.waitForTimeout(900);
    check("Hitting the daily goal opens the full-screen celebration", (await goalPage.isVisible(".goal")) && /DAILY GOAL/.test(await goalPage.textContent(".goal")) && /30 \/ 30/.test(await goalPage.textContent(".goalnum")));
    check("Celebration covers the whole screen with the waving flag", (await goalPage.$eval(".goal", (g) => { const r = g.getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight; })) && (await goalPage.$$(".goal .gflag")).length === 1);
    check("The flag is drawn (cloth pixels on its canvas)", await goalPage.$eval(".gflag", (c) => { const d = c.getContext("2d").getImageData(c.width * .5, c.height * .45, 1, 1).data; return d[3] > 0; }));
    await goalPage.screenshot({ path: path.join(SHOTS, "13-goal.png") });
    check("Applied today tile shows Goal hit", (await goalPage.isVisible("#s-goalhit")) && (await goalPage.$eval("#t-today", (x) => x.classList.contains("done"))));
    check("Streak goes up to 2 when today's goal is hit", (await goalPage.textContent("#s-streak")) === "2");
    await goalPage.keyboard.press("Escape"); await goalPage.waitForTimeout(500);
    check("Escape closes the celebration", !(await goalPage.$(".goal")));
    await goalPage.click("#t-today"); await goalPage.waitForTimeout(300);
    check("Clicking the Applied today tile replays it", await goalPage.isVisible(".goal"));
    await goalPage.click(".goal"); await goalPage.waitForTimeout(500);
    check("Clicking anywhere closes it", !(await goalPage.$(".goal")));
    check("No script errors in the goal flow", gErr.length === 0, gErr.join(" | "));
    await goalPage.close();

    // ---------- job buttons inside the Tailor CV view ----------
    const dp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const dErr = []; dp.on("pageerror", (e) => dErr.push(e.message));
    await dp.addInitScript(fakeClaude, data); await dp.goto("file://" + testFile); await dp.waitForTimeout(1000);
    await dp.click('.row[data-id="test-b"] button[data-act="tailor"]'); await dp.waitForTimeout(600);
    check("Tailor CV header has Open posting, Applied, Skip and a status menu", (await dp.getAttribute("#t-jobacts a.btn", "href")) === "https://example.com/b"
      && (await dp.isVisible('#t-jobacts button[data-dact="applied"]')) && (await dp.isVisible('#t-jobacts button[data-dact="skip"]')) && (await dp.isVisible("#dd-dst-test-b")));
    await dp.screenshot({ path: path.join(SHOTS, "16-drawer-job-buttons.png") });
    await dp.click('#t-jobacts button[data-dact="applied"]'); await dp.waitForTimeout(400);
    const dw = (await dp.evaluate(() => window.__writes)).filter((x) => x.path === "jobs/test-b").pop();
    check("Applied from inside the Tailor CV view saves it and keeps the view open", dw && dw.patch.status === "applied" && dw.patch.followup && (await dp.isVisible("#t-drawer")) && /Applied/.test(await dp.textContent("#t-jobacts .stat")), JSON.stringify(dw));
    await pick(dp, "dst-test-b", "interview");
    const dw2 = (await dp.evaluate(() => window.__writes)).filter((x) => x.path === "jobs/test-b").pop();
    check("Status menu inside the view works", dw2 && dw2.patch.status === "interview", JSON.stringify(dw2));
    await dp.click("#tab-notes"); await dp.fill("#t-notes", "Spoke to the hiring manager"); await dp.click("#tab-chat"); await dp.waitForTimeout(200);
    const dw3 = (await dp.evaluate(() => window.__writes)).filter((x) => x.path === "jobs/test-b").pop();
    check("Your notes save from inside the view", dw3 && dw3.patch.notes === "Spoke to the hiring manager", JSON.stringify(dw3));
    check("No script errors in the Tailor CV view", dErr.length === 0, dErr.join(" | "));
    await dp.close();

    // ---------- very wide screen ----------
    const wide = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await wide.addInitScript(fakeClaude, data);
    await wide.goto("file://" + testFile);
    await wide.waitForTimeout(1000);
    const tops = await wide.$$eval(".row", (r) => r.map((x) => Math.round(x.getBoundingClientRect().top)));
    check("Very wide screen: one job per row, stacked", tops.length === 2 && tops[1] > tops[0], tops.join());
    await wide.screenshot({ path: path.join(SHOTS, "11-wide.png") });
    await wide.close();

    // ---------- phone ----------
    const phone = await browser.newPage({ viewport: { width: 400, height: 860 } });
    await phone.addInitScript(fakeClaude, data);
    await phone.goto("file://" + testFile);
    await phone.waitForTimeout(1000);
    check("Phone width: no sideways scrolling", (await phone.evaluate(() => document.documentElement.scrollWidth)) <= 400);
    check("Phone width: section buttons all reachable in the top bar", (await phone.$$(".nav .tab")).length === 5 && (await phone.isVisible("#me-btn")));
    await phone.screenshot({ path: path.join(SHOTS, "3-phone.png"), fullPage: true });
    await phone.click('.row[data-id="test-b"] button[data-act="tailor"]'); await phone.waitForTimeout(600);
    check("Phone width: drawer is full width with no sideways scrolling", (await phone.$eval("#t-drawer", (d) => Math.round(d.getBoundingClientRect().width))) === 400
      && (await phone.$eval(".dbody", (b) => b.scrollWidth <= b.clientWidth)));
    await phone.screenshot({ path: path.join(SHOTS, "12-phone-drawer.png") });
    await phone.keyboard.press("Escape");

    // ---------- header follows the city setting ----------
    const multi = await browser.newPage({ viewport: { width: 400, height: 860 } });
    const jobsSF = data.jobs.map((j) => (j.id === "test-b" ? { ...j, city: "SF" } : j));
    await multi.addInitScript(fakeClaude, { ...data, jobs: jobsSF, profile_search: { cities: ["Austin", "SF", "NYC"] } });
    await multi.goto("file://" + testFile);
    await multi.waitForTimeout(1000);
    const mscope = await multi.textContent("#scope");
    check("Header line lists every city when more are added", /Austin \+ SF \+ NYC/.test(mscope) && /6:55am/.test(mscope), mscope);
    check("Phone width with 3 cities: no sideways scrolling", (await multi.evaluate(() => document.documentElement.scrollWidth)) <= 400);
    await multi.screenshot({ path: path.join(SHOTS, "4-phone-3-cities.png") });
    check("City filter shows when there are several cities", await multi.isVisible("#dd-f-city"));
    check("Each job shows its city tag", (await multi.$$eval(".row .city", (x) => x.map((c) => c.textContent))).sort().join() === "Austin,SF");
    const metaA = await multi.textContent('.row[data-id="test-a"] .meta');
    check("City is not said twice on a row (work setup drops the city name)", (metaA.match(/Austin/g) || []).length === 1 && /Hybrid/.test(metaA), metaA);
    await pick(multi, "f-city", "SF");
    check("City filter keeps only that city's jobs", (await multi.$$(".row")).length === 1 && (await multi.textContent(".row .city")) === "SF");
    await multi.click("#me-btn"); await multi.click('#me-menu [data-tab="settings"]'); await multi.waitForTimeout(200);
    check("Phone width: settings tab has no sideways scrolling", (await multi.evaluate(() => document.documentElement.scrollWidth)) <= 400);
    await multi.screenshot({ path: path.join(SHOTS, "6-phone-settings.png"), fullPage: true });

    // ---------- attention bell and paste mode ----------
    const li = (id, company, fit) => ({ id, company, role: "Sales Development Representative", url: "https://www.linkedin.com/jobs/view/" + id.length + "123456", linkedin: "https://www.linkedin.com/jobs/view/" + id.length + "123456",
      source: "LinkedIn", status: "new", found: "2026-10-05", fit, track: "Sales", cv: "Sales", city: "Austin", pending: true, pendingTried: true, pendingNote: "Found on LinkedIn only. Open it and paste the job description in Tailor CV to fill the details", flags: "LinkedIn only: check the posting" });
    const bp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const bErr = []; bp.on("pageerror", (e) => bErr.push(e.message));
    await bp.addInitScript(fakeClaude, { ...data, jobs: [...data.jobs, li("li-one", "Lima Co", "B"), li("li-two", "Kilo AI", "A")] });
    await bp.goto("file://" + testFile); await bp.waitForTimeout(1000);
    const due = Number(await bp.textContent("#s-due"));
    check("Bell in the top bar counts what needs you (2 descriptions + follow-ups due)", (await bp.isVisible(".topbar #bell-btn")) && (await bp.textContent("#bell-count")) === String(2 + due), await bp.textContent("#bell-count"));
    await bp.click("#bell-btn"); await bp.waitForTimeout(100);
    const pop = await bp.textContent("#bell-pop");
    check("Bell panel lists the descriptions to paste and the follow-ups due", /2 jobs need a description/.test(pop) && /LinkedIn only/.test(pop) && (!due || /follow-up/.test(pop)), pop);
    await bp.screenshot({ path: path.join(SHOTS, "17-bell.png"), clip: { x: 760, y: 0, width: 520, height: 330 } });
    await bp.click("#bell-paste"); await bp.waitForTimeout(150);
    check("Paste opens one job at a time, best fit first", (await bp.isVisible("#paste-modal")) && /1 of 2/.test(await bp.textContent(".pastestep")) && /Kilo AI/.test(await bp.textContent(".pastejob")) && (await bp.getAttribute("#paste-open", "href")) === "https://www.linkedin.com/jobs/view/6123456");
    await bp.screenshot({ path: path.join(SHOTS, "18-paste-mode.png") });
    await bp.click("#paste-save");
    check("Saving with nothing pasted asks for the description", /Paste the description first/.test(await bp.textContent("#paste-status")));
    const jdText = "About the role. You will prospect into mid-market accounts, book meetings for the sales team and learn our product inside out. Requirements: 0 to 2 years.";
    await bp.fill("#paste-text", jdText); await bp.keyboard.press("Control+Enter"); await bp.waitForTimeout(400);
    const pw = await bp.evaluate(() => window.__writes.filter((w) => w.path === "jobs/li-two").map((w) => w.patch));
    check("Save and next stores the description and takes the job off the list", pw.length >= 1 && pw[0].jd === jdText && pw[0].pendingTried === false && /2 of 2/.test(await bp.textContent(".pastestep")), JSON.stringify(pw));
    check("If Claude can't fill the details, the job still leaves pending (text kept)", pw.some((p) => p.pending === false));
    await bp.click("#paste-later"); await bp.waitForTimeout(100);
    check("Done screen after the last job, with what was added", /1 description added/.test(await bp.textContent("#paste-body")) && /1 left for later/.test(await bp.textContent("#paste-body")));
    await bp.keyboard.press("Escape"); await bp.waitForTimeout(100);
    check("Escape closes paste mode", !(await bp.isVisible("#paste-modal")));
    check("Bell count goes down after pasting", (await bp.textContent("#bell-count")) === String(1 + due), await bp.textContent("#bell-count"));
    if (due) { await bp.click("#bell-btn"); await bp.click("#bell-due"); await bp.waitForTimeout(150);
      check("Show follow-ups jumps to Applied, follow-up due first", (await bp.textContent("#viewtitle")) === "Applied" && (await bp.$eval("#f-sort", (s) => s.value)) === "due"); }
    check("No page errors around the bell and paste mode", bErr.length === 0, bErr.join(" | "));
    await bp.close();
    const clear = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await clear.addInitScript(fakeClaude, { ...data, jobs: data.jobs.filter((j) => j.status !== "applied") });
    await clear.goto("file://" + testFile); await clear.waitForTimeout(900);
    await clear.click("#bell-btn"); await clear.waitForTimeout(100);
    check("Nothing to do: no count on the bell and the panel says all clear", !(await clear.isVisible("#bell-count")) && /All clear/.test(await clear.textContent("#bell-pop")));
    await clear.close();
    await multi.click("#bell-btn"); await multi.waitForTimeout(100);
    check("Phone width: bell panel fits on screen", await multi.$eval("#bell-pop", (p) => { const r = p.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    await multi.screenshot({ path: path.join(SHOTS, "19-phone-bell.png") });
    // ---------- tailoring keeps going in the background ----------
    // Slow fake Claude: answers after 1.2s, and stops if the page aborts the request.
    const slowSample = () => {
      window.__aborted = 0; window.__tailorCalls = 0;
      const base = window.claude.use;
      const reply = { summary: { lead: "Background test lead.", body: "Tailored while the view was closed." }, bullets: {}, gaps: [], changes: ["test"], keywords: [] };
      window.claude = { use: async (n) => n !== "sample" ? base(n) : { json: (prompt, o = {}) => new Promise((res, rej) => {
        window.__tailorCalls++;
        const t = setTimeout(() => res(JSON.parse(JSON.stringify(reply))), 1200);
        if (o.signal) o.signal.addEventListener("abort", () => { clearTimeout(t); window.__aborted++; rej({ code: "cancelled" }); });
      }) } };
    };
    const bg = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const bgErr = []; bg.on("pageerror", (e) => bgErr.push(e.message));
    await bg.addInitScript(fakeClaude, data); await bg.addInitScript(slowSample);
    await bg.goto("file://" + testFile); await bg.waitForTimeout(900);
    await bg.click('.row[data-id="test-a"] button[data-act="tailor"]'); await bg.waitForTimeout(300);
    await bg.click("#t-go"); await bg.waitForTimeout(150);
    check("Tailoring says you can close the view", /close this/.test(await bg.textContent("#t-status")), await bg.textContent("#t-status"));
    await bg.click("#t-close"); await bg.waitForTimeout(150);
    check("Closing the Tailor CV view does not stop the tailor", (await bg.evaluate(() => window.__aborted)) === 0);
    check("The job row shows Tailoring CV while it runs", /Tailoring CV/.test(await bg.textContent('.row[data-id="test-a"] .meta')));
    await bg.screenshot({ path: path.join(SHOTS, "20-tailoring-in-background.png") });
    await bg.click('.row[data-id="test-a"] button[data-act="tailor"]'); await bg.waitForTimeout(150);
    check("Reopening the job shows the tailor still running, with Stop", /Thinking|Writing|Checking/.test(await bg.textContent("#t-status")) && (await bg.isVisible("#t-stop")) && (await bg.isDisabled("#t-go")), await bg.textContent("#t-status"));
    await bg.click("#t-close"); await bg.waitForTimeout(1800);
    const bgw = await bg.evaluate(() => window.__writes.filter((w) => w.path === "jobs/test-a" && w.patch && w.patch.tailor).length);
    check("The draft is saved even though the view was closed", bgw === 1, String(bgw));
    check("The row then shows CV tailored and a toast says it's ready", /CV tailored/.test(await bg.textContent('.row[data-id="test-a"] .meta')) && /CV ready: Alpha/.test(await bg.textContent("#toast")), await bg.textContent("#toast"));
    await bg.click('.row[data-id="test-b"] button[data-act="tailor"]'); await bg.waitForTimeout(300);
    await bg.click("#t-go"); await bg.waitForTimeout(150);
    await bg.click("#t-stop"); await bg.waitForTimeout(200);
    const stopW = await bg.evaluate(() => window.__writes.filter((w) => w.path === "jobs/test-b" && w.patch && w.patch.tailor).length);
    check("Stop still cancels a tailor and saves nothing", (await bg.evaluate(() => window.__aborted)) === 1 && stopW === 0 && /Stopped/.test(await bg.textContent("#t-status")) && !(await bg.isDisabled("#t-go")));
    // two tailors started back to back: the second waits in line, then runs by itself
    await bg.click("#t-close"); await bg.waitForTimeout(100);
    await bg.evaluate(() => { window.__tailorCalls = 0; });
    await bg.click('.row[data-id="test-a"] button[data-act="tailor"]'); await bg.waitForTimeout(200);
    await bg.click("#t-go"); await bg.waitForTimeout(100); await bg.click("#t-close"); await bg.waitForTimeout(100);
    await bg.click('.row[data-id="test-b"] button[data-act="tailor"]'); await bg.waitForTimeout(200);
    await bg.click("#t-go"); await bg.waitForTimeout(150);
    check("A second tailor waits in line instead of running at the same time", (await bg.evaluate(() => window.__tailorCalls)) === 1 && /In line/.test(await bg.textContent("#t-status")), await bg.textContent("#t-status"));
    await bg.click("#t-close"); await bg.waitForTimeout(100);
    check("The waiting job's row says Queued for tailoring", /Queued for tailoring/.test(await bg.textContent('.row[data-id="test-b"] .meta')) && /Tailoring CV/.test(await bg.textContent('.row[data-id="test-a"] .meta')));
    await bg.waitForTimeout(6000);
    const qw = await bg.evaluate(() => window.__writes.filter((w) => w.patch && w.patch.tailor).map((w) => w.path));
    check("Both finish, one after the other", (await bg.evaluate(() => window.__tailorCalls)) >= 2 && qw.filter((x) => x === "jobs/test-a").length === 2 && qw.includes("jobs/test-b"), JSON.stringify(qw));
    // Stop on a job that is still waiting: it leaves the line and never calls Claude
    await bg.evaluate(() => { window.__tailorCalls = 0; });
    await bg.click('.row[data-id="test-a"] button[data-act="tailor"]'); await bg.waitForTimeout(200);
    await bg.click("#t-go"); await bg.waitForTimeout(100); await bg.click("#t-close"); await bg.waitForTimeout(100);
    await bg.click('.row[data-id="test-b"] button[data-act="tailor"]'); await bg.waitForTimeout(200);
    await bg.click("#t-go"); await bg.waitForTimeout(100); await bg.click("#t-stop"); await bg.waitForTimeout(150);
    const stopStatus = await bg.textContent("#t-status"); await bg.waitForTimeout(3000);
    check("Stop on a queued tailor takes it out of line without using Claude", (await bg.evaluate(() => window.__writes.filter((w) => w.path === "jobs/test-b" && w.patch && w.patch.tailor).length)) === 1 && /Stopped/.test(stopStatus) && /Stopped/.test(await bg.textContent("#t-status")), String(await bg.evaluate(() => window.__tailorCalls)));
    check("No page errors around background tailoring", bgErr.length === 0, bgErr.join(" | "));
    await bg.close();

    // ---------- a failed tailor retries by itself and keeps its place in line ----------
    const flaky = () => {
      window.__calls = [];
      const base = window.claude.use;
      const reply = { summary: { lead: "Retry test lead.", body: "Tailored after one failed try." }, bullets: {}, gaps: [], changes: ["test"], keywords: [] };
      window.claude = { use: async (n) => n !== "sample" ? base(n) : { json: (prompt, o = {}) => new Promise((res, rej) => {
        const who = /Company: (\w+)/.exec(typeof prompt === "string" ? prompt : JSON.stringify(prompt)); window.__calls.push(who ? who[1] : "?");
        const first = window.__calls.length === 1;
        const t = setTimeout(() => (first ? rej({ code: "server_error" }) : res(JSON.parse(JSON.stringify(reply)))), first ? 200 : 400);
        if (o.signal) o.signal.addEventListener("abort", () => { clearTimeout(t); rej({ code: "cancelled" }); });
      }) } };
    };
    const rt = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const rtErr = []; rt.on("pageerror", (e) => rtErr.push(e.message));
    await rt.addInitScript(fakeClaude, data); await rt.addInitScript(flaky);
    await rt.goto("file://" + testFile); await rt.waitForTimeout(900);
    await rt.click('.row[data-id="test-a"] button[data-act="tailor"]'); await rt.waitForTimeout(200);
    await rt.click("#t-go"); await rt.waitForTimeout(100); await rt.click("#t-close"); await rt.waitForTimeout(100);
    await rt.click('.row[data-id="test-b"] button[data-act="tailor"]'); await rt.waitForTimeout(200);
    await rt.click("#t-go"); await rt.waitForTimeout(100); await rt.click("#t-close");
    await rt.waitForTimeout(400);
    await rt.click('.row[data-id="test-a"] button[data-act="tailor"]'); await rt.waitForTimeout(100);
    check("A failed try says it is trying again by itself", /Trying again/i.test(await rt.textContent("#t-status")), await rt.textContent("#t-status"));
    await rt.click("#t-close"); await rt.waitForTimeout(7000);
    const order = await rt.evaluate(() => window.__writes.filter((w) => w.patch && w.patch.tailor).map((w) => w.path));
    const calls = await rt.evaluate(() => window.__calls);
    check("After a failure it retries on its own and still finishes first, then the next in line", order[0] === "jobs/test-a" && order.includes("jobs/test-b") && calls.indexOf("Beta") > calls.lastIndexOf("Alpha") - 0 && calls[0] === "Alpha" && calls[1] === "Alpha", JSON.stringify({ order, calls }));
    check("No page errors around retries", rtErr.length === 0, rtErr.join(" | "));
    await rt.close();

    // ---------- a brand new copy: empty database, nothing set up yet ----------
    check("The page has no personal details baked in", !/denis|popov|\bUCD\b|hitchhik|starpool|bitpilot|arrive logistics|kilian/i.test(html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, "")));
    check("The page talks about the person without he/his/him", !/\b(he|his|him|himself)\b/i.test(html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, "")));
    const fresh = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const frErr = []; fresh.on("pageerror", (e) => frErr.push(e.message));
    await fresh.addInitScript(fakeClaude, { jobs: [] });
    await fresh.goto("file://" + testFile); await fresh.waitForTimeout(800);
    check("Fresh copy: the queue opens empty", /No roles yet/.test(await fresh.textContent("#list")), await fresh.textContent("#list"));
    await fresh.click("#me-btn"); await fresh.click('#me-menu [data-tab="cv"]'); await fresh.waitForTimeout(200);
    check("Fresh copy: Master CV page says how to add a CV", /No master CV yet/.test(await fresh.textContent("#cv-form")), await fresh.textContent("#cv-form"));
    await fresh.screenshot({ path: path.join(SHOTS, "fresh-master-cv.png"), fullPage: true });
    await fresh.click("#me-btn"); await fresh.click('#me-menu [data-tab="settings"]'); await fresh.waitForTimeout(200);
    check("Fresh copy: no companies skipped by default", (await fresh.inputValue("#set-skip")) === "");
    await fresh.fill("#set-about", "Recent marketing graduate who wants community roles.");
    await fresh.click("#set-save"); await fresh.waitForTimeout(300);
    const fsw = (await fresh.evaluate(() => window.__writes)).find((x) => x.path === "profile/search");
    check("Fresh copy: About you saves with the search settings", fsw && fsw.set.about === "Recent marketing graduate who wants community roles.", JSON.stringify(fsw));
    await fresh.screenshot({ path: path.join(SHOTS, "fresh-settings.png"), fullPage: true });

    // Role types, level and job type are the person's own
    await fresh.click('#set-roles button[data-rmrole="0"]'); await fresh.waitForTimeout(80);
    check("A role type can be removed", (await fresh.$$("#set-roles .rolerow")).length === 13 && !(await fresh.$("#set-role-sdr")));
    await fresh.uncheck("#set-role-gtm");
    await fresh.fill("#set-role-name", "Nursing"); await fresh.fill("#set-role-ex", "Registered nurse, ICU nurse"); await fresh.press("#set-role-ex", "Enter"); await fresh.waitForTimeout(80);
    check("A new role type can be added and starts ticked", (await fresh.isChecked("#set-role-nursing")) && /Registered nurse/.test(await fresh.textContent("#set-roles")) && !(await fresh.isChecked("#set-role-gtm")));
    await pick(fresh, "set-level", "senior"); await pick(fresh, "set-years", "99");
    await fresh.check("#set-jt-part-time"); await fresh.uncheck("#set-jt-full-time");
    await fresh.screenshot({ path: path.join(SHOTS, "fresh-settings-custom.png"), fullPage: true });
    await fresh.click("#set-save"); await fresh.waitForTimeout(300);
    const fs2 = (await fresh.evaluate(() => window.__writes)).filter((x) => x.path === "profile/search").pop();
    check("Saving keeps custom role types, level, job type and no year limit",
      fs2 && fs2.set.roleTypes.some((r) => r.id === "nursing" && r.ex === "Registered nurse, ICU nurse") && !fs2.set.roleTypes.some((r) => r.id === "sdr")
      && fs2.set.roles.includes("nursing") && !fs2.set.roles.includes("gtm") && fs2.set.level === "senior" && fs2.set.jobTypes.join() === "Part-time" && fs2.set.maxYears === 99, JSON.stringify(fs2 && fs2.set));
    check("Header line shows the chosen job type", /part-time/.test(await fresh.textContent("#scope")) && !/full-time/.test(await fresh.textContent("#scope")), await fresh.textContent("#scope"));
    check("Fresh copy: no page errors", frErr.length === 0, frErr.join(" | "));
    await fresh.close();
    const pr = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await pr.addInitScript(fakeClaude, { jobs: [], profile_search: { cities: ["Austin"], arrangements: ["On-site"], jobTypes: ["Part-time"], level: "senior", maxYears: 99,
      roleTypes: [{ id: "nursing", name: "Nursing", ex: "Registered nurse" }, { id: "teaching", name: "Teaching", ex: "" }], roles: ["nursing"] } });
    await pr.addInitScript(() => {
      window.__prompts = []; const base = window.claude.use;
      window.claude.use = async (n) => n === "sample" ? { json: async (p) => { window.__prompts.push(p); return { company: "Made Up Clinic", role: "Senior ICU Nurse", city: "Austin", track: "nursing", cv: "nursing", fit: "A", jd: "DOES: care", why: "Fits.", flags: "", arrangement: "On-site", salary: "", auth: "None stated" }; } } : base(n);
    });
    await pr.goto("file://" + testFile); await pr.waitForTimeout(800);
    await pr.click('.tab[data-tab="mine"]'); await pr.waitForTimeout(150); await pr.click("#add-open"); await pr.evaluate(() => { document.getElementById("add-jdwrap").open = true; });
    await pr.fill("#add-jd", "Senior ICU Nurse at Made Up Clinic\nAustin, TX, on-site, part-time\nCare for patients in the intensive care unit. 5+ years of ICU experience."); await pr.click("#add-go"); await pr.waitForTimeout(500);
    const prompt = (await pr.evaluate(() => window.__prompts))[0] || "";
    check("Job grading uses the person's own role types, level and job type", /Nursing \(Registered nurse\)/.test(prompt) && /senior/.test(prompt) && /part-time/.test(prompt) && !/Teaching/.test(prompt) && !/Sales or Ops/.test(prompt) && !/years\b.*\+ years/.test(prompt) && !/99\+/.test(prompt), prompt.slice(0, 600));
    const tw = await pr.evaluate(() => window.__writes.filter((w) => w.patch && w.patch.track).map((w) => w.patch.track));
    check("A job's role type is matched to the person's own name for it", tw[0] === "Nursing", JSON.stringify(tw));
    await pr.close();
  } finally {
    await browser.close();
    fs.rmSync(testFile, { force: true });
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots: tests/screenshots/`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("TEST CRASHED:", e.message); process.exit(1); });

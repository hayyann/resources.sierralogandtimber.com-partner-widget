/* ===========================================================================
   SIERRA LOG & TIMBER — LANDOWNER RESOURCES, AS A PARTNER WIDGET
   ===========================================================================

   One file, no dependencies, no build step. It runs inside an iframe that a
   partner pastes onto their own site, and every link it draws goes to
   resources.sierralogandtimber.com carrying that partner's UTM parameters.

   ## THE UTM PARAMETERS ARE THE POINT

   The widget before this one tagged the IFRAME's own address and stopped
   there, so a visitor who clicked through arrived at the shop with no
   campaign on the URL at all and the referring partner could not be told
   apart from organic traffic. Here the tag is applied where it is read: on
   the outbound link, every time one is built, by one function
   (`resourceUrl`) that nothing may go around.

   ## WHERE THE DATA COMES FROM

   resources.sierralogandtimber.com/search-index.json, which the directory
   already publishes for its own search box: every published county and every
   Census place inside one, about 106 KB over the wire with compression. It
   answers `Access-Control-Allow-Origin: *`, which is what makes a widget on
   somebody else's domain possible at all.

   IT IS FETCHED ON FIRST INTERACTION, never on load. A visitor who scrolls
   past this widget without touching it should pay nothing for it, and the
   state buttons below are drawn from a list in this file precisely so the
   first paint needs no network.

   ## THE RANKING IS THE DIRECTORY'S OWN

   `rank()` is a port of lib/resources/search.ts from the Sierra repository,
   tier for tier and tie-break for tie-break, so a search here and a search
   on the directory itself cannot disagree about what a query finds. The
   comments there carry the reasoning; the short version is that exact beats
   prefix beats word-start beats substring, a state-name match boosts within
   a tier but can never lift a tier, and a tie goes to the county because the
   broader answer is the better guess.
   =========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------- the source */

  var SITE = "https://resources.sierralogandtimber.com";
  var INDEX_URL = SITE + "/search-index.json";

  /**
   * The nine states the directory publishes, in the order it lists them.
   * Written out rather than derived from the index so the first paint needs
   * no network: a reader sees something to press before anything is fetched.
   * If the directory adds a state, this list gains a line and the widget is
   * otherwise unchanged; an unknown state in the index is still searchable,
   * it simply has no button until somebody adds one.
   */
  var STATES = [
    { code: "AZ", name: "Arizona" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "ID", name: "Idaho" },
    { code: "MT", name: "Montana" },
    { code: "NV", name: "Nevada" },
    { code: "OR", name: "Oregon" },
    { code: "UT", name: "Utah" },
    { code: "WA", name: "Washington" }
  ];

  var MAX_RESULTS = 12;

  /* -------------------------------------------------------- what the partner
     told us, and the two different places it can arrive from.

     FRAMED, which is the normal install: the snippet appends the partner's
     hostname to the iframe's address, so it is on THIS page's query string.

     SELF-HOSTED, where the partner drops widget.js straight onto their own
     page: there is no frame and no address of ours to decorate, so the
     parameters ride on the script tag's own `src`. `document.currentScript`
     is read here, at parse time, because it is null inside every callback
     after it. */

  var ownScript = document.currentScript;

  function paramsFromScript() {
    try {
      if (ownScript && ownScript.src) return new URL(ownScript.src).searchParams;
    } catch (e) { /* a script with no resolvable src tells us nothing */ }
    return new URLSearchParams("");
  }

  var fromScript = paramsFromScript();
  var fromPage = new URLSearchParams(window.location.search);

  /** The page's own query wins, because that is the framed install's channel. */
  function param(name, fallback) {
    var v = (fromPage.get(name) || fromScript.get(name) || "").trim();
    return v === "" ? fallback : v;
  }

  var framed = window.parent !== window;

  /**
   * utm_source, in order of preference: what the partner told us, then the
   * host we can work out, then a word that is at least honest about not
   * knowing.
   *
   * WHICH HOST DEPENDS ON WHETHER WE ARE IN A FRAME, and getting this
   * backwards would mislabel every lead. Framed, the partner's page is our
   * referrer and our own hostname is Sierra's, so the referrer is the answer.
   * Self-hosted, we ARE on the partner's page, so our own hostname is the
   * answer and the referrer is wherever the visitor happened to come from,
   * which would be somebody else's domain entirely.
   */
  function partnerHost() {
    if (!framed) return window.location.hostname;
    try {
      if (document.referrer) return new URL(document.referrer).hostname;
    } catch (e) { /* a malformed referrer is not worth an exception */ }
    return "";
  }

  var UTM = {
    source: param("source", partnerHost() || "partner-site"),
    medium: param("medium", "partner-widget"),
    campaign: param("campaign", "sierra-resources")
  };

  /* ------------------------------------------------------------ the addresses

     ONE FUNCTION BUILDS EVERY OUTBOUND LINK. Two things it must get right,
     and both have bitten this pattern before:

     1. Entries for towns already carry a query string — the directory sends
        "/idaho/bingham-county?from=aberdeen" so the page can say which town
        the reader came in on. Appending with "?" would produce two of them
        and the directory would read neither.
     2. utm_content names WHAT was clicked, which is the difference between
        knowing a partner sends traffic and knowing their visitors search for
        towns rather than counties. */

  function resourceUrl(path, content) {
    var url = new URL(path, SITE);
    url.searchParams.set("utm_source", UTM.source);
    url.searchParams.set("utm_medium", UTM.medium);
    url.searchParams.set("utm_campaign", UTM.campaign);
    if (content) url.searchParams.set("utm_content", content);
    return url.toString();
  }

  /* --------------------------------------------------------- the ranking, as
     lib/resources/search.ts has it. Tiers are named rather than inlined so the
     order is a fact of the file and not an accident of arithmetic. */

  var TIER_EXACT = 400;
  var TIER_PREFIX = 300;
  var TIER_WORD_START = 200;
  var TIER_SUBSTRING = 100;
  var STATE_BOOST = 50;

  /** The directory's own slug rules, so "dona ana" finds "Doña Ana County". */
  function slugify(text) {
    return String(text)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function tierFor(query, text) {
    var folded = slugify(text);
    if (folded === "") return 0;
    if (folded === query) return TIER_EXACT;
    if (folded.indexOf(query) === 0) return TIER_PREFIX;
    if (folded.indexOf("-" + query) !== -1) return TIER_WORD_START;
    if (folded.indexOf(query) !== -1) return TIER_SUBSTRING;
    return 0;
  }

  /**
   * A TOWN IS SCORED ON ITS OWN NAME AND NOTHING ELSE. Every town entry also
   * carries its county's name and slug, and scoring those too would answer a
   * county query with one row per town in it.
   */
  function candidatesFor(entry) {
    if (entry.place) return [entry.place];
    return [entry.slug, entry.name].concat(entry.altNames || []);
  }

  function rank(query, entries, limit) {
    var folded = slugify(query);
    if (folded === "") return [];

    var scored = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var cands = candidatesFor(entry);
      var best = 0;
      for (var c = 0; c < cands.length; c++) {
        var t = tierFor(folded, cands[c]);
        if (t > best) best = t;
      }
      if (best === 0) continue;
      if (tierFor(folded, entry.stateName) > 0) best += STATE_BOOST;
      scored.push({ entry: entry, score: best });
    }

    scored.sort(function (a, b) {
      return (
        b.score - a.score ||
        Number(!!a.entry.place) - Number(!!b.entry.place) ||
        (a.entry.place || a.entry.name).localeCompare(b.entry.place || b.entry.name) ||
        a.entry.name.localeCompare(b.entry.name) ||
        a.entry.stateName.localeCompare(b.entry.stateName)
      );
    });

    return scored.slice(0, limit || MAX_RESULTS).map(function (s) { return s.entry; });
  }

  /* ------------------------------------------------------------- the fetching

     Once, lazily, and shared: every caller awaits the same promise, so three
     keystrokes before the first response do not make three requests. */

  var indexPromise = null;

  function loadIndex() {
    if (indexPromise === null) {
      indexPromise = fetch(INDEX_URL, { credentials: "omit" })
        .then(function (r) {
          if (!r.ok) throw new Error(INDEX_URL + " answered " + r.status);
          return r.json();
        })
        .then(function (rows) {
          if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error("the directory index came back empty");
          }
          return rows;
        })
        .catch(function (err) {
          /* Let the next attempt try again rather than caching a failure:
             a widget that gives up for good on one dropped request is a
             widget that is broken for the rest of the visit. */
          indexPromise = null;
          throw err;
        });
    }
    return indexPromise;
  }

  /* --------------------------------------------------------------- the markup */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var root = document.getElementById("slt-resources");
  var listEl, statusEl, inputEl, stateWrap;

  /* A self-hosting partner who forgets the container gets a console line
     rather than a stack trace in the middle of their page. */
  if (root === null) {
    if (window.console && console.warn) {
      console.warn("Sierra resources widget: no element with id \"slt-resources\" on this page.");
    }
    return;
  }

  function shell() {
    root.innerHTML =
      '<div class="slt-head">' +
        '<h2 class="slt-title">Free help for land you own</h2>' +
        '<p class="slt-lede">Defensible space, home hardening, cost share and forest health ' +
          'programmes, listed county by county with the organisation behind each one. ' +
          'Find the county your land is in.</p>' +
      '</div>' +

      '<form class="slt-form" role="search" autocomplete="off">' +
        '<label class="slt-label" for="slt-q">Town or county</label>' +
        '<div class="slt-field">' +
          '<input class="slt-input" id="slt-q" type="search" name="q" ' +
            'placeholder="Grass Valley, Ada County, Bend…" ' +
            'aria-describedby="slt-status" enterkeyhint="search">' +
        '</div>' +
      '</form>' +

      '<div class="slt-states" role="group" aria-label="Browse by state">' +
        STATES.map(function (s) {
          return '<button type="button" class="slt-state" data-state="' + s.code + '">' +
            esc(s.name) + '</button>';
        }).join("") +
      '</div>' +

      '<p class="slt-status" id="slt-status" role="status" aria-live="polite"></p>' +
      '<ul class="slt-list"></ul>' +

      '<p class="slt-foot">' +
        '<a class="slt-all" href="' + esc(resourceUrl("/", "all-resources")) + '" ' +
          'target="_blank" rel="noopener">See every county we cover</a>' +
        '<span class="slt-by">Sierra Log &amp; Timber</span>' +
      '</p>';

    listEl = root.querySelector(".slt-list");
    statusEl = root.querySelector(".slt-status");
    inputEl = root.querySelector(".slt-input");
    stateWrap = root.querySelector(".slt-states");
  }

  /** One row. A town names the county it is going to, before it is reached. */
  function row(entry) {
    var isTown = !!entry.place;
    var title = isTown ? entry.place : entry.name;
    var under = isTown
      ? entry.name + ", " + entry.stateName
      : entry.stateName;
    var href = resourceUrl(entry.url, isTown ? "town" : "county");

    return '<li class="slt-item">' +
      '<a class="slt-link" href="' + esc(href) + '" target="_blank" rel="noopener">' +
        '<span class="slt-name">' + esc(title) + '</span>' +
        '<span class="slt-where">' + esc(under) + '</span>' +
        '<span class="slt-go" aria-hidden="true">View resources</span>' +
      '</a>' +
    '</li>';
  }

  function say(text) {
    statusEl.textContent = text;
    measure();
  }

  function draw(entries, note) {
    listEl.innerHTML = entries.map(row).join("");
    say(note);
  }

  /* ------------------------------------------------------------- the actions */

  var lastQuery = "";
  var activeState = param("state", "").toUpperCase();

  function search(query) {
    lastQuery = query;
    if (query.trim() === "") {
      if (activeState) return browse(activeState);
      listEl.innerHTML = "";
      say("");
      return;
    }

    say("Searching…");
    loadIndex().then(function (rows) {
      if (query !== lastQuery) return;          /* a later keystroke won */
      var hits = rank(query, rows, MAX_RESULTS);
      if (hits.length === 0) {
        listEl.innerHTML = "";
        say(
          "Nothing matches “" + query + "”. The directory covers " +
          STATES.length + " western states so far; try a county name, or browse a state."
        );
        return;
      }
      draw(hits, hits.length === 1 ? "1 match" : hits.length + " matches");
    }).catch(function () {
      if (query !== lastQuery) return;
      listEl.innerHTML = "";
      say("The directory could not be reached just now. Please try again in a moment.");
    });
  }

  function browse(code) {
    activeState = code;
    lastQuery = "";
    inputEl.value = "";

    [].forEach.call(stateWrap.querySelectorAll(".slt-state"), function (b) {
      var on = b.getAttribute("data-state") === code;
      b.classList.toggle("slt-state--on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    var label = (STATES.filter(function (s) { return s.code === code; })[0] || {}).name || code;
    say("Loading " + label + "…");

    loadIndex().then(function (rows) {
      if (activeState !== code) return;
      var counties = rows.filter(function (e) {
        return !e.place && e.stateCode === code;
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      if (counties.length === 0) {
        listEl.innerHTML = "";
        say("No counties published in " + label + " yet.");
        return;
      }
      draw(counties, counties.length + " counties in " + label);
    }).catch(function () {
      if (activeState !== code) return;
      listEl.innerHTML = "";
      say("The directory could not be reached just now. Please try again in a moment.");
    });
  }

  /* ------------------------------------------------------------- the plumbing */

  /**
   * Tell the parent page how tall we are, so the iframe can follow instead of
   * showing a scrollbar inside somebody else's layout. Sent on every change
   * and on every resize; a parent that is not listening simply ignores it,
   * which is why the snippet's script is optional and the iframe still works
   * without it.
   */
  function measure() {
    if (!framed) return;              /* self-hosted: the page sizes itself */
    var h = Math.ceil(root.getBoundingClientRect().height + 8);
    try {
      window.parent.postMessage({ type: "slt-resources:height", height: h }, "*");
    } catch (e) { /* a parent that refuses messages is not our problem */ }
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function start() {
    shell();

    var onType = debounce(function () { search(inputEl.value); }, 140);
    inputEl.addEventListener("input", onType);
    root.querySelector(".slt-form").addEventListener("submit", function (e) {
      e.preventDefault();
      search(inputEl.value);
    });

    stateWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".slt-state");
      if (!btn) return;
      var code = btn.getAttribute("data-state");
      if (code === activeState) {                /* pressing it again clears */
        activeState = "";
        btn.classList.remove("slt-state--on");
        btn.setAttribute("aria-pressed", "false");
        listEl.innerHTML = "";
        say("");
        return;
      }
      browse(code);
    });

    /* The index is fetched when somebody first shows an interest, and focus
       is the earliest honest signal of that. */
    inputEl.addEventListener("focus", function () { loadIndex().catch(function () {}); }, { once: true });

    window.addEventListener("resize", debounce(measure, 120));

    if (activeState) browse(activeState);
    else measure();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

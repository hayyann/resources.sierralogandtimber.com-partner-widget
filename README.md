# Sierra Log & Timber — Landowner Resources Widget

Put a searchable directory of free county programmes on your own site with one
paste. Your visitors find the wildfire, defensible space, cost share and forest
health help published for the county their land is in, and every link they
follow is tagged with your site, so Sierra can see the traffic you send.

**Live widget:** <https://hayyann.github.io/resources.sierralogandtimber.com-partner-widget/>

---

## Install it

Copy everything inside [`partner-snippet.html`](partner-snippet.html) and paste
it into a **Custom HTML** block on the page where you want it.

- **Elementor** — drag a *Custom HTML* widget onto the page, paste, publish.
- **WordPress block editor** — add a *Custom HTML* block, paste, publish.
- **Squarespace** — add a *Code* block, paste, save.
- **Wix** — add *Embed → Custom Embed → Embed a widget*, paste, update.
- **Anything else** — look for "Custom HTML", "HTML block", or "Embed code".

That is the whole installation. Nothing to upload, no account, no plugin, no
API key. Design and data updates happen at the source, so the snippet you paste
today keeps working without you touching it again.

> Use the **Custom HTML** block type, not a rich-text or visual editor. Visual
> editors strip `<script>` tags, and the script is what makes the frame grow to
> fit and what puts your domain on the links.

---

## What your visitors get

- A search box that finds a **town** or a **county** across the nine western
  states the directory covers: Arizona, California, Colorado, Idaho, Montana,
  Nevada, Oregon, Utah and Washington.
- Buttons to browse every published county in a state.
- Each result opens the county's page on
  **resources.sierralogandtimber.com** in a new tab, listing the programmes
  available there and the organisation behind each one.

The widget carries no adverts, asks for no email address, and sets no cookies.

---

## How the tracking works

Every link the widget draws carries UTM parameters naming your site:

```
https://resources.sierralogandtimber.com/california/nevada-county
  ?from=grass-valley
  &utm_source=yoursite.com        ← your domain, filled in automatically
  &utm_medium=partner-widget
  &utm_campaign=sierra-resources
  &utm_content=town               ← "town" or "county"
```

`utm_source` defaults to the hostname of the page the widget is on. If you
would rather be identified by a name than a domain — useful when the same
snippet runs on several of your sites — change one line in the snippet:

```js
var source = 'summit-realty';     // instead of window.location.hostname
```

You can also pass `medium` and `campaign` the same way if you want to tell two
placements apart, for example a sidebar from a landing page.

---

## Make it match your brand (optional)

The widget inherits your site's typeface automatically. Everything else is a
CSS variable. Because it runs in a frame, your site's stylesheet does not reach
inside it, so pass the colours on the frame's address instead — or ask Sierra
for a branded build if you want more than colour.

| Variable | What it colours | Default |
|---|---|---|
| `--slt-green` | buttons, links, focus rings | `#2f4034` |
| `--slt-ink` | headings and names | `#241d15` |
| `--slt-paper` | the widget's background | `#faf8f4` |
| `--slt-panel` | each result row | `#f4f0e8` |
| `--slt-line` | borders | `#e4ddd1` |
| `--slt-radius` | corner rounding | `10px` |
| `--slt-font` | typeface | `inherit` |

---

## Self-hosting instead of framing

If you would rather serve the files yourself than embed a frame, upload
`widget.css` and `widget.js` anywhere public on your site and paste this where
you want the widget:

```html
<link rel="stylesheet" href="https://yoursite.com/path/to/widget.css">
<div id="slt-resources"></div>
<script src="https://yoursite.com/path/to/widget.js?source=yoursite.com"></script>
```

Self-hosting means your site's own CSS **can** reach the widget, which is
either the reason to do it or the reason not to. It also means you are
responsible for updating the two files when Sierra improves them, which the
framed version does for you.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| A blank box | Give it a moment on first use: the directory index is fetched the first time somebody types or presses a state, not on page load. |
| "The directory could not be reached" | A network problem between your visitor and the directory. It retries on the next keystroke. |
| A scrollbar inside the widget | The `<script>` in the snippet was stripped. Re-paste into a **Custom HTML** block. |
| The frame never grows | Same cause as above. |
| Links are not tagged with my domain | Also the script. Without it the widget still works and still tags links, but as `partner-site` rather than as you. |
| It looks nothing like my site | Only the typeface is inherited. Colours are set with the variables above. |

---

## Notes

- **Nothing is cached against you.** The directory index is fetched from
  `resources.sierralogandtimber.com` at the moment of use, so counties added or
  updated there appear in your widget the same day.
- **It is not indexed.** The widget page carries `noindex` and a canonical
  pointing at the directory, so it cannot compete with your own pages or with
  Sierra's in search results.
- **No JavaScript, no problem.** A visitor with scripting disabled sees a plain
  link to the directory rather than an empty box.
- **Nine states today.** The directory is growing; the widget picks up new
  states automatically, though the browse buttons gain a new one only when this
  repository is updated.

---

## For maintainers

[`tools/`](tools/) holds the checks. `check.mjs` runs the ranking and the link
building against the live index with no browser, and `render.mjs` drives the
real widget inside a real frame and asserts that it tags links, grows to fit
and logs nothing. Both are dependency-light and neither ships to partners.

```
cd tools && npm install && npm run check && npm run render
```

Questions? Contact Sierra Log & Timber.

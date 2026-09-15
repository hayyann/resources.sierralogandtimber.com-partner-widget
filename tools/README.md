# Checks

Neither of these ships to a partner. They exist so that the two things a
partner depends on are proved before anything is published: that a search finds
what the directory itself would find, and that every outbound link carries the
partner's tag.

```
npm install
npm run serve      # in one terminal, serves the repository root on :4321
npm run check      # ranking and link building, against the live index, no browser
npm run render     # the real widget in a real frame: tags, growth, console
npm run shots      # writes screenshots beside these scripts
npm run county     # press a result: map, programmes, and a tagged link out
npm run live       # the PUBLISHED widget, framed from another origin, end to end
```

`check.mjs` lifts the pure functions out of `widget.js` by reading the file, so
there is no build step and no second copy of the ranking to drift.

`preview.html` is a pretend partner page. Open
<http://localhost:4321/tools/preview.html> after `npm run serve` to see the
widget as a partner's visitor would.

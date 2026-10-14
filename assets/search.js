
(function () {
  var DATA = null, LINKS = null, LIMIT = 30, shown = LIMIT;

  function hrefFor(s) {
    // Until the links file lands, point at a search for the headline rather
    // than at nothing: the result stays clickable from the first paint.
    if (!LINKS) {
      return "https://news.google.com/search?q=" + encodeURIComponent(s.t);
    }
    var raw = LINKS[s.i] || "";
    var parts = raw.split("	");
    return parts[1] === "1"
      ? "https://news.google.com/rss/articles/" + parts[0] + "?oc=5"
      : parts[0];
  }
  var q = document.getElementById("q");
  var deskSel = document.getElementById("desk");
  var regionSel = document.getElementById("region");
  var list = document.getElementById("results");
  var count = document.getElementById("count");
  var more = document.getElementById("more");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function mark(text, words) {
    var out = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"),
                        "<mark>$1</mark>");
    });
    return out;
  }
  function ago(d) {
    var gap = Math.round((Date.now() - new Date(d + "T12:00:00Z")) / 86400000);
    if (gap <= 0) return "today";
    if (gap === 1) return "yesterday";
    if (gap < 7) return gap + " days ago";
    return d.slice(8, 10) + "." + d.slice(5, 7) + ".";
  }

  function render() {
    if (!DATA) return;
    var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var desk = deskSel.value, region = regionSel.value;
    var hits = DATA.stories.filter(function (s) {
      if (desk && s.c !== desk) return false;
      if (region && s.r !== region) return false;
      if (!words.length) return true;
      var hay = (s.t + " " + s.s).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });

    count.textContent = hits.length.toLocaleString() + " of " +
      DATA.stories.length.toLocaleString() + " stories";
    list.innerHTML = hits.slice(0, shown).map(function (s) {
      var r = DATA.regions[s.r] || { name: s.r, accent: "#64748b" };
      var href = hrefFor(s);
      return '<li><a class="row" href="' + esc(href) + '" target="_blank" ' +
        'rel="noopener noreferrer"><div class="text"><h3>' + mark(s.t, words) +
        '</h3><div class="byline"><span class="r" style="background:' + r.accent +
        '">' + esc(r.name) + '</span><span>' + esc(DATA.desks[s.c] || "") +
        '</span><span>' + esc(s.s) + '</span><span>' + ago(s.d) + '</span>' +
        (s.e ? '<span class="pick">' + s.e + ' outlets</span>' : "") +
        "</div></div></a></li>";
    }).join("") || '<li style="padding:30px 0;color:var(--faint)">Nothing matches.</li>';
    more.hidden = hits.length <= shown;
  }

  function reset() { shown = LIMIT; render(); }

  fetch("data/search.json").then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      DATA.stories.forEach(function (s, i) { s.i = i; });
      render();
      // Behind the titles, so the list is usable before these arrive.
      return fetch("data/links.json").then(function (r) { return r.json(); });
    })
    .then(function (l) { LINKS = l; render(); })
    .catch(function () {
      if (!DATA) count.textContent = "Could not load the index.";
    });

  q.addEventListener("input", reset);
  deskSel.addEventListener("change", reset);
  regionSel.addEventListener("change", reset);
  more.addEventListener("click", function () { shown += 40; render(); });

  // A query in the address bar, so a search can be bookmarked or sent on.
  var params = new URLSearchParams(location.search);
  if (params.get("q")) { q.value = params.get("q"); }
  if (params.get("desk")) { deskSel.value = params.get("desk"); }
  render();
})();

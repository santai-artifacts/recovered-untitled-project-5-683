import { Hono } from 'hono'
import Anthropic from '@anthropic-ai/sdk'
import { parseBuffer } from 'music-metadata'

const app = new Hono()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Likewise</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #faf8f4;
      --surface: #f3efe5;
      --border: #d8d2c4;
      --text: #1a1714;
      --muted: #7a7060;
      --accent: #a63228;
      --accent-bg: #f9efee;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 28px 40px 20px;
      border-bottom: 1px solid var(--border);
    }

    .site-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: -0.01em;
      color: var(--text);
      text-decoration: none;
    }

    main {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      padding: 52px 40px 100px;
      flex: 1;
    }

    /* Category nav */
    .cats {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 48px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0;
      flex-wrap: wrap;
    }

    .cat-btn {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      cursor: pointer;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 0 0 14px;
      margin-bottom: -1px;
      margin-right: 28px;
      transition: color 0.15s, border-color 0.15s;
    }

    .cat-btn:hover { color: var(--text); }
    .cat-btn.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 500; }

    /* Hero */
    .hero { margin-bottom: 40px; }

    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(34px, 5vw, 52px);
      font-weight: 400;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .hero h1 em { font-style: italic; color: var(--accent); }

    /* Upload zones */
    .drop-zone {
      border: 1.5px dashed var(--border);
      border-radius: 4px;
      padding: 48px 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }

    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--accent);
      background: var(--accent-bg);
    }

    .drop-zone.drag-over { border-style: solid; }

    .drop-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 19px;
      font-style: italic;
      margin-bottom: 8px;
      color: var(--text);
    }

    .drop-hint { font-size: 13px; color: var(--muted); margin-bottom: 28px; font-weight: 300; }

    .formats-note { margin-top: 16px; font-size: 11px; color: var(--muted); letter-spacing: 0.03em; text-transform: uppercase; }

    /* Text input form */
    .text-form { padding-top: 4px; }

    .form-field { margin-bottom: 32px; }

    .form-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 10px;
      font-weight: 500;
    }

    .form-input {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--border);
      background: transparent;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-style: italic;
      color: var(--text);
      padding: 6px 0 12px;
      outline: none;
      transition: border-color 0.15s;
      -webkit-appearance: none;
    }

    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--muted); font-style: italic; }

    /* Buttons */
    .pick-btn {
      display: inline-block;
      padding: 10px 24px;
      background: var(--text);
      color: var(--bg);
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .pick-btn:hover { background: var(--accent); }

    /* File selected row */
    .file-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      margin-top: 24px;
    }

    .file-info { flex: 1; min-width: 0; }
    .file-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 12px; color: var(--muted); margin-top: 2px; font-weight: 300; }

    .go-btn {
      padding: 9px 20px;
      background: var(--accent);
      color: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .go-btn:hover { opacity: 0.85; }

    /* Error */
    .error-box {
      margin-top: 16px;
      padding: 12px 16px;
      background: var(--accent-bg);
      border-left: 3px solid var(--accent);
      font-size: 13px;
      color: var(--accent);
    }

    /* Loading */
    .loading { padding: 72px 0; }

    .loading-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-style: italic;
      color: var(--text);
    }

    .loading-dots::after {
      content: '';
      animation: dots 1.4s steps(4, end) infinite;
    }

    @keyframes dots {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
      100% { content: ''; }
    }

    /* Results */
    .results { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .results-meta {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .results-based {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 400;
      margin-bottom: 40px;
      line-height: 1.4;
    }

    .results-based em { font-style: italic; color: var(--accent); }

    .rec-list { margin-bottom: 48px; }

    .rec-item {
      padding: 24px 0;
      border-top: 1px solid var(--border);
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 16px;
      align-items: start;
      animation: fadeIn 0.3s ease backwards;
    }

    .rec-item:last-child { border-bottom: 1px solid var(--border); }

    .rec-n { font-size: 12px; color: var(--muted); padding-top: 4px; letter-spacing: 0.02em; }

    .rec-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 400;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .rec-byline { font-size: 13px; color: var(--muted); margin-bottom: 10px; font-weight: 300; }
    .rec-byline strong { color: var(--text); font-weight: 500; }

    .rec-reason { font-size: 14px; color: var(--muted); font-style: italic; line-height: 1.65; margin-bottom: 12px; font-weight: 300; }

    .rec-links { display: flex; gap: 16px; }

    .rec-link {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s;
      padding-bottom: 1px;
    }

    .rec-link:hover { border-color: var(--accent); }

    .reset-link {
      font-size: 13px;
      color: var(--muted);
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
      background: none;
      border: none;
      font-family: inherit;
      transition: color 0.15s;
      padding: 0;
    }

    .reset-link:hover { color: var(--text); }

    .hidden { display: none !important; }

    @media (max-width: 580px) {
      header { padding: 20px 24px 16px; }
      main { padding: 36px 24px 80px; }
      .cat-btn { margin-right: 18px; font-size: 11px; }
    }
  </style>
</head>
<body>

<header>
  <a class="site-name" href="#">Likewise</a>
</header>

<main>

  <!-- Category selector -->
  <nav class="cats">
    <button class="cat-btn active" data-cat="music">Music</button>
    <button class="cat-btn" data-cat="book">Books</button>
    <button class="cat-btn" data-cat="tv">TV</button>
    <button class="cat-btn" data-cat="film">Film</button>
    <button class="cat-btn" data-cat="clothes">Clothes</button>
  </nav>

  <!-- Hero -->
  <div class="hero">
    <h1 id="headline">A song you love.<br><em>Five you haven't heard.</em></h1>
  </div>

  <!-- Upload section -->
  <div id="upload-section">

    <!-- Music file drop -->
    <div id="input-music" class="input-section">
      <div class="drop-zone" id="music-drop">
        <div class="drop-label">Drop a song here</div>
        <div class="drop-hint">or browse your files</div>
        <button class="pick-btn" onclick="document.getElementById('music-file').click(); event.stopPropagation()">Choose a file</button>
        <div class="formats-note">MP3 &middot; FLAC &middot; WAV &middot; M4A &middot; OGG &middot; up to 50 MB</div>
        <input type="file" id="music-file" accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac" style="display:none">
      </div>
    </div>

    <!-- Text input (book / tv / film) -->
    <div id="input-text" class="input-section hidden">
      <form class="text-form" id="text-form" onsubmit="submitText(event)">
        <div class="form-field">
          <label class="form-label" id="title-label">Title</label>
          <input class="form-input" id="title-input" type="text" placeholder="Enter a title" autocomplete="off">
        </div>
        <div class="form-field" id="creator-field">
          <label class="form-label" id="creator-label">Author</label>
          <input class="form-input" id="creator-input" type="text" placeholder="Optional" autocomplete="off">
        </div>
        <button type="submit" class="pick-btn">Find matches</button>
      </form>
    </div>

    <!-- Clothes image drop -->
    <div id="input-clothes" class="input-section hidden">
      <div class="drop-zone" id="clothes-drop">
        <div class="drop-label">Drop an image here</div>
        <div class="drop-hint">a photo of a piece or an outfit</div>
        <button class="pick-btn" onclick="document.getElementById('clothes-file').click(); event.stopPropagation()">Choose an image</button>
        <div class="formats-note">JPG &middot; PNG &middot; WEBP &middot; up to 20 MB</div>
        <input type="file" id="clothes-file" accept="image/*,.jpg,.jpeg,.png,.webp" style="display:none">
      </div>
    </div>

    <!-- File selected (for music + clothes) -->
    <div id="file-row" class="file-row hidden">
      <div class="file-info">
        <div class="file-name" id="fname"></div>
        <div class="file-size" id="fsize"></div>
      </div>
      <button class="go-btn" onclick="submitFile()">Find matches</button>
    </div>

    <div id="err-box" class="error-box hidden"><span id="err-text"></span></div>
  </div>

  <!-- Loading -->
  <div id="loading-section" class="loading hidden">
    <div class="loading-text">Finding something you'll love<span class="loading-dots"></span></div>
  </div>

  <!-- Results -->
  <div id="results-section" class="results hidden">
    <div class="results-meta" id="r-verb">Listening to</div>
    <div class="results-based">
      <em id="r-title"></em><span id="r-sep"> &mdash; </span><span id="r-creator"></span>
    </div>
    <div class="rec-list" id="rec-list"></div>
    <button class="reset-link" onclick="reset()">&#8592; Try something else</button>
  </div>

</main>

<script>
  var currentCat = 'music';
  var selectedFile = null;

  var CATS = {
    music:   { headline: 'A song you love.<br><em>Five you haven\'t heard.</em>',   verb: 'Listening to',  input: 'music' },
    book:    { headline: 'A book you loved.<br><em>Five to read next.</em>',         verb: 'Reading',       input: 'text', titleLabel: 'Title', creatorLabel: 'Author', showCreator: true },
    tv:      { headline: 'A show you finished.<br><em>Five to start next.</em>',     verb: 'Watching',      input: 'text', titleLabel: 'Show title', showCreator: false },
    film:    { headline: 'A film you loved.<br><em>Five to watch next.</em>',        verb: 'Watching',      input: 'text', titleLabel: 'Title', creatorLabel: 'Director', showCreator: true },
    clothes: { headline: 'A piece you wear.<br><em>Five to add to it.</em>',         verb: 'Inspired by',   input: 'clothes' }
  };

  function switchCat(cat) {
    if (cat === currentCat) return;
    currentCat = cat;
    reset(true);
    document.getElementById('file-row').classList.add('hidden');

    // Update tabs
    document.querySelectorAll('.cat-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.cat === cat);
    });

    // Update headline
    document.getElementById('headline').innerHTML = CATS[cat].headline;

    // Update input area
    document.querySelectorAll('.input-section').forEach(function(el) { el.classList.add('hidden'); });
    var cfg = CATS[cat];
    if (cfg.input === 'text') {
      document.getElementById('input-text').classList.remove('hidden');
      document.getElementById('title-label').textContent = cfg.titleLabel;
      document.getElementById('creator-field').classList.toggle('hidden', !cfg.showCreator);
      if (cfg.showCreator) document.getElementById('creator-label').textContent = cfg.creatorLabel;
      document.getElementById('title-input').value = '';
      document.getElementById('creator-input').value = '';
      document.getElementById('title-input').focus();
    } else if (cfg.input === 'music') {
      document.getElementById('input-music').classList.remove('hidden');
    } else if (cfg.input === 'clothes') {
      document.getElementById('input-clothes').classList.remove('hidden');
    }
  }

  document.querySelector('.cats').addEventListener('click', function(e) {
    if (e.target.classList.contains('cat-btn')) {
      switchCat(e.target.dataset.cat);
    }
  });

  // Music drop zone
  setupDrop('music-drop', 'music-file', false);
  setupDrop('clothes-drop', 'clothes-file', true);

  function setupDrop(zoneId, inputId, isImage) {
    var zone  = document.getElementById(zoneId);
    var input = document.getElementById(inputId);

    zone.addEventListener('click', function() { input.click(); });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', function() {
      if (input.files[0]) setFile(input.files[0]);
    });
  }

  function setFile(file) {
    selectedFile = file;
    document.getElementById('fname').textContent = file.name;
    document.getElementById('fsize').textContent = fmtSize(file.size);
    document.getElementById('file-row').classList.remove('hidden');
    document.getElementById('err-box').classList.add('hidden');
  }

  function fmtSize(b) {
    return b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  }

  async function submitFile() {
    if (!selectedFile) return;
    var maxMB = currentCat === 'clothes' ? 20 : 50;
    if (selectedFile.size > maxMB * 1048576) {
      showErr('File too large. Max ' + maxMB + ' MB.');
      return;
    }
    var form = new FormData();
    form.append('category', currentCat);
    form.append('file', selectedFile);
    return doRequest(form);
  }

  function submitText(e) {
    e.preventDefault();
    var title   = document.getElementById('title-input').value.trim();
    var creator = document.getElementById('creator-input').value.trim();
    if (!title) { showErr('Please enter a title.'); return; }
    var form = new FormData();
    form.append('category', currentCat);
    form.append('title', title);
    form.append('creator', creator);
    return doRequest(form);
  }

  async function doRequest(form) {
    showState('loading');
    try {
      var res  = await fetch('/api/recommend', { method: 'POST', body: form });
      var data = await res.json();
      if (!res.ok || data.error) {
        showState('upload');
        showErr(data.error || 'Something went wrong. Please try again.');
        return;
      }
      renderResults(data);
    } catch(e) {
      showState('upload');
      showErr('Network error. Please try again.');
    }
  }

  function renderResults(data) {
    var det     = data.detected || {};
    var title   = det.title   || '';
    var creator = det.creator || '';

    document.getElementById('r-verb').textContent    = CATS[currentCat].verb;
    document.getElementById('r-title').textContent   = title;
    document.getElementById('r-creator').textContent = creator;
    document.getElementById('r-sep').style.display   = creator ? '' : 'none';

    var list = document.getElementById('rec-list');
    list.innerHTML = '';

    (data.recommendations || []).forEach(function(rec, i) {
      var links = makeLinks(currentCat, rec.title, rec.creator);
      var item  = document.createElement('div');
      item.className = 'rec-item';
      item.style.animationDelay = (i * 0.06) + 's';

      var byline = rec.creator ? '<strong>' + esc(rec.creator) + '</strong>' : '';
      if (byline && rec.year) byline += ' &nbsp;&middot;&nbsp; ' + esc(rec.year);
      else if (rec.year)      byline  = esc(rec.year);

      var linkHtml = links.map(function(l) {
        return '<a class="rec-link" href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + '</a>';
      }).join('');

      item.innerHTML =
        '<div class="rec-n">0' + (i + 1) + '</div>' +
        '<div class="rec-body">' +
          '<div class="rec-title">' + esc(rec.title) + '</div>' +
          (byline ? '<div class="rec-byline">' + byline + '</div>' : '') +
          '<div class="rec-reason">' + esc(rec.reason) + '</div>' +
          '<div class="rec-links">' + linkHtml + '</div>' +
        '</div>';
      list.appendChild(item);
    });

    showState('results');
  }

  function makeLinks(cat, title, creator) {
    var tq   = encodeURIComponent(title || '');
    var full = encodeURIComponent(creator ? (title + ' ' + creator) : title);
    if (cat === 'music')   return [['Spotify','https://open.spotify.com/search/'+full],['YouTube','https://www.youtube.com/results?search_query='+full]];
    if (cat === 'book')    return [['Goodreads','https://www.goodreads.com/search?q='+full],['Open Library','https://openlibrary.org/search?q='+full]];
    if (cat === 'tv')      return [['IMDb','https://www.imdb.com/find?q='+tq],['JustWatch','https://www.justwatch.com/us/search?q='+tq]];
    if (cat === 'film')    return [['IMDb','https://www.imdb.com/find?q='+tq],['Letterboxd','https://letterboxd.com/search/'+tq+'/']];
    if (cat === 'clothes') return [['Shop','https://www.google.com/search?tbm=shop&q='+full],['Pinterest','https://www.pinterest.com/search/pins/?q='+full]];
    return [];
  }

  function showState(s) {
    document.getElementById('upload-section').classList.toggle('hidden', s !== 'upload');
    document.getElementById('loading-section').classList.toggle('hidden', s !== 'loading');
    document.getElementById('results-section').classList.toggle('hidden', s !== 'results');
  }

  function showErr(msg) {
    document.getElementById('err-text').textContent = msg;
    document.getElementById('err-box').classList.remove('hidden');
  }

  function reset(keepInputs) {
    selectedFile = null;
    document.getElementById('music-file').value   = '';
    document.getElementById('clothes-file').value = '';
    document.getElementById('file-row').classList.add('hidden');
    document.getElementById('err-box').classList.add('hidden');
    if (!keepInputs) {
      document.getElementById('title-input').value   = '';
      document.getElementById('creator-input').value = '';
    }
    showState('upload');
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
</script>
</body>
</html>`

app.get('/', (c) => c.html(html))

app.post('/api/recommend', async (c) => {
  try {
    const form = await c.req.formData()
    const category = (form.get('category') as string || '').trim()

    if (!['music', 'book', 'tv', 'film', 'clothes'].includes(category)) {
      return c.json({ error: 'Invalid category.' }, 400)
    }

    const ai = new Anthropic({
      baseURL: process.env.SANTAI_AI_BASE_URL,
      apiKey: process.env.SANTAI_AI_TOKEN || 'placeholder',
    })

    let messages: Anthropic.MessageParam[]

    // ── Music ────────────────────────────────────────────────────────
    if (category === 'music') {
      const file = form.get('file') as File
      if (!file || file.size === 0) return c.json({ error: 'Please upload a song.' }, 400)
      if (file.size > 50 * 1024 * 1024) return c.json({ error: 'File too large. Max 50 MB.' }, 400)

      const buffer = Buffer.from(await file.arrayBuffer())
      const meta: Record<string, string> = {}
      try {
        const parsed = await parseBuffer(buffer, { mimeType: file.type })
        const { common } = parsed
        if (common.title)       meta.title  = common.title
        if (common.artist)      meta.artist = common.artist
        if (common.album)       meta.album  = common.album
        if (common.genre?.[0])  meta.genre  = common.genre[0]
        if (common.year)        meta.year   = String(common.year)
        if (common.bpm)         meta.bpm    = String(Math.round(common.bpm))
      } catch {}
      if (!meta.title) meta.title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

      const info = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n')

      messages = [{ role: 'user', content: `You are a music curator. Recommend 5 songs based on this track's metadata. Consider genre, era, mood, and artist style. Vary the picks.

${info}

Return ONLY valid JSON:
{
  "detected": { "title": "song title", "creator": "artist name" },
  "recommendations": [
    { "title": "...", "creator": "artist", "year": "...", "reason": "One specific sentence." }
  ]
}` }]

    // ── Clothes (vision) ─────────────────────────────────────────────
    } else if (category === 'clothes') {
      const file = form.get('file') as File
      if (!file || file.size === 0) return c.json({ error: 'Please upload an image.' }, 400)
      if (file.size > 20 * 1024 * 1024) return c.json({ error: 'Image too large. Max 20 MB.' }, 400)

      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const mimeType = (validTypes.includes(file.type) ? file.type : 'image/jpeg') as
        'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: `You are a fashion stylist. Analyze the clothing or outfit in this image and recommend 5 similar styles, pieces, or looks. Consider aesthetic, color palette, formality, and overall vibe.

Return ONLY valid JSON:
{
  "detected": { "title": "brief description of what you see", "creator": "brand if identifiable, or empty string" },
  "recommendations": [
    { "title": "piece or look name", "creator": "brand or style name", "year": "", "reason": "One specific sentence about why this fits." }
  ]
}` }
        ]
      }]

    // ── Text-based: book / tv / film ─────────────────────────────────
    } else {
      const title   = (form.get('title')   as string || '').trim()
      const creator = (form.get('creator') as string || '').trim()
      if (!title) return c.json({ error: 'Please enter a title.' }, 400)

      const prompts: Record<string, string> = {
        book: `You are a literary expert. Recommend 5 books similar to "${title}"${creator ? ' by ' + creator : ''}. Consider genre, themes, writing style, and tone. Vary the picks.`,
        tv:   `You are a TV critic. Recommend 5 shows similar to "${title}". Consider genre, tone, pacing, and themes. Vary the picks.`,
        film: `You are a film critic. Recommend 5 films similar to "${title}"${creator ? ' directed by ' + creator : ''}. Consider genre, style, and themes. Vary the picks.`,
      }

      const creatorLabels: Record<string, string> = { book: 'author', tv: 'creator', film: 'director' }

      messages = [{ role: 'user', content: `${prompts[category]}

Return ONLY valid JSON:
{
  "detected": { "title": "${title.replace(/"/g, '\\"')}", "creator": "${creator.replace(/"/g, '\\"')}" },
  "recommendations": [
    { "title": "...", "creator": "${creatorLabels[category]} name", "year": "...", "reason": "One specific sentence." }
  ]
}` }]
    }

    const msg = await ai.messages.create({
      model: 'anthropic-claude-bedrock4.5-haiku',
      max_tokens: 1500,
      messages,
    })

    const raw     = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr) throw new Error('Could not parse response')

    return c.json({ ...JSON.parse(jsonStr), category })

  } catch (err: any) {
    console.error(err)
    return c.json({ error: err.message || 'Something went wrong.' }, 500)
  }
})

export default { port: process.env.PORT || 3000, fetch: app.fetch }

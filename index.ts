import { Hono } from 'hono'
import Anthropic from '@anthropic-ai/sdk'
import { parseBuffer } from 'music-metadata'

const app = new Hono()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Soundmatch</title>
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
      --link: #a63228;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
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

    /* Main */
    main {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      padding: 64px 40px 100px;
      flex: 1;
    }

    /* Hero */
    .hero { margin-bottom: 52px; }

    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(36px, 5.5vw, 56px);
      font-weight: 400;
      line-height: 1.08;
      letter-spacing: -0.02em;
      margin-bottom: 18px;
      color: var(--text);
    }

    .hero h1 em {
      font-style: italic;
      color: var(--accent);
    }

    .hero p {
      font-size: 16px;
      color: var(--muted);
      line-height: 1.7;
      max-width: 440px;
      font-weight: 300;
    }

    /* Divider */
    .rule {
      border: none;
      border-top: 1px solid var(--border);
      margin: 40px 0;
    }

    /* Upload zone */
    .upload-zone {
      border: 1.5px dashed var(--border);
      border-radius: 4px;
      padding: 48px 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: transparent;
    }

    .upload-zone:hover, .upload-zone.drag-over {
      border-color: var(--accent);
      background: var(--accent-bg);
    }

    .upload-zone.drag-over { border-style: solid; }

    .upload-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 400;
      font-style: italic;
      margin-bottom: 10px;
      color: var(--text);
    }

    .upload-hint {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 28px;
      font-weight: 300;
    }

    .pick-btn {
      display: inline-block;
      padding: 10px 24px;
      background: var(--text);
      color: var(--bg);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .pick-btn:hover { background: var(--accent); }

    .formats-note {
      margin-top: 16px;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    #file-input { display: none; }

    /* File selected */
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

    .file-name {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text);
    }

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
      transition: opacity 0.15s;
      flex-shrink: 0;
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
      font-weight: 400;
    }

    /* Loading */
    .loading { padding: 72px 0; text-align: center; }

    .loading-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-style: italic;
      font-weight: 400;
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
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
      font-weight: 400;
    }

    .results-based {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 400;
      margin-bottom: 40px;
      line-height: 1.4;
    }

    .results-based em { font-style: italic; color: var(--accent); }

    /* Rec list */
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

    .rec-n {
      font-size: 12px;
      color: var(--muted);
      font-weight: 400;
      padding-top: 4px;
      letter-spacing: 0.03em;
    }

    .rec-body {}

    .rec-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 400;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .rec-byline {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 10px;
      font-weight: 300;
    }

    .rec-byline strong { color: var(--text); font-weight: 500; }

    .rec-reason {
      font-size: 14px;
      color: var(--muted);
      font-style: italic;
      line-height: 1.65;
      margin-bottom: 12px;
      font-weight: 300;
    }

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

    /* Reset */
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
      main { padding: 44px 24px 80px; }
    }
  </style>
</head>
<body>

<header>
  <a class="site-name" href="#">Soundmatch</a>
</header>

<main>
  <div class="hero">
    <h1>A song you love.<br><em>Five you haven't heard.</em></h1>
    <p>Upload any track and get five recommendations matched to its character.</p>
  </div>

  <!-- Upload -->
  <div id="upload-section">
    <div class="upload-zone" id="drop-zone">
      <div class="upload-label">Drop a song here</div>
      <div class="upload-hint">or browse your files</div>
      <button class="pick-btn" onclick="document.getElementById('file-input').click(); event.stopPropagation()">
        Choose a file
      </button>
      <div class="formats-note">MP3 &middot; FLAC &middot; WAV &middot; M4A &middot; OGG &middot; up to 50 MB</div>
      <input type="file" id="file-input" accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac">
    </div>

    <div id="file-row" class="file-row hidden">
      <div class="file-info">
        <div class="file-name" id="fname"></div>
        <div class="file-size" id="fsize"></div>
      </div>
      <button class="go-btn" onclick="analyze()">Find matches</button>
    </div>

    <div id="err-box" class="error-box hidden" id="err-box">
      <span id="err-text"></span>
    </div>
  </div>

  <!-- Loading -->
  <div id="loading-section" class="loading hidden">
    <div class="loading-text">Finding something you'll love<span class="loading-dots"></span></div>
  </div>

  <!-- Results -->
  <div id="results-section" class="results hidden">
    <div class="results-meta">Listening to</div>
    <div class="results-based">
      <em id="r-title"></em> &mdash; <span id="r-artist"></span>
    </div>

    <div class="rec-list" id="rec-list"></div>

    <button class="reset-link" onclick="reset()">&#8592; Try a different song</button>
  </div>
</main>

<script>
  var selectedFile = null;
  var dropZone  = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', function() { fileInput.click(); });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) selectFile(fileInput.files[0]);
  });

  function selectFile(file) {
    selectedFile = file;
    document.getElementById('fname').textContent = file.name;
    document.getElementById('fsize').textContent = fmtSize(file.size);
    document.getElementById('file-row').classList.remove('hidden');
    document.getElementById('err-box').classList.add('hidden');
  }

  function fmtSize(b) {
    return b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  }

  async function analyze() {
    if (!selectedFile) return;
    if (selectedFile.size > 52428800) {
      showErr('File too large. Please choose a song under 50 MB.');
      return;
    }
    showState('loading');
    var form = new FormData();
    form.append('song', selectedFile);
    try {
      var res  = await fetch('/api/analyze', { method: 'POST', body: form });
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

  function showState(s) {
    document.getElementById('upload-section').classList.toggle('hidden', s !== 'upload');
    document.getElementById('loading-section').classList.toggle('hidden', s !== 'loading');
    document.getElementById('results-section').classList.toggle('hidden', s !== 'results');
  }

  function showErr(msg) {
    document.getElementById('err-text').textContent = msg;
    document.getElementById('err-box').classList.remove('hidden');
  }

  function renderResults(data) {
    document.getElementById('r-title').textContent  = data.detected && data.detected.title  ? data.detected.title  : selectedFile.name;
    document.getElementById('r-artist').textContent = data.detected && data.detected.artist ? data.detected.artist : 'Unknown';

    var list = document.getElementById('rec-list');
    list.innerHTML = '';

    var recs = data.recommendations || [];
    recs.forEach(function(rec, i) {
      var q    = encodeURIComponent(rec.title + ' ' + rec.artist);
      var item = document.createElement('div');
      item.className = 'rec-item';
      item.style.animationDelay = (i * 0.06) + 's';

      var byline = '<strong>' + esc(rec.artist) + '</strong>';
      if (rec.year) byline += ' &nbsp;&middot;&nbsp; ' + esc(rec.year);

      item.innerHTML =
        '<div class="rec-n">0' + (i + 1) + '</div>' +
        '<div class="rec-body">' +
          '<div class="rec-title">' + esc(rec.title) + '</div>' +
          '<div class="rec-byline">' + byline + '</div>' +
          '<div class="rec-reason">' + esc(rec.reason) + '</div>' +
          '<div class="rec-links">' +
            '<a class="rec-link" href="https://open.spotify.com/search/' + q + '" target="_blank" rel="noopener">Spotify</a>' +
            '<a class="rec-link" href="https://www.youtube.com/results?search_query=' + q + '" target="_blank" rel="noopener">YouTube</a>' +
          '</div>' +
        '</div>';
      list.appendChild(item);
    });

    showState('results');
  }

  function reset() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('file-row').classList.add('hidden');
    document.getElementById('err-box').classList.add('hidden');
    showState('upload');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`

app.get('/', (c) => c.html(html))

app.post('/api/analyze', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('song') as File

    if (!file || file.size === 0) {
      return c.json({ error: 'Please upload an audio file.' }, 400)
    }

    if (file.size > 50 * 1024 * 1024) {
      return c.json({ error: 'File too large. Please upload a file under 50MB.' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata: Record<string, string> = {}

    try {
      const parsed = await parseBuffer(buffer, { mimeType: file.type })
      const { common } = parsed
      if (common.title) metadata.title = common.title
      if (common.artist) metadata.artist = common.artist
      if (common.album) metadata.album = common.album
      if (common.genre?.length) metadata.genre = common.genre[0]
      if (common.year) metadata.year = String(common.year)
      if (common.bpm) metadata.bpm = String(Math.round(common.bpm))
    } catch {
      // metadata unavailable — fall through to filename fallback
    }

    if (!metadata.title) {
      metadata.title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    }

    const songDescription = Object.entries(metadata)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      .join('\n')

    const ai = new Anthropic({
      baseURL: process.env.SANTAI_AI_BASE_URL,
      apiKey: process.env.SANTAI_AI_TOKEN || 'placeholder',
    })

    const msg = await ai.messages.create({
      model: 'anthropic-claude-bedrock4.5-haiku',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are a knowledgeable music curator. A listener uploaded a song with the following metadata:

${songDescription}

Recommend 5 songs they would genuinely love. Think about genre, era, mood, texture, and artist influence. Vary the picks slightly — don't just list the most obvious similar artists.

Return ONLY valid JSON, no markdown, no extra text:
{
  "detected": {
    "title": "song title",
    "artist": "artist name or 'Unknown'"
  },
  "recommendations": [
    {
      "title": "Song Title",
      "artist": "Artist Name",
      "year": "year or empty string",
      "reason": "One specific sentence about why this fits"
    }
  ]
}`,
        },
      ],
    })

    const raw = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr) throw new Error('Could not parse response')

    const result = JSON.parse(jsonStr)
    return c.json({ ...result, metadata })
  } catch (err: any) {
    console.error('Error:', err)
    return c.json({ error: err.message || 'Something went wrong. Please try again.' }, 500)
  }
})

export default { port: process.env.PORT || 3000, fetch: app.fetch }

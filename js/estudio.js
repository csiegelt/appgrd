/* Biblioteca y práctica local. La IA solo se utiliza mediante el servicio autenticado. */
const Estudio = (() => {
  const KEY = 'grd-estudio-v1';
  const html = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'custom-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
  let st = { subjects: [], progress: {}, notes: {}, history: [], caseSelection: {}, selected: 'sistemas-salud', lesson: 'salud-1' };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && Array.isArray(saved.subjects)) st = { ...st, ...saved }; } catch {}
  let view = 'library', mode = 'guide', card = 0, revealed = false, reviewOnly = false, quiz = null, query = '', editor = null, lastRenderKey = '';
  let chat = [], ai = { available: false, connected: false, models: [] }, busy = false, status = '', draft = '', web = false, model = '', pendingPractice = false, difficulty = 'intermedia', practiceStyle = 'concepts';
  let statusPlace = 'general';
  const consolidated = consolidateSubjects(st);
  if (consolidated) {
    try {
      // Keep the complete previous state before combining any personal copies.
      localStorage.setItem('grd-estudio-antes-unificar-v1', JSON.stringify(st));
      localStorage.setItem(KEY, JSON.stringify(consolidated));
      st = consolidated;
      status = 'Tus preguntas y apuntes están reunidos en Sistemas de Salud. Se conservaron los avances y un respaldo local anterior.';
    } catch { status = 'No se pudieron unificar las copias por falta de almacenamiento. Tus datos anteriores se conservan; descarga un respaldo antes de liberar espacio.'; }
  }
  let apiUsage = null, usageLoading = false, usageError = '', usageLocked = false, usagePromise = null;
  const economicsUpdated = EconomiaIntegracion.enhance(st);
  if (economicsUpdated) {
    try {
      localStorage.setItem('grd-estudio-antes-economia-v1', JSON.stringify(st));
      localStorage.setItem(KEY, JSON.stringify(economicsUpdated));
      st = economicsUpdated;
    } catch { status = 'No se pudo guardar la ampliación de Economía por falta de espacio. Tu material anterior se conserva; descarga un respaldo.'; }
  }
  // Generated cases and their answers belong only to this open page, never to localStorage or exports.
  const caseSessions = new Map();
  let creatingCase = false;
  let materialTopic = '', materialTarget = '', materialRunning = false;
  let examLoaded = false, examThreshold = 0.6, examConfirm = false, creatingExam = false;
  const tokenNumber = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('es-CL') : '—';
  const usageDate = value => value ? new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin consultas';
  const root = () => document.getElementById('tab-estudio');
  const economicsID = EconomiaIntegracion.find(st)?.id || ECONOMIA_ASIGNATURA.id;
  const builtins = [SALUD_ASIGNATURA, CUANTITATIVAS_ASIGNATURA, { ...ECONOMIA_ASIGNATURA, id: economicsID }];
  const isEconomics = () => subject().id === economicsID;
  const subjects = () => [...builtins.map(b => st.subjects.find(s => s.id === b.id) || b), ...st.subjects.filter(s => !builtins.some(b => b.id === s.id))];
  const subject = () => subjects().find(s => s.id === st.selected) || SALUD_ASIGNATURA;
  const lesson = () => subject().lessons.find(l => l.id === st.lesson) || subject().lessons[0];
  const progressKey = id => `${subject().id}/${id}`;
  const progress = id => st.progress[progressKey(id)] || {};
  const questions = () => subject().lessons.flatMap(l => l.questions.filter(q => !isExtract(q)).map(q => ({ ...q, lesson: l.id, topic: l.title })));
  const shuffled = items => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); return true; }
    catch { status = 'No se pudo guardar. Descarga un respaldo antes de cerrar: el navegador puede estar sin espacio.'; return false; }
  }
  function editableSubject(id) {
    let s = st.subjects.find(x => x.id === id);
    const base = builtins.find(b => b.id === id);
    if (!s && base) { s = structuredClone(base); st.subjects.push(s); }
    return s;
  }
  function consolidateSubjects(state) {
    const base = SALUD_ASIGNATURA;
    const isPersonalCopy = s => s.id === base.id || (
      [base.name + ' · Mi práctica IA', base.name + ' · Mis apuntes'].includes(s.name) && s.source === base.source &&
      s.lessons?.some(l => base.lessons.some(b => b.id === l.id && b.title === l.title && b.text === l.text))
    );
    const copies = state.subjects.filter(isPersonalCopy);
    if (!copies.length) return null;
    const next = structuredClone(state), merged = structuredClone(base);
    const lessons = new Map(merged.lessons.map(l => [l.id, l]));
    const caseKey = c => c.id || JSON.stringify([c.lesson, c.title, c.text]);
    const cases = new Set(merged.cases.map(caseKey));
    for (const copy of copies) {
      for (const l of copy.lessons) {
        const existing = lessons.get(l.id);
        if (!existing) { const added = structuredClone(l); merged.lessons.push(added); lessons.set(l.id, added); }
        else {
          if (l.materialStatus === 'ready') Object.assign(existing, { objective: l.objective, summary: structuredClone(l.summary), materialStatus: 'ready', materialGeneratedAt: l.materialGeneratedAt });
          const ids = new Set(existing.questions.map(q => q.id));
          for (const q of l.questions) if (!ids.has(q.id)) { existing.questions.push(structuredClone(q)); ids.add(q.id); }
        }
      }
      for (const c of copy.cases || []) if (!cases.has(caseKey(c))) { merged.cases.push(structuredClone(c)); cases.add(caseKey(c)); }
      if (copy.id === base.id) continue;
      const prefix = copy.id + '/';
      for (const [key, note] of Object.entries(next.notes)) {
        if (!key.startsWith(prefix)) continue;
        const target = base.id + key.slice(copy.id.length), current = next.notes[target];
        if (!current) next.notes[target] = note;
        else if (note && current !== note) next.notes[target] = current + '\n\nApunte recuperado de ' + copy.name + ':\n' + note;
        delete next.notes[key];
      }
      for (const [key, progress] of Object.entries(next.progress)) {
        if (!key.startsWith(prefix)) continue;
        const target = base.id + key.slice(copy.id.length), current = next.progress[target];
        if (!current) next.progress[target] = progress;
        else {
          const combined = { ...current, ...progress };
          for (const flag of ['read', 'known', 'wrong']) if (flag in current || flag in progress) combined[flag] = !!(current[flag] || progress[flag]);
          if ('attempts' in current || 'attempts' in progress) combined.attempts = (current.attempts || 0) + (progress.attempts || 0);
          next.progress[target] = combined;
        }
        delete next.progress[key];
      }
      for (const h of next.history) if (h.subject === copy.id) h.subject = base.id;
      if (next.caseSelection[copy.id] && (!next.caseSelection[base.id] || state.selected === copy.id)) next.caseSelection[base.id] = next.caseSelection[copy.id];
      delete next.caseSelection[copy.id];
      if (next.selected === copy.id) next.selected = base.id;
    }
    const ids = new Set(copies.map(s => s.id));
    next.subjects = [merged, ...next.subjects.filter(s => !ids.has(s.id))];
    return JSON.stringify(next) === JSON.stringify(state) ? null : next;
  }
  const button = (action, text, extra = '', cls = '') => `<button type="button" class="study-btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
  const badge = text => `<span class="study-badge">${html(text)}</span>`;
  const icon = name => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({book: '<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Zm0 0v14"/>', chart: '<path d="M4 3v17h17M9 15V9m5 6V5m5 10v-4"/>', plus: '<path d="M12 5v14M5 12h14"/>', health: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8m-4-4h8"/>'})[name]}</svg>`;
  function breadcrumbs() {
    if (view === 'library' && !editor) return '';
    const parts = [button('library', 'Inicio', '', 'crumb')];
    if (editor === 'subject') parts.push('<span aria-current="page">Nueva asignatura</span>');
    else {
      parts.push(view === 'subject' && !editor ? `<span aria-current="page">${html(subject().name)}</span>` : button('subject', html(subject().name), `data-id="${html(subject().id)}"`, 'crumb'));
      if (view !== 'subject' || editor) parts.push(`<span aria-current="page">${view === 'resources' ? 'Laboratorios interactivos' : view === 'exam' ? 'Prueba con nota' : 'Estudio para la prueba'}</span>`);
    }
    return `<nav class="study-breadcrumbs" aria-label="Ubicación">${parts.join('<span aria-hidden="true">/</span>')}</nav>`;
  }
  function shell(body) {
    return `<div class="study-wrap">${breadcrumbs()}
      ${view !== 'tutor' || statusPlace === 'general' ? notice() : ''}${body}</div>`;
  }
  function notice() { return status ? `<p class="study-notice" role="status">${html(status)}</p>` : ''; }
  function render() {
    const r = root(); if (!r) return;
    r.innerHTML = shell(editor ? editorUI() : view === 'library' ? libraryUI() : view === 'subject' ? subjectUI() : view === 'resources' ? resourcesUI() : view === 'home' ? homeUI() : view === 'lesson' ? lessonUI() : view === 'cards' ? cardsUI() : view === 'quiz' ? quizUI() : view === 'exam' ? examUI() : view === 'cases' ? casesUI() : tutorUI());
    r.onclick = onClick; r.onchange = onChange; r.oninput = onInput; r.onsubmit = onSubmit;
    r.onpointerdown = e => { if (!EconomiaLab.pointerdown(e)) CuantitativasLab.pointerdown(e); };
    if (busy) r.querySelectorAll('#study-model, #study-ai-context, #study-difficulty, #study-practice-style, #study-web, #study-material-topic, #study-case-topic, #study-case-difficulty, #study-case-select, #study-case-ai-select, .study-case-step textarea').forEach(control => { control.disabled = true; });
    const home = document.getElementById('app-home');
    if (home) { home.disabled = busy; if (view === 'library' && !editor) home.setAttribute('aria-current', 'page'); else home.removeAttribute('aria-current'); }
    const key = [view, editor, st.selected, st.lesson, mode, view === 'quiz' ? quiz?.index : '', view === 'exam' ? `${examAttempt()?.index}/${!!examAttempt()?.finishedAt}` : '', view === 'cards' ? card : '', view === 'cases' ? caseIndex() : ''].join('/');
    if (key !== lastRenderKey && r.classList.contains('active')) r.scrollIntoView({ block: 'start', behavior: 'instant' });
    lastRenderKey = key;
    if (view === 'library' && !editor && apiUsage === null && !usageError && !usageLocked && !usageLoading) refreshUsage();
  }
  function openLibrary() {
    if (busy) return;
    view = 'library'; editor = null; status = ''; render(); setTab('estudio'); window.scrollTo({ top: 0, behavior: 'instant' }); refreshUsage();
  }
  function openSubject(id) {
    if (busy) return;
    const s = subjects().find(s => s.id === id); if (!s) return;
    if (st.selected !== s.id) { st.lesson = s.lessons[0]?.id; scope = null; materialTopic = ''; materialTarget = ''; quiz = null; chat = []; draft = ''; pendingPractice = false; }
    st.selected = s.id; view = 'subject'; editor = null; query = ''; status = ''; save(); render(); setTab('estudio'); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function libraryUI() {
    const list = subjects();
    return `<div class="study-top"><div><span class="study-eyebrow">TU ESPACIO DE APRENDIZAJE</span><h2>Asignaturas</h2><p>Elige una asignatura para descubrir sus contenidos.</p></div>${badge(`${list.length} ${list.length === 1 ? 'asignatura' : 'asignaturas'}`)}</div>
      <article id="study-api-usage" class="study-usage" aria-label="Consumo de la API">${usageUI()}</article>
      <div class="study-library-grid">${list.map(s => {
        const health = s.id === 'sistemas-salud', read = s.lessons.filter(l => st.progress[`${s.id}/${l.id}`]?.read).length;
        return `<button type="button" class="study-subject-card" data-action="subject" data-id="${html(s.id)}"><span class="study-folder-icon">${icon(health ? 'health' : 'book')}</span><span class="study-eyebrow">ASIGNATURA</span><strong>${html(s.name)}</strong><span class="study-card-description">${health ? 'Estudio para la prueba y herramientas GRD.' : s.id === economicsID ? 'Guías, laboratorios y prueba de 30 preguntas con nota.' : 'Tus temas, guías y actividades de estudio.'}</span><span class="study-card-meta">${health || s.id === economicsID ? '2 contenidos' : '1 contenido'} · ${s.lessons.length} ${s.lessons.length === 1 ? 'tema' : 'temas'} de estudio</span><span class="study-card-footer"><span>${read ? `${read} de ${s.lessons.length} temas leídos` : 'Lista para comenzar'}</span><span>Ver contenidos →</span></span></button>`;
      }).join('')}<button type="button" class="study-subject-card study-add-subject" data-action="new-subject"><span class="study-folder-icon">${icon('plus')}</span><strong>Agregar asignatura</strong><span class="study-card-description">Crea un espacio para otra materia y agrega tus primeros apuntes.</span><span class="study-card-footer">+ Nueva asignatura</span></button></div>
      <details class="study-source"><summary>Importar una asignatura</summary><p>Recupera una asignatura que hayas descargado desde esta app.</p><label>Archivo de asignatura (.json)<input id="study-import" type="file" accept=".json,application/json"></label></details>
      <p class="study-footnote">Tus asignaturas, apuntes y avances se guardan en este navegador.</p>`;
  }
  function quotaAlert() {
    if (apiUsage?.quota?.state !== 'exhausted') return '';
    return `<div class="study-quota-alert" role="alert"><strong>Sin saldo o cuota disponible para el tutor</strong><p>${html(apiUsage.quota.message)}</p><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener">Revisar saldo y facturación ↗</a><p>Después de reponer saldo o ajustar el límite, vuelve a enviar tu consulta.</p></div>`;
  }
  function usageUI() {
    const header = `<div class="study-usage-heading"><h3>Tokens de la API</h3>${button('refresh-usage', usageLoading ? 'Actualizando…' : 'Actualizar', usageLoading ? 'disabled' : '', 'secondary')}</div>`;
    if (usageLocked) return header + `<p>Ingresa al tutor para consultar el consumo de esta app.</p>${button('tutor', 'Abrir tutor', '', 'secondary')}`;
    if (!apiUsage) return header + `<p>${usageLoading ? 'Consultando el contador…' : html(usageError || 'Todavía no hay datos de la API.')}</p>`;
    if (!apiUsage.configured) return header + `<p>Configura la API de OpenAI para ver el contador y usar el tutor.</p>${button('tutor', 'Ver configuración', '', 'secondary')}`;
    const rate = [...(apiUsage.rateLimits || [])].sort((a, b) => a.remaining - b.remaining)[0];
    const expired = rate && (rate.expired || (rate.resetAt && Date.now() >= Date.parse(rate.resetAt)));
    return `${header}${quotaAlert()}${usageError ? `<p class="study-notice">${html(usageError)} Se conserva la última lectura.</p>` : ''}
      ${apiUsage.scope === 'instance' ? '<p class="study-usage-caption">En Vercel este contador es temporal y corresponde a la instancia que atiende la solicitud. Consulta el consumo completo en OpenAI.</p>' : ''}<div class="study-usage-metrics"><div><span>${apiUsage.scope === 'instance' ? 'Tokens registrados en esta instancia' : 'Tokens usados en esta app'}</span><strong data-usage="total">${tokenNumber(apiUsage.totalTokens)}</strong><small>Entrada ${tokenNumber(apiUsage.inputTokens)} · Salida ${tokenNumber(apiUsage.outputTokens)}</small></div><div><span>Disponibles en la última consulta</span><strong data-usage="remaining">${rate ? tokenNumber(rate.remaining) : 'Sin lectura'}</strong><small>${rate ? `${rate.limit !== null ? 'De ' + tokenNumber(rate.limit) + ' · ' : ''}límite temporal${expired ? ' · ya renovado' : ''}` : 'OpenAI aún no ha informado este dato'}</small></div></div>
      <p class="study-usage-caption">Última consulta: ${apiUsage.lastCall?.usage ? tokenNumber(apiUsage.lastCall.usage.totalTokens) + ' tokens' : apiUsage.lastCall ? 'consumo no informado' : 'sin registrar'} · ${html(apiUsage.model)}</p>
      <p class="study-usage-caption">La disponibilidad corresponde a un límite temporal que se renueva. El saldo monetario se consulta en OpenAI.</p>
      <div class="study-usage-links"><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener">Saldo y facturación ↗</a><a href="https://platform.openai.com/usage" target="_blank" rel="noopener">Consumo en OpenAI ↗</a></div>
      <details><summary>Detalle del contador</summary><p>Registro de esta app desde ${html(usageDate(apiUsage.since))}: ${tokenNumber(apiUsage.calls)} solicitudes. Incluye entrada y salida informadas por OpenAI; no incluye el historial previo a este contador ni otras aplicaciones.</p>${rate ? `<p>Disponibilidad leída el ${html(usageDate(rate.observedAt))}. ${expired ? 'El intervalo ya se renovó; la cifra es una referencia anterior.' : 'Puede cambiar con el tiempo y con otras solicitudes del proyecto.'} Se actualiza al realizar una consulta al tutor.</p>` : '<p>El número disponible se mostrará cuando OpenAI entregue los encabezados de límite de tokens en una consulta.</p>'}${apiUsage.unreportedCalls ? `<p>${tokenNumber(apiUsage.unreportedCalls)} solicitudes no informaron tokens; el acumulado puede ser incompleto.</p>` : ''}${apiUsage.persistenceWarning ? '<p>No se pudo guardar el contador en el servidor. El registro podría perderse al reiniciar.</p>' : ''}<p>Actualizar relee el registro de la app y no genera una consulta de pago.</p></details>`;
  }
  function refreshUsage(force = false) {
    if (usagePromise) return force ? usagePromise.then(() => refreshUsage()) : usagePromise;
    usageLoading = true;
    const update = () => { const container = document.getElementById('study-api-usage'); if (container) container.innerHTML = usageUI(); };
    update();
    usagePromise = (async () => {
    try { apiUsage = await request('usage'); usageError = ''; usageLocked = false; }
    catch (err) {
      usageLocked = err.status === 401;
      usageError = usageLocked ? '' : 'No se pudo actualizar el contador. Abre la app desde el servidor de la API.';
      if (usageLocked) apiUsage = null;
    } finally { usageLoading = false; usagePromise = null; update(); }
    })();
    return usagePromise;
  }
  function resourcesPanel() {
    if (isEconomics()) return `<article class="study-panel econ-entry"><div><span class="study-eyebrow">APRENDER HACIENDO</span><h3>Laboratorio de Economía de la Salud</h3><p>Modifica los gráficos del documento, compara escenarios y resuelve ejercicios. Oferta, demanda, elasticidad, economías de escala, productividad, monopolio y seguros.</p><p class="study-footnote">Tablas editables, fórmulas opcionales y soluciones paso a paso. Disponible sin IA.</p></div><div class="study-actions">${button('resources', 'Abrir laboratorios interactivos →')}</div></article>`;
    if (subject().id !== 'herramientas-cuantitativas') return '';
    return `<article class="study-panel"><h3>Guía y gráficos editables</h3><p>Practica regresiones, chi cuadrado, búsquedas y Erlang con los datos de clase y ejemplos de salud. Cambia los datos y observa los resultados.</p><div class="study-actions">${button('resources', 'Abrir laboratorios interactivos')}<a class="study-btn secondary" href="manual/cuantitativas/ejercicios.xlsx" download>Descargar Excel editable</a><a class="study-btn secondary" href="manual/cuantitativas/guia.pdf" target="_blank" rel="noopener">Leer guía PDF</a></div><p class="study-footnote">La guía explica las discrepancias del archivo de chi cuadrado. Los ejemplos nuevos de salud son simulados.</p></article>`;
  }
  function resourcesUI() {
    return `${button('subject', '← Volver a la asignatura', `data-id="${html(subject().id)}"`, 'secondary')}${isEconomics() ? EconomiaLab.html() : CuantitativasLab.html()}`;
  }
  function subjectUI() {
    const s = subject(), health = s.id === 'sistemas-salud';
    return `<div class="study-top"><div><span class="study-eyebrow">ASIGNATURA</span><h2>${html(s.name)}</h2><p>Elige el contenido que quieres trabajar hoy.</p></div>${badge(health || isEconomics() ? '2 contenidos' : '1 contenido')}</div>${resourcesPanel()}
      <div class="study-module-grid"><button type="button" class="study-module-card study-module-exam" data-action="home"><span class="study-folder-icon">${icon('book')}</span><span class="study-eyebrow">LECTURA Y PRÁCTICA</span><strong>Estudio para la prueba</strong><span class="study-card-description">Guías, tarjetas, preguntas, casos prácticos y tutor IA para preparar tu evaluación.</span><span class="study-module-tags">${badge(`${s.lessons.length} temas`)}${badge(`${questions().length} preguntas`)}${s.cases.length ? badge(`${s.cases.length} casos`) : ''}</span><span class="study-card-footer">Ir a estudiar <span aria-hidden="true">→</span></span></button>
      ${isEconomics() ? `<button type="button" class="study-module-card study-module-exam" data-action="exam"><span class="study-folder-icon">${icon('book')}</span><span class="study-eyebrow">EVALÚA LO APRENDIDO</span><strong>Prueba con nota</strong><span class="study-card-description">30 preguntas de selección múltiple creadas con IA desde el material del ramo. Nota y explicaciones al entregar.</span><span class="study-module-tags">${badge('4 alternativas')}${badge('Nota 1,0–7,0')}</span><span class="study-card-footer">${examAttempt() ? examAttempt().finishedAt ? 'Ver resultado' : 'Continuar prueba' : 'Preparar prueba'} →</span></button>` : ''}
      ${health ? `<button type="button" class="study-module-card study-module-grd" data-action="grd"><span class="study-folder-icon">${icon('chart')}</span><span class="study-eyebrow">ANÁLISIS Y SIMULACIÓN</span><strong>GRD</strong><span class="study-card-description">Explora los Grupos Relacionados por el Diagnóstico y practica el análisis de costos y pagos hospitalarios.</span><span class="study-module-tags">${badge('Simulador')}${badge('Casos y cálculos')}${badge('Licitaciones')}</span><span class="study-card-footer">Abrir herramientas GRD <span aria-hidden="true">→</span></span></button>` : ''}</div>`;
  }
  function homeUI() {
    const s = subject(), qs = questions(), known = qs.filter(q => progress(q.id).known).length;
    const read = s.lessons.filter(l => progress(l.id).read).length;
    const pending = qs.filter(q => !progress(q.id).known).length;
    const pct = qs.length ? Math.round(known / qs.length * 100) : 0;
    const next = s.lessons.find(l => !progress(l.id).read) || s.lessons[0];
    return `<article class="study-hero"><div>${badge(s.name)}<h2>Estudio para la prueba</h2><p>${s.id === 'sistemas-salud' ? 'Clases 1 a 6 · fundamentos, incentivos, GRD y medicamentos.' : html(s.source)}</p>
      <div class="study-progress-label"><span>${known} de ${qs.length} tarjetas dominadas</span><strong>${pct}%</strong></div><progress value="${known}" max="${Math.max(qs.length, 1)}" aria-label="Tarjetas dominadas"></progress>
      <div class="study-actions">${next ? button('lesson', read ? 'Continuar estudiando →' : 'Comenzar a estudiar →', `data-id="${html(next.id)}"`, 'light') : button('add-lesson', 'Agregar primer tema', '', 'light')}${button('tutor', '✦ Tutor IA', '', 'hero-outline')}</div></div>
      <div class="study-hero-art" aria-hidden="true"><div class="study-art-card">Aa<span>Comprender</span></div><div class="study-art-card">✓<span>Recordar</span></div><div class="study-art-card">↗<span>Aplicar</span></div></div></article>
      <div class="study-stats"><div><strong>${read}/${s.lessons.length}</strong><span>Temas leídos</span></div><div><strong>${pending}</strong><span>Por repasar</span></div><div><strong>${st.history.filter(h => h.subject === s.id).length}</strong><span>Prácticas realizadas</span></div></div>
      <div class="study-modes">${modeCard('practice-ai', '✦', 'Práctica IA', 'Preguntas nuevas en cada sesión. Responde y recibe una explicación.', 'Con la API de OpenAI')}${modeCard('cards', '▤', 'Tarjetas', 'Recuerda antes de revelar la respuesta.', `${qs.length} preguntas`)}${modeCard('quiz', '✓', 'Autoevaluación', 'Practica con corrección y explicación.', 'Sesiones de hasta 10 preguntas')}${modeCard('cases', '↗', 'Casos prácticos', 'Asume un rol, decide y justifica tu solución.', `${s.cases.length} incluidos · Nuevos casos con IA`)}</div>
      ${isEconomics() ? modeCard('exam', '✓', 'Prueba con nota · 30 preguntas', 'Responde a tu ritmo. Recibe tu nota y las explicaciones al entregar.', 'Selección múltiple · Generada con IA') + resourcesPanel() : ''}<div class="study-section-title"><h3>Tu ruta de estudio</h3>${button('add-lesson', '+ Tema', '', 'secondary')}</div><label class="study-search">Buscar en títulos y contenido<input id="study-search" type="search" placeholder="Por ejemplo: riesgo moral, GRD…" value="${html(query)}"></label>
      <div class="study-topics" id="study-topics">${topicCards()}</div>
      <details class="study-source"><summary>Sobre este material y tus datos</summary><p>${html(s.source)}</p><p>Las cifras y referencias normativas pertenecen a los periodos del material. El tutor puede contrastarlas con fuentes actuales cuando habilitas la búsqueda web.</p><p>Tu biblioteca y avance se guardan en este navegador. Descarga esta asignatura o respalda todos tus datos desde Sistemas de Salud → GRD → Parámetros.</p>${button('export-subject', 'Descargar asignatura', '', 'secondary')} <label>Importar asignatura JSON<input id="study-import" type="file" accept=".json,application/json"></label></details>
      ${historyUI()}`;
  }
  function modeCard(action, icon, title, description, meta) {
    return `<button class="study-mode-card" data-action="${action}"><span class="study-mode-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><span>${description}</span><small>${meta}</small><span class="study-card-arrow" aria-hidden="true">↗</span></button>`;
  }
  function topicCards() {
    const list = subject().lessons.filter(l => `${l.title} ${l.text}`.toLowerCase().includes(query.toLowerCase()));
    return list.map(l => `<button class="study-topic" data-action="lesson" data-id="${html(l.id)}"><span class="study-topic-number">${String(subject().lessons.indexOf(l) + 1).padStart(2, '0')}</span><span><strong>${html(l.title)}</strong><small>${needsMaterial(l) ? 'Guía y tarjetas pendientes de generar con IA' : html(l.objective)}<br>${l.questions.filter(q => !isExtract(q)).length} preguntas · ${Math.max(1, Math.ceil(l.text.split(/\s+/).length / 180))} min de lectura</small></span><span class="study-topic-status">${progress(l.id).read ? '✓ Leído' : '→'}</span></button>`).join('') || '<p class="study-empty">No hay temas que coincidan. Prueba otra palabra o agrega contenido.</p>';
  }
  function back() { return button('home', '← Estudio para la prueba', '', 'secondary'); }
  function lessonUI() {
    const l = lesson(); if (!l) return `${back()}<p>Agrega un tema para comenzar.</p>`;
    const note = st.notes[progressKey(l.id)] || '';
    return `${back()}<div class="study-section-title"><div><span class="study-eyebrow">TEMA ${subject().lessons.indexOf(l) + 1}</span><h3>${html(l.title)}</h3></div>${button('tutor', '✦ Preguntar al tutor', '', 'secondary')}</div>
      <div class="study-switch" aria-label="Modo del tema">${['guide','reading'].map(m => button('lesson-mode', m === 'guide' ? 'Guía de apoyo' : 'Texto completo', `data-mode="${m}" aria-pressed="${mode === m}"`, mode === m ? 'selected' : 'secondary')).join('')}</div>
      ${materialPanel(l)}
      ${isEconomics() && l.lab ? `<div class="study-actions">${button('resources', 'Practicar este tema con gráficos →', `data-lab="${html(l.lab)}"`)}</div>` : ''}
      ${mode === 'guide' ? needsMaterial(l) ? '<p class="study-empty">Tu texto está guardado. Genera la guía con IA para estudiar sus ideas explicadas y practicar con tarjetas.</p>' : `<div class="study-objective"><span aria-hidden="true">◎</span><div><strong>Al terminar podrás…</strong><p>${html(l.objective)}</p></div></div><div class="study-support">${l.summary.map((p, i) => `<article><span class="study-eyebrow">IDEA ${i + 1}</span><p>${html(p)}</p></article>`).join('')}</div><article class="study-panel"><h4>Explícalo con tus palabras</h4><p>¿Cuál es el concepto central? ¿Cómo funciona? ¿Qué ejemplo lo ilustra? ¿Qué límite o condición debes recordar?</p></article>` : `<article class="study-panel study-reading">${l.text.split(/\n+/).filter(Boolean).map(p => p.length < 100 && !/[.!?]$/.test(p) ? `<h4>${html(p)}</h4>` : `<p>${html(p)}</p>`).join('')}</article>`}
      <label class="study-panel">Mis apuntes<textarea id="study-note" rows="5" placeholder="Escribe una explicación o las dudas que quieres repasar…">${html(note)}</textarea><small>Se guardan mientras escribes.</small></label>
      <div class="study-actions">${button('mark-read', progress(l.id).read ? '✓ Leído · marcar pendiente' : 'Marcar como leído', '', 'secondary')}${button('practice-ai', '✦ Preguntas nuevas con IA')}${button('topic-cards', 'Practicar tarjetas', '', 'secondary')}${button('topic-quiz', 'Evaluarme', '', 'secondary')}</div><p class="study-footnote">Fuente: capítulo ${subject().lessons.indexOf(l) + 1} · ${html(subject().source)}</p>`;
  }
  let scope = null;
  function deck() { return questions().filter(q => (!scope || q.lesson === scope) && (!reviewOnly || !progress(q.id).known)); }
  function cardsUI() {
    const list = deck(); card = Math.max(0, Math.min(card, list.length - 1)); const q = list[card];
    return `${back()}<div class="study-section-title"><h3>Recupera antes de mirar</h3>${badge(`${list.length} tarjetas`)}</div>${materialPanel(materialLesson(), true)}<label class="study-check"><input id="study-review" type="checkbox" ${reviewOnly ? 'checked' : ''}>Solo las que necesito repasar</label>
      ${q ? `<article class="study-flashcard">${badge(q.topic)}${q.generated === 'ai-material' ? ' ' + badge('Creada con IA') : ''}<p class="study-eyebrow">TARJETA ${card + 1} / ${list.length}</p><h4>${html(q.prompt)}</h4><p>Piensa tu respuesta o dila en voz alta.</p>${!revealed ? button('reveal', 'Revelar respuesta') : `<div class="study-answer" role="status"><strong>${html(q.answer)}</strong><p>${html(q.explanation)}</p>${q.evidence ? `<details class="study-evidence"><summary>Ver fundamento en el texto</summary><p>${html(q.evidence)}</p></details>` : ''}</div><div class="study-actions">${button('known', '✓ Lo sé')}${button('again', '↻ Necesito repasar', '', 'secondary')}</div>`}</article><div class="study-actions study-center">${button('prev-card', '← Anterior', card === 0 ? 'disabled' : '', 'secondary')}${button('next-card', 'Siguiente →', card >= list.length - 1 ? 'disabled' : '', 'secondary')}${button('source', 'Ver texto fuente', `data-id="${html(q.lesson)}"`, 'secondary')}</div>` : `<article class="study-panel study-empty"><h4>${questions().length ? '¡Todo repasado!' : 'Todavía no hay tarjetas'}</h4><p>${questions().length ? 'Puedes desactivar el filtro para practicar todas las preguntas.' : 'Genera la guía y las tarjetas de un tema para comenzar.'}</p></article>`}`;
  }
  function startQuiz(failedOnly = false) {
    const pool = questions().filter(q => (!scope || q.lesson === scope) && (!failedOnly || progress(q.id).wrong));
    quiz = { items: shuffled(pool).slice(0, 10).map(q => ({ ...q, choices: shuffled(q.options || [q.answer]) })), index: 0, answers: [], feedback: null, finished: false };
    view = 'quiz'; render();
  }
  function quizUI() {
    if (!quiz) return `${back()}<article class="study-panel"><h3>Autoevaluación</h3><p>Hasta 10 preguntas, con explicación después de responder.</p>${button('start-quiz', 'Comenzar')}</article>`;
    if (!quiz.items.length) return `${back()}<p class="study-empty">Genera las tarjetas del tema para comenzar a practicar.</p>${materialPanel(materialLesson(), true)}`;
    if (quiz.finished) {
      const correct = quiz.answers.filter(a => a.correct).length, pct = Math.round(correct / quiz.items.length * 100);
      return `${back()}<article class="study-result"><span class="study-eyebrow">PRÁCTICA COMPLETADA</span><strong class="study-result-score">${pct}%</strong><h3>${correct} de ${quiz.items.length} correctas</h3><p>Revisa los conceptos que faltaron y vuelve a intentarlo.</p><div class="study-actions">${button('start-quiz', 'Nueva práctica')}${button('retry-failed', 'Repasar errores', '', 'secondary')}</div></article>${quiz.answers.map((a, i) => `<article class="study-panel"><h4>${a.correct ? '✓' : '↻'} ${html(quiz.items[i].prompt)}</h4><p>Tu respuesta: ${html(a.answer)}</p><p><strong>Respuesta: ${html(quiz.items[i].answer)}</strong></p><p>${html(quiz.items[i].explanation)}</p>${button('source', 'Revisar tema', `data-id="${html(quiz.items[i].lesson)}"`, 'secondary')}</article>`).join('')}`;
    }
    const q = quiz.items[quiz.index];
    return `${back()}<div class="study-section-title"><h3>Autoevaluación</h3>${badge(`${quiz.index + 1} / ${quiz.items.length}`)}</div><progress value="${quiz.index}" max="${quiz.items.length}" aria-label="Avance de la autoevaluación"></progress><article class="study-panel"><p class="study-eyebrow">${html(q.topic)}</p><h4>${html(q.prompt)}</h4>
      ${q.options ? `<div class="study-options">${q.choices.map((o,i) => button('answer', html(o), `data-index="${i}" ${quiz.feedback ? 'disabled' : ''}`, quiz.feedback && o === q.answer ? 'correct' : 'secondary')).join('')}</div>` : `<p>Responde con tus palabras antes de comparar con el texto.</p><textarea id="study-open-answer" rows="4" placeholder="Tu respuesta…" ${quiz.feedback ? 'disabled' : ''}></textarea>${!quiz.feedback ? button('open-answer', 'Comparar con respuesta de referencia') : ''}`}
      ${quiz.feedback ? `<div class="study-answer" role="status"><strong>${quiz.feedback.open ? 'Compara y evalúa tu respuesta' : quiz.feedback.correct ? '✓ Correcto' : '↻ Revisa este concepto'}</strong><p>${html(q.answer)}</p><p>${html(q.explanation)}</p>${quiz.feedback.open ? `<div class="study-actions">${button('self-correct', 'Mi respuesta coincide')}${button('self-wrong', 'Necesito repasar', '', 'secondary')}</div>` : button('next-question', quiz.index === quiz.items.length - 1 ? 'Ver resultado' : 'Siguiente pregunta →')}</div>` : ''}</article>`;
  }
  function record(answer, correct) {
    const q = quiz.items[quiz.index]; quiz.answers.push({ answer, correct });
    st.progress[progressKey(q.id)] = { ...progress(q.id), wrong: !correct, attempts: (progress(q.id).attempts || 0) + 1 };
    save(); quiz.feedback = { correct }; render();
  }
  function historyUI() {
    const list = st.history.filter(h => h.subject === subject().id).slice(-5).reverse();
    return list.length ? `<article class="study-panel"><h3>Mis últimas prácticas</h3>${list.map(h => `<p>${html(new Date(h.date).toLocaleDateString('es-CL'))} · ${h.correct}/${h.total} correctas${h.type === 'exam' ? ` · Nota ${html(Number(h.grade).toFixed(1).replace('.', ','))} · Exigencia ${Math.round(h.threshold * 100)} %` : ''}${h.self ? ' · incluye autoevaluación de respuestas abiertas' : ''}</p>`).join('')}</article>` : '';
  }
  function examAttempt() {
    if (!examLoaded) {
      if (!st.exams || typeof st.exams !== 'object' || Array.isArray(st.exams)) st.exams = {};
      const saved = st.exams[economicsID];
      st.exams[economicsID] = PruebaEstudio.restore(saved);
      if (saved && !st.exams[economicsID]) status = 'No se pudo recuperar la prueba guardada. Puedes generar otra; tus apuntes y resultados anteriores se conservan.';
      examLoaded = true;
    }
    return st.exams[economicsID];
  }
  const examGrade = value => value.toFixed(1).replace('.', ',');
  function examSetup() {
    return `<article class="study-panel study-exam-setup">
      <span class="study-eyebrow">ECONOMÍA DE LA SALUD · PRUEBA IA</span><h3>30 preguntas para poner a prueba lo aprendido</h3>
      <p>La IA crea una prueba nueva desde el contenido que tengas ingresado en este ramo, incluidos tus temas personales. Las preguntas y sus alternativas se ordenan al azar.</p>
      <p>Cuatro alternativas por pregunta, una correcta. Incluye conceptos y ejercicios con situaciones simuladas de salud. Puedes saltar preguntas y cambiar tus respuestas antes de entregar. Sin límite de tiempo.</p>
      <label>Exigencia para obtener un 4,0<select id="study-exam-threshold" ${busy ? 'disabled' : ''}>${[50,60,70].map(p => `<option value="${p / 100}" ${examThreshold === p / 100 ? 'selected' : ''}>${p} % · ${Math.ceil(30 * p / 100)} correctas de 30</option>`).join('')}</select></label>
      <p class="study-footnote">Escala de 1,0 a 7,0, con un decimal. Cada acierto vale un punto; errores y omisiones valen cero. Exigencia fija durante el intento. Es una autoevaluación de estudio.</p>
      ${quotaAlert()}${button('generate-exam', creatingExam ? 'Creando las 30 preguntas…' : examAttempt() ? '✦ Generar otra prueba con IA' : '✦ Generar prueba de 30 preguntas', busy || !ai.connected ? 'disabled' : '')}
      <p class="study-footnote">${creatingExam ? 'La IA está creando y revisando las preguntas y sus soluciones. Puede tardar unos minutos.' : 'Crear y revisar la prueba usa la API de OpenAI. Responderla y consultar la nota no requiere nuevas consultas. Tu último intento se guarda en este navegador.'}</p>
      ${!ai.connected ? `<div class="study-case-connection">${connectionUI()}</div>` : ''}</article>`;
  }
  function examUI() {
    const attempt = examAttempt(), top = `${back()}<div class="study-section-title"><h2>Prueba con nota</h2>${badge('Economía de la Salud')}</div>`;
    if (!attempt) return top + examSetup();
    if (attempt.finishedAt) {
      const result = PruebaEstudio.score(attempt);
      const topics = [...new Set(attempt.questions.map(q => q.sourceTitle))];
      return `${top}<article class="study-result" id="study-exam-result"><span class="study-eyebrow">PRUEBA ENTREGADA · NOTA FINAL</span><strong class="study-result-score">${examGrade(result.grade)}</strong><h3>${result.passed ? 'Meta alcanzada' : 'Sigue practicando'} · ${result.correct} de 30 correctas</h3><p>${result.percent} % de logro · ${result.wrong} incorrectas · ${result.omitted} omitidas.</p><p>Escala 1,0–7,0 · Exigencia ${Math.round(attempt.threshold * 100)} % para el 4,0 · ${html(usageDate(attempt.finishedAt))}</p></article><article class="study-panel"><h3>Resultado por tema</h3><ul class="study-exam-topics">${topics.map(title => { const indices = attempt.questions.map((q,i) => q.sourceTitle === title ? i : -1).filter(i => i >= 0), correct = indices.filter(i => attempt.answers[i] === attempt.questions[i].answerIndex).length; return `<li><span>${html(title)}</span><strong>${correct}/${indices.length}</strong></li>`; }).join('')}</ul></article><div class="study-section-title"><h3>Revisa tus respuestas</h3>${badge('Corrección y explicación')}</div>${attempt.questions.map((q,i) => { const selected = attempt.answers[i], correct = selected === q.answerIndex, source = subject().lessons.find(l => l.title === q.sourceTitle); return `<details class="study-panel study-exam-review"><summary>${i + 1}. ${correct ? '✓ Correcta' : selected === null ? '— Omitida' : '↻ Incorrecta'} · ${html(q.prompt)}</summary><p>Tu respuesta: ${selected === null ? 'Sin responder' : html(q.options[selected])}</p><p><strong>Respuesta correcta: ${html(q.options[q.answerIndex])}</strong></p><p>${html(q.explanation)}</p><p class="study-footnote">Tema: ${html(q.sourceTitle)}</p>${source ? button('source', 'Repasar este tema', `data-id="${html(source.id)}"`, 'secondary') : ''}</details>`; }).join('')}<p class="study-footnote">Preguntas creadas con IA. Contrasta las explicaciones con el material del ramo; la IA puede cometer errores.</p>${examSetup()}`;
    }
    const q = attempt.questions[attempt.index], answered = attempt.answers.filter(a => a !== null).length;
    return `${top}<div class="study-exam-meta"><strong>${answered} de 30 respondidas</strong><span>Exigencia ${Math.round(attempt.threshold * 100)} % · Guardado en este navegador</span></div><progress value="${answered}" max="30" aria-label="Preguntas respondidas"></progress><nav class="study-exam-nav" aria-label="Navegar por las 30 preguntas">${attempt.questions.map((_,i) => button('exam-jump', `${i + 1}`, `data-index="${i}" aria-label="Pregunta ${i + 1}, ${attempt.answers[i] === null ? 'sin responder' : 'respondida'}" ${i === attempt.index ? 'aria-current="step"' : ''}`, attempt.answers[i] !== null ? 'answered' : 'secondary')).join('')}</nav><p class="study-footnote">Los números verdes indican preguntas respondidas. Puedes revisar y cambiar cualquier respuesta.</p><article class="study-panel study-exam-question"><p class="study-eyebrow">PREGUNTA ${attempt.index + 1} DE 30</p><h3 id="study-exam-prompt">${html(q.prompt)}</h3><div class="study-options" role="group" aria-labelledby="study-exam-prompt">${q.options.map((option,i) => button('exam-answer', `<span class="study-exam-letter">${'ABCD'[i]}</span><span>${html(option)}</span>`, `data-index="${i}" aria-pressed="${attempt.answers[attempt.index] === i}"`, attempt.answers[attempt.index] === i ? 'selected' : 'secondary')).join('')}</div><div class="study-actions">${button('exam-prev', '← Anterior', attempt.index === 0 ? 'disabled' : '', 'secondary')}${button('exam-next', 'Siguiente →', attempt.index === 29 ? 'disabled' : '')}${attempt.answers[attempt.index] !== null ? button('exam-clear', 'Quitar respuesta', '', 'secondary') : ''}</div></article><div class="study-actions">${button('exam-deliver', 'Entregar prueba y ver nota')}${button('exam-pending', `Revisar sin responder (${30 - answered})`, answered === 30 ? 'disabled' : '', 'secondary')}</div>${examConfirm ? `<article class="study-notice" id="study-exam-confirm" role="alert"><strong>${answered < 30 ? `Quedan ${30 - answered} preguntas sin responder; contarán como incorrectas.` : 'Las 30 preguntas están respondidas.'}</strong><p>Al entregar se calculará la nota y las respuestas quedarán cerradas.</p><div class="study-actions">${button('exam-finish', 'Confirmar entrega')}${button('exam-cancel-delivery', 'Seguir revisando', '', 'secondary')}</div></article>` : ''}<p class="study-footnote">Puedes salir y continuar después en este navegador. Las soluciones se muestran al entregar.</p>`;
  }
  async function generateExam() {
    if (busy || !isEconomics()) return;
    const captured = structuredClone(subject()), previous = examAttempt();
    busy = true; creatingExam = true; status = ''; statusPlace = 'general'; render();
    try {
      await checkAI();
      if (!ai.connected) throw Error('Habilita la conexión con la API para generar la prueba.');
      const data = await request('tutor', { model, generateExam: true, context: { name: captured.name, source: captured.source, lessons: captured.lessons.map(l => ({ title: l.title, text: l.text })) }, messages: [{ role: 'user', content: 'Prepara una prueba de 30 preguntas variadas con conceptos, casos de salud y ejercicios. ' + (previous ? 'Evita repetir estos enunciados de la prueba anterior: ' + JSON.stringify(previous.questions.map(q => q.prompt)).slice(0, 18000) : '') }] });
      const attempt = PruebaEstudio.create(data.exam?.questions, examThreshold);
      if (attempt.questions.some(q => !captured.lessons.some(l => l.title === q.sourceTitle))) throw Error('La prueba contiene temas ajenos al material. Vuelve a generarla.');
      st.exams[captured.id] = attempt; examConfirm = false; save();
    } catch (err) { status = err.message; if (err.status === 402) apiUsage = { ...apiUsage, quota: { state: 'exhausted', code: err.code, message: err.message } }; }
    finally { busy = false; creatingExam = false; await refreshUsage(true); render(); }
  }
  const caseID = (c, i) => c.id || `case-${i}`;
  const caseNoteKey = (c, i, step) => progressKey(`case-${c.id || i}-${step}`);
  function caseSession() {
    const id = subject().id;
    if (!caseSessions.has(id)) caseSessions.set(id, { mode: 'default', items: [], selected: '', notes: {}, topic: '', difficulty: 'intermedia' });
    return caseSessions.get(id);
  }
  function caseIndex() {
    const list = subject().cases;
    const selected = list.findIndex((c,i) => caseID(c,i) === st.caseSelection?.[subject().id]);
    return selected >= 0 ? selected : Math.max(0, list.findIndex(c => c.role));
  }
  function casesUI() {
    const session = caseSession(), generated = session.mode === 'ai';
    const list = generated ? session.items : subject().cases, ci = generated ? Math.max(0, list.findIndex(c => c.id === session.selected)) : caseIndex(), c = list[ci];
    const header = `${back()}<div class="study-section-title"><h3>Casos prácticos</h3>${badge('Decide · Fundamenta · Revisa')}</div>
      <article class="study-panel study-case-generator" aria-busy="${creatingCase}"><span class="study-eyebrow">UN DESAFÍO NUEVO</span><h4>Crea un caso al azar con IA</h4><p>Practica con otra situación, nuevas restricciones y tres decisiones guiadas, a partir de tus apuntes.</p>
        <div class="study-case-settings"><label>Tema del caso<select id="study-case-topic"><option value="">Elegir un tema al azar</option>${subject().lessons.map(l => `<option value="${html(l.id)}" ${session.topic === l.id ? 'selected' : ''}>${html(l.title)}</option>`).join('')}</select></label>
        <label>Dificultad<select id="study-case-difficulty">${['básica','intermedia','avanzada'].map(d => `<option ${d === session.difficulty ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
        ${button('generate-case', creatingCase ? 'Creando tu caso…' : '✦ Generar caso nuevo con IA', busy || !ai.connected || !model || !subject().lessons.length ? 'disabled' : '')}
        ${creatingCase ? '<p role="status">La IA está preparando la situación y sus orientaciones. Tu caso anterior se conserva mientras esperas.</p>' : ''}
        <p class="study-footnote">Cada generación consume tokens de la API. Los casos IA y tus respuestas son temporales: se descartan al recargar o cerrar esta página.</p>
        ${!ai.connected ? `<div class="study-case-connection">${connectionUI()}</div>` : ''}${quotaAlert()}
      </article>
      <div class="study-switch" aria-label="Origen de los casos">${button('cases-default', `Casos incluidos (${subject().cases.length})`, `aria-pressed="${!generated}" ${busy ? 'disabled' : ''}`, generated ? 'secondary' : 'selected')}${button('cases-ai', `Casos IA de esta sesión (${session.items.length})`, `aria-pressed="${generated}" ${busy ? 'disabled' : ''}`, generated ? 'selected' : 'secondary')}</div>`;
    if (!c) return header + `<p class="study-empty">${generated ? 'Genera un caso nuevo para comenzar. Aparecerá aquí con sus preguntas y orientaciones.' : 'Esta asignatura todavía no tiene casos incluidos. Puedes generar uno nuevo con IA usando su material.'}</p>`;
    const notes = generated ? session.notes : st.notes;
    return `${header}<div class="study-case-picker"><label>${generated ? 'Casos generados en esta página' : 'Elige una situación incluida'}<select id="${generated ? 'study-case-ai-select' : 'study-case-select'}">${list.map((item,i) => `<option value="${i}" ${i === ci ? 'selected' : ''}>${html(item.title)}</option>`).join('')}</select></label>${!generated ? button('random-case', '↻ Sortear caso incluido', busy || list.length < 2 ? 'disabled' : '', 'secondary') : ''}</div>
      <p>Escribe tu plan antes de consultar la solución. Puede haber varias propuestas defendibles: explica el diagnóstico, las prioridades, los responsables y cómo medirás el resultado.</p>
      <article class="study-panel study-case-scenario">${c.role ? badge(`Tu rol: ${c.role}`) : badge('Caso de aplicación')}${c.fictional ? ' ' + badge('Escenario ficticio') : ''}${generated ? ' ' + badge('Generado con IA') : ''}<h4>${html(c.title)}</h4><p>${html(c.text)}</p>${generated ? `<p class="study-footnote">Tema: ${html(c.sourceTitle)} · Dificultad ${html(c.difficulty)}. Contrasta las orientaciones con el material.</p>` : ''}</article>
      ${c.steps.map((step, si) => { const key = caseNoteKey(c, ci, si); return `<article class="study-panel study-case-step"><span class="study-eyebrow">PASO ${si + 1} · ${html(step[0])}</span><h4>${html(step[1])}</h4><label>Mi decisión y su fundamento<textarea ${generated ? 'data-case-note' : 'data-note'}="${html(key)}" rows="4" placeholder="Haría… porque… Lo coordinaría con… Evaluaría el resultado mediante…">${html(notes[key] || '')}</textarea></label><details><summary>Comparar con una solución razonada</summary><p>${html(step[2])}</p></details></article>`; }).join('')}
      <article class="study-panel"><h4>Revisa tu propuesta</h4><p>¿Resuelve la causa o solo el síntoma? ¿Quién tiene la atribución para actuar? ¿Qué recursos necesita? ¿Qué indicador usarías? ¿Qué riesgo debes vigilar?</p><p class="study-footnote">${generated ? 'Este caso y tus respuestas se descartan al recargar o cerrar la página.' : 'Tus respuestas se guardan en este navegador.'} La solución es una orientación para estudiar; puedes defender alternativas con los conceptos del material.</p><div class="study-actions">${button('case-to-tutor', '✦ Llevar mi plan al tutor')}${button('source', 'Consultar fundamento del caso', `data-id="${html(c.lesson)}"`, 'secondary')}</div></article>`;
  }
  async function generateCase() {
    if (busy || !ai.connected || !model) return;
    const s = subject(), session = caseSession();
    // With random topics, avoid the last generated topic when other lessons are available.
    const candidates = session.topic ? s.lessons.filter(l => l.id === session.topic) : s.lessons.filter(l => s.lessons.length < 2 || l.id !== session.items.at(-1)?.lesson);
    const l = shuffled(candidates)[0]; if (!l) return;
    const avoidCases = [...s.cases, ...session.items].slice(-30).map(c => ({ title: c.title.slice(0, 180), text: c.text.slice(0, 1000) }));
    busy = true; creatingCase = true; status = ''; statusPlace = 'general'; render();
    try {
      const data = await request('tutor', { model, generateCase: true, web: false, difficulty: session.difficulty, avoidCases,
        practiceStyle: s.id === 'sistemas-salud' || s.cases.some(c => c.role === 'Director/a de hospital') ? 'hospital-director' : 'concepts',
        context: { name: s.name, source: s.source, lessons: [{ title: l.title, text: l.text }] },
        messages: [{ role: 'user', content: 'Crea un caso práctico nuevo con tres etapas para que pueda decidir, escribir mi plan y compararlo con una solución razonada.' }] });
      const c = data.case;
      if (!c || c.sourceTitle !== l.title || !Array.isArray(c.steps) || c.steps.length !== 3) throw Error('La IA no devolvió un caso válido. Inténtalo nuevamente.');
      session.items.push({ ...c, lesson: l.id, difficulty: session.difficulty }); session.selected = c.id; session.mode = 'ai';
      status = 'Caso nuevo listo. Escribe tu plan y abre las orientaciones cuando quieras compararlo.';
    } catch (err) {
      status = err.message;
      if (err.status === 402) apiUsage = { ...apiUsage, quota: { state: 'exhausted', code: err.code, message: err.message } };
      if (err.status === 401) await checkAI();
    } finally { await refreshUsage(true); busy = false; creatingCase = false; render(); }
  }
  function editorUI() {
    return `${button('cancel-editor', '← Cancelar', '', 'secondary')}<form id="study-editor" class="study-panel"><h3>${editor === 'subject' ? 'Nueva asignatura' : 'Agregar tema a ' + html(subject().name)}</h3>
      ${editor === 'subject' ? '<label>Nombre de la asignatura<input name="subject" required maxlength="120" placeholder="Por ejemplo: Economía de la salud"></label>' : ''}
      <label>Título del tema<input name="title" required maxlength="180" placeholder="Por ejemplo: Conceptos de la clase 1"></label><label>Fuente o referencia<input name="source" maxlength="400" placeholder="Apuntes, clase, autor y fecha"></label>
      <label>Contenido de estudio<textarea name="text" id="study-content" rows="10" required minlength="80" maxlength="120000" placeholder="Pega aquí el texto del tema…"></textarea></label><label>Cargar texto (.txt o .md)<input id="study-text-file" type="file" accept=".txt,.md,text/plain,text/markdown"></label>
      <p class="study-footnote">La IA elaborará una guía, preguntas concretas, respuestas y explicaciones a partir del texto. El texto se guarda primero; si falta acceso o saldo, podrás generar el material después. La generación consume tokens de la API.</p><div class="study-actions"><button class="study-btn" type="submit" value="generate">Guardar y generar con IA</button><button class="study-btn secondary" type="submit" value="text">Guardar solo texto</button></div></form>`;
  }
  function buildLesson(title, text, source) {
    return { id: uid(), title, text, source, objective: '', summary: [], questions: [], materialStatus: 'pending' };
  }
  function isExtract(q) { return q.generated === 'extract' || /^Explica la idea de este fragmento:/.test(q.prompt); }
  function needsMaterial(l) { return l.materialStatus === 'pending' || l.questions.some(isExtract); }
  function materialLesson() {
    return subject().lessons.find(l => l.id === (materialTopic || scope)) || subject().lessons.find(needsMaterial) || lesson();
  }
  function materialPanel(l, choose = false) {
    if (!l) return '';
    return `<article class="study-panel study-material" aria-busy="${materialRunning}"><div class="study-section-title"><h4>Guía y tarjetas con IA</h4>${badge(l.materialStatus === 'ready' ? 'Material generado con IA' : needsMaterial(l) ? 'Pendiente de generar' : 'Material de estudio')}</div>
      ${choose ? `<label>Tema para generar<select id="study-material-topic">${subject().lessons.map(x => `<option value="${html(x.id)}" ${x.id === l.id ? 'selected' : ''}>${html(x.title)}</option>`).join('')}</select></label>` : ''}
      <p>${l.questions.some(isExtract) ? 'Este tema tiene tarjetas antiguas hechas con fragmentos. La IA las reemplazará por preguntas y respuestas elaboradas.' : 'Comprende las ideas del tema y practica preguntas con respuestas claras y explicaciones.'}</p>
      ${button('generate-material', materialRunning ? 'Elaborando guía y tarjetas…' : l.materialStatus === 'ready' ? '↻ Regenerar guía y tarjetas con IA' : '✦ Generar guía y tarjetas con IA', `data-id="${html(l.id)}" ${busy ? 'disabled' : ''}`)}
      <p class="study-footnote">Se genera desde el texto completo de este tema y consume tokens. Conserva tus apuntes y las preguntas añadidas por otras vías; reemplaza los antiguos extractos y la generación anterior de este botón.</p>
      ${materialRunning ? '<p role="status">La IA está preparando el material. El texto original y tus apuntes se conservan.</p>' : materialTarget === l.id && !ai.connected ? connectionUI() : ''}${quotaAlert()}</article>`;
  }
  async function generateMaterial(id) {
    if (busy) return;
    const s = subject(), l = s.lessons.find(x => x.id === id); if (!l) return;
    materialTarget = l.id; materialTopic = l.id; materialRunning = true; busy = true; status = ''; statusPlace = 'general'; render();
    try {
      await checkAI();
      if (!ai.connected || !model) { status = 'Tu texto está guardado. Habilita el acceso a la IA y pulsa Generar guía y tarjetas para continuar.'; return; }
      const data = await request('tutor', { model, generateMaterial: true, web: false, practiceStyle: 'concepts',
        context: { name: s.name, source: l.source || s.source, lessons: [{ title: l.title, text: l.text }] },
        messages: [{ role: 'user', content: 'Elabora una guía clara y tarjetas con preguntas específicas, respuestas breves y explicaciones fundamentadas. Deben ayudarme a comprender y recordar este tema.' }] });
      const m = data.material;
      if (!m || m.sourceTitle !== l.title || typeof m.objective !== 'string' || !Array.isArray(m.summary) || !Array.isArray(m.cards) || m.cards.length < 3 || m.cards.some(q => !q.prompt || !q.answer || !q.explanation || !q.evidence)) throw Error('La IA no devolvió material completo. Intenta nuevamente.');
      const before = structuredClone(st), target = editableSubject(s.id).lessons.find(x => x.id === l.id);
      const kept = target.questions.filter(q => !isExtract(q) && q.generated !== 'ai-material');
      Object.assign(target, { objective: m.objective, summary: m.summary, materialStatus: 'ready', materialGeneratedAt: new Date().toISOString(),
        questions: [...kept, ...m.cards.map(q => ({ ...q, id: uid(), generated: 'ai-material' }))] });
      if (!save()) { st = before; throw Error('No se pudo guardar el material nuevo en este navegador. El contenido anterior se conserva; descarga un respaldo y libera espacio antes de reintentar.'); }
      card = 0; revealed = false; reviewOnly = false; quiz = null;
      if (view === 'cards') scope = l.id;
      status = `Guía y ${m.cards.length} tarjetas creadas con IA. Revisa sus explicaciones con el texto fuente.`;
    } catch (err) {
      status = err.message;
      if (err.status === 402) apiUsage = { ...apiUsage, quota: { state: 'exhausted', code: err.code, message: err.message } };
      if (err.status === 401) await checkAI();
    } finally { await refreshUsage(true); busy = false; materialRunning = false; render(); }
  }
  function validateSubject(s) {
    if (!s || typeof s.name !== 'string' || !s.name.trim() || !Array.isArray(s.lessons) || !s.lessons.length || s.lessons.length > 100) throw Error('La asignatura debe tener nombre y entre 1 y 100 temas.');
    const id = uid();
    const result = { id, name: s.name.slice(0, 120), source: String(s.source || 'Contenido importado'), cases: [], lessons: s.lessons.map(l => {
      if (typeof l.title !== 'string' || typeof l.text !== 'string' || l.text.length > 120000 || !l.text.trim()) throw Error('Cada tema necesita título y texto (máximo 120.000 caracteres).');
      const lesson = buildLesson(l.title, l.text, l.source || s.source);
      if (Array.isArray(l.summary) && l.summary.every(x => typeof x === 'string')) lesson.summary = l.summary.slice(0, 12);
      if (typeof l.objective === 'string') lesson.objective = l.objective;
      if (lesson.objective && lesson.summary.length) lesson.materialStatus = l.materialStatus === 'ready' ? 'ready' : 'provided';
      if (typeof l.materialGeneratedAt === 'string') lesson.materialGeneratedAt = l.materialGeneratedAt;
      if (Array.isArray(l.questions)) lesson.questions = l.questions.slice(0, 100).map((q, i) => {
        if (typeof q.prompt !== 'string' || typeof q.answer !== 'string' || !q.answer.trim()) throw Error('Pregunta o respuesta inválida.');
        const options = q.options;
        if (options != null && (!Array.isArray(options) || options.length < 2 || options.length > 6 || !options.every(o => typeof o === 'string') || new Set(options).size !== options.length || !options.includes(q.answer))) throw Error('Las alternativas deben ser únicas e incluir la respuesta correcta.');
        return { id: lesson.id + '-q' + i, prompt: q.prompt, answer: q.answer, explanation: String(q.explanation || ''), ...(options ? { options } : {}), ...(['extract', 'ai-material'].includes(q.generated) ? { generated: q.generated } : {}), ...(typeof q.evidence === 'string' ? { evidence: q.evidence } : {}) };
      });
      return lesson;
    }) };
    if (Array.isArray(s.cases)) result.cases = s.cases.slice(0, 30).map(c => {
      const index = s.lessons.findIndex(l => l.id === c.lesson);
      if (index < 0 || typeof c.title !== 'string' || typeof c.text !== 'string' || !Array.isArray(c.steps) || c.steps.some(step => !Array.isArray(step) || step.length !== 3 || !step.every(v => typeof v === 'string'))) throw Error('Caso guiado inválido.');
      return { id: uid(), title: c.title, text: c.text, lesson: result.lessons[index].id, steps: c.steps.slice(0, 15), ...(typeof c.role === 'string' ? { role: c.role.slice(0, 120) } : {}), ...(c.fictional === true ? { fictional: true } : {}) };
    });
    return result;
  }
  async function request(path, body) {
    const response = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    if (!response.ok) { let data; try { data = await response.json(); } catch {} const err = Error(data?.error || 'No se pudo conectar con el servicio de IA.'); err.status = response.status; err.code = data?.code; throw err; }
    return response.json();
  }
  async function checkAI() {
    try {
      const data = await request('session');
      if (data.provider !== 'openai-api') throw Error('El servidor sigue ejecutando la conexión anterior. Detén el proceso, inicia npm start y recarga la página.');
      ai = data; model = ai.models.some(m => m.slug === model) ? model : ai.models[0]?.slug || ''; await refreshUsage(true);
    } catch (err) { ai = { available: false, connected: false, models: [], error: err.message }; model = ''; }
  }
  function connectionUI() {
    if (ai.setupError) return `<div class="study-notice"><strong>Completa la configuración del hosting</strong><p>${html(ai.setupError)}</p><p>Guarda las variables en Production y vuelve a desplegar el proyecto. APP_PASSWORD es opcional: elimínala para acceder sin contraseña. OPENAI_API_KEY se mantiene en el servidor.</p></div>${button('refresh-ai', 'Volver a comprobar', busy ? 'disabled' : '', 'secondary')}`;
    if (!ai.available) return `<p class="study-notice">No se encontró el servicio de la API. Abre la app desde el servidor Node.js o desde el hosting que lo ejecuta. GitHub Pages y abrir index.html directamente permiten estudiar sin el tutor integrado.</p>${ai.error ? `<p>${html(ai.error)}</p>` : ''}${button('refresh-ai', 'Volver a comprobar', busy ? 'disabled' : '', 'secondary')}`;
    if (!ai.configured) return `<div class="study-notice"><strong>Falta configurar la API de OpenAI</strong><p>En tu computador, agrega la clave en <code>OPENAI_API_KEY</code> dentro del archivo <code>.env</code> de la app y reinicia el servidor. Si está publicada, configura esa variable en el hosting.</p><p>La clave permanece en el servidor. No la pegues en el chat ni en tus apuntes.</p></div><div class="study-actions"><a class="study-btn secondary" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">Crear clave de API ↗</a>${button('refresh-ai', 'Ya configuré la API · comprobar', busy ? 'disabled' : '', 'secondary')}</div>`;
    if (ai.authRequired) return `<form id="study-login-form" class="study-composer"><label for="study-access-password">Contraseña de acceso al tutor<input id="study-access-password" name="password" type="password" autocomplete="current-password" required maxlength="1000" ${busy ? 'disabled' : ''}></label><p class="study-footnote">Usa la contraseña de esta plataforma que configuró su administrador.</p><button class="study-btn" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Verificando…' : 'Entrar al tutor'}</button></form>`;
    return `<p>La API está configurada para conversar sobre tus apuntes y crear preguntas.</p><label>Modelo de estudio<select id="study-model">${ai.models.map(m => `<option value="${html(m.slug)}" ${m.slug === model ? 'selected' : ''}>${html(m.display_name)}</option>`).join('')}</select></label><div class="study-actions">${button('check-api', busy ? 'Comprobando…' : 'Comprobar conexión API', busy ? 'disabled' : '', 'secondary')}${ai.protected ? button('disconnect-ai', 'Cerrar acceso al tutor', busy ? 'disabled' : '', 'secondary') : ''}<a class="study-btn secondary" href="https://platform.openai.com/usage" target="_blank" rel="noopener">Ver consumo de API ↗</a></div>`;
  }
  function tutorUI() {
    const l = lesson();
    return `${back()}<div class="study-section-title"><div><span class="study-eyebrow">APRENDE CONVERSANDO</span><h3>Tu tutor de estudio</h3></div>${badge(ai.connected ? 'API configurada' : 'OpenAI API')}</div>
      <article class="study-panel">${connectionUI()}${statusPlace === 'connection' ? notice() : ''}<p class="study-footnote">Las consultas y búsquedas se facturan al proyecto de OpenAI configurado para esta app, por separado del plan de ChatGPT.</p></article><article class="study-panel">
      <label>Contexto del tutor<select id="study-ai-context"><option value="">Toda la asignatura</option>${subject().lessons.map(x => `<option value="${html(x.id)}" ${scope === x.id ? 'selected' : ''}>${html(x.title)}</option>`).join('')}</select></label>
      <label>Dificultad de las preguntas<select id="study-difficulty">${['básica','intermedia','avanzada'].map(d => `<option ${d === difficulty ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>Tipo de práctica<select id="study-practice-style"><option value="concepts" ${practiceStyle === 'concepts' ? 'selected' : ''}>Conceptos y aplicación</option><option value="hospital-director" ${practiceStyle === 'hospital-director' ? 'selected' : ''}>Casos: director/a de hospital</option></select></label><p class="study-footnote">En los casos directivos tendrás que priorizar una acción ante una situación ficticia. La explicación abordará responsables, recursos, indicadores y riesgos.</p>
      <label class="study-check"><input id="study-web" type="checkbox" ${web ? 'checked' : ''}>Permitir búsqueda web cuando sea necesaria</label><p class="study-footnote">El tutor recibe el texto seleccionado al enviar tu consulta. La búsqueda es opcional, tiene costo de API y depende del modelo configurado; las respuestas muestran sus fuentes. Las preguntas de práctica se generan desde tus apuntes.</p>${button('begin-ai-practice', busy ? 'Creando preguntas…' : '✦ Comenzar práctica con preguntas nuevas', busy || !ai.connected || !subject().lessons.length ? 'disabled' : '')}${pendingPractice && !ai.connected ? '<p>Habilita el acceso a la API para comenzar la práctica interactiva.</p>' : ''}</article>
      <div class="study-quick">${['Explícame el concepto con un ejemplo','Hazme una pregunta a la vez','Entrenar como director/a'].map((p, i) => button('quick-ai', html(p), `data-index="${i}"`, 'secondary')).join('')}${button('generate-ai', '✦ Crear preguntas para este tema', ` ${busy || !ai.connected || !l ? 'disabled' : ''}`, 'secondary')}</div>
      <div class="study-chat" role="log" aria-label="Conversación con el tutor">${chat.map(m => `<article class="study-message ${m.role}"><strong>${m.role === 'user' ? 'Tú' : 'Tutor'}</strong><div>${html(m.text)}</div>${(m.sources || []).map(s => /^https?:\/\//.test(s.url) ? `<a href="${html(s.url)}" target="_blank" rel="noopener">${html(s.title || s.url)} ↗</a>` : '').join('')}</article>`).join('')}${busy ? '<p role="status">El tutor está preparando tu respuesta…</p>' : ''}</div>
      ${quotaAlert()}${statusPlace === 'chat' && status !== apiUsage?.quota?.message ? notice() : ''}<form id="study-chat-form" class="study-composer"><label for="study-message">Tu pregunta<textarea id="study-message" rows="3" maxlength="6000" placeholder="¿Qué te gustaría comprender mejor?" ${busy ? 'disabled' : ''}>${html(draft)}</textarea></label><button class="study-btn" ${busy || !ai.connected || !model ? 'disabled' : ''}>Enviar →</button></form>${chat.length ? button('clear-chat', 'Nueva conversación', busy ? 'disabled' : '', 'secondary') : ''}`;
  }
  function context() { return { name: subject().name, source: subject().source, lessons: subject().lessons.filter(l => !scope || l.id === scope).map(l => ({ title: l.title, text: l.text })) }; }
  async function sendAI(message, generate = false, practice = false) {
    if (busy || !ai.connected || !model) return;
    busy = true; status = ''; statusPlace = 'chat'; draft = '';
    const capturedScope = scope, capturedSubject = subject(), capturedLesson = capturedSubject.lessons.find(l => l.id === capturedScope) || lesson();
    const messages = [...chat.slice(-12).map(m => ({ role: m.role, content: m.text })), { role: 'user', content: message }];
    const outgoing = { role: 'user', text: message };
    if (!generate) chat.push(outgoing);
    render();
    try {
      const data = await request('tutor', { model, web: generate ? false : web, practiceStyle, context: generate && !practice ? { name: capturedSubject.name, source: capturedSubject.source, lessons: [{ title: capturedLesson.title, text: capturedLesson.text }] } : context(), messages: generate ? [{ role: 'user', content: message }] : messages, generate });
      if (generate) {
        const parsed = JSON.parse(data.text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
        if (!Array.isArray(parsed.questions) || parsed.questions.length !== 6 || parsed.questions.some(q => !q.options)) throw Error('La IA debe devolver seis preguntas con alternativas. Inténtalo nuevamente.');
        const sourceLessons = practice ? capturedSubject.lessons.filter(l => !capturedScope || l.id === capturedScope) : [capturedLesson];
        if (new Set(parsed.questions.map(q => q.prompt)).size !== 6 || parsed.questions.some(q => !sourceLessons.some(l => l.title === q.sourceTitle))) throw Error('Las preguntas deben ser distintas e identificar un tema fuente válido. Inténtalo nuevamente.');
        const validated = validateSubject({ name: capturedSubject.name, lessons: [{ ...capturedLesson, questions: parsed.questions }] });
        if (!validated.lessons[0].questions.length) throw Error('La IA no devolvió preguntas válidas.');
        if (practice) {
          const items = validated.lessons[0].questions.map((q, i) => { const source = sourceLessons.find(l => l.title === parsed.questions[i].sourceTitle); return { ...q, lesson: source.id, topic: source.title, choices: shuffled(q.options) }; });
          quiz = { ai: true, items: shuffled(items), index: 0, answers: [], feedback: null, finished: false };
          pendingPractice = false; view = 'quiz'; status = 'Preguntas creadas por IA desde tus apuntes. Responde una a una y contrasta la explicación con el material.';
          return;
        }
        // Personal additions retain the subject's identity and its GRD navigation.
        const target = editableSubject(capturedSubject.id);
        const targetLesson = target.lessons.find(l => l.id === capturedLesson.id);
        targetLesson.questions.push(...validated.lessons[0].questions);
        st.selected = target.id; st.lesson = capturedLesson.id; save();
        status = `Se agregaron ${validated.lessons[0].questions.length} preguntas de IA. Revisa sus respuestas con el texto fuente.`;
      } else chat.push({ role: 'assistant', text: data.text, sources: data.sources });
    } catch (err) { status = err.message; if (err.status === 402) apiUsage = { ...apiUsage, quota: { state: 'exhausted', code: err.code, message: err.message } }; if (!generate) { draft = message; const index = chat.indexOf(outgoing); if (index >= 0) chat.splice(index, 1); } }
    finally { await refreshUsage(true); busy = false; render(); }
  }
  function onClick(e) {
    if (EconomiaLab.handle(e)) return;
    if (CuantitativasLab.handle(e)) return;
    const b = e.target.closest('[data-action]'); if (!b || b.disabled) return;
    const a = b.dataset.action;
    if (busy && !['refresh-ai'].includes(a)) return;
    if (a === 'library') { openLibrary(); return; }
    else if (a === 'refresh-usage') { refreshUsage(); return; }
    else if (a === 'subject') { openSubject(b.dataset.id); return; }
    else if (a === 'grd' && subject().id === 'sistemas-salud') { setTab('dashboard'); return; }
    else if (a === 'resources' && (subject().id === 'herramientas-cuantitativas' || isEconomics())) { if (isEconomics() && b.dataset.lab) EconomiaLab.open(b.dataset.lab); view = 'resources'; status = ''; }
    else if (a === 'home') { view = 'home'; editor = null; scope = null; status = ''; }
    else if (a === 'exam' && isEconomics()) { view = 'exam'; editor = null; status = ''; examConfirm = false; render(); const before = JSON.stringify(ai); checkAI().then(() => { if (view === 'exam' && (!examAttempt() || examAttempt().finishedAt) && before !== JSON.stringify(ai)) render(); }); return; }
    else if (a === 'generate-exam') { generateExam(); return; }
    else if (a.startsWith('exam-') && view === 'exam' && isEconomics()) {
      const attempt = examAttempt(); if (!attempt || attempt.finishedAt) return;
      status = '';
      if (a === 'exam-answer') { const index = Number(b.dataset.index); if (!Number.isInteger(index) || index < 0 || index > 3) return; attempt.answers[attempt.index] = index; examConfirm = false; }
      else if (a === 'exam-clear') { attempt.answers[attempt.index] = null; examConfirm = false; }
      else if (a === 'exam-jump') { const index = Number(b.dataset.index); if (!Number.isInteger(index) || index < 0 || index > 29) return; attempt.index = index; examConfirm = false; }
      else if (a === 'exam-prev' || a === 'exam-next') { attempt.index = Math.max(0, Math.min(29, attempt.index + (a === 'exam-prev' ? -1 : 1))); examConfirm = false; }
      else if (a === 'exam-pending') { const index = attempt.answers.findIndex((value,i) => value === null && i > attempt.index); attempt.index = index >= 0 ? index : Math.max(0, attempt.answers.indexOf(null)); examConfirm = false; }
      else if (a === 'exam-deliver') examConfirm = true;
      else if (a === 'exam-cancel-delivery') examConfirm = false;
      else if (a === 'exam-finish' && examConfirm) {
        attempt.finishedAt = new Date().toISOString(); examConfirm = false;
        const result = PruebaEstudio.score(attempt);
        if (!st.history.some(h => h.examId === attempt.id)) st.history.push({ subject: economicsID, type: 'exam', examId: attempt.id, date: attempt.finishedAt, correct: result.correct, total: 30, grade: result.grade, threshold: attempt.threshold });
        st.history = st.history.slice(-200);
      }
      save(); render();
      if (a === 'exam-answer') root().querySelector(`[data-action="exam-answer"][data-index="${b.dataset.index}"]`)?.focus({ preventScroll: true });
      if (a === 'exam-deliver') root().querySelector('#study-exam-confirm')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    else if (a === 'lesson' || a === 'source') { st.lesson = b.dataset.id; mode = a === 'source' ? 'reading' : 'guide'; view = 'lesson'; save(); }
    else if (a === 'lesson-mode') mode = b.dataset.mode;
    else if (a === 'mark-read') { const l = lesson(); st.progress[progressKey(l.id)] = { ...progress(l.id), read: !progress(l.id).read }; save(); }
    else if (a === 'cards' || a === 'topic-cards') { scope = a === 'topic-cards' ? lesson().id : null; materialTopic = scope || ''; view = 'cards'; card = 0; revealed = false; }
    else if (a === 'reveal') revealed = true;
    else if (a === 'prev-card' || a === 'next-card') { card += a === 'prev-card' ? -1 : 1; revealed = false; }
    else if (a === 'known' || a === 'again') { const q = deck()[card]; st.progress[progressKey(q.id)] = { ...progress(q.id), known: a === 'known' }; save(); if (!reviewOnly || a === 'again') card = Math.min(card + 1, deck().length - 1); revealed = false; }
    else if (a === 'quiz' || a === 'topic-quiz') { scope = a === 'topic-quiz' ? lesson().id : null; startQuiz(); return; }
    else if (a === 'start-quiz' || a === 'retry-failed') {
      if (quiz?.ai && a === 'retry-failed') { const failed = quiz.items.filter((q,i) => !quiz.answers[i].correct); quiz = { ai: true, items: shuffled(failed), index: 0, answers: [], feedback: null, finished: false }; render(); return; }
      startQuiz(a === 'retry-failed'); return;
    }
    else if (a === 'answer' && !quiz.feedback) { const q = quiz.items[quiz.index], ans = q.choices[Number(b.dataset.index)]; record(ans, ans === q.answer); return; }
    else if (a === 'open-answer') { const answer = root().querySelector('#study-open-answer').value.trim(); if (!answer) { status = 'Escribe tu respuesta antes de consultar la referencia.'; render(); return; } quiz.feedback = { open: true, answer }; }
    else if (a === 'self-correct' || a === 'self-wrong') { record(quiz.feedback.answer, a === 'self-correct'); return; }
    else if (a === 'next-question') { quiz.feedback = null; quiz.index++; if (quiz.index === quiz.items.length) { quiz.finished = true; st.history.push({ subject: subject().id, date: new Date().toISOString(), correct: quiz.answers.filter(x => x.correct).length, total: quiz.items.length, self: quiz.items.some(q => !q.options) }); st.history = st.history.slice(-200); save(); } }
    else if (a === 'cases') { view = 'cases'; status = ''; render(); const before = JSON.stringify(ai); checkAI().then(() => { if (view === 'cases' && JSON.stringify(ai) !== before) render(); }); return; }
    else if (a === 'generate-case') { generateCase(); return; }
    else if (a === 'generate-material') { generateMaterial(b.dataset.id); return; }
    else if (a === 'cases-default' || a === 'cases-ai') { caseSession().mode = a === 'cases-ai' ? 'ai' : 'default'; status = ''; }
    else if (a === 'random-case') { const candidates = subject().cases.map((c,i) => i).filter(i => i !== caseIndex()); if (candidates.length) { const index = candidates[Math.floor(Math.random() * candidates.length)]; st.caseSelection[subject().id] = caseID(subject().cases[index], index); save(); } }
    else if (a === 'case-to-tutor') {
      const session = caseSession(), generated = session.mode === 'ai', ci = generated ? session.items.findIndex(c => c.id === session.selected) : caseIndex(), c = generated ? session.items[ci] : subject().cases[ci];
      if (!c) return;
      const notes = generated ? session.notes : st.notes;
      const plan = c.steps.map((step, si) => `${step[1]}\nMi respuesta: ${notes[caseNoteKey(c,ci,si)] || '(Aún no respondí)'}`).join('\n\n');
      chat = []; scope = c.lesson; st.lesson = c.lesson; save(); practiceStyle = c.role === 'Director/a de hospital' ? 'hospital-director' : 'concepts';
      draft = `Ayúdame a resolver este caso: ${c.title}.\nSituación: ${c.text}\n\n${plan}\n\nEvalúa mi propuesta con el material: diagnóstico, prioridades, atribuciones, recursos, indicadores y riesgos. Reconoce alternativas defendibles. Señala una fortaleza y una mejora; luego hazme una sola pregunta sobre el punto que más deba trabajar y espera mi respuesta. Si aún no respondí, pídeme primero una decisión, sin revelar la solución completa.`;
      view = 'tutor'; statusPlace = 'general'; status = 'Tu caso y tu plan están preparados en el mensaje. Pulsa Enviar para discutirlos con el tutor.'; render(); const before = JSON.stringify(ai); checkAI().then(() => { if (view === 'tutor' && JSON.stringify(ai) !== before) render(); }); return;
    }
    else if (a === 'new-subject' || a === 'add-lesson') { editor = a === 'new-subject' ? 'subject' : 'lesson'; status = ''; }
    else if (a === 'cancel-editor') editor = null;
    else if (a === 'export-subject') { download('asignatura-estudio.json', JSON.stringify(subject(), null, 2), 'application/json'); return; }
    else if (a === 'tutor' || a === 'practice-ai') { scope = view === 'lesson' ? lesson()?.id : null; pendingPractice = a === 'practice-ai'; view = 'tutor'; render(); const before = JSON.stringify(ai); checkAI().then(() => { if (view === 'tutor' && JSON.stringify(ai) !== before) render(); }); return; }
    else if (a === 'begin-ai-practice') { sendAI(`Crea seis preguntas nuevas de dificultad ${difficulty}, variadas y en orden aleatorio, basadas en el material. ${practiceStyle === 'hospital-director' ? 'Sitúame como director/a de hospital: describe una situación ficticia y pregúntame qué haría primero o qué plan elegiría. Incluye restricciones, alternativas plausibles y una explicación de la solución.' : 'Incluye aplicación y comprensión.'} Evita estas preguntas ya vistas: ${JSON.stringify((quiz?.ai ? quiz.items : []).map(q => q.prompt))}`, true, true); return; }
    else if (a === 'refresh-ai') { status = ''; checkAI().then(render); return; }
    else if (a === 'check-api') { busy = true; status = ''; statusPlace = 'connection'; render(); request('check', {}).then(data => { status = data.message; }).catch(err => { status = err.message; }).finally(() => { busy = false; render(); }); return; }
    else if (a === 'disconnect-ai') { busy = true; status = ''; statusPlace = 'connection'; render(); request('logout', {}).then(() => { chat = []; draft = ''; return checkAI(); }).catch(err => { status = err.message; }).finally(() => { busy = false; render(); }); return; }
    else if (a === 'quick-ai') { if (Number(b.dataset.index) === 2) practiceStyle = 'hospital-director'; draft = ['Explícame el concepto con un ejemplo','Hazme una pregunta a la vez y espera mi respuesta antes de corregirme','Me nombraron director/a de un hospital. Plantea un caso ficticio basado en el tema seleccionado, con un problema y recursos limitados. Pregúntame qué haría primero y espera mi respuesta. Luego evalúa mi razonamiento, explica alternativas y agrega una nueva dificultad. No reveles la solución antes de que responda.'][Number(b.dataset.index)]; }
    else if (a === 'generate-ai') { sendAI('Elabora 6 preguntas de selección múltiple basadas exclusivamente en este tema.', true); return; }
    else if (a === 'clear-chat') { chat = []; draft = ''; }
    render();
  }
  function onInput(e) {
    if (EconomiaLab.handle(e)) return;
    if (CuantitativasLab.handle(e)) return;
    if (e.target.id === 'study-search') { query = e.target.value; root().querySelector('#study-topics').innerHTML = topicCards(); }
    if (e.target.id === 'study-note') { st.notes[progressKey(lesson().id)] = e.target.value; save(); }
    if (e.target.dataset.note) { st.notes[e.target.dataset.note] = e.target.value; save(); }
    if (e.target.dataset.caseNote) caseSession().notes[e.target.dataset.caseNote] = e.target.value;
    if (e.target.id === 'study-message') draft = e.target.value;
  }
  async function onChange(e) {
    if (e.target.id === 'study-exam-threshold') { if (!busy && [0.5,0.6,0.7].includes(Number(e.target.value))) examThreshold = Number(e.target.value); return; }
    if (EconomiaLab.handle(e)) return;
    if (CuantitativasLab.handle(e)) return;
    if (e.target.id === 'study-review') { reviewOnly = e.target.checked; card = 0; revealed = false; render(); }
    if (e.target.id === 'study-web') web = e.target.checked;
    if (e.target.id === 'study-model') model = e.target.value;
    if (e.target.id === 'study-difficulty') difficulty = e.target.value;
    if (e.target.id === 'study-practice-style') practiceStyle = e.target.value;
    if (e.target.id === 'study-material-topic') { materialTopic = e.target.value; render(); }
    if (e.target.id === 'study-case-select') { const index = Number(e.target.value), c = subject().cases[index]; if (c) { st.caseSelection[subject().id] = caseID(c, index); save(); render(); } }
    if (e.target.id === 'study-case-topic') caseSession().topic = e.target.value;
    if (e.target.id === 'study-case-difficulty') caseSession().difficulty = e.target.value;
    if (e.target.id === 'study-case-ai-select') { const c = caseSession().items[Number(e.target.value)]; if (c) { caseSession().selected = c.id; render(); } }
    if (e.target.id === 'study-ai-context') { scope = e.target.value || null; chat = []; render(); }
    if (e.target.id === 'study-text-file' || e.target.id === 'study-import') {
      const file = e.target.files[0]; if (!file) return;
      try { if (file.size > 2000000) throw Error('El archivo supera 2 MB. Divide el contenido en temas.');
        const text = await file.text();
        if (e.target.id === 'study-text-file') root().querySelector('#study-content').value = text.slice(0, 120000);
        else { const s = validateSubject(JSON.parse(text)); st.subjects.push(s); st.selected = s.id; st.lesson = s.lessons[0].id; view = 'subject'; editor = null; query = ''; scope = null; quiz = null; chat = []; draft = ''; pendingPractice = false; save(); status = 'Asignatura importada con sus preguntas.'; render(); }
      } catch (err) { status = err.message; render(); }
    }
  }
  function onSubmit(e) {
    if (EconomiaLab.handle(e)) return;
    e.preventDefault();
    if (e.target.id === 'study-login-form') {
      if (busy) return;
      const password = new FormData(e.target).get('password'); busy = true; status = ''; statusPlace = 'connection'; render();
      request('login', { password }).then(checkAI).catch(err => { status = err.message; }).finally(() => { busy = false; render(); }); return;
    }
    if (e.target.id === 'study-chat-form') { const message = draft.trim(); if (message) sendAI(message); return; }
    if (e.target.id !== 'study-editor') return;
    const data = new FormData(e.target), text = String(data.get('text')).trim(), title = String(data.get('title')).trim();
    if (!title || text.length < 80) { status = 'Agrega un título y al menos 80 caracteres de contenido.'; render(); return; }
    const source = String(data.get('source') || 'Texto aportado por el estudiante');
    const l = buildLesson(title, text, source);
    if (editor === 'subject') { const name = String(data.get('subject')).trim(); if (!name) return; const s = { id: uid(), name, source, lessons: [l], cases: [] }; st.subjects.push(s); st.selected = s.id; }
    else editableSubject(subject().id).lessons.push(l);
    st.lesson = l.id; scope = null; quiz = null; chat = []; draft = ''; pendingPractice = false; materialTopic = l.id;
    const saved = save(); editor = null; mode = 'guide'; view = 'lesson';
    if (saved) status = 'Texto guardado. Genera la guía y las tarjetas con IA para practicar.';
    render();
    if (saved && e.submitter?.value !== 'text') generateMaterial(l.id);
  }
  // CSS handles resizing; avoid replacing forms while the user types or rotates a phone.
  return { render: () => { if (root() && !root().innerHTML) render(); }, openLibrary, openSubject, buildLesson, validateSubject };
})();

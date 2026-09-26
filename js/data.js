// Datos de referencia y de ejemplo.
// IMPORTANTE: los pesos, estancias y puntos de corte del catálogo son ILUSTRATIVOS.
// Para análisis real, importe la Norma IR-GRD vigente (MINSAL / FONASA).

const CDM_NOMBRES = {
  '00': 'Pre-CDM (trasplantes, traqueostomías)',
  '01': 'Sistema nervioso',
  '02': 'Ojo',
  '03': 'Oído, nariz, boca y garganta',
  '04': 'Sistema respiratorio',
  '05': 'Sistema circulatorio',
  '06': 'Sistema digestivo',
  '07': 'Hepatobiliar y páncreas',
  '08': 'Musculoesquelético y tejido conectivo',
  '09': 'Piel, tejido subcutáneo y mama',
  '10': 'Endocrinas, nutricionales y metabólicas',
  '11': 'Riñón y vías urinarias',
  '12': 'Aparato reproductor masculino',
  '13': 'Aparato reproductor femenino',
  '14': 'Embarazo, parto y puerperio',
  '15': 'Recién nacidos y período perinatal',
  '16': 'Sangre, hematopoyéticos e inmunológicos',
  '17': 'Neoplasias mieloproliferativas',
  '18': 'Infecciosas y parasitarias',
  '19': 'Trastornos mentales',
  '20': 'Uso de alcohol y drogas',
  '21': 'Lesiones, envenenamientos y tóxicos',
  '22': 'Quemaduras',
  '23': 'Factores que influyen en el estado de salud',
  '24': 'Infecciones por VIH',
  '25': 'Trauma múltiple significativo'
};

const SEVERIDAD_NOMBRES = { '0': 'Sin severidad', '1': 'Menor', '2': 'Moderada', '3': 'Mayor' };

// codigo; descripcion; peso; em_norma; pci; pcs; p50  (valores de ejemplo)
const CATALOGO_EJEMPLO = [
  ['014101', 'ACV con infarto (ejemplo) · sev. menor', 0.9120, 6.1, 1, 15, 5],
  ['014102', 'ACV con infarto (ejemplo) · sev. moderada', 1.2450, 9.4, 2, 22, 8],
  ['014103', 'ACV con infarto (ejemplo) · sev. mayor', 2.1780, 15.2, 3, 36, 13],
  ['044101', 'Neumonía simple (ejemplo) · sev. menor', 0.6210, 4.8, 1, 12, 4],
  ['044102', 'Neumonía simple (ejemplo) · sev. moderada', 0.8530, 6.9, 1, 16, 6],
  ['044103', 'Neumonía simple (ejemplo) · sev. mayor', 1.6240, 11.3, 2, 26, 9],
  ['051301', 'Procedimientos vasculares mayores (ejemplo) · sev. menor', 1.8900, 5.2, 1, 13, 4],
  ['051303', 'Procedimientos vasculares mayores (ejemplo) · sev. mayor', 4.3100, 16.8, 3, 38, 14],
  ['054101', 'Insuficiencia cardíaca (ejemplo) · sev. menor', 0.7340, 5.5, 1, 13, 5],
  ['054102', 'Insuficiencia cardíaca (ejemplo) · sev. moderada', 0.9810, 7.8, 1, 18, 7],
  ['054103', 'Insuficiencia cardíaca (ejemplo) · sev. mayor', 1.7050, 12.1, 2, 28, 10],
  ['061101', 'Apendicectomía (ejemplo) · sev. menor', 0.6980, 2.9, 1, 7, 2],
  ['061102', 'Apendicectomía (ejemplo) · sev. moderada', 1.0420, 5.1, 1, 12, 4],
  ['071201', 'Colecistectomía laparoscópica (ejemplo) · sev. menor', 0.7810, 2.6, 1, 7, 2],
  ['071202', 'Colecistectomía laparoscópica (ejemplo) · sev. moderada', 1.1230, 4.9, 1, 12, 4],
  ['081101', 'Reemplazo de cadera (ejemplo) · sev. menor', 1.9540, 5.8, 2, 14, 5],
  ['081102', 'Reemplazo de cadera (ejemplo) · sev. moderada', 2.4870, 8.7, 2, 20, 7],
  ['114101', 'Infección urinaria (ejemplo) · sev. menor', 0.5480, 4.2, 1, 10, 4],
  ['114102', 'Infección urinaria (ejemplo) · sev. moderada', 0.7920, 6.1, 1, 14, 5],
  ['141301', 'Cesárea (ejemplo) · sev. menor', 0.5520, 3.1, 1, 7, 3],
  ['141302', 'Cesárea (ejemplo) · sev. moderada', 0.7010, 4.3, 1, 10, 4],
  ['144101', 'Parto vaginal (ejemplo) · sev. menor', 0.3810, 2.2, 1, 5, 2],
  ['154101', 'Recién nacido prematuro (ejemplo) · sev. moderada', 2.9600, 18.5, 4, 42, 16],
  ['184101', 'Septicemia (ejemplo) · sev. menor', 0.9870, 6.4, 1, 15, 5],
  ['184102', 'Septicemia (ejemplo) · sev. moderada', 1.4120, 9.3, 2, 22, 8],
  ['184103', 'Septicemia (ejemplo) · sev. mayor', 2.3400, 14.0, 3, 33, 11],
  ['214101', 'Lesiones y envenenamientos (ejemplo) · sev. menor', 0.5230, 3.1, 1, 8, 2]
].map(([codigo, descripcion, peso, em, pci, pcs, p50]) => ({ codigo, descripcion, peso, em, pci, pcs, p50 }));

const SERVICIOS = ['Medicina', 'Cirugía', 'Traumatología', 'Obstetricia', 'Neonatología', 'UPC', 'Neurología', 'Cardiología'];

const SERVICIO_POR_CDM = {
  '01': 'Neurología', '04': 'Medicina', '05': 'Cardiología', '06': 'Cirugía', '07': 'Cirugía',
  '08': 'Traumatología', '11': 'Medicina', '14': 'Obstetricia', '15': 'Neonatología', '18': 'UPC', '21': 'Cirugía'
};

// Genera egresos de ejemplo reproducibles (PRNG con semilla).
function generarEgresosEjemplo(n = 80) {
  let seed = 20260926;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const normal = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const out = [];
  const inicio = new Date('2026-01-01').getTime();
  for (let i = 0; i < n; i++) {
    const g = CATALOGO_EJEMPLO[Math.floor(rnd() * CATALOGO_EJEMPLO.length)];
    let dias = Math.max(1, Math.round(g.em * Math.exp(0.45 * normal())));
    if (rnd() < 0.06) dias = g.pcs + 2 + Math.floor(rnd() * 12);    // outlier superior forzado
    const costoUnidad = 2600000 + rnd() * 900000;                    // costo por unidad de peso
    const costo = Math.round(g.peso * costoUnidad * Math.pow(dias / g.em, 0.65) * (0.9 + rnd() * 0.2) / 1000) * 1000;
    const fecha = new Date(inicio + Math.floor(rnd() * 240) * 86400000).toISOString().slice(0, 10);
    out.push({
      id: 'EP-' + String(i + 1).padStart(4, '0'),
      fecha, grd: g.codigo,
      servicio: SERVICIO_POR_CDM[g.codigo.slice(0, 2)] || SERVICIOS[0],
      dias, costo, peso: null
    });
  }
  return out;
}

// Bases de licitación de camas críticas GRD 2018 (caso histórico), punto 9.7 "Regla de pago en caso de ajustes por tecnología":
// valores que FONASA paga en forma adicional al valor GRD, una sola vez por egreso, cuando por criterio clínico se realiza la prestación.
const AJUSTES_TECNOLOGIA_2018 = [
  { grupo: 'Prótesis aórtica', opciones: [['Prótesis aórtica (quirúrgica o endovascular)', 12308767]] },
  { grupo: 'Plasmaféresis terapéutica', opciones: [['1 a 3 sesiones', 830467], ['4 a 6 sesiones', 1411788], ['7 o más sesiones', 2313710]] },
  { grupo: 'Sustitución renal continua (hemodiálisis, hemofiltración, hemodiafiltración)',
    opciones: [['6 a 9 horas', 513043], ['10 a 18 horas', 769566], ['19 a 32 horas', 1026089], ['33 a 48 horas', 1282612], ['49 a 60 horas (máximo)', 1539135]] },
  { grupo: 'Dispositivos cardíacos',
    opciones: [['Desfibrilador VVI', 11880110], ['Desfibrilador DDD', 13949370],
               ['Desfibrilador VVI con resincronización cardíaca', 17545630], ['Desfibrilador DDD con resincronización cardíaca', 17863950]] },
  { grupo: 'Coils cerebrales',
    opciones: [['Uno o más coils (HSA por ruptura de aneurisma, aneurisma sin ruptura o malformación arteriovenosa cerebral)', 3284400]] }
];

// Suma los ajustes elegidos: sel = arreglo con el índice de opción por grupo (-1 o null = ninguno).
function ajustesTecnologia(sel) {
  const items = [];
  (sel || []).forEach((idx, g) => {
    const grp = AJUSTES_TECNOLOGIA_2018[g];
    if (grp && idx != null && idx >= 0 && grp.opciones[idx]) items.push({ grupo: grp.grupo, nombre: grp.opciones[idx][0], valor: grp.opciones[idx][1] });
  });
  return { items, total: items.reduce((a, i) => a + i.valor, 0) };
}

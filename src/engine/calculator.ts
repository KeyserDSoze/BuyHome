import { Unit, RuleSet, Tariff, RoomType, LuxuryCheckMode } from '../models/types';

// ── Rounding ──────────────────────────────────────────────────────────────────

/**
 * Round to the nearest half-vano:
 *   frac < 0.25  → floor
 *   0.25 ≤ frac < 0.75 → floor + 0.5
 *   frac ≥ 0.75  → floor + 1
 */
export function roundHalfVano(v: number): number {
  const fl = Math.floor(v);
  const frac = v - fl;
  if (frac < 0.25) return fl;
  if (frac < 0.75) return fl + 0.5;
  return fl + 1;
}

// ── Room coefficient ──────────────────────────────────────────────────────────

function getRoomCoeff(roomType: RoomType, ruleSet: RuleSet): number {
  switch (roomType) {
    case 'Main':
    case 'Kitchen':
      return 1.0;
    case 'AccessoryDirect':
      return ruleSet.accessoryDirectCoeff;
    case 'AccessoryComplementary':
      return ruleSet.accessoryComplementaryCoeff;
    case 'Terrazzo': // 0 vani – area tracciata separatamente per DM 2/8/1969 cr.2
    case 'Excluded':
      return 0;
  }
}

// ── Trace types ───────────────────────────────────────────────────────────────

export interface RoomContribution {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  areaMq: number;
  baseCoeff: number;
  vaniEquivalent: number;
  ragguaglio: boolean;
  ragguaglioNote: string;
}

export interface FloorTrace {
  floorId: string;
  floorName: string;
  rooms: RoomContribution[];
  floorVaniRaw: number;
}

export interface ConsistenzaTrace {
  floors: FloorTrace[];
  vaniRaw: number;
  dipendenzaAdj: number;
  vaniAdjusted: number;
  vaniRounded: number;
  totalMq: number;          // Main + Kitchen + AccessoryDirect + AccessoryComplementary (per display)
  terrazzaMq: number;       // Terrazzo/balconi (esclusi da DM 1969)
  complementaryMq: number;  // AccessoryComplementary (cantine/soffitte – escluse da superficie DM 1969)
  excludedMq: number;       // Excluded (scale, posti macchine – esclusi da tutto)
}

export interface RenditaResult {
  unitId: string;
  unitName: string;
  consistenza: number;
  consistenzaUnit: 'vani' | 'mq';
  tariffa: number;
  tariffaLabel: string;
  rendita: number;
  trace: ConsistenzaTrace;
  missingTariff: boolean;
}

// ── Luxury analysis types (DM 2 agosto 1969) ─────────────────────────────────

export interface LuxuryCriterion {
  id: string;
  label: string;
  detail: string;
  triggered: boolean;
}

export interface LuxuryAnalysis {
  mode: LuxuryCheckMode;
  dataAtto?: string;
  catastaleIsLuxury?: boolean;           // true se la categoria è A/1, A/8 o A/9
  dm1969Applied: boolean;                // true se il motore DM 1969 è stato eseguito
  surfaceMethod: 'globale' | 'roomBased';
  dmSurfaceMq: number;                   // superficie usata nel calcolo DM 1969 (art. 6, tab. a/b)
  ambiguousRoomWarnings: string[];       // vani con indicatori di "utilizzabilità" (Cass. ord. 2503/2025)
  isLuxury: boolean;
  absoluteTriggered: number;
  tableTriggered: number;
  art8Triggered: boolean;
  absoluteCriteria: LuxuryCriterion[];
  tableCriteria: LuxuryCriterion[];
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  dwelling?: RenditaResult;
  pertinenza?: RenditaResult;
  renditaTotale: number;
  imuBase?: number;
  imuEstimate?: number;        // IMU effettiva (0 se esente prima casa)
  imuIfSecondHome?: number;    // IMU teorica come seconda casa (nessun esonero, nessuna detrazione)
  warnings: string[];
  flags: {
    luxuryAnalysis: LuxuryAnalysis; // DM 2 agosto 1969 – tutti i criteri
    imuAtRisk: boolean;             // category A/1 A/8 A/9
    pertinenzaAgevolabile: boolean;
    imuIsMainHome: boolean;         // true = prima casa dichiarata
    imuExempt: boolean;             // true = esente (prima casa non lusso)
  };
}

// ── Consistenza for Group A (vani) ────────────────────────────────────────────

export function calculateConsistenzaVani(unit: Unit, ruleSet: RuleSet): ConsistenzaTrace {
  const floors: FloorTrace[] = [];
  let vaniRaw = 0;
  let totalMq = 0;
  let terrazzaMq = 0;
  let complementaryMq = 0;
  let excludedMq = 0;

  for (const floor of unit.floors) {
    const roomContribs: RoomContribution[] = [];
    let floorVani = 0;

    for (const room of floor.rooms) {
      const baseCoeff = getRoomCoeff(room.roomType, ruleSet);
      if (room.roomType === 'Terrazzo') {
        terrazzaMq += room.areaMq;
      } else if (room.roomType === 'Excluded') {
        excludedMq += room.areaMq;
      } else {
        totalMq += room.areaMq;
        if (room.roomType === 'AccessoryComplementary') complementaryMq += room.areaMq;
      }

      if (baseCoeff === 0) {
        roomContribs.push({
          roomId: room.id,
          roomName: room.name,
          roomType: room.roomType,
          areaMq: room.areaMq,
          baseCoeff: 0,
          vaniEquivalent: 0,
          ragguaglio: false,
          ragguaglioNote: '',
        });
        continue;
      }

      let vaniEq = baseCoeff;
      let ragguaglio = false;
      let ragguaglioNote = '';

      if (
        ruleSet.applyLargeRoomRagguaglio &&
        (room.roomType === 'Main' || room.roomType === 'Kitchen') &&
        room.areaMq > ruleSet.vanoMaxMq
      ) {
        vaniEq = 1 + (room.areaMq - ruleSet.vanoMaxMq) / ruleSet.vanoMaxMq;
        ragguaglio = true;
        ragguaglioNote = `Ragguaglio: 1 + (${room.areaMq} - ${ruleSet.vanoMaxMq}) / ${ruleSet.vanoMaxMq} = ${vaniEq.toFixed(3)}`;
      }

      roomContribs.push({
        roomId: room.id,
        roomName: room.name,
        roomType: room.roomType,
        areaMq: room.areaMq,
        baseCoeff,
        vaniEquivalent: vaniEq,
        ragguaglio,
        ragguaglioNote,
      });
      floorVani += vaniEq;
    }

    floors.push({ floorId: floor.id, floorName: floor.name, rooms: roomContribs, floorVaniRaw: floorVani });
    vaniRaw += floorVani;
  }

  const dipendenzaAdj = vaniRaw * ruleSet.dipendenzePct;
  const vaniAdjusted = vaniRaw + dipendenzaAdj;
  const vaniRounded = roundHalfVano(vaniAdjusted);

  return { floors, vaniRaw, dipendenzaAdj, vaniAdjusted, vaniRounded, totalMq, terrazzaMq, complementaryMq, excludedMq };
}

// ── Consistenza for Group C (m²) ──────────────────────────────────────────────

export function calculateConsistenzaMq(unit: Unit): { mq: number; trace: ConsistenzaTrace } {
  const floors: FloorTrace[] = [];
  let mq = 0;

  for (const floor of unit.floors) {
    const roomContribs: RoomContribution[] = [];
    let floorMq = 0;

    for (const room of floor.rooms) {
      const included = room.roomType !== 'Excluded';
      const contrib = included ? room.areaMq : 0;
      floorMq += contrib;
      roomContribs.push({
        roomId: room.id,
        roomName: room.name,
        roomType: room.roomType,
        areaMq: room.areaMq,
        baseCoeff: included ? 1 : 0,
        vaniEquivalent: contrib,
        ragguaglio: false,
        ragguaglioNote: '',
      });
    }

    floors.push({ floorId: floor.id, floorName: floor.name, rooms: roomContribs, floorVaniRaw: floorMq });
    mq += floorMq;
  }

  return {
    mq,
    trace: {
      floors,
      vaniRaw: mq,
      dipendenzaAdj: 0,
      vaniAdjusted: mq,
      vaniRounded: mq,
      totalMq: mq,
      terrazzaMq: 0,
      complementaryMq: 0,
      excludedMq: 0,
    },
  };
}

// ── Tariff lookup ─────────────────────────────────────────────────────────────

export function findTariff(tariffs: Tariff[], category: string, classe: string): Tariff | undefined {
  return tariffs.find(t => t.category === category && t.classe === classe);
}

// ── IMU calculation ───────────────────────────────────────────────────────────

const IMU_LUXURY = ['A/1', 'A/8', 'A/9'];

export function calculateImu(
  rendita: number,
  category: string,
  aliquota: number,
  isMainHome: boolean,
  detrazione: number,
): { base: number; imu: number; imuIfSecondHome: number; exempt: boolean } {
  const moltiplicatore = category === 'C/1' ? 55 : 160;
  const base = rendita * 1.05 * moltiplicatore;
  // Valore teorico come seconda casa: stessa aliquota, nessuna detrazione, nessun esonero
  const imuIfSecondHome = Math.max(0, base * aliquota);

  // Main home exemption: only luxury categories pay IMU even as main home
  if (isMainHome && !IMU_LUXURY.includes(category)) {
    return { base, imu: 0, imuIfSecondHome, exempt: true };
  }

  return { base, imu: Math.max(0, base * aliquota - detrazione), imuIfSecondHome, exempt: false };
}

// ── Luxury analysis (DM 2 agosto 1969 / regime catastale) ────────────────────
const CATASTALE_LUXURY_CATEGORIES = ['A/1', 'A/8', 'A/9'];

function analyzeLuxury(
  unit: Unit | undefined,
  trace: { totalMq: number; terrazzaMq: number; complementaryMq: number; excludedMq: number },
  mode: LuxuryCheckMode,
  dataAtto: string | undefined,
  dwellingCategory: string,
): LuxuryAnalysis {
  const catastaleIsLuxury = CATASTALE_LUXURY_CATEGORIES.includes(dwellingCategory);
  const emptyDm1969 = {
    dm1969Applied: false as const,
    surfaceMethod: 'roomBased' as const,
    dmSurfaceMq: 0,
    ambiguousRoomWarnings: [] as string[],
    isLuxury: false,
    absoluteTriggered: 0,
    tableTriggered: 0,
    art8Triggered: false,
    absoluteCriteria: [] as LuxuryCriterion[],
    tableCriteria: [] as LuxuryCriterion[],
  };

  // ── Regime routing ─────────────────────────────────────────────────────────
  // primaCasaRegistro: D.Lgs. 23/2011 art. 10 – dal 1/1/2014 conta la categoria
  // primaCasaIVA: D.Lgs. 175/2014 art. 33 + circ. AdE 31/E 2014 – dal 13/12/2014 conta la categoria
  // analisiDM1969: always use the DM 1969 engine regardless of date
  let useCatastale = false;
  if (mode === 'primaCasaRegistro') {
    useCatastale = !dataAtto || dataAtto >= '2014-01-01';
  } else if (mode === 'primaCasaIVA') {
    useCatastale = !dataAtto || dataAtto >= '2014-12-13';
  }

  if (useCatastale) {
    return { mode, dataAtto, catastaleIsLuxury, ...emptyDm1969, isLuxury: catastaleIsLuxury };
  }

  // ── DM 1969 engine ─────────────────────────────────────────────────────────
  const dm1969Base = {
    mode,
    dataAtto,
    catastaleIsLuxury: mode === 'analisiDM1969' ? undefined : catastaleIsLuxury,
    dm1969Applied: true as const,
  };

  if (!unit) {
    return { ...dm1969Base, ...emptyDm1969, dm1969Applied: true };
  }

  // Compute DM 1969 surface (Cass. 29643/2019: SU = globale − balconi/terrazze − cantine/soffitte − scale/p.macchine)
  let dmSurfaceMq: number;
  let surfaceMethod: 'globale' | 'roomBased';
  const globale = unit.superficieGlobaleAttoMq;
  if (globale != null && globale > 0) {
    dmSurfaceMq = Math.max(0, globale - trace.terrazzaMq - trace.complementaryMq - trace.excludedMq);
    surfaceMethod = 'globale';
  } else {
    // Room-based: Main + Kitchen + AccessoryDirect only (cantine/soffitte excluded per Cassazione)
    dmSurfaceMq = Math.max(0, trace.totalMq - trace.complementaryMq);
    surfaceMethod = 'roomBased';
  }
  const terrazzaMq = trace.terrazzaMq;

  // ── Ambiguous rooms (Cass. ord. 2503/2025) ─────────────────────────────────
  const ambiguousRoomWarnings: string[] = [];
  for (const floor of unit.floors) {
    for (const room of floor.rooms) {
      if (room.roomType === 'AccessoryComplementary' && (room.accessoDaInterno || room.impiantiPresenti)) {
        const flags = [
          room.accessoDaInterno && 'accesso diretto dall\u2019interno',
          room.impiantiPresenti && 'impianti (acqua/scarico/riscaldamento)',
        ].filter(Boolean).join(', ');
        ambiguousRoomWarnings.push(
          `"${room.name}" (${floor.name}): cantina/soffitta con ${flags} \u2192 potenzialmente computabile come superficie utile (Cass. ord. 2503/2025)`,
        );
      }
    }
  }

  // ── Absolute criteria (Art. 1–7): ONE is enough ──────────────────────────────────
  const gardenRatio = dmSurfaceMq > 0 ? (unit.gardenMq ?? 0) / dmSurfaceMq : 0;

  const absoluteCriteria: LuxuryCriterion[] = [
    {
      id: '1',
      label: 'Zona urb. "ville", "parco privato" o "di lusso"',
      detail: 'Art. 1 – abitazioni su aree destinate dagli strumenti urbanistici (PRG) a ville, parco privato o costruzioni qualificate come di lusso.',
      triggered: unit.art1_luxuryZone ?? false,
    },
    {
      id: '2',
      label: 'Lotto unifamiliare con vincolo ≥ 3.000 m²',
      detail: 'Art. 2 – abitazioni su aree per case unifamiliari con prescrizione di lotti non inferiori a 3.000 m² (escluse zone agricole).',
      triggered: unit.art2_largeLot ?? false,
    },
    {
      id: '3',
      label: 'Fabbricato >2.000 mc e densità <25 mc v.p.p./100 m²',
      detail: 'Art. 3 – fabbricato con cubatura >2.000 mc v.p.p. realizzato su lotto con densità edificatoria <25 mc v.p.p. per 100 m² di superficie asservita.',
      triggered: unit.art3_lowDensity ?? false,
    },
    {
      id: '4a',
      label: 'Piscina unifamiliare ≥ 80 m²',
      detail: 'Art. 4 – abitazione unifamiliare dotata di piscina di almeno 80 m² di superficie (specchio d’acqua).',
      triggered: unit.art4_pool ?? false,
    },
    {
      id: '4b',
      label: 'Campo da tennis unifamiliare ≥ 650 m² (sottofondo drenato)',
      detail: 'Art. 4 – abitazione unifamiliare con campo da tennis con sottofondo drenato di superficie non inferiore a 650 m².',
      triggered: unit.art4_tennis ?? false,
    },
    {
      id: '5',
      label: 'Casa unifamiliare >200 m² con giardino >6× area coperta',
      detail: (unit.art5_villa ?? false)
        ? `Art. 5 – sup. utile ${dmSurfaceMq.toFixed(1)} m² (soglia >200 m²), giardino ${(unit.gardenMq ?? 0).toFixed(0)} m² — rapporto ${gardenRatio.toFixed(2)}× (soglia >6×).`
        : 'Art. 5 – casa unifamiliare con sup. >200 m² (esclusi balconi/cantine/soffitte/scale/p.macchine) con area scoperta pertinenza >6× area coperta. Non selezionato.',
      triggered: (unit.art5_villa ?? false) && dmSurfaceMq > 200 && gardenRatio > 6,
    },
    {
      id: '6',
      label: 'Superficie utile complessiva >240 m²',
      detail: `Art. 6 – superficie utile calcolata ${dmSurfaceMq.toFixed(1)} m² (esclusi balconi, terrazze, cantine, soffitte, scale e posto macchine). Metodo: ${surfaceMethod === 'globale' ? 'superficie globale atto' : 'somma vani'}.`,
      triggered: dmSurfaceMq > 240,
    },
    {
      id: '7',
      label: 'Costo terreno coperto >1,5× costo costruzione',
      detail: 'Art. 7 – abitazioni in fabbricati dove il costo del terreno coperto e di pertinenza supera di una volta e mezzo il costo della sola costruzione.',
      triggered: unit.art7_expensiveLand ?? false,
    },
  ];

  // ── Table characteristics (Art. 8): MORE THAN 4 needed ─────────────────────
  const tableCriteria: LuxuryCriterion[] = [
    {
      id: 'a',
      label: `Superficie appartamento >160 m² (${dmSurfaceMq.toFixed(1)} m²)`,
      detail: 'Tab. a) – superficie utile complessiva >160 m² (esclusi balconi, terrazze, cantine, soffitte, scale e posto macchine).',
      triggered: dmSurfaceMq > 160,
    },
    {
      id: 'b',
      label: `Terrazze/balconi >65 m² (${terrazzaMq.toFixed(1)} m²)`,
      detail: 'Tab. b) – terrazze a livello coperte/scoperte e balconi con superficie utile complessiva >65 m² al servizio della singola unità.',
      triggered: terrazzaMq > 65,
    },
    {
      id: 'c',
      label: 'Più di un ascensore per scala (<7 piani sopraelevati)',
      detail: 'Tab. c) – quando vi sia più di un ascensore per ogni scala; ogni ascensore aggiuntivo conta per una caratteristica se la scala serve meno di 7 piani sopraelevati.',
      triggered: unit.table_c_multiLift ?? false,
    },
    {
      id: 'd',
      label: 'Scala di servizio non obbligatoria per legge',
      detail: 'Tab. d) – scala di servizio non prescritta da leggi, regolamenti o necessità di prevenzione infortuni od incendi.',
      triggered: unit.table_d_serviceStairs ?? false,
    },
    {
      id: 'e',
      label: 'Montacarichi o ascensore di servizio <4 piani',
      detail: 'Tab. e) – montacarichi o ascensore di servizio al servizio di meno di 4 piani.',
      triggered: unit.table_e_serviceElevator ?? false,
    },
    {
      id: 'f',
      label: 'Scala principale con rivestimenti pregiati (>170 cm di media)',
      detail: 'Tab. f) – scala principale con pareti rivestite di materiali pregiati per altezza >170 cm di media, o con materiali lavorati in modo pregiato.',
      triggered: unit.table_f_stairMaterials ?? false,
    },
    {
      id: 'g',
      label: 'Altezza libera netta del piano >3,30 m',
      detail: 'Tab. g) – altezza libera netta del piano superiore a 3,30 m (salvo regolamenti edilizi locali che prevedano altezze minime superiori).',
      triggered: unit.table_g_highCeilings ?? false,
    },
    {
      id: 'h',
      label: 'Porte d’ingresso agli appartamenti pregiate',
      detail: 'Tab. h) – porte di ingresso agli appartamenti da scala interna in legno pregiato massello/lastronato; in legno intagliato/scolpito/intarsiato; o con decorazioni pregiate sovrapposte od impresse.',
      triggered: unit.table_h_fancyDoors ?? false,
    },
    {
      id: 'i',
      label: 'Infissi interni pregiati (>50% della superficie totale infissi)',
      detail: 'Tab. i) – infissi interni con caratteristiche pregiate come h), anche se tamburati, qualora la loro superficie superi il 50% della superficie totale degli infissi.',
      triggered: unit.table_i_fancyInfissi ?? false,
    },
    {
      id: 'l',
      label: 'Pavimenti pregiati (>50% della superficie utile totale)',
      detail: 'Tab. l) – pavimenti in materiale pregiato o lavorati in modo pregiato per superficie >50% della superficie utile totale dell’appartamento.',
      triggered: unit.table_l_fancyFloors ?? false,
    },
    {
      id: 'm',
      label: 'Pareti con materiali pregiati/stoffe (>30% della superficie)',
      detail: 'Tab. m) – pareti eseguite con materiali e lavori pregiati o rivestite di stoffe od altri materiali pregiati per oltre il 30% della loro superficie complessiva.',
      triggered: unit.table_m_fancyWalls ?? false,
    },
    {
      id: 'n',
      label: 'Soffitti a cassettoni decorati o con stucchi dipinti a mano',
      detail: 'Tab. n) – soffitti a cassettoni decorati oppure decorati con stucchi tirati sul posto dipinti a mano (escluse le piccole sagome di distacco fra pareti e soffitti).',
      triggered: unit.table_n_decorCeilings ?? false,
    },
    {
      id: 'o',
      label: 'Piscina in muratura – edificio/complesso <15 unità immobiliari',
      detail: 'Tab. o) – piscina coperta o scoperta in muratura al servizio di edificio o complesso con meno di 15 unità immobiliari.',
      triggered: unit.table_o_condoPool ?? false,
    },
    {
      id: 'p',
      label: 'Campo da tennis – edificio/complesso <15 unità immobiliari',
      detail: 'Tab. p) – campo da tennis al servizio di edificio o complesso con meno di 15 unità immobiliari.',
      triggered: unit.table_p_condoTennis ?? false,
    },
  ];

  const absoluteTriggered = absoluteCriteria.filter(c => c.triggered).length;
  const tableTriggered = tableCriteria.filter(c => c.triggered).length;
  const art8Triggered = tableTriggered > 4;
  const isLuxury = absoluteTriggered > 0 || art8Triggered;

  return {
    ...dm1969Base,
    surfaceMethod,
    dmSurfaceMq,
    ambiguousRoomWarnings,
    isLuxury,
    absoluteTriggered,
    tableTriggered,
    art8Triggered,
    absoluteCriteria,
    tableCriteria,
  };
}

// ── Merge utility for fusion scenarios ──────────────────────────────────────

export function mergeUnits(units: Unit[]): Unit {
  const globalMqValues = units
    .map(u => u.superficieGlobaleAttoMq)
    .filter((v): v is number => v != null && v > 0);
  const mergedGlobalMq = globalMqValues.length > 0
    ? globalMqValues.reduce((a, b) => a + b, 0)
    : undefined;

  return {
    id: 'fusion_' + units.map(u => u.id).join('_'),
    name: units.map(u => u.name).join(' + '),
    unitType: 'DwellingA',
    targetCategory: units[0]?.targetCategory ?? 'A/3',
    targetClass: units[0]?.targetClass ?? '1',
    floors: units.flatMap(u => u.floors),
    superficieGlobaleAttoMq: mergedGlobalMq,
    // Merge luxury boolean flags from all units (any = true)
    art1_luxuryZone: units.some(u => u.art1_luxuryZone),
    art2_largeLot: units.some(u => u.art2_largeLot),
    art3_lowDensity: units.some(u => u.art3_lowDensity),
    art4_pool: units.some(u => u.art4_pool),
    art4_tennis: units.some(u => u.art4_tennis),
    art5_villa: units.some(u => u.art5_villa),
    art7_expensiveLand: units.some(u => u.art7_expensiveLand),
    gardenMq: units.reduce((acc, u) => acc + (u.gardenMq ?? 0), 0) || undefined,
    table_c_multiLift: units.some(u => u.table_c_multiLift),
    table_d_serviceStairs: units.some(u => u.table_d_serviceStairs),
    table_e_serviceElevator: units.some(u => u.table_e_serviceElevator),
    table_f_stairMaterials: units.some(u => u.table_f_stairMaterials),
    table_g_highCeilings: units.some(u => u.table_g_highCeilings),
    table_h_fancyDoors: units.some(u => u.table_h_fancyDoors),
    table_i_fancyInfissi: units.some(u => u.table_i_fancyInfissi),
    table_l_fancyFloors: units.some(u => u.table_l_fancyFloors),
    table_m_fancyWalls: units.some(u => u.table_m_fancyWalls),
    table_n_decorCeilings: units.some(u => u.table_n_decorCeilings),
    table_o_condoPool: units.some(u => u.table_o_condoPool),
    table_p_condoTennis: units.some(u => u.table_p_condoTennis),
  };
}

// ── Scenario runner ───────────────────────────────────────────────────────────

const PERTINENZA_AGEVOLABILE = ['C/2', 'C/6', 'C/7'];

export function runScenario(params: {
  scenarioId: string;
  scenarioName: string;
  dwellingUnit?: Unit;
  dwellingCategory: string;
  dwellingClass: string;
  pertinenzaUnit?: Unit;
  pertinenzaCategory: string;
  pertinenzaClass: string;
  enablePertinenza: boolean;
  tariffs: Tariff[];
  ruleSet: RuleSet;
  enableImu: boolean;
  imuAliquota: number;
  imuIsMainHome: boolean;
  imuDetrazione: number;
  luxuryCheckMode?: LuxuryCheckMode;
  dataAtto?: string;
}): ScenarioResult {
  const {
    scenarioId, scenarioName,
    dwellingUnit, dwellingCategory, dwellingClass,
    pertinenzaUnit, pertinenzaCategory, pertinenzaClass,
    enablePertinenza, tariffs, ruleSet,
    enableImu, imuAliquota, imuIsMainHome, imuDetrazione,
    luxuryCheckMode = 'analisiDM1969', dataAtto,
  } = params;

  const warnings: string[] = [];
  let dwelling: RenditaResult | undefined;
  let pertinenza: RenditaResult | undefined;

  // ── Dwelling (Group A) ────
  if (dwellingUnit) {
    const trace = calculateConsistenzaVani(dwellingUnit, ruleSet);
    const tariff = findTariff(tariffs, dwellingCategory, dwellingClass);
    const tariffa = tariff?.value ?? 0;
    const missingTariff = !tariff;
    if (missingTariff) {
      warnings.push(`Tariffa non trovata per ${dwellingCategory} classe ${dwellingClass}`);
    }
    dwelling = {
      unitId: dwellingUnit.id,
      unitName: dwellingUnit.name,
      consistenza: trace.vaniRounded,
      consistenzaUnit: 'vani',
      tariffa,
      tariffaLabel: tariff ? `${dwellingCategory} cl.${dwellingClass} → ${tariffa} €/vano` : 'Tariffa mancante',
      rendita: trace.vaniRounded * tariffa,
      trace,
      missingTariff,
    };
  }

  // ── Luxury analysis ────
  const luxuryAnalysis = analyzeLuxury(
    dwellingUnit,
    {
      totalMq: dwelling?.trace.totalMq ?? 0,
      terrazzaMq: dwelling?.trace.terrazzaMq ?? 0,
      complementaryMq: dwelling?.trace.complementaryMq ?? 0,
      excludedMq: dwelling?.trace.excludedMq ?? 0,
    },
    luxuryCheckMode,
    dataAtto,
    dwellingCategory,
  );
  if (luxuryAnalysis.isLuxury) {
    const parts: string[] = [];
    const absIds = luxuryAnalysis.absoluteCriteria.filter(c => c.triggered).map(c => `art.${c.id}`);
    if (absIds.length > 0) parts.push(absIds.join(', '));
    if (luxuryAnalysis.art8Triggered) parts.push(`art.8 (${luxuryAnalysis.tableTriggered}/14 caratteristiche tabella)`);
    warnings.push(`Possibile abitazione di lusso DM 2/8/1969 (${parts.join(' + ')}) → verificare classamento in A/1, A/8 o A/9`);
  }

  // ── Pertinenza (Group C) ────
  if (enablePertinenza && pertinenzaUnit) {
    const { mq, trace } = calculateConsistenzaMq(pertinenzaUnit);
    const tariff = findTariff(tariffs, pertinenzaCategory, pertinenzaClass);
    const tariffa = tariff?.value ?? 0;
    const missingTariff = !tariff;
    if (missingTariff) {
      warnings.push(`Tariffa non trovata per ${pertinenzaCategory} classe ${pertinenzaClass}`);
    }
    pertinenza = {
      unitId: pertinenzaUnit.id,
      unitName: pertinenzaUnit.name,
      consistenza: mq,
      consistenzaUnit: 'mq',
      tariffa,
      tariffaLabel: tariff ? `${pertinenzaCategory} cl.${pertinenzaClass} → ${tariffa} €/m²` : 'Tariffa mancante',
      rendita: mq * tariffa,
      trace,
      missingTariff,
    };
  }

  const renditaTotale = (dwelling?.rendita ?? 0) + (pertinenza?.rendita ?? 0);

  // ── Flags ────
  const imuAtRisk = IMU_LUXURY.includes(dwellingCategory);
  const pertinenzaAgevolabile = enablePertinenza
    ? PERTINENZA_AGEVOLABILE.includes(pertinenzaCategory)
    : true;

  if (imuAtRisk) {
    warnings.push(`Categoria ${dwellingCategory}: IMU dovuta anche come abitazione principale`);
  }
  if (enablePertinenza && !pertinenzaAgevolabile) {
    warnings.push(`Pertinenza ${pertinenzaCategory}: non agevolabile per IMU abitazione principale (solo C/2, C/6, C/7)`);
  }

  // ── IMU ────
  let imuBase: number | undefined;
  let imuEstimate: number | undefined;
  let imuIfSecondHome: number | undefined;
  let imuExempt = false;

  if (enableImu && dwellingUnit) {
    const result = calculateImu(renditaTotale, dwellingCategory, imuAliquota, imuIsMainHome, imuDetrazione);
    imuBase = result.base;
    imuEstimate = result.imu;
    imuIfSecondHome = result.imuIfSecondHome;
    imuExempt = result.exempt;
  }

  return {
    scenarioId,
    scenarioName,
    dwelling,
    pertinenza,
    renditaTotale,
    imuBase,
    imuEstimate,
    imuIfSecondHome,
    warnings,
    flags: { luxuryAnalysis, imuAtRisk, pertinenzaAgevolabile, imuIsMainHome, imuExempt },
  };
}

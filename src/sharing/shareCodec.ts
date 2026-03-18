/**
 * shareCodec.ts
 *
 * Encodes a Project into a compact Base64url string and back.
 * Keys are shortened (n=name, t=type, a=area, …) and defaults are omitted
 * to keep URLs as short as possible.
 *
 * URL format:  https://buyho.me/?i=<base64url>
 * Schema version: v1
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Project, Unit, Floor, Room, Tariff, Scenario, Person, Contract,
  RoomType, UnitType, TariffUnit, VenditoreTipo, TipoContratto, LuxuryCheckMode,
} from '../models/types';

const SCHEMA_VERSION = 1;

// ── Enum maps ─────────────────────────────────────────────────────────────────

const RT_ENC: Record<RoomType, string> = {
  Main: 'M', Kitchen: 'K', AccessoryDirect: 'D', AccessoryComplementary: 'C',
  Terrazzo: 'T', Excluded: 'X',
};
const RT_DEC: Record<string, RoomType> = Object.fromEntries(
  Object.entries(RT_ENC).map(([k, v]) => [v, k as RoomType])
);

const UT_ENC: Record<UnitType, string> = { DwellingA: 'A', PertinenzaC: 'C', Other: 'O' };
const UT_DEC: Record<string, UnitType> = Object.fromEntries(
  Object.entries(UT_ENC).map(([k, v]) => [v, k as UnitType])
);

const TU_ENC: Record<TariffUnit, string> = { euro_per_vano: 'v', euro_per_mq: 'm' };
const TU_DEC: Record<string, TariffUnit> = Object.fromEntries(
  Object.entries(TU_ENC).map(([k, v]) => [v, k as TariffUnit])
);

const LM_ENC: Record<LuxuryCheckMode, string> = {
  analisiDM1969: 'a', primaCasaRegistro: 'r', primaCasaIVA: 'v',
};
const LM_DEC: Record<string, LuxuryCheckMode> = Object.fromEntries(
  Object.entries(LM_ENC).map(([k, v]) => [v, k as LuxuryCheckMode])
);

const VT_DEC: VenditoreTipo[] = ['privato', 'costruttore_prima_casa', 'costruttore_ordinario'];
const VT_ENC: Record<VenditoreTipo, number> = {
  privato: 0, costruttore_prima_casa: 1, costruttore_ordinario: 2,
};

const TC_ENC: Record<TipoContratto, string> = { dipendente: 'd', autonomo: 'a', altro: 'o' };
const TC_DEC: Record<string, TipoContratto> = Object.fromEntries(
  Object.entries(TC_ENC).map(([k, v]) => [v, k as TipoContratto])
);

// ── Luxury bitmask (19 bits) ──────────────────────────────────────────────────

const LX_BITS = [
  'art1_luxuryZone', 'art2_largeLot', 'art3_lowDensity',
  'art4_pool', 'art4_tennis', 'art5_villa', 'art7_expensiveLand',
  'table_c_multiLift', 'table_d_serviceStairs', 'table_e_serviceElevator',
  'table_f_stairMaterials', 'table_g_highCeilings', 'table_h_fancyDoors',
  'table_i_fancyInfissi', 'table_l_fancyFloors', 'table_m_fancyWalls',
  'table_n_decorCeilings', 'table_o_condoPool', 'table_p_condoTennis',
] as const;

function encodeLuxury(u: Unit): number {
  let bits = 0;
  LX_BITS.forEach((key, i) => { if ((u as unknown as Record<string, unknown>)[key]) bits |= (1 << i); });
  return bits;
}

function decodeLuxury(bits: number): Partial<Unit> {
  const out: Partial<Unit> = {};
  LX_BITS.forEach((key, i) => { if (bits & (1 << i)) (out as unknown as Record<string, unknown>)[key] = true; });
  return out;
}

// ── Generic dictionary ────────────────────────────────────────────────────────

type Cx = Record<string, unknown>;

// ── Room ──────────────────────────────────────────────────────────────────────

function encRoom(r: Room): Cx {
  const o: Cx = { n: r.name, t: RT_ENC[r.roomType], a: r.areaMq };
  if (r.notes) o.no = r.notes;
  if (r.accessoDaInterno) o.ai = 1;
  if (r.impiantiPresenti) o.ip = 1;
  return o;
}

function decRoom(c: Cx): Room {
  return {
    id: uuidv4(),
    name: c.n as string,
    roomType: RT_DEC[c.t as string] ?? 'Main',
    areaMq: c.a as number,
    notes: (c.no as string) ?? '',
    accessoDaInterno: !!(c.ai),
    impiantiPresenti: !!(c.ip),
  };
}

// ── Floor ─────────────────────────────────────────────────────────────────────

function encFloor(f: Floor): Cx {
  return { n: f.name, r: f.rooms.map(encRoom) };
}

function decFloor(c: Cx): Floor {
  return { id: uuidv4(), name: c.n as string, rooms: (c.r as Cx[]).map(decRoom) };
}

// ── Unit ──────────────────────────────────────────────────────────────────────

function encUnit(u: Unit): Cx {
  const o: Cx = {
    n: u.name,
    t: UT_ENC[u.unitType],
    tc: u.targetCategory,
    tl: u.targetClass,
    f: u.floors.map(encFloor),
  };
  if (u.superficieGlobaleAttoMq) o.sg = u.superficieGlobaleAttoMq;
  if (u.gardenMq) o.gm = u.gardenMq;
  const lx = encodeLuxury(u);
  if (lx) o.lx = lx;
  return o;
}

function decUnit(c: Cx): Unit {
  return {
    id: uuidv4(),
    name: c.n as string,
    unitType: UT_DEC[c.t as string] ?? 'DwellingA',
    targetCategory: c.tc as string,
    targetClass: c.tl as string,
    floors: (c.f as Cx[]).map(decFloor),
    superficieGlobaleAttoMq: c.sg as number | undefined,
    gardenMq: c.gm as number | undefined,
    ...(c.lx ? decodeLuxury(c.lx as number) : {}),
  };
}

// ── Tariff ────────────────────────────────────────────────────────────────────

function encTariff(t: Tariff): Cx {
  const o: Cx = { c: t.category, cl: t.classe, v: t.value, u: TU_ENC[t.unit] };
  if (t.sourceType !== 'manual') o.s = t.sourceType[0]; // 'i' or 'd'
  if (t.sourceNote) o.sn = t.sourceNote;
  return o;
}

function decTariff(c: Cx): Tariff {
  const s = c.s as string | undefined;
  return {
    id: uuidv4(),
    category: c.c as string,
    classe: c.cl as string,
    value: c.v as number,
    unit: TU_DEC[c.u as string] ?? 'euro_per_vano',
    sourceType: s === 'i' ? 'imported' : s === 'd' ? 'dataset' : 'manual',
    sourceNote: (c.sn as string) ?? '',
  };
}

// ── Scenario ──────────────────────────────────────────────────────────────────

function encScenario(s: Scenario, unitIds: string[]): Cx {
  const du = Math.max(0, unitIds.indexOf(s.dwellingUnitId));
  const pu = Math.max(0, unitIds.indexOf(s.pertinenzaUnitId));
  const o: Cx = { n: s.name, du, dc: s.dwellingCategory, dl: s.dwellingClass, pu, pc: s.pertinenzaCategory, pl: s.pertinenzaClass };
  if (s.isFusion) {
    o.fus = 1;
    o.fui = (s.fusionUnitIds ?? []).map(id => unitIds.indexOf(id)).filter(i => i >= 0);
  }
  if (s.enablePertinenza) o.ep = 1;
  if (s.enableImu) {
    o.ei = 1;
    o.ia = s.imuAliquota;
    if (!s.imuIsMainHome) o.nim = 1; // not main home
    if (s.imuDetrazione !== 200) o.idet = s.imuDetrazione;
  }
  const lm = s.luxuryCheckMode ?? 'analisiDM1969';
  if (lm !== 'analisiDM1969') o.lm = LM_ENC[lm];
  if (s.dataAtto) o.da = s.dataAtto;
  return o;
}

function decScenario(c: Cx, unitIds: string[]): Scenario {
  return {
    id: uuidv4(),
    name: c.n as string,
    isFusion: !!(c.fus),
    fusionUnitIds: c.fui ? (c.fui as number[]).map(i => unitIds[i] ?? '') : [],
    dwellingUnitId: unitIds[c.du as number] ?? '',
    dwellingCategory: c.dc as string,
    dwellingClass: c.dl as string,
    pertinenzaUnitId: unitIds[c.pu as number] ?? '',
    pertinenzaCategory: c.pc as string,
    pertinenzaClass: c.pl as string,
    enablePertinenza: !!(c.ep),
    enableImu: !!(c.ei),
    imuAliquota: (c.ia as number) ?? 0.0076,
    imuIsMainHome: !(c.nim),
    imuDetrazione: (c.idet as number) ?? 200,
    luxuryCheckMode: c.lm ? LM_DEC[c.lm as string] : 'analisiDM1969',
    dataAtto: (c.da as string) ?? '',
  };
}

// ── Person ────────────────────────────────────────────────────────────────────

function encPerson(p: Person): Cx {
  const o: Cx = { n: p.name };
  const t = TC_ENC[p.tipoContratto];
  if (t !== 'd') o.t = t;
  if (p.redditoNettoMensile) o.r = p.redditoNettoMensile;
  if (p.notes) o.no = p.notes;
  return o;
}

function decPerson(c: Cx): Person {
  return {
    id: uuidv4(),
    name: c.n as string,
    tipoContratto: c.t ? TC_DEC[c.t as string] : 'dipendente',
    redditoNettoMensile: (c.r as number) ?? 0,
    notes: (c.no as string) ?? '',
  };
}

// ── Contract ──────────────────────────────────────────────────────────────────

function encContract(ct: Contract, scenarioIds: string[], personIds: string[]): Cx {
  const o: Cx = {
    n: ct.name,
    se: ct.scenarioEntries.map(e => {
      const si = Math.max(0, scenarioIds.indexOf(e.scenarioId));
      const eo: Cx = { si, p: e.prezzoAcquisto };
      if (e.isPrimaCasa) eo.pc = 1;
      const vt = VT_ENC[e.venditore];
      if (vt !== 0) eo.v = vt;
      return eo;
    }),
  };
  if (ct.personIds.length) o.pi = ct.personIds.map(id => personIds.indexOf(id)).filter(i => i >= 0);
  if (ct.hasAgenzia) {
    o.ha = 1;
    if (ct.agenziaPercent !== 0.03) o.ap = ct.agenziaPercent;
    if (ct.agenziaMinimo !== 1000) o.am = ct.agenziaMinimo;
  }
  // Notaio: only non-defaults
  const cn = ct.costiNotaio;
  const cnO: Cx = {};
  if (cn.rogitoOnorario !== 2000) cnO.ro = cn.rogitoOnorario;
  if (!cn.rogitoIva) cnO.ri = 0;
  if (cn.rogitoSpeseExtra !== 500) cnO.rs = cn.rogitoSpeseExtra;
  if (cn.mutuoOnorario !== 1200) cnO.mo = cn.mutuoOnorario;
  if (!cn.mutuoIva) cnO.mi = 0;
  if (cn.mutuoSpeseExtra !== 200) cnO.ms = cn.mutuoSpeseExtra;
  if (Object.keys(cnO).length) o.cn = cnO;
  // Mutuo: only if enabled
  if (ct.mutuo.enabled) {
    o.mu = { i: ct.mutuo.importo, t: ct.mutuo.tassoAnnuo, d: ct.mutuo.durataAnni, p: ct.mutuo.isPrimaCasa ? 1 : 0 };
  }
  if (ct.perizia !== 300) o.pz = ct.perizia;
  if (ct.peruziaHasIva) o.phi = 1;
  // BancaCosti: skip the default single entry
  const isDefaultBanca = ct.bancaCosti.length === 1 &&
    ct.bancaCosti[0].label === 'Istruttoria banca' &&
    ct.bancaCosti[0].importo === 800 &&
    !ct.bancaCosti[0].hasIva;
  if (!isDefaultBanca) {
    o.bc = ct.bancaCosti.map(cb => {
      const bco: Cx = { l: cb.label, i: cb.importo };
      if (cb.hasIva) bco.v = 1;
      return bco;
    });
  }
  if (ct.compromessoRegistrazione !== 250) o.cr = ct.compromessoRegistrazione;
  if (ct.utenza.enabled) {
    const u = ct.utenza;
    o.ut = { o: u.numOccupanti, e: u.elettricitaKwhAnno, ep: u.elettricitaPrezzioKwh, a: u.acquaEuroAnno, g: u.gasEuroAnno, inet: u.internetEuroAnno, c: u.condominieMqAnno };
  }
  if (ct.notes) o.no = ct.notes;
  return o;
}

function decContract(c: Cx, scenarioIds: string[], personIds: string[]): Contract {
  const cn = (c.cn as Cx) ?? {};
  const mu = c.mu as Cx | undefined;
  const ut = c.ut as Cx | undefined;
  return {
    id: uuidv4(),
    name: c.n as string,
    scenarioEntries: (c.se as Cx[]).map(e => ({
      scenarioId: scenarioIds[e.si as number] ?? '',
      prezzoAcquisto: e.p as number,
      isPrimaCasa: !!(e.pc),
      venditore: VT_DEC[(e.v as number) ?? 0],
    })),
    personIds: c.pi ? (c.pi as number[]).map(i => personIds[i] ?? '') : [],
    hasAgenzia: !!(c.ha),
    agenziaPercent: (c.ap as number) ?? 0.03,
    agenziaMinimo: (c.am as number) ?? 1000,
    costiNotaio: {
      rogitoOnorario: (cn.ro as number) ?? 2000,
      rogitoIva: cn.ri !== undefined ? !!(cn.ri) : true,
      rogitoSpeseExtra: (cn.rs as number) ?? 500,
      mutuoOnorario: (cn.mo as number) ?? 1200,
      mutuoIva: cn.mi !== undefined ? !!(cn.mi) : true,
      mutuoSpeseExtra: (cn.ms as number) ?? 200,
    },
    mutuo: mu ? {
      enabled: true,
      importo: mu.i as number,
      tassoAnnuo: mu.t as number,
      durataAnni: mu.d as number,
      isPrimaCasa: !!(mu.p),
    } : { enabled: false, importo: 0, tassoAnnuo: 0.035, durataAnni: 25, isPrimaCasa: true },
    perizia: (c.pz as number) ?? 300,
    peruziaHasIva: !!(c.phi),
    bancaCosti: c.bc
      ? (c.bc as Cx[]).map(cb => ({ id: uuidv4(), label: cb.l as string, importo: cb.i as number, hasIva: !!(cb.v) }))
      : [{ id: uuidv4(), label: 'Istruttoria banca', importo: 800, hasIva: false }],
    compromessoRegistrazione: (c.cr as number) ?? 250,
    utenza: ut ? {
      enabled: true,
      numOccupanti: ut.o as number,
      elettricitaKwhAnno: ut.e as number,
      elettricitaPrezzioKwh: ut.ep as number,
      acquaEuroAnno: ut.a as number,
      gasEuroAnno: ut.g as number,
      internetEuroAnno: ut.inet as number,
      condominieMqAnno: ut.c as number,
    } : { enabled: false, numOccupanti: 2, elettricitaKwhAnno: 2500, elettricitaPrezzioKwh: 0.28, acquaEuroAnno: 250, gasEuroAnno: 900, internetEuroAnno: 360, condominieMqAnno: 15 },
    notes: (c.no as string) ?? '',
  };
}

// ── Base64url helpers ─────────────────────────────────────────────────────────

function toBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function encodeProject(project: Project): string {
  const unitIds = project.units.map(u => u.id);
  const scenarioIds = project.scenarios.map(s => s.id);
  const personIds = (project.persons ?? []).map(p => p.id);

  const rs = project.ruleSet;
  const rsO: Cx = {};
  if (Math.abs(rs.accessoryDirectCoeff - 1 / 3) > 0.0001) rsO.adc = rs.accessoryDirectCoeff;
  if (Math.abs(rs.accessoryComplementaryCoeff - 0.25) > 0.0001) rsO.acc = rs.accessoryComplementaryCoeff;
  if (rs.applyLargeRoomRagguaglio) rsO.alr = 1;
  if (rs.vanoMaxMq !== 26) rsO.vmx = rs.vanoMaxMq;
  if (rs.dipendenzePct !== 0) rsO.dip = rs.dipendenzePct;

  const j = project.jurisdiction;
  const jO: Cx = {};
  if (j.comune) jO.c = j.comune;
  if (j.zonaCensuaria) jO.z = j.zonaCensuaria;
  if (j.note) jO.n = j.note;

  const compact: Cx = { v: SCHEMA_VERSION, n: project.name };
  if (Object.keys(jO).length) compact.j = jO;
  if (Object.keys(rsO).length) compact.r = rsO;
  compact.u = project.units.map(encUnit);
  compact.t = project.tariffs.map(encTariff);
  compact.s = project.scenarios.map(s => encScenario(s, unitIds));
  if ((project.persons ?? []).length) compact.p = project.persons.map(encPerson);
  if ((project.contracts ?? []).length) compact.c = project.contracts.map(ct => encContract(ct, scenarioIds, personIds));

  return toBase64url(JSON.stringify(compact));
}

export function decodeProject(encoded: string): Project {
  const json = fromBase64url(encoded);
  const c = JSON.parse(json) as Cx;

  if (c.v !== SCHEMA_VERSION) throw new Error(`Unknown schema version: ${c.v}`);

  const units: Unit[] = (c.u as Cx[]).map(decUnit);
  const unitIds = units.map(u => u.id);
  const scenarios: Scenario[] = (c.s as Cx[]).map(s => decScenario(s, unitIds));
  const scenarioIds = scenarios.map(s => s.id);
  const persons: Person[] = c.p ? (c.p as Cx[]).map(decPerson) : [];
  const personIds = persons.map(p => p.id);
  const contracts: Contract[] = c.c ? (c.c as Cx[]).map(ct => decContract(ct, scenarioIds, personIds)) : [];

  const rs = (c.r as Cx) ?? {};
  const j = (c.j as Cx) ?? {};
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: c.n as string,
    createdAt: now,
    updatedAt: now,
    jurisdiction: {
      comune: (j.c as string) ?? '',
      zonaCensuaria: (j.z as string) ?? '',
      note: (j.n as string) ?? '',
    },
    ruleSet: {
      accessoryDirectCoeff: (rs.adc as number) ?? 1 / 3,
      accessoryComplementaryCoeff: (rs.acc as number) ?? 0.25,
      applyLargeRoomRagguaglio: !!(rs.alr),
      vanoMaxMq: (rs.vmx as number) ?? 26,
      dipendenzePct: (rs.dip as number) ?? 0,
    },
    units,
    tariffs: (c.t as Cx[]).map(decTariff),
    scenarios,
    persons,
    contracts,
  };
}

/** Build a shareable URL for the given project. */
export function buildShareUrl(project: Project): string {
  const encoded = encodeProject(project);
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('i', encoded);
  return url.toString();
}

/** Read the `?i=` param from the current URL (null if absent). */
export function extractShareParam(): string | null {
  return new URLSearchParams(window.location.search).get('i');
}

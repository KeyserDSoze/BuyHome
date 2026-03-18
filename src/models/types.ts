// ── Room ─────────────────────────────────────────────────────────────────────

export type RoomType =
  | 'Main'                   // Stanza principale (soggiorno, camera, studio...)
  | 'Kitchen'                // Cucina con impianti
  | 'AccessoryDirect'        // Accessori diretti: bagno, ingresso, corridoio → 1/3
  | 'AccessoryComplementary' // Accessori complementari: cantina, soffitta → 1/4
  | 'Terrazzo'               // Terrazza/balcone – 0 vani, area rilevante per DM 2/8/1969
  | 'Excluded';              // Escluso dal computo

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  Main: 'Principale',
  Kitchen: 'Cucina',
  AccessoryDirect: 'Accessorio diretto (1/3)',
  AccessoryComplementary: 'Accessorio complementare (1/4)',
  Terrazzo: 'Terrazzo/Balcone',
  Excluded: 'Escluso',
};

// ── Luxury check mode (regime giuridico) ─────────────────────────────────────
/**
 * Seleziona il regime con cui verificare la natura "di lusso" dell'abitazione.
 *
 * – primaCasaRegistro: dal 1/1/2014 conta la categoria catastale A/1, A/8, A/9
 *   (D.Lgs. 23/2011 art. 10). Prima: applicare analisiDM1969.
 *
 * – primaCasaIVA: allineamento al criterio catastale dal 13/12/2014
 *   (D.Lgs. 175/2014 art. 33). Per atti IVA ante-13/12/2014: D.M. 1969
 *   (circ. AdE 2/E 2014 e 31/E 2014).
 *
 * – analisiDM1969: applica sempre il D.M. 2/8/1969 (analisi storica/generica).
 */
export type LuxuryCheckMode =
  | 'primaCasaRegistro'  // Post 1/1/2014: categoria A/1 A/8 A/9 (D.Lgs. 23/2011 art. 10)
  | 'primaCasaIVA'       // Post 13/12/2014: categoria A/1 A/8 A/9 (D.Lgs. 175/2014 art. 33)
  | 'analisiDM1969';     // Sempre D.M. 2/8/1969 (analisi storica / generica)

export const LUXURY_CHECK_MODE_LABELS: Record<LuxuryCheckMode, string> = {
  primaCasaRegistro: 'Prima casa – Imposta di Registro (atti dal 1/1/2014)',
  primaCasaIVA: 'Prima casa – IVA/Cessione (atti dal 13/12/2014)',
  analisiDM1969: 'Analisi D.M. 2/8/1969 (storica / generica)',
};

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  areaMq: number;
  notes: string;
  accessoDaInterno?: boolean;    // Vano raggiungibile dall'interno (indicatore di "utilizzabilità" Cass. 2503/2025)
  impiantiPresenti?: boolean;    // Impianti idraulici/termici presenti (indicatore di "utilizzabilità")
}

// ── Floor ─────────────────────────────────────────────────────────────────────

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

// ── Unit ─────────────────────────────────────────────────────────────────────

export type UnitType = 'DwellingA' | 'PertinenzaC' | 'Other';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  DwellingA: 'Abitazione (Gruppo A)',
  PertinenzaC: 'Pertinenza (Gruppo C)',
  Other: 'Altro',
};

export const CATEGORY_OPTIONS_A = ['A/1', 'A/2', 'A/3', 'A/4', 'A/5', 'A/6', 'A/7', 'A/8', 'A/9', 'A/10', 'A/11'];
export const CATEGORY_OPTIONS_C = ['C/1', 'C/2', 'C/3', 'C/4', 'C/5', 'C/6', 'C/7'];
export const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];

export interface Unit {
  id: string;
  name: string;
  unitType: UnitType;
  targetCategory: string;
  targetClass: string;
  floors: Floor[];
  superficieGlobaleAttoMq?: number;  // Superficie globale come da atto (formula Cass. 29643/2019: SU = globale − escl.)
  // ── DM 2 agosto 1969: Criteri assoluti (Art. 1–7) – basta uno solo ──────────
  art1_luxuryZone?: boolean;          // Art. 1: zona urb. "ville", "parco privato" o "di lusso"
  art2_largeLot?: boolean;            // Art. 2: lotto unifamiliare con prescrizione ≥ 3.000 m²
  art3_lowDensity?: boolean;          // Art. 3: cubatura fabbricato >2.000 mc e densità <25 mc/100 m²
  art4_pool?: boolean;                // Art. 4: abitazione unifamiliare con piscina ≥ 80 m²
  art4_tennis?: boolean;              // Art. 4: abitazione unifamiliare con campo tennis ≥ 650 m²
  art5_villa?: boolean;               // Art. 5: casa unifamiliare >200 m² con giardino >6× area coperta
  gardenMq?: number;                  // Art. 5: superficie giardino/area scoperta di pertinenza in m²
  art7_expensiveLand?: boolean;       // Art. 7: costo terreno coperto >1,5× costo costruzione
  // ── DM 2 agosto 1969: Caratteristiche tabella (Art. 8) – servono PIÙ DI 4 ──
  table_c_multiLift?: boolean;        // Tab. c): più di 1 ascensore per scala (<7 piani sopraelevati)
  table_d_serviceStairs?: boolean;    // Tab. d): scala di servizio non prescritta da legge
  table_e_serviceElevator?: boolean;  // Tab. e): montacarichi o ascensore di servizio <4 piani
  table_f_stairMaterials?: boolean;   // Tab. f): scala principale con rivestimenti pregiati (>170 cm)
  table_g_highCeilings?: boolean;     // Tab. g): altezza libera netta piano > 3,30 m
  table_h_fancyDoors?: boolean;       // Tab. h): porte d'ingresso in legno pregiato/intagliato
  table_i_fancyInfissi?: boolean;     // Tab. i): infissi interni pregiati se >50% sup. totale
  table_l_fancyFloors?: boolean;      // Tab. l): pavimenti pregiati per >50% sup. utile totale
  table_m_fancyWalls?: boolean;       // Tab. m): pareti pregiate/stoffe per >30% sup. complessiva
  table_n_decorCeilings?: boolean;    // Tab. n): soffitti a cassettoni decorati o stucchi dipinti
  table_o_condoPool?: boolean;        // Tab. o): piscina in muratura edificio/complesso <15 unità
  table_p_condoTennis?: boolean;      // Tab. p): campo da tennis edificio/complesso <15 unità
}

// ── Tariff ───────────────────────────────────────────────────────────────────

export type TariffUnit = 'euro_per_vano' | 'euro_per_mq';
export type TariffSource = 'manual' | 'imported' | 'dataset';

export const TARIFF_UNIT_LABELS: Record<TariffUnit, string> = {
  euro_per_vano: '€/vano',
  euro_per_mq: '€/m²',
};

export interface Tariff {
  id: string;
  category: string;
  classe: string;
  value: number;
  unit: TariffUnit;
  sourceType: TariffSource;
  sourceNote: string;
}

// ── Scenario ─────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  isFusion?: boolean;        // true = accorpamento di più unità
  fusionUnitIds?: string[];  // IDs delle unità da fondere
  dwellingUnitId: string;
  dwellingCategory: string;
  dwellingClass: string;
  pertinenzaUnitId: string;
  pertinenzaCategory: string;
  pertinenzaClass: string;
  enablePertinenza: boolean;
  enableImu: boolean;
  imuAliquota: number;       // e.g. 0.0076 for 0.76%
  imuIsMainHome: boolean;
  imuDetrazione: number;     // euro
  luxuryCheckMode?: LuxuryCheckMode;  // Regime lusso (default: analisiDM1969)
  dataAtto?: string;                   // Data atto ISO YYYY-MM-DD (per routing post-2014)
}

// ── RuleSet ───────────────────────────────────────────────────────────────────

export interface RuleSet {
  accessoryDirectCoeff: number;        // default 1/3
  accessoryComplementaryCoeff: number; // default 1/4
  applyLargeRoomRagguaglio: boolean;
  vanoMaxMq: number;                   // threshold for ragguaglio (default 26)
  dipendenzePct: number;               // 0..0.10
}

// ── Jurisdiction ──────────────────────────────────────────────────────────────

export interface Jurisdiction {
  comune: string;
  zonaCensuaria: string;
  note: string;
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  jurisdiction: Jurisdiction;
  ruleSet: RuleSet;
  units: Unit[];
  tariffs: Tariff[];
  scenarios: Scenario[];
  persons: Person[];
  contracts: Contract[];
}

// ── Person (acquirente / cointestatario) ──────────────────────────────────────

export type TipoContratto = 'dipendente' | 'autonomo' | 'altro';
export const TIPO_CONTRATTO_LABELS: Record<TipoContratto, string> = {
  dipendente: 'Lavoratore dipendente',
  autonomo: 'Lavoratore autonomo / libero professionista',
  altro: 'Altro / pensionato',
};

export interface Person {
  id: string;
  name: string;
  tipoContratto: TipoContratto;
  redditoNettoMensile: number;   // € netti/mese
  notes: string;
}

// ── Contract ──────────────────────────────────────────────────────────────────

/** Tipo di venditore: determina imposte registro/IVA e imposte fisse */
export type VenditoreTipo = 'privato' | 'costruttore_prima_casa' | 'costruttore_ordinario';
export const VENDITORE_TIPO_LABELS: Record<VenditoreTipo, string> = {
  privato: 'Privato (cedente soggetto privato o soc. esente IVA)',
  costruttore_prima_casa: 'Costruttore – prima casa (IVA 4%)',
  costruttore_ordinario: 'Costruttore – ordinario (IVA 10%)',
};

/** Un singolo scenario incluso nel contratto, con il suo prezzo di acquisto */
export interface ContractScenarioEntry {
  scenarioId: string;
  prezzoAcquisto: number;          // valore dichiarato nell'atto (€)
  isPrimaCasa: boolean;            // agevolazione prima casa per questo immobile
  venditore: VenditoreTipo;
}

/** Configurazione del mutuo bancario */
export interface MutuoConfig {
  enabled: boolean;
  importo: number;                 // importo del mutuo (€)
  tassoAnnuo: number;              // tasso fisso annuo (es. 0.035 = 3.5%)
  durataAnni: number;              // durata in anni
  isPrimaCasa: boolean;            // imposta sostitutiva 0.25% vs 2%
}

/** Singola voce di costo bancario/extra */
export interface CostoBancario {
  id: string;
  label: string;                   // es. "Istruttoria banca"
  importo: number;
  hasIva: boolean;                 // se true: importo è imponibile, si aggiunge IVA 22%
}

/** Costi notarili (rogito + mutuo) */
export interface CostiNotaio {
  // Atto di compravendita
  rogitoOnorario: number;          // onorario netto notaio
  rogitoIva: boolean;              // true = + IVA 22% (sempre per notaio)
  rogitoSpeseExtra: number;        // visure, bolli, etc. (no IVA)
  // Atto di mutuo (se presente)
  mutuoOnorario: number;
  mutuoIva: boolean;
  mutuoSpeseExtra: number;
}

/** Stima costi utenze mensili */
export interface UtenzaConfig {
  enabled: boolean;
  numOccupanti: number;
  // Coefficienti personalizzabili €/mq/anno
  elettricitaKwhAnno: number;      // kWh/anno
  elettricitaPrezzioKwh: number;   // €/kWh
  acquaEuroAnno: number;           // stima fissa mensile
  gasEuroAnno: number;
  internetEuroAnno: number;
  condominieMqAnno: number;        // €/mq/anno per condominio
}

export interface Contract {
  id: string;
  name: string;
  scenarioEntries: ContractScenarioEntry[];
  personIds: string[];             // persone cointestate / garanti reddito

  // Agenzia
  hasAgenzia: boolean;
  agenziaPercent: number;          // es. 0.03 = 3%
  agenziaMinimo: number;           // minimo provvigione (€)

  // Notaio
  costiNotaio: CostiNotaio;

  // Mutuo
  mutuo: MutuoConfig;

  // Costi banca / perizia
  perizia: number;
  peruziaHasIva: boolean;
  bancaCosti: CostoBancario[];

  // Compromesso
  compromessoRegistrazione: number; // es. 250 (no IVA)

  // Utenze
  utenza: UtenzaConfig;

  notes: string;
}

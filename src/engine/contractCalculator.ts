/**
 * contractCalculator.ts
 * Calcola tutte le spese di acquisto di un immobile in Italia:
 * imposte, agenzia, notaio, mutuo, banca, utenze.
 */

import {
  Contract,
  ContractScenarioEntry,
  Person,
  Scenario,
} from '../models/types';

const IVA = 0.22;

// ── Imposta di registro / IVA acquisto ────────────────────────────────────────

export interface ImpostaCessioneBreakdown {
  impostaRegistro: number;     // imposta di registro (privato)
  impostaIva: number;          // IVA (costruttore)
  impostaIpotecaria: number;   // fissa (50 privato / 200 costruttore)
  impostaCatastale: number;    // fissa (50 privato / 200 costruttore)
  totale: number;
  aliquotaEffettiva: number;   // % sul prezzo acquisto (informativa)
  baseImponibileRegistro: number; // valore catastale rivalutato usato per registro
}

/**
 * Calcola imposte per una singola entry del contratto.
 * @param entry     – entry dello scenario nel contratto
 * @param renditaCatastale – rendita catastale dello scenario (dal motore rendita)
 */
export function calcolaImposte(
  entry: ContractScenarioEntry,
  renditaCatastale: number,
): ImpostaCessioneBreakdown {
  const { isPrimaCasa, venditore, prezzoAcquisto } = entry;

  // Base imponibile registro: rendita × 1.05 × moltiplicatore
  // Prima casa: 110; seconda casa: 120 (DPR 131/1986 nota II-bis)
  const molt = isPrimaCasa ? 110 : 120;
  const baseRegistro = renditaCatastale * 1.05 * molt;

  let impostaRegistro = 0;
  let impostaIva = 0;
  let impostaIpotecaria = 0;
  let impostaCatastale = 0;

  if (venditore === 'privato') {
    // Imposta di registro: 2% prima casa / 9% seconda casa, minimo 1.000 €
    const aliq = isPrimaCasa ? 0.02 : 0.09;
    impostaRegistro = Math.max(1000, baseRegistro * aliq);
    impostaIpotecaria = 50;
    impostaCatastale = 50;
  } else {
    // Costruttore: IVA sostituisce registro
    const aliqIva = venditore === 'costruttore_prima_casa' ? 0.04 : 0.10;
    impostaIva = prezzoAcquisto * aliqIva;
    impostaIpotecaria = 200;
    impostaCatastale = 200;
    impostaRegistro = 200; // imposta registro fissa su cessione soggetta IVA
  }

  const totale = impostaRegistro + impostaIva + impostaIpotecaria + impostaCatastale;

  return {
    impostaRegistro,
    impostaIva,
    impostaIpotecaria,
    impostaCatastale,
    totale,
    aliquotaEffettiva: prezzoAcquisto > 0 ? totale / prezzoAcquisto : 0,
    baseImponibileRegistro: baseRegistro,
  };
}

// ── Calcolo rata mutuo (ammortamento francese) ────────────────────────────────

export function calcolaRataMutuo(
  capitale: number,
  tassoAnnuo: number,
  durataAnni: number,
): { rataMensile: number; totaleDaRimborsare: number; totaleInteressi: number } {
  if (capitale <= 0 || durataAnni <= 0) {
    return { rataMensile: 0, totaleDaRimborsare: 0, totaleInteressi: 0 };
  }
  if (tassoAnnuo === 0) {
    const rataMensile = capitale / (durataAnni * 12);
    return { rataMensile, totaleDaRimborsare: capitale, totaleInteressi: 0 };
  }
  const r = tassoAnnuo / 12;
  const n = durataAnni * 12;
  const rataMensile = (capitale * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totaleDaRimborsare = rataMensile * n;
  return {
    rataMensile,
    totaleDaRimborsare,
    totaleInteressi: totaleDaRimborsare - capitale,
  };
}

// ── Stima utenze mensili ──────────────────────────────────────────────────────

export interface UtenzaBreakdown {
  enabled: boolean;
  elettricitaMensile: number;
  acquaMensile: number;
  gasMensile: number;
  internetMensile: number;
  condominieMensile: number;
  totaleMensile: number;
}

export function calcolaUtenze(
  contract: Contract,
  totaleMq: number,
): UtenzaBreakdown {
  const u = contract.utenza;
  if (!u.enabled) {
    return {
      enabled: false,
      elettricitaMensile: 0,
      acquaMensile: 0,
      gasMensile: 0,
      internetMensile: 0,
      condominieMensile: 0,
      totaleMensile: 0,
    };
  }
  const elettricitaMensile = (u.elettricitaKwhAnno * u.elettricitaPrezzioKwh) / 12;
  const acquaMensile = u.acquaEuroAnno / 12;
  const gasMensile = u.gasEuroAnno / 12;
  const internetMensile = u.internetEuroAnno / 12;
  const condominieMensile = (u.condominieMqAnno * totaleMq) / 12;

  return {
    enabled: true,
    elettricitaMensile,
    acquaMensile,
    gasMensile,
    internetMensile,
    condominieMensile,
    totaleMensile: elettricitaMensile + acquaMensile + gasMensile + internetMensile + condominieMensile,
  };
}

// ── Breakdown completo contratto ──────────────────────────────────────────────

export interface ContractEntryBreakdown {
  scenarioId: string;
  scenarioName: string;
  prezzoAcquisto: number;
  renditaCatastale: number;
  imposte: ImpostaCessioneBreakdown;
  imuAnnua: number;
  imuIfSecondHome: number;
}

export interface ContractBreakdown {
  // per-entry
  entries: ContractEntryBreakdown[];

  // totali acquisto
  prezzoTotale: number;

  // Imposte cessione (somma entries)
  imposteTotale: number;

  // Agenzia
  agenziaImponibile: number;
  agenziaIva: number;
  agenziaTotale: number;

  // Notaio rogito
  notaioRogitoImponibile: number;
  notaioRogitoIva: number;
  notaioRogitoSpeseExtra: number;
  notaioRogitoTotale: number;

  // Compromesso
  compromessoTotale: number;

  // Mutuo
  mutuoImporto: number;
  mutuoImpostaSostitutiva: number;
  mutuoRataMensile: number;
  mutuoTotaleDaRimborsare: number;
  mutuoTotaleInteressi: number;

  // Notaio mutuo
  notaioMutuoImponibile: number;
  notaioMutuoIva: number;
  notaioMutuoSpeseExtra: number;
  notaioMutuoTotale: number;

  // Banca
  peruziaImponibile: number;
  peruziaIva: number;
  periziaTotale: number;
  bancaCostiTotale: number;    // con IVA inclusa

  // Totali sommari
  totaleSpeseAccessorie: number;   // tutto tranne prezzo e mutuo
  totaleAcquistoSenzaMutuo: number; // prezzo + tutte le spese
  anticipoNecessario: number;      // prezzo - mutuo + spese accessorie
  totaleConMutuo: number;          // prezzo + spese + totale interessi

  // Sostenibilità
  redditoMensileComune: number;
  rataMassimaSostenibile: number;  // 33% del reddito netto
  mutuoSostenibile: boolean;
  coefficienteDebitoReddito: number; // rata / reddito %

  // IMU aggregata
  imuAnnuaTotale: number;
  imuIfSecondHomeTotale: number;

  // Utenze
  utenze: UtenzaBreakdown;
  totaleMensileAbitare: number;    // rata + utenze + imu mensile
}

export interface ContractCalcInput {
  contract: Contract;
  scenarios: Scenario[];
  scenarioRendite: Record<string, number>;       // scenarioId → renditaCatastale
  scenarioImuEstimates: Record<string, number>;  // scenarioId → imuEffettiva
  scenarioImuSecondHome: Record<string, number>; // scenarioId → imuIfSecondHome
  scenarioTotalMq: Record<string, number>;       // scenarioId → totalMq
  persons: Person[];
}

export function calcolaContratto(input: ContractCalcInput): ContractBreakdown {
  const { contract, scenarios, scenarioRendite, scenarioImuEstimates, scenarioImuSecondHome, scenarioTotalMq, persons } = input;

  // ── Per-entry breakdown ────────────────────────────────────────────────────
  const entries: ContractEntryBreakdown[] = contract.scenarioEntries.map(entry => {
    const scenario = scenarios.find(s => s.id === entry.scenarioId);
    const renditaCatastale = scenarioRendite[entry.scenarioId] ?? 0;
    const imposte = calcolaImposte(entry, renditaCatastale);
    return {
      scenarioId: entry.scenarioId,
      scenarioName: scenario?.name ?? entry.scenarioId,
      prezzoAcquisto: entry.prezzoAcquisto,
      renditaCatastale,
      imposte,
      imuAnnua: scenarioImuEstimates[entry.scenarioId] ?? 0,
      imuIfSecondHome: scenarioImuSecondHome[entry.scenarioId] ?? 0,
    };
  });

  const prezzoTotale = entries.reduce((s, e) => s + e.prezzoAcquisto, 0);
  const imposteTotale = entries.reduce((s, e) => s + e.imposte.totale, 0);
  const imuAnnuaTotale = entries.reduce((s, e) => s + e.imuAnnua, 0);
  const imuIfSecondHomeTotale = entries.reduce((s, e) => s + e.imuIfSecondHome, 0);
  const totaleMqContratto = contract.scenarioEntries.reduce((s, e) => s + (scenarioTotalMq[e.scenarioId] ?? 0), 0);

  // ── Agenzia ───────────────────────────────────────────────────────────────
  let agenziaImponibile = 0;
  let agenziaIva = 0;
  let agenziaTotale = 0;
  if (contract.hasAgenzia) {
    agenziaImponibile = Math.max(
      contract.agenziaMinimo,
      prezzoTotale * contract.agenziaPercent,
    );
    agenziaIva = agenziaImponibile * IVA;
    agenziaTotale = agenziaImponibile + agenziaIva;
  }

  // ── Notaio rogito ─────────────────────────────────────────────────────────
  const notaioRogitoImponibile = contract.costiNotaio.rogitoOnorario;
  const notaioRogitoIva = contract.costiNotaio.rogitoIva ? notaioRogitoImponibile * IVA : 0;
  const notaioRogitoSpeseExtra = contract.costiNotaio.rogitoSpeseExtra;
  const notaioRogitoTotale = notaioRogitoImponibile + notaioRogitoIva + notaioRogitoSpeseExtra;

  // ── Compromesso ───────────────────────────────────────────────────────────
  const compromessoTotale = contract.compromessoRegistrazione;

  // ── Mutuo ─────────────────────────────────────────────────────────────────
  let mutuoImporto = 0;
  let mutuoImpostaSostitutiva = 0;
  let mutuoRataMensile = 0;
  let mutuoTotaleDaRimborsare = 0;
  let mutuoTotaleInteressi = 0;
  let notaioMutuoImponibile = 0;
  let notaioMutuoIva = 0;
  let notaioMutuoSpeseExtra = 0;
  let notaioMutuoTotale = 0;

  if (contract.mutuo.enabled) {
    mutuoImporto = contract.mutuo.importo;
    // Imposta sostitutiva: 0.25% prima casa / 2% seconda casa
    mutuoImpostaSostitutiva = mutuoImporto * (contract.mutuo.isPrimaCasa ? 0.0025 : 0.02);

    const rata = calcolaRataMutuo(mutuoImporto, contract.mutuo.tassoAnnuo, contract.mutuo.durataAnni);
    mutuoRataMensile = rata.rataMensile;
    mutuoTotaleDaRimborsare = rata.totaleDaRimborsare;
    mutuoTotaleInteressi = rata.totaleInteressi;

    notaioMutuoImponibile = contract.costiNotaio.mutuoOnorario;
    notaioMutuoIva = contract.costiNotaio.mutuoIva ? notaioMutuoImponibile * IVA : 0;
    notaioMutuoSpeseExtra = contract.costiNotaio.mutuoSpeseExtra;
    notaioMutuoTotale = notaioMutuoImponibile + notaioMutuoIva + notaioMutuoSpeseExtra;
  }

  // ── Banca / perizia ───────────────────────────────────────────────────────
  const peruziaImponibile = contract.perizia;
  const peruziaIvaAmt = contract.peruziaHasIva ? peruziaImponibile * IVA : 0;
  const periziaTotale = peruziaImponibile + peruziaIvaAmt;

  const bancaCostiTotale = contract.bancaCosti.reduce((s, c) => {
    return s + c.importo + (c.hasIva ? c.importo * IVA : 0);
  }, 0);

  // ── Totali ────────────────────────────────────────────────────────────────
  const totaleSpeseAccessorie =
    imposteTotale +
    agenziaTotale +
    notaioRogitoTotale +
    compromessoTotale +
    periziaTotale +
    bancaCostiTotale +
    mutuoImpostaSostitutiva +
    notaioMutuoTotale;

  const totaleAcquistoSenzaMutuo = prezzoTotale + totaleSpeseAccessorie;
  const anticipoNecessario = prezzoTotale - mutuoImporto + totaleSpeseAccessorie;
  const totaleConMutuo = prezzoTotale + totaleSpeseAccessorie + mutuoTotaleInteressi;

  // ── Sostenibilità mutuo ───────────────────────────────────────────────────
  const linkedPersons = persons.filter(p => contract.personIds.includes(p.id));
  const redditoMensileComune = linkedPersons.reduce((s, p) => s + p.redditoNettoMensile, 0);
  const rataMassimaSostenibile = redditoMensileComune * 0.33;
  const mutuoSostenibile = !contract.mutuo.enabled || mutuoRataMensile <= rataMassimaSostenibile;
  const coefficienteDebitoReddito = redditoMensileComune > 0 ? mutuoRataMensile / redditoMensileComune : 0;

  // ── Utenze ────────────────────────────────────────────────────────────────
  const utenze = calcolaUtenze(contract, totaleMqContratto);
  const totaleMensileAbitare = mutuoRataMensile + utenze.totaleMensile + imuAnnuaTotale / 12;

  return {
    entries,
    prezzoTotale,
    imposteTotale,
    agenziaImponibile,
    agenziaIva,
    agenziaTotale,
    notaioRogitoImponibile,
    notaioRogitoIva,
    notaioRogitoSpeseExtra,
    notaioRogitoTotale,
    compromessoTotale,
    mutuoImporto,
    mutuoImpostaSostitutiva,
    mutuoRataMensile,
    mutuoTotaleDaRimborsare,
    mutuoTotaleInteressi,
    notaioMutuoImponibile,
    notaioMutuoIva,
    notaioMutuoSpeseExtra,
    notaioMutuoTotale,
    peruziaImponibile,
    peruziaIva: peruziaIvaAmt,
    periziaTotale,
    bancaCostiTotale,
    totaleSpeseAccessorie,
    totaleAcquistoSenzaMutuo,
    anticipoNecessario,
    totaleConMutuo,
    redditoMensileComune,
    rataMassimaSostenibile,
    mutuoSostenibile,
    coefficienteDebitoReddito,
    imuAnnuaTotale,
    imuIfSecondHomeTotale,
    utenze,
    totaleMensileAbitare,
  };
}

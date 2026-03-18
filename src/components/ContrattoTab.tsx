import { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Switch, FormControlLabel, Alert,
  Chip, Divider, Tooltip, IconButton, Paper, Accordion,
  AccordionSummary, AccordionDetails, Table, TableBody,
  TableRow, TableCell, LinearProgress, InputAdornment,
  Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import HomeIcon from '@mui/icons-material/Home';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalculateIcon from '@mui/icons-material/Calculate';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { v4 as uuidv4 } from 'uuid';
import { useProject } from '../context/ProjectContext';
import {
  Contract, ContractScenarioEntry, MutuoConfig, CostoBancario,
  CostiNotaio, UtenzaConfig, VenditoreTipo, VENDITORE_TIPO_LABELS,
} from '../models/types';
import {
  calcolaContratto, ContractBreakdown,
} from '../engine/contractCalculator';
import {
  runScenario, mergeUnits, ScenarioResult,
} from '../engine/calculator';

// ── Formatters ────────────────────────────────────────────────────────────────

function eur(v: number, digits = 0) {
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits });
}
function pct(v: number) {
  return (v * 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// ── Default builders ──────────────────────────────────────────────────────────

function emptyNotaio(): CostiNotaio {
  return {
    rogitoOnorario: 2000,
    rogitoIva: true,
    rogitoSpeseExtra: 500,
    mutuoOnorario: 1200,
    mutuoIva: true,
    mutuoSpeseExtra: 200,
  };
}

function emptyMutuo(): MutuoConfig {
  return {
    enabled: false,
    importo: 0,
    tassoAnnuo: 0.035,
    durataAnni: 25,
    isPrimaCasa: true,
  };
}

function emptyUtenza(): UtenzaConfig {
  return {
    enabled: false,
    numOccupanti: 2,
    elettricitaKwhAnno: 2500,
    elettricitaPrezzioKwh: 0.28,
    acquaEuroAnno: 250,
    gasEuroAnno: 900,
    internetEuroAnno: 360,
    condominieMqAnno: 15,
  };
}

function emptyContract(): Omit<Contract, 'id'> {
  return {
    name: '',
    scenarioEntries: [],
    personIds: [],
    hasAgenzia: false,
    agenziaPercent: 0.03,
    agenziaMinimo: 1000,
    costiNotaio: emptyNotaio(),
    mutuo: emptyMutuo(),
    perizia: 300,
    peruziaHasIva: false,
    bancaCosti: [
      { id: uuidv4(), label: 'Istruttoria banca', importo: 800, hasIva: false },
    ],
    compromessoRegistrazione: 250,
    utenza: emptyUtenza(),
    notes: '',
  };
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function RowCost({ label, value, sub, warn, ok, bold }: {
  label: string; value: number; sub?: string; warn?: boolean; ok?: boolean; bold?: boolean;
}) {
  return (
    <TableRow>
      <TableCell sx={{ fontWeight: bold ? 700 : 400, color: warn ? 'error.main' : ok ? 'success.dark' : 'inherit' }}>
        {label}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: bold ? 700 : 400, whiteSpace: 'nowrap' }}>
        <Box>
          <span style={{ color: warn ? 'red' : ok ? 'green' : 'inherit' }}>{eur(value)}</span>
          {sub && <Typography variant="caption" display="block" color="text.secondary">{sub}</Typography>}
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ── ContractBreakdownView ─────────────────────────────────────────────────────

function ContractBreakdownView({ bd }: { bd: ContractBreakdown }) {
  const hasMutuo = bd.mutuoImporto > 0;

  const feasibilityPct = bd.redditoMensileComune > 0 ? bd.coefficienteDebitoReddito : null;

  return (
    <Box>
      {/* ── Sommario immobili ── */}
      {bd.entries.map(e => (
        <Paper key={e.scenarioId} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            <HomeIcon sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 18 }} />
            {e.scenarioName}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Prezzo acquisto</Typography>
              <Typography fontWeight={600}>{eur(e.prezzoAcquisto)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Rendita catastale</Typography>
              <Typography>{eur(e.renditaCatastale, 2)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Base imponibile registro</Typography>
              <Typography variant="body2">{eur(e.imposte.baseImponibileRegistro)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">IMU annua stimata</Typography>
              <Typography variant="body2">{e.imuAnnua > 0 ? eur(e.imuAnnua) : '—'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      ))}

      {/* ── Tabella costi ── */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={700}>Dettaglio costi di acquisto</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Table size="small">
            <TableBody>
              {/* Prezzo */}
              <RowCost label="Prezzo di acquisto" value={bd.prezzoTotale} bold />
              <TableRow><TableCell colSpan={2} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">IMPOSTE CESSIONE</Typography>
              </TableCell></TableRow>

              {bd.entries.map(e => (
                <TableRow key={e.scenarioId}>
                  <TableCell sx={{ pl: 3 }} colSpan={2}>
                    <Typography variant="body2">
                      <strong>{e.scenarioName}</strong>
                      {e.imposte.impostaRegistro > 0 && ` — Registro ${eur(e.imposte.impostaRegistro)}`}
                      {e.imposte.impostaIva > 0 && ` — IVA acquisto ${eur(e.imposte.impostaIva)}`}
                      {` — Ipotecaria ${eur(e.imposte.impostaIpotecaria)}`}
                      {` — Catastale ${eur(e.imposte.impostaCatastale)}`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              <RowCost label="Totale imposte cessione" value={bd.imposteTotale} bold />

              {/* Agenzia */}
              {bd.agenziaTotale > 0 && (
                <>
                  <TableRow><TableCell colSpan={2} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">AGENZIA</Typography>
                  </TableCell></TableRow>
                  <RowCost
                    label={`Provvigione (imponibile)`}
                    value={bd.agenziaImponibile}
                    sub={`+ IVA 22% = ${eur(bd.agenziaIva)}`}
                  />
                  <RowCost label="Totale agenzia (IVA incl.)" value={bd.agenziaTotale} bold />
                </>
              )}

              {/* Notaio rogito */}
              <TableRow><TableCell colSpan={2} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">NOTAIO — ROGITO</Typography>
              </TableCell></TableRow>
              <RowCost
                label="Onorario notaio"
                value={bd.notaioRogitoImponibile}
                sub={bd.notaioRogitoIva > 0 ? `+ IVA 22% = ${eur(bd.notaioRogitoIva)}` : 'esente IVA'}
              />
              {bd.notaioRogitoSpeseExtra > 0 && (
                <RowCost label="Spese extra (visure, bolli…)" value={bd.notaioRogitoSpeseExtra} />
              )}
              <RowCost label="Totale notaio rogito" value={bd.notaioRogitoTotale} bold />

              {/* Compromesso */}
              {bd.compromessoTotale > 0 && (
                <>
                  <TableRow><TableCell colSpan={2} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">COMPROMESSO</Typography>
                  </TableCell></TableRow>
                  <RowCost label="Registrazione compromesso" value={bd.compromessoTotale} />
                </>
              )}

              {/* Mutuo */}
              {hasMutuo && (
                <>
                  <TableRow><TableCell colSpan={2} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">MUTUO &amp; BANCA</Typography>
                  </TableCell></TableRow>
                  <RowCost label="Imposta sostitutiva mutuo" value={bd.mutuoImpostaSostitutiva}
                    sub={bd.mutuoImporto > 0 ? `${pct(bd.mutuoImpostaSostitutiva / bd.mutuoImporto)} dell'importo mutuo` : ''}
                  />
                  {bd.notaioMutuoTotale > 0 && (
                    <RowCost
                      label="Notaio — atto di mutuo"
                      value={bd.notaioMutuoTotale}
                      sub={`onorario ${eur(bd.notaioMutuoImponibile)} + IVA ${eur(bd.notaioMutuoIva)} + spese ${eur(bd.notaioMutuoSpeseExtra)}`}
                    />
                  )}
                </>
              )}

              {/* Perizia + banca */}
              {bd.periziaTotale > 0 && (
                <RowCost
                  label="Perizia immobile"
                  value={bd.periziaTotale}
                  sub={bd.peruziaIva > 0 ? `+ IVA ${eur(bd.peruziaIva)}` : ''}
                />
              )}
              {bd.bancaCostiTotale > 0 && (
                <RowCost label="Costi bancari (istruttoria, ecc.)" value={bd.bancaCostiTotale} />
              )}

              {/* Totali */}
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell colSpan={2} sx={{ py: 0.5 }} />
              </TableRow>
              <RowCost label="Totale spese accessorie" value={bd.totaleSpeseAccessorie} bold />
              <RowCost
                label="Totale esborso (prezzo + spese)"
                value={bd.totaleAcquistoSenzaMutuo}
                bold
                ok
              />
              {hasMutuo && (
                <RowCost
                  label="Anticipo necessario (prezzo − mutuo + spese)"
                  value={bd.anticipoNecessario}
                  bold
                  warn={bd.anticipoNecessario < 0}
                />
              )}
              {hasMutuo && (
                <RowCost
                  label="Costo totale con mutuo (prezzo + spese + interessi)"
                  value={bd.totaleConMutuo}
                  sub={`di cui interessi: ${eur(bd.mutuoTotaleInteressi)}`}
                  bold
                />
              )}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* ── Mutuo e sostenibilità ── */}
      {hasMutuo && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={700}>Mutuo e sostenibilità</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Importo mutuo</Typography>
                <Typography variant="h6" fontWeight={700}>{eur(bd.mutuoImporto)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Rata mensile</Typography>
                <Typography variant="h6" fontWeight={700} color={bd.mutuoSostenibile ? 'success.dark' : 'error'}>
                  {eur(bd.mutuoRataMensile)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Totale da rimborsare</Typography>
                <Typography fontWeight={600}>{eur(bd.mutuoTotaleDaRimborsare)}</Typography>
                <Typography variant="caption" color="text.secondary">interessi: {eur(bd.mutuoTotaleInteressi)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">LTV (mutuo/prezzo)</Typography>
                <Typography fontWeight={600}>
                  {bd.prezzoTotale > 0 ? pct(bd.mutuoImporto / bd.prezzoTotale) : '—'}
                </Typography>
              </Grid>
            </Grid>

            {bd.redditoMensileComune > 0 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    Rata {eur(bd.mutuoRataMensile)}/mese vs reddito {eur(bd.redditoMensileComune)}/mese
                  </Typography>
                  <Typography variant="body2" fontWeight={700}
                    color={bd.mutuoSostenibile ? 'success.dark' : 'error'}>
                    {feasibilityPct !== null ? pct(feasibilityPct) : ''}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (feasibilityPct ?? 0) * 100)}
                  color={bd.mutuoSostenibile ? 'success' : 'error'}
                  sx={{ height: 10, borderRadius: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">0%</Typography>
                  <Typography variant="caption" color="success.dark">33% — soglia bancaria</Typography>
                  <Typography variant="caption" color="text.secondary">100%</Typography>
                </Box>
                {bd.mutuoSostenibile ? (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <CheckCircleIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                    Rata sostenibile: {pct(feasibilityPct!)} del reddito (soglia: 33%)
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <WarningIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                    Rata troppo alta: {pct(feasibilityPct!)} del reddito — soglia bancaria superata (33%)
                  </Alert>
                )}
              </Box>
            )}
            {bd.redditoMensileComune === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nessuna persona associata al contratto: aggiungi persone nella tab "Persone" e collegale al contratto per la verifica di sostenibilità.
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* ── Costi ricorrenti ── */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={700}>Costi ricorrenti mensili stimati</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {hasMutuo && (
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Rata mutuo</Typography>
                <Typography fontWeight={600}>{eur(bd.mutuoRataMensile)}</Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">IMU mensile (rata annua/12)</Typography>
              <Typography fontWeight={600}>{eur(bd.imuAnnuaTotale / 12)}</Typography>
              <Typography variant="caption" color="text.secondary">{eur(bd.imuAnnuaTotale)}/anno</Typography>
            </Grid>
            {bd.utenze.enabled !== false && (
              <>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Elettricità</Typography>
                  <Typography>{eur(bd.utenze.elettricitaMensile)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Acqua</Typography>
                  <Typography>{eur(bd.utenze.acquaMensile)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Gas</Typography>
                  <Typography>{eur(bd.utenze.gasMensile)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Internet</Typography>
                  <Typography>{eur(bd.utenze.internetMensile)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Condominio</Typography>
                  <Typography>{eur(bd.utenze.condominieMensile)}</Typography>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography fontWeight={700}>Totale mensile abitare</Typography>
                <Typography fontWeight={700} color="primary">{eur(bd.totaleMensileAbitare)}</Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// ── ContractDialog ─────────────────────────────────────────────────────────────

interface ContractDialogProps {
  open: boolean;
  initial?: Contract;
  onClose: () => void;
  onSave: (data: Omit<Contract, 'id'>) => void;
}

function ContractDialog({ open, initial, onClose, onSave }: ContractDialogProps) {
  const { project } = useProject();
  const [form, setForm] = useState<Omit<Contract, 'id'>>(
    initial ?? emptyContract(),
  );
  const [tab, setTab] = useState(0);

  // Reset on open
  const handleOpen = useCallback(() => {
    setForm(initial ?? emptyContract());
    setTab(0);
  }, [initial]);

  // biome-ignore lint: needed for dialog open sync
  useMemo(() => { if (open) handleOpen(); }, [open]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const setNotaio = <K extends keyof CostiNotaio>(key: K, value: CostiNotaio[K]) =>
    setForm(f => ({ ...f, costiNotaio: { ...f.costiNotaio, [key]: value } }));

  const setMutuo = <K extends keyof MutuoConfig>(key: K, value: MutuoConfig[K]) =>
    setForm(f => ({ ...f, mutuo: { ...f.mutuo, [key]: value } }));

  const setUtenza = <K extends keyof UtenzaConfig>(key: K, value: UtenzaConfig[K]) =>
    setForm(f => ({ ...f, utenza: { ...f.utenza, [key]: value } }));

  // Scenario entries helpers
  function toggleScenario(sid: string, checked: boolean) {
    if (checked) {
      set('scenarioEntries', [
        ...form.scenarioEntries,
        { scenarioId: sid, prezzoAcquisto: 0, isPrimaCasa: true, venditore: 'privato' },
      ]);
    } else {
      set('scenarioEntries', form.scenarioEntries.filter(e => e.scenarioId !== sid));
    }
  }

  function updateEntry(sid: string, updates: Partial<ContractScenarioEntry>) {
    set('scenarioEntries', form.scenarioEntries.map(e =>
      e.scenarioId === sid ? { ...e, ...updates } : e,
    ));
  }

  // Banca costi helpers
  function addBancaCosto() {
    set('bancaCosti', [
      ...form.bancaCosti,
      { id: uuidv4(), label: '', importo: 0, hasIva: false },
    ]);
  }
  function updateBancaCosto(id: string, updates: Partial<CostoBancario>) {
    set('bancaCosti', form.bancaCosti.map(c => c.id === id ? { ...c, ...updates } : c));
  }
  function deleteBancaCosto(id: string) {
    set('bancaCosti', form.bancaCosti.filter(c => c.id !== id));
  }

  function handleSave() {
    if (!form.name.trim() || form.scenarioEntries.length === 0) return;
    onSave(form);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon color="primary" />
        {initial ? 'Modifica contratto' : 'Nuovo contratto di acquisto'}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Immobili" />
            <Tab label="Agenzia &amp; Notaio" />
            <Tab label="Mutuo" />
            <Tab label="Banca &amp; Extra" />
            <Tab label="Utenze" />
          </Tabs>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>

        {/* ── Tab 0: Immobili ── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome contratto"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              error={!form.name.trim()}
              helperText={!form.name.trim() ? 'Campo obbligatorio' : ''}
              fullWidth
              autoFocus
            />

            <Typography variant="subtitle2" color="text.secondary">
              Seleziona gli scenari inclusi in questo contratto:
            </Typography>

            {project.scenarios.length === 0 && (
              <Alert severity="warning">Nessuno scenario disponibile. Crea prima gli scenari nella tab "Scenari".</Alert>
            )}

            {project.scenarios.map(s => {
              const entry = form.scenarioEntries.find(e => e.scenarioId === s.id);
              const isSelected = !!entry;
              return (
                <Paper key={s.id} variant="outlined" sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isSelected}
                        onChange={e => toggleScenario(s.id, e.target.checked)}
                      />
                    }
                    label={<Typography fontWeight={600}>{s.name}</Typography>}
                  />
                  {isSelected && entry && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <TextField
                        label="Prezzo di acquisto (€)"
                        type="number"
                        value={entry.prezzoAcquisto || ''}
                        onChange={e => updateEntry(s.id, { prezzoAcquisto: parseFloat(e.target.value) || 0 })}
                        size="small"
                        sx={{ width: 200 }}
                        inputProps={{ min: 0, step: 1000 }}
                      />
                      <TextField
                        select
                        label="Tipo venditore"
                        value={entry.venditore}
                        onChange={e => updateEntry(s.id, { venditore: e.target.value as VenditoreTipo })}
                        size="small"
                        sx={{ minWidth: 260 }}
                      >
                        {(Object.keys(VENDITORE_TIPO_LABELS) as VenditoreTipo[]).map(k => (
                          <MenuItem key={k} value={k}>{VENDITORE_TIPO_LABELS[k]}</MenuItem>
                        ))}
                      </TextField>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={entry.isPrimaCasa}
                            onChange={e => updateEntry(s.id, { isPrimaCasa: e.target.checked })}
                            size="small"
                          />
                        }
                        label="Prima casa"
                      />
                    </Box>
                  )}
                </Paper>
              );
            })}

            <Divider />
            <Typography variant="subtitle2">Persone / acquirenti associati</Typography>
            {project.persons.length === 0 && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Aggiungi persone nella tab "Persone" per la verifica di sostenibilità mutuo.
              </Alert>
            )}
            {project.persons.map(p => (
              <FormControlLabel
                key={p.id}
                control={
                  <Switch
                    checked={form.personIds.includes(p.id)}
                    onChange={e => set('personIds',
                      e.target.checked
                        ? [...form.personIds, p.id]
                        : form.personIds.filter(id => id !== p.id),
                    )}
                    size="small"
                  />
                }
                label={`${p.name} — ${p.redditoNettoMensile.toLocaleString('it-IT')} €/mese netti`}
              />
            ))}
          </Box>
        )}

        {/* ── Tab 1: Agenzia & Notaio ── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={<Switch checked={form.hasAgenzia} onChange={e => set('hasAgenzia', e.target.checked)} />}
                label={<Typography fontWeight={600}>Mediazione immobiliare (agenzia)</Typography>}
              />
              {form.hasAgenzia && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Percentuale provvigione"
                    type="number"
                    value={(form.agenziaPercent * 100).toFixed(2)}
                    onChange={e => set('agenziaPercent', (parseFloat(e.target.value) || 0) / 100)}
                    size="small"
                    sx={{ width: 180 }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                  <TextField
                    label="Minimo provvigione (€)"
                    type="number"
                    value={form.agenziaMinimo || ''}
                    onChange={e => set('agenziaMinimo', parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ width: 180 }}
                    helperText="All'imponibile si aggiunge IVA 22%"
                  />
                </Box>
              )}
            </Paper>

            <Typography variant="subtitle2" fontWeight={700}>Notaio — Atto di compravendita (rogito)</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Onorario notaio (€ imponibile)"
                type="number"
                value={form.costiNotaio.rogitoOnorario || ''}
                onChange={e => setNotaio('rogitoOnorario', parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 220 }}
              />
              <FormControlLabel
                control={<Switch checked={form.costiNotaio.rogitoIva} onChange={e => setNotaio('rogitoIva', e.target.checked)} />}
                label="+ IVA 22%"
              />
              <TextField
                label="Spese extra notaio (visure, bolli…)"
                type="number"
                value={form.costiNotaio.rogitoSpeseExtra || ''}
                onChange={e => setNotaio('rogitoSpeseExtra', parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 220 }}
                helperText="Netto, senza IVA"
              />
            </Box>

            <Divider />
            <Typography variant="subtitle2" fontWeight={700}>Notaio — Atto di mutuo</Typography>
            <Typography variant="caption" color="text.secondary">
              Se è previsto un mutuo, il notaio redige anche l'atto di mutuo (onorario separato).
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Onorario atto mutuo (€ imponibile)"
                type="number"
                value={form.costiNotaio.mutuoOnorario || ''}
                onChange={e => setNotaio('mutuoOnorario', parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 220 }}
              />
              <FormControlLabel
                control={<Switch checked={form.costiNotaio.mutuoIva} onChange={e => setNotaio('mutuoIva', e.target.checked)} />}
                label="+ IVA 22%"
              />
              <TextField
                label="Spese extra atto mutuo"
                type="number"
                value={form.costiNotaio.mutuoSpeseExtra || ''}
                onChange={e => setNotaio('mutuoSpeseExtra', parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 220 }}
              />
            </Box>

            <Divider />
            <TextField
              label="Registrazione compromesso (€)"
              type="number"
              value={form.compromessoRegistrazione || ''}
              onChange={e => set('compromessoRegistrazione', parseFloat(e.target.value) || 0)}
              size="small"
              sx={{ maxWidth: 220 }}
              helperText="Imposta di registro del preliminare (tipicamente 200–300 €)"
            />
          </Box>
        )}

        {/* ── Tab 2: Mutuo ── */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={form.mutuo.enabled} onChange={e => setMutuo('enabled', e.target.checked)} />}
              label={<Typography fontWeight={600}>Acquisto con mutuo bancario</Typography>}
            />

            {form.mutuo.enabled && (
              <>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Importo mutuo (€)"
                      type="number"
                      fullWidth
                      value={form.mutuo.importo || ''}
                      onChange={e => setMutuo('importo', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, step: 5000 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Tasso fisso annuo"
                      type="number"
                      fullWidth
                      value={(form.mutuo.tassoAnnuo * 100).toFixed(3)}
                      onChange={e => setMutuo('tassoAnnuo', (parseFloat(e.target.value) || 0) / 100)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ step: 0.05 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Durata (anni)"
                      type="number"
                      fullWidth
                      value={form.mutuo.durataAnni || ''}
                      onChange={e => setMutuo('durataAnni', parseInt(e.target.value) || 25)}
                      inputProps={{ min: 5, max: 40, step: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.mutuo.isPrimaCasa}
                          onChange={e => setMutuo('isPrimaCasa', e.target.checked)}
                        />
                      }
                      label="Prima casa (imposta sostitutiva 0,25% vs 2%)"
                    />
                  </Grid>
                </Grid>
                {form.mutuo.importo > 0 && (
                  <Alert severity="info">
                    Imposta sostitutiva: <strong>
                      {eur(form.mutuo.importo * (form.mutuo.isPrimaCasa ? 0.0025 : 0.02))}
                    </strong>
                    {' '}({form.mutuo.isPrimaCasa ? '0,25%' : '2%'})
                  </Alert>
                )}
              </>
            )}
          </Box>
        )}

        {/* ── Tab 3: Banca & Extra ── */}
        {tab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Perizia immobile</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Costo perizia (€)"
                type="number"
                value={form.perizia || ''}
                onChange={e => set('perizia', parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 180 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.peruziaHasIva}
                    onChange={e => set('peruziaHasIva', e.target.checked)}
                  />
                }
                label="+ IVA 22%"
              />
            </Box>

            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>Altri costi bancari</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addBancaCosto}>Aggiungi voce</Button>
            </Box>
            {form.bancaCosti.map(c => (
              <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  label="Descrizione"
                  value={c.label}
                  onChange={e => updateBancaCosto(c.id, { label: e.target.value })}
                  size="small"
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <TextField
                  label="Importo (€)"
                  type="number"
                  value={c.importo || ''}
                  onChange={e => updateBancaCosto(c.id, { importo: parseFloat(e.target.value) || 0 })}
                  size="small"
                  sx={{ width: 140 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={c.hasIva}
                      onChange={e => updateBancaCosto(c.id, { hasIva: e.target.checked })}
                      size="small"
                    />
                  }
                  label="IVA"
                />
                <IconButton size="small" color="error" onClick={() => deleteBancaCosto(c.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* ── Tab 4: Utenze ── */}
        {tab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.utenza.enabled}
                  onChange={e => setUtenza('enabled', e.target.checked)}
                />
              }
              label={<Typography fontWeight={600}>Stima costi utenze mensili</Typography>}
            />
            {form.utenza.enabled && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Occupanti"
                    type="number"
                    fullWidth
                    value={form.utenza.numOccupanti}
                    onChange={e => setUtenza('numOccupanti', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Elettricità (kWh/anno)"
                    type="number"
                    fullWidth
                    value={form.utenza.elettricitaKwhAnno}
                    onChange={e => setUtenza('elettricitaKwhAnno', parseFloat(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Prezzo energia (€/kWh)"
                    type="number"
                    fullWidth
                    value={form.utenza.elettricitaPrezzioKwh}
                    onChange={e => setUtenza('elettricitaPrezzioKwh', parseFloat(e.target.value) || 0)}
                    inputProps={{ step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Acqua (€/anno)"
                    type="number"
                    fullWidth
                    value={form.utenza.acquaEuroAnno}
                    onChange={e => setUtenza('acquaEuroAnno', parseFloat(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Gas (€/anno)"
                    type="number"
                    fullWidth
                    value={form.utenza.gasEuroAnno}
                    onChange={e => setUtenza('gasEuroAnno', parseFloat(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Internet (€/anno)"
                    type="number"
                    fullWidth
                    value={form.utenza.internetEuroAnno}
                    onChange={e => setUtenza('internetEuroAnno', parseFloat(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Condominio (€/m²/anno)"
                    type="number"
                    fullWidth
                    value={form.utenza.condominieMqAnno}
                    onChange={e => setUtenza('condominieMqAnno', parseFloat(e.target.value) || 0)}
                    helperText="Applicato sulla superficie totale degli immobili"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!form.name.trim() || form.scenarioEntries.length === 0}
        >
          Salva contratto
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── ContractCard ──────────────────────────────────────────────────────────────

function ContractCard({ contract, onEdit, onDelete }: {
  contract: Contract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { project } = useProject();

  // Build scenario results to compute rendite and IMU
  const scenarioResults = useMemo<Record<string, ScenarioResult>>(() => {
    const out: Record<string, ScenarioResult> = {};
    for (const s of project.scenarios) {
      const dwUnit = (s.isFusion ?? false)
        ? mergeUnits(project.units.filter(u => (s.fusionUnitIds ?? []).includes(u.id)))
        : project.units.find(u => u.id === s.dwellingUnitId);
      const pertUnit = (!s.isFusion && s.enablePertinenza)
        ? project.units.find(u => u.id === s.pertinenzaUnitId)
        : undefined;
      out[s.id] = runScenario({
        scenarioId: s.id,
        scenarioName: s.name,
        dwellingUnit: dwUnit,
        dwellingCategory: s.dwellingCategory,
        dwellingClass: s.dwellingClass,
        pertinenzaUnit: pertUnit,
        pertinenzaCategory: s.pertinenzaCategory,
        pertinenzaClass: s.pertinenzaClass,
        enablePertinenza: s.enablePertinenza,
        tariffs: project.tariffs,
        ruleSet: project.ruleSet,
        enableImu: s.enableImu,
        imuAliquota: s.imuAliquota,
        imuIsMainHome: s.imuIsMainHome,
        imuDetrazione: s.imuDetrazione,
        luxuryCheckMode: s.luxuryCheckMode,
        dataAtto: s.dataAtto,
      });
    }
    return out;
  }, [project]);

  const breakdown = useMemo<ContractBreakdown>(() => {
    const rendite: Record<string, number> = {};
    const imuEst: Record<string, number> = {};
    const imuSecond: Record<string, number> = {};
    const mq: Record<string, number> = {};
    for (const [sid, r] of Object.entries(scenarioResults)) {
      rendite[sid] = r.renditaTotale;
      imuEst[sid] = r.imuEstimate ?? 0;
      imuSecond[sid] = r.imuIfSecondHome ?? 0;
      mq[sid] = (r.dwelling?.trace?.totalMq ?? 0) + (r.pertinenza?.trace?.totalMq ?? 0);
    }
    return calcolaContratto({
      contract,
      scenarios: project.scenarios,
      scenarioRendite: rendite,
      scenarioImuEstimates: imuEst,
      scenarioImuSecondHome: imuSecond,
      scenarioTotalMq: mq,
      persons: project.persons ?? [],
    });
  }, [contract, project, scenarioResults]);

  const scenarioNames = contract.scenarioEntries
    .map(e => project.scenarios.find(s => s.id === e.scenarioId)?.name ?? e.scenarioId)
    .join(', ');

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6">{contract.name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {contract.mutuo.enabled && <Chip icon={<AccountBalanceIcon />} label="Mutuo" size="small" color="info" />}
            {breakdown.mutuoImporto > 0 && (
              <Chip
                label={breakdown.mutuoSostenibile ? 'Sostenibile' : 'Rata alta'}
                size="small"
                color={breakdown.mutuoSostenibile ? 'success' : 'error'}
              />
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {scenarioNames}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Prezzo acquisto</Typography>
            <Typography fontWeight={700} color="primary">{eur(breakdown.prezzoTotale)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Spese accessorie</Typography>
            <Typography fontWeight={600}>{eur(breakdown.totaleSpeseAccessorie)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Totale esborso</Typography>
            <Typography fontWeight={700}>{eur(breakdown.totaleAcquistoSenzaMutuo)}</Typography>
          </Grid>
          {breakdown.mutuoImporto > 0 && (
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Rata mensile</Typography>
              <Typography fontWeight={700} color={breakdown.mutuoSostenibile ? 'success.dark' : 'error'}>
                {eur(breakdown.mutuoRataMensile)}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Accordion sx={{ mt: 1.5 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalculateIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={600}>Dettaglio completo</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <ContractBreakdownView bd={breakdown} />
          </AccordionDetails>
        </Accordion>

        {contract.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            {contract.notes}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="Modifica">
          <IconButton size="small" onClick={onEdit} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Elimina">
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

// ── ContrattoTab ──────────────────────────────────────────────────────────────

export default function ContrattoTab() {
  const { project, addContract, updateContract, deleteContract } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);

  const contracts = project.contracts ?? [];

  return (
    <Box maxWidth={1000} mx="auto">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Contratti di acquisto</Typography>
          <Typography variant="body2" color="text.secondary">
            Raggruppa uno o più scenari, calcola tutte le spese e verifica la sostenibilità del mutuo
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditContract(null); setDialogOpen(true); }}
          disabled={project.scenarios.length === 0}
        >
          Nuovo contratto
        </Button>
      </Box>

      {project.scenarios.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Crea prima almeno uno <strong>scenario</strong> nella tab Scenari, poi torna qui per pianificare l'acquisto.
        </Alert>
      )}

      {contracts.length === 0 && project.scenarios.length > 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <DescriptionIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>Nessun contratto ancora</Typography>
          <Typography variant="body2" mb={3}>
            Crea un contratto per calcolare tutte le spese di acquisto: imposte,
            agenzia, notaio, mutuo, banca, utenze e sostenibilità.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Crea il primo contratto
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {contracts.map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onEdit={() => { setEditContract(contract); setDialogOpen(true); }}
              onDelete={() => {
                if (window.confirm(`Eliminare il contratto "${contract.name}"?`)) {
                  deleteContract(contract.id);
                }
              }}
            />
          ))}
        </Box>
      )}

      <ContractDialog
        open={dialogOpen && !editContract}
        onClose={() => setDialogOpen(false)}
        onSave={data => {
          addContract(data);
          setDialogOpen(false);
        }}
      />

      {editContract && (
        <ContractDialog
          open={dialogOpen}
          initial={editContract}
          onClose={() => { setDialogOpen(false); setEditContract(null); }}
          onSave={data => {
            updateContract(editContract.id, data);
            setDialogOpen(false);
            setEditContract(null);
          }}
        />
      )}
    </Box>
  );
}

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import { useProject } from '../context/ProjectContext';
import { runScenario, mergeUnits, ScenarioResult, RenditaResult, LuxuryAnalysis } from '../engine/calculator';
import { ROOM_TYPE_LABELS, RoomType, LUXURY_CHECK_MODE_LABELS } from '../models/types';

// ── Currency formatter ────────────────────────────────────────────────────────

function eur(v: number | undefined) {
  if (v === undefined) return '—';
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function num(v: number, decimals = 2) {
  return v.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── AuditTrail for one unit result ────────────────────────────────────────────

function AuditTrailPanel({ result }: { result: RenditaResult }) {
  const trace = result.trace;

  if (result.consistenzaUnit === 'mq') {
    return (
      <Box>
        <Typography variant="body2">
          Consistenza m²: <strong>{num(trace.totalMq)} m²</strong>
        </Typography>
        <Typography variant="body2">
          Tariffa: <strong>{eur(result.tariffa)} /m²</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Rendita = {num(trace.totalMq)} × {eur(result.tariffa)} = {eur(result.rendita)}</strong>
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {trace.floors.map(floor => (
        <Box key={floor.floorId} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {floor.floorName} — {num(floor.floorVaniRaw)} vani grezzi
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vano</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">m²</TableCell>
                <TableCell align="right">Coeff.</TableCell>
                <TableCell align="right">Contributo (vani)</TableCell>
                <TableCell>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floor.rooms.map(room => (
                <TableRow key={room.roomId} sx={{ opacity: room.baseCoeff === 0 ? 0.5 : 1 }}>
                  <TableCell>{room.roomName}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROOM_TYPE_LABELS[room.roomType as RoomType]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{num(room.areaMq)}</TableCell>
                  <TableCell align="right">
                    {room.baseCoeff === 0 ? '—' : num(room.baseCoeff, 4)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{room.baseCoeff === 0 ? '—' : num(room.vaniEquivalent, 4)}</strong>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {room.ragguaglioNote}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ))}

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2">
          Vani grezzi (Σ): <strong>{num(trace.vaniRaw, 4)}</strong>
        </Typography>
        {trace.dipendenzaAdj !== 0 && (
          <Typography variant="body2">
            + Incremento dipendenze: <strong>{num(trace.dipendenzaAdj, 4)}</strong>
          </Typography>
        )}
        <Typography variant="body2">
          Vani rettificati: <strong>{num(trace.vaniAdjusted, 4)}</strong>
        </Typography>
        <Typography variant="body2">
          Arrotondamento al ½ vano: <strong>{num(trace.vaniRounded, 1)} vani</strong>
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        <Typography variant="body2">
          Tariffa d'estimo: <strong>{result.tariffaLabel}</strong>
        </Typography>
        <Typography variant="body1" fontWeight={700} color="primary">
          Rendita = {num(trace.vaniRounded, 1)} × {eur(result.tariffa)} = {eur(result.rendita)}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Luxury criteria panel ─────────────────────────────────────────────────────

function LuxuryCriteriaPanel({ analysis }: { analysis: LuxuryAnalysis }) {
  const {
    mode, dataAtto, catastaleIsLuxury, dm1969Applied,
    surfaceMethod, dmSurfaceMq, ambiguousRoomWarnings,
    isLuxury, absoluteTriggered, tableTriggered, art8Triggered,
  } = analysis;
  const modeLabel = LUXURY_CHECK_MODE_LABELS[mode];

  return (
    <Accordion sx={{ mt: 1, border: 1, borderColor: 'warning.light' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <WarningAmberIcon color={isLuxury ? 'warning' : 'disabled'} fontSize="small" />
          <Typography variant="subtitle2">Analisi Lusso</Typography>
          <Chip label={modeLabel} size="small" variant="outlined" />
          {!dm1969Applied && catastaleIsLuxury != null && (
            <Chip
              label={catastaleIsLuxury ? 'Categoria: LUSSO (A/1, A/8 o A/9)' : 'Categoria: non è A/1/A/8/A/9'}
              size="small"
              color={catastaleIsLuxury ? 'warning' : 'success'}
            />
          )}
          {dm1969Applied && absoluteTriggered > 0 && (
            <Chip label={`${absoluteTriggered} criterio/i assoluto/i`} size="small" color="warning" />
          )}
          {dm1969Applied && art8Triggered && (
            <Chip label={`Art.8: ${tableTriggered}/14 caratteristiche`} size="small" color="warning" />
          )}
          {dm1969Applied && !isLuxury && tableTriggered > 0 && !art8Triggered && (
            <Chip label={`${tableTriggered}/14 caratteristiche (soglia: >4)`} size="small" color="default" />
          )}
          {dm1969Applied && !isLuxury && absoluteTriggered === 0 && tableTriggered === 0 && (
            <Chip label="Nessun criterio DM 1969" size="small" color="default" />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1.5 }}>
        {/* Regime info box */}
        <Box sx={{ mb: 1.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Regime: <strong>{modeLabel}</strong>
            {dataAtto && ` — Atto: ${dataAtto}`}
          </Typography>
          {!dm1969Applied && (
            <Typography variant="caption" color="text.secondary" display="block">
              {mode === 'primaCasaRegistro'
                ? 'D.Lgs. 23/2011 art. 10 – dal 1/1/2014 conta la categoria catastale (non il D.M. 1969)'
                : 'D.Lgs. 175/2014 art. 33 + circ. AdE 31/E 2014 – dal 13/12/2014 conta la categoria catastale'}
            </Typography>
          )}
          {dm1969Applied && (
            <Typography variant="caption" color="text.secondary" display="block">
              Superficie DM 1969:{' '}
              <strong>{dmSurfaceMq.toFixed(1)} m²</strong>{' '}
              — Metodo:{' '}
              {surfaceMethod === 'globale' ? 'superficie globale atto' : 'somma vani (Main + Accessori diretti)'}
            </Typography>
          )}
        </Box>

        {/* Catastale result (when DM 1969 not applied) */}
        {!dm1969Applied && (
          <Box sx={{ p: 1, bgcolor: isLuxury ? 'warning.light' : 'success.light', borderRadius: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight={700} color={isLuxury ? 'warning.dark' : 'success.dark'}>
              {isLuxury
                ? '⚠ Categoria A/1, A/8 o A/9: abitazione di lusso ai fini del regime selezionato'
                : '✓ Categoria non compresa tra A/1, A/8, A/9: non di lusso ai fini del regime selezionato'}
            </Typography>
          </Box>
        )}

        {/* Ambiguous room warnings */}
        {ambiguousRoomWarnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
            <Typography variant="caption" fontWeight={700} display="block">
              Ambienti con indicatori di “utilizzabilità” (Cass. ord. 2503/2025):
            </Typography>
            {ambiguousRoomWarnings.map((w, i) => (
              <Typography key={i} variant="caption" display="block">• {w}</Typography>
            ))}
            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
              Questi ambienti sono attualmente esclusi dalla superficie utile. Valuta se includerli come “vani principali” o “accessori diretti”.
            </Typography>
          </Alert>
        )}

        {/* DM 1969 Section A + B — only when DM 1969 engine was applied */}
        {dm1969Applied && (
          <>
            {/* Section A */}
            <Typography variant="caption" color="warning.dark" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
              A · Criteri assoluti (art. 1–7) — basta UNO
            </Typography>
            <Table size="small" sx={{ mb: 1.5 }}>
              <TableBody>
                {analysis.absoluteCriteria.map(c => (
                  <TableRow key={c.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ width: 28, pr: 0 }}>
                      {c.triggered
                        ? <WarningAmberIcon color="warning" fontSize="small" />
                        : <CheckCircleIcon color="disabled" fontSize="small" />}
                    </TableCell>
                    <TableCell sx={{ width: 64, color: 'text.secondary' }}>
                      <Typography variant="caption">art.{c.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={c.triggered ? 700 : 400} color={c.triggered ? 'warning.dark' : 'text.primary'}>
                        {c.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{c.detail}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Section B */}
            <Typography
              variant="caption"
              color={art8Triggered ? 'warning.dark' : 'text.secondary'}
              fontWeight={700}
              sx={{ display: 'block', mb: 0.5 }}
            >
              B · Caratteristiche tabella (art. 8) — attive {tableTriggered}/14
              {art8Triggered ? ' → PIÙ DI 4: LUSSO' : tableTriggered > 0 ? ' (≤4: non sufficiente)' : ''}
            </Typography>
            <Table size="small">
              <TableBody>
                {analysis.tableCriteria.map(c => (
                  <TableRow key={c.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ width: 28, pr: 0 }}>
                      {c.triggered
                        ? <WarningAmberIcon color="warning" fontSize="small" />
                        : <CheckCircleIcon color="disabled" fontSize="small" />}
                    </TableCell>
                    <TableCell sx={{ width: 64, color: 'text.secondary' }}>
                      <Typography variant="caption">tab.{c.id})</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={c.triggered ? 700 : 400} color={c.triggered ? 'warning.dark' : 'text.primary'}>
                        {c.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{c.detail}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Scenario result card ──────────────────────────────────────────────────────

function ScenarioCard({ result, isFusion, fusionUnitNames }: {
  result: ScenarioResult;
  isFusion?: boolean;
  fusionUnitNames?: string[];
}) {
  const { flags, warnings } = result;

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          {result.scenarioName}
        </Typography>
        {isFusion && (
          <Tooltip title={`Fusione di: ${(fusionUnitNames ?? []).join(', ')}`}>
            <Chip icon={<CallMergeIcon />} label="Fusione" color="warning" size="small" />
          </Tooltip>
        )}
        {flags.luxuryAnalysis.isLuxury && (
          <Tooltip title="Possibile abitazione di lusso (DM 2/8/1969) — espandi per dettagli">
            <Chip icon={<WarningAmberIcon />} label="Lusso" color="warning" size="small" />
          </Tooltip>
        )}
        {flags.imuAtRisk && (
          <Tooltip title="Categoria IMU-assoggettata anche come abitazione principale">
            <Chip icon={<WarningAmberIcon />} label="IMU a rischio" color="warning" size="small" />
          </Tooltip>
        )}
        {flags.pertinenzaAgevolabile && (
          <Tooltip title="Pertinenza agevolabile per IMU abitazione principale">
            <Chip icon={<CheckCircleIcon />} label="Pertinenza OK" color="success" size="small" />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Warnings */}
        {warnings.map((w, i) => (
          <Alert key={i} severity="warning" sx={{ mb: 1 }} icon={<WarningAmberIcon />}>
            {w}
          </Alert>
        ))}

        {/* Summary numbers */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {result.dwelling && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">RC Abitazione</Typography>
                <Typography variant="h6" color="primary">
                  {eur(result.dwelling.rendita)}
                </Typography>
                <Typography variant="caption">
                  {num(result.dwelling.consistenza, 1)} vani × {eur(result.dwelling.tariffa)}/vano
                </Typography>
              </Paper>
            </Grid>
          )}
          {result.pertinenza && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">RC Pertinenza</Typography>
                <Typography variant="h6" color="secondary">
                  {eur(result.pertinenza.rendita)}
                </Typography>
                <Typography variant="caption">
                  {num(result.pertinenza.consistenza)} m² × {eur(result.pertinenza.tariffa)}/m²
                </Typography>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8 }}>RC Totale</Typography>
              <Typography variant="h6">{eur(result.renditaTotale)}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>rendita annua</Typography>
            </Paper>
          </Grid>
          {result.imuEstimate !== undefined && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  bgcolor: result.flags.imuExempt ? 'success.light' : 'warning.light',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  IMU stimata{result.flags.imuIsMainHome ? ' — prima casa' : ' — seconda casa'}
                </Typography>
                <Typography variant="h6" color={result.flags.imuExempt ? 'success.dark' : 'warning.dark'}>
                  {result.flags.imuExempt ? 'ESENTE' : eur(result.imuEstimate)}
                </Typography>
                {result.imuBase !== undefined && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Base imponibile: {eur(result.imuBase)}
                  </Typography>
                )}
                {result.flags.imuExempt && result.imuIfSecondHome != null && result.imuIfSecondHome > 0 && (
                  <Tooltip title="Valore calcolato con stessa aliquota, senza detrazione e senza esonero prima casa">
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                      sx={{ mt: 0.5, borderTop: '1px dashed', borderColor: 'divider', pt: 0.5, cursor: 'help' }}
                    >
                      Se seconda casa: ~{eur(result.imuIfSecondHome)}
                    </Typography>
                  </Tooltip>
                )}
                {!result.flags.imuExempt && result.flags.imuIsMainHome && (
                  <Typography variant="caption" display="block" color="warning.dark" sx={{ mt: 0.5 }}>
                    Categoria di lusso: IMU dovuta anche come prima casa
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Audit trail */}
        {result.dwelling && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Dettaglio Calcolo — {result.dwelling.unitName}
              </Typography>
              <Chip
                label={`${num(result.dwelling.consistenza, 1)} vani`}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AuditTrailPanel result={result.dwelling} />
            </AccordionDetails>
          </Accordion>
        )}

        {result.pertinenza && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Dettaglio Calcolo — {result.pertinenza.unitName}
              </Typography>
              <Chip
                label={`${num(result.pertinenza.consistenza)} m²`}
                size="small"
                color="secondary"
                sx={{ ml: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AuditTrailPanel result={result.pertinenza} />
            </AccordionDetails>
          </Accordion>
        )}

        {/* Luxury criteria analysis */}
        {result.dwelling && (
          <LuxuryCriteriaPanel analysis={flags.luxuryAnalysis} />
        )}
      </Box>
    </Paper>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

function ComparisonTable({ results }: { results: ScenarioResult[] }) {
  if (results.length === 0) return null;
  const maxRendita = Math.max(...results.map(r => r.renditaTotale), 1);

  return (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
        <Typography variant="h6">Confronto Scenari</Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Scenario</TableCell>
              <TableCell align="right">RC Abitazione</TableCell>
              <TableCell align="right">RC Pertinenza</TableCell>
              <TableCell align="right">RC Totale</TableCell>
              <TableCell align="right">IMU Stimata</TableCell>
              <TableCell>Flag</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.scenarioId} hover>
                <TableCell>
                  <Typography fontWeight={600}>{r.scenarioName}</Typography>
                </TableCell>
                <TableCell align="right">{eur(r.dwelling?.rendita)}</TableCell>
                <TableCell align="right">{eur(r.pertinenza?.rendita)}</TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography fontWeight={700} color="primary">
                      {eur(r.renditaTotale)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(r.renditaTotale / maxRendita) * 100}
                      sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {r.imuEstimate !== undefined
                    ? r.flags.imuExempt
                      ? (
                        <Tooltip title={r.imuIfSecondHome ? `Come seconda casa: ~${eur(r.imuIfSecondHome)}` : 'Prima casa non di lusso'}>
                          <Chip label="ESENTE" size="small" color="success" sx={{ cursor: 'help' }} />
                        </Tooltip>
                      )
                      : eur(r.imuEstimate)
                    : '—'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {r.flags.luxuryAnalysis.isLuxury && (
                      <Chip label="Lusso" size="small" color="warning" />
                    )}
                    {r.flags.imuAtRisk && (
                      <Chip label="IMU" size="small" color="error" />
                    )}
                    {r.warnings.length > 0 && (
                      <Tooltip title={r.warnings.join('\n')}>
                        <Chip
                          icon={<WarningAmberIcon />}
                          label={`${r.warnings.length} avvisi`}
                          size="small"
                          color="warning"
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ── RisultatiTab ──────────────────────────────────────────────────────────────

export default function RisultatiTab() {
  const { project } = useProject();

  const results = useMemo<ScenarioResult[]>(() => {
    return project.scenarios.map(s => {
      const dwellingUnit = (s.isFusion ?? false)
        ? mergeUnits(project.units.filter(u => (s.fusionUnitIds ?? []).includes(u.id)))
        : project.units.find(u => u.id === s.dwellingUnitId);
      const pertinenzaUnit = (!s.isFusion && s.enablePertinenza)
        ? project.units.find(u => u.id === s.pertinenzaUnitId)
        : undefined;

      return runScenario({
        scenarioId: s.id,
        scenarioName: s.name,
        dwellingUnit,
        dwellingCategory: s.dwellingCategory,
        dwellingClass: s.dwellingClass,
        pertinenzaUnit,
        pertinenzaCategory: s.pertinenzaCategory,
        pertinenzaClass: s.pertinenzaClass,
        enablePertinenza: s.enablePertinenza,
        tariffs: project.tariffs,
        ruleSet: project.ruleSet,
        enableImu: s.enableImu,
        imuAliquota: s.imuAliquota,
        imuIsMainHome: s.imuIsMainHome,
        imuDetrazione: s.imuDetrazione,
        luxuryCheckMode: s.luxuryCheckMode ?? 'analisiDM1969',
        dataAtto: s.dataAtto,
      });
    });
  }, [project]);

  if (project.scenarios.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Risultati</Typography>
        <Alert severity="info">
          Configura almeno uno scenario nella scheda "Scenari" per visualizzare i risultati.
        </Alert>
      </Box>
    );
  }

  const hasWarnings = results.some(r => r.warnings.length > 0);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Risultati del Calcolo
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Stime indicative.</strong> I valori di rendita catastale sotto sono calcolati su base
        geometrica e tariffaria. Il classamento definitivo è determinato dall'Agenzia delle Entrate –
        Territorio. Rivolgersi a un tecnico abilitato per la pratica Docfa.
      </Alert>

      {hasWarnings && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
          Alcuni scenari presentano avvisi. Espandi i dettagli di ciascuno scenario per visualizzarli.
        </Alert>
      )}

      <ComparisonTable results={results} />

      <Typography variant="h6" gutterBottom>
        Dettaglio per Scenario
      </Typography>

      {results.map((r, i) => {
        const s = project.scenarios[i];
        return (
          <ScenarioCard
            key={r.scenarioId}
            result={r}
            isFusion={s?.isFusion ?? false}
            fusionUnitNames={(s?.fusionUnitIds ?? []).map(
              id => project.units.find(u => u.id === id)?.name ?? id,
            )}
          />
        );
      })}
    </Box>
  );
}

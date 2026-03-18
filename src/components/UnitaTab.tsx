import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Tooltip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InfoTooltip from './InfoTooltip';
import { useProject } from '../context/ProjectContext';
import {
  Unit,
  UnitType,
  UNIT_TYPE_LABELS,
  CATEGORY_OPTIONS_A,
  CATEGORY_OPTIONS_C,
  CLASS_OPTIONS,
  RoomType,
  ROOM_TYPE_LABELS,
  Room,
} from '../models/types';

// ── Room type chip colors ──────────────────────────────────────────────────────

const ROOM_CHIP_COLORS: Record<
  RoomType,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
> = {
  Main: 'primary',
  Kitchen: 'success',
  AccessoryDirect: 'info',
  AccessoryComplementary: 'secondary',
  Terrazzo: 'warning',
  Excluded: 'default',
};

// ── Unit Dialog ───────────────────────────────────────────────────────────────

interface UnitDialogProps {
  open: boolean;
  initial?: Partial<Unit>;
  onClose: () => void;
  onSave: (name: string, unitType: UnitType, category: string, classe: string) => void;
}

function UnitDialog({ open, initial, onClose, onSave }: UnitDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unitType, setUnitType] = useState<UnitType>(initial?.unitType ?? 'DwellingA');
  const [category, setCategory] = useState(initial?.targetCategory ?? 'A/3');
  const [classe, setClasse] = useState(initial?.targetClass ?? '1');

  const catOptions = unitType === 'DwellingA' ? CATEGORY_OPTIONS_A : CATEGORY_OPTIONS_C;

  function reset() {
    setName(initial?.name ?? '');
    setUnitType(initial?.unitType ?? 'DwellingA');
    setCategory(initial?.targetCategory ?? 'A/3');
    setClasse(initial?.targetClass ?? '1');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), unitType, category, classe);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial?.id ? 'Modifica Unità' : 'Nuova Unità Immobiliare'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Nome Unità"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="es. Abitazione piano terra-primo-secondo"
            helperText="Nome descrittivo per identificare l'unità nel progetto (es. 'Appartamento A/3 sub. 3')."
          />
          <FormControl fullWidth>
            <InputLabel>Tipo Unità</InputLabel>
            <Select
              value={unitType}
              label="Tipo Unità"
              onChange={e => {
                const t = e.target.value as UnitType;
                setUnitType(t);
                setCategory(t === 'DwellingA' ? 'A/3' : 'C/2');
              }}
            >
              {(['DwellingA', 'PertinenzaC', 'Other'] as UnitType[]).map(t => (
                <MenuItem key={t} value={t}>
                  {UNIT_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>Abitazione (Gruppo A)</strong>: le unità abitative (A/1–A/11) hanno
            consistenza in <em>vani</em>.
            <br />
            <strong>Pertinenza (Gruppo C)</strong>: magazzini, depositi, box ecc. (C/1–C/7) hanno
            consistenza in <em>m²</em>. La pertinenza IMU-agevolabile deve essere C/2, C/6 o C/7.
          </Alert>
          {unitType !== 'Other' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria Target</InputLabel>
                <Select
                  value={category}
                  label="Categoria Target"
                  onChange={e => setCategory(e.target.value)}
                >
                  {catOptions.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Classe</InputLabel>
                <Select
                  value={classe}
                  label="Classe"
                  onChange={e => setClasse(e.target.value)}
                >
                  {CLASS_OPTIONS.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <InfoTooltip text="Categoria e classe si leggono dalla visura catastale attuale dell'unità (es. 'Cat: A/3 – Cl: 2'). Se stai simulando uno scenario post-fusione, scegli la categoria che ipotizzi assegnerà l'Agenzia (di solito A/3 o A/2). Usa la scheda Scenari per confrontare più ipotesi." />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          {initial?.id ? 'Salva' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Room Dialog ───────────────────────────────────────────────────────────────

interface RoomDialogProps {
  open: boolean;
  title: string;
  initial?: { name?: string; roomType?: RoomType; areaMq?: number; notes?: string; accessoDaInterno?: boolean; impiantiPresenti?: boolean };
  onClose: () => void;
  onSave: (name: string, roomType: RoomType, areaMq: number, notes: string, accessoDaInterno: boolean, impiantiPresenti: boolean) => void;
}

function RoomDialog({ open, title, initial, onClose, onSave }: RoomDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [roomType, setRoomType] = useState<RoomType>(initial?.roomType ?? 'Main');
  const [areaMq, setAreaMq] = useState(initial?.areaMq?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [accessoDaInterno, setAccessoDaInterno] = useState(initial?.accessoDaInterno ?? false);
  const [impiantiPresenti, setImpiantiPresenti] = useState(initial?.impiantiPresenti ?? false);

  function handleClose() {
    setName(initial?.name ?? '');
    setRoomType(initial?.roomType ?? 'Main');
    setAreaMq(initial?.areaMq?.toString() ?? '');
    setNotes(initial?.notes ?? '');
    setAccessoDaInterno(initial?.accessoDaInterno ?? false);
    setImpiantiPresenti(initial?.impiantiPresenti ?? false);
    onClose();
  }

  function handleSave() {
    const area = parseFloat(areaMq);
    if (!name.trim() || isNaN(area) || area <= 0) return;
    onSave(name.trim(), roomType, area, notes, accessoDaInterno, impiantiPresenti);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Nome Vano"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="es. Soggiorno, Camera matrimoniale, Bagno..."
            helperText="Usa nomi descrittivi come in planimetria: 'Camera 1', 'Bagno padronale', 'Ripostiglio'"
          />
          <FormControl fullWidth>
            <InputLabel>Tipo Vano</InputLabel>
            <Select
              value={roomType}
              label="Tipo Vano"
              onChange={e => setRoomType(e.target.value as RoomType)}
            >
              {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map(rt => (
                <MenuItem key={rt} value={rt}>
                  {ROOM_TYPE_LABELS[rt]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>Principale</strong>: soggiorni, camere da letto, studi, sale → 1 vano.<br />
            <strong>Cucina</strong>: cucina abitabile con impianti fissi → 1 vano.<br />
            <strong>Accessorio diretto</strong>: bagni, ingressi, corridoi, disimpegni → 1/3 vano.<br />
            <strong>Accessorio complementare</strong>: cantine, soffitte, sgomberi → 1/4 vano.<br />
            <strong>Terrazzo/Balcone</strong>: terrazze e balconi → 0 vani; l'area è tracciata per la verifica del criterio 2 del DM 2/8/1969 (lusso se &gt; 65 m²).<br />
            <strong>Escluso</strong>: spazi non computabili (vano scala condominiale, locale tecnico).
          </Alert>
          <TextField
            fullWidth
            label="Area Netta (m²)"
            type="number"
            inputProps={{ step: '0.5', min: '0.1' }}
            value={areaMq}
            onChange={e => setAreaMq(e.target.value)}
            helperText="Area netta interna al lordo dei muri interni, al netto dei muri perimetrali — leggila dalla planimetria catastale"
            InputProps={{
              endAdornment: (
                <InfoTooltip text="L'area di ogni vano si legge dalla planimetria catastale depositata (disponibile in visura su Sister). In alternativa, misurarla direttamente con metro o laser. Usare sempre l'area NETTA interna (esclusi i muri perimetrali), non la superficie lorda. La planimetria catastale riporta di solito le dimensioni di ciascun locale." />
              ),
            }}
          />
          <TextField
            fullWidth
            label="Note"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="es. 'balcone comunicante', 'altezza ridotta 2.20 m', 'finestra doppia esposizione'"
            helperText="Campo facoltativo per annotazioni utili al calcolo o alla verifica"
          />
          {/* Utilizzabilità flags — visible only for AccessoryComplementary */}
          {roomType === 'AccessoryComplementary' && (
            <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                Indicatori di “utilizzabilità” (Cass. ord. 2503/2025)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Se questo vano è accessibile dall’interno o dotato di impianti, la Cassazione potrebbe
                considerarlo “concretamente utilizzabile” e computarlo nella superficie utile DM 1969.
              </Typography>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox size="small" checked={accessoDaInterno} onChange={e => setAccessoDaInterno(e.target.checked)} />}
                  label={<Typography variant="caption">Accesso diretto dall’interno dell’abitazione</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={impiantiPresenti} onChange={e => setImpiantiPresenti(e.target.checked)} />}
                  label={<Typography variant="caption">Impianti presenti (acqua/scarico/riscaldamento)</Typography>}
                />
              </FormGroup>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || !areaMq || parseFloat(areaMq) <= 0}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Floor section ─────────────────────────────────────────────────────────────

interface FloorSectionProps {
  unitId: string;
  floor: { id: string; name: string; rooms: Room[] };
}

function FloorSection({ unitId, floor }: FloorSectionProps) {
  const { addRoom, updateRoom, deleteRoom, updateFloor, deleteFloor } = useProject();
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editingFloorName, setEditingFloorName] = useState(false);
  const [floorNameVal, setFloorNameVal] = useState(floor.name);

  const totalMq = floor.rooms.filter(r => r.roomType !== 'Excluded' && r.roomType !== 'Terrazzo').reduce((s, r) => s + r.areaMq, 0);

  return (
    <Box sx={{ mb: 1 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Floor header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {editingFloorName ? (
            <>
              <TextField
                size="small"
                value={floorNameVal}
                onChange={e => setFloorNameVal(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  updateFloor(unitId, floor.id, floorNameVal);
                  setEditingFloorName(false);
                }}
              >
                OK
              </Button>
              <Button size="small" onClick={() => setEditingFloorName(false)}>
                ✕
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
                🏢 {floor.name}
              </Typography>
              <Chip label={`${floor.rooms.length} vani · ${totalMq.toFixed(1)} m²`} size="small" color="info" />
              <Tooltip title="Rinomina Piano">
                <IconButton size="small" onClick={() => { setFloorNameVal(floor.name); setEditingFloorName(true); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina Piano">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    if (window.confirm(`Eliminare il piano "${floor.name}" e tutti i suoi vani?`)) {
                      deleteFloor(unitId, floor.id);
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>

        {/* Rooms table */}
        {floor.rooms.length > 0 && (
          <TableContainer sx={{ overflowX: 'auto', mb: 1 }}>
          <Table size="small" sx={{ minWidth: 380 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Vano</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell align="right"><strong>m²</strong></TableCell>
                <TableCell><strong>Note</strong></TableCell>
                <TableCell align="center"><strong>Azioni</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floor.rooms.map(room => (
                <TableRow key={room.id} hover>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROOM_TYPE_LABELS[room.roomType]}
                      size="small"
                      color={ROOM_CHIP_COLORS[room.roomType]}
                    />
                  </TableCell>
                  <TableCell align="right">{room.areaMq.toFixed(1)}</TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="caption" color="text.secondary">{room.notes}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifica">
                      <IconButton size="small" onClick={() => setEditRoom(room)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteRoom(unitId, floor.id, room.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        )}

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddRoomOpen(true)}
        >
          Aggiungi Vano
        </Button>
      </Paper>

      {/* Add room dialog */}
      <RoomDialog
        open={addRoomOpen}
        title={`Nuovo Vano – ${floor.name}`}
        onClose={() => setAddRoomOpen(false)}
        onSave={(name, roomType, areaMq, notes, accessoDaInterno, impiantiPresenti) => {
          addRoom(unitId, floor.id, name, roomType, areaMq, notes, accessoDaInterno, impiantiPresenti);
          setAddRoomOpen(false);
        }}
      />

      {/* Edit room dialog */}
      {editRoom && (
        <RoomDialog
          open={true}
          title={`Modifica Vano – ${editRoom.name}`}
          initial={editRoom}
          onClose={() => setEditRoom(null)}
          onSave={(name, roomType, areaMq, notes, accessoDaInterno, impiantiPresenti) => {
            updateRoom(unitId, floor.id, editRoom.id, { name, roomType, areaMq, notes, accessoDaInterno, impiantiPresenti });
            setEditRoom(null);
          }}
        />
      )}
    </Box>
  );
}

// ── Unit luxury analysis panel (DM 2/8/1969) ─────────────────────────────────

function LuxuryCheckRow({ checked, onChange, label, tooltip }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip: string;
}) {
  return (
    <FormControlLabel
      sx={{ alignItems: 'flex-start', mt: 0.25 }}
      control={<Checkbox size="small" checked={checked} onChange={e => onChange(e.target.checked)} sx={{ pt: 0.25 }} />}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2">{label}</Typography>
          <InfoTooltip size="small" text={tooltip} />
        </Box>
      }
    />
  );
}

function LuxuryAutoRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5, py: 0.25 }}>
      <Checkbox size="small" checked={checked} disabled sx={{ p: 0.5 }} />
      <Typography variant="body2" color={checked ? 'warning.dark' : 'text.secondary'} fontWeight={checked ? 700 : 400} fontStyle="italic">
        {label}
      </Typography>
    </Box>
  );
}

function UnitLuxuryPanel({ unit }: { unit: Unit }) {
  const { updateUnit } = useProject();
  const unitTotalMq = unit.floors.flatMap(f => f.rooms)
    .filter(r => r.roomType !== 'Excluded' && r.roomType !== 'Terrazzo')
    .reduce((s, r) => s + r.areaMq, 0);
  const unitTerrazzaMq = unit.floors.flatMap(f => f.rooms)
    .filter(r => r.roomType === 'Terrazzo')
    .reduce((s, r) => s + r.areaMq, 0);
  const gardenRatio = unitTotalMq > 0 ? (unit.gardenMq ?? 0) / unitTotalMq : 0;
  const upd = (updates: Partial<Unit>) => updateUnit(unit.id, updates);

  return (
    <Accordion sx={{ mt: 2 }} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" color="warning.dark" fontWeight={700}>
            Analisi lusso DM 2 agosto 1969
          </Typography>
          <InfoTooltip text="Il DM 2 agosto 1969 definisce due percorsi: (A) Criteri assoluti art. 1–7 — basta che sia soddisfatto anche solo UNO. (B) Caratteristiche tabella art. 8 — l'unità è di lusso se soddisfa PIÙ DI 4 su 14 caratteristiche. Art.6 e Tab.a)/b) sono verificati automaticamente dalla geometria inserita." />
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 1 }}>
        {/* A — Absolute criteria */}
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark', display: 'block', mb: 0.5 }}>
          A · Criteri assoluti (art. 1–7) — basta UNO solo per essere di lusso
        </Typography>
        <FormGroup sx={{ pl: 1, mb: 1.5 }}>
          <LuxuryCheckRow
            checked={unit.art1_luxuryZone ?? false}
            onChange={v => upd({ art1_luxuryZone: v })}
            label='Art.1 – Zona urb. "ville", "parco privato" o "di lusso"'
            tooltip='Art. 1: abitazioni realizzate su area classificata dagli strumenti urbanistici (PRG) come zona destinata a "ville", "parco privato", o dove le costruzioni sono espressamente qualificate come "di lusso".'
          />
          <LuxuryCheckRow
            checked={unit.art2_largeLot ?? false}
            onChange={v => upd({ art2_largeLot: v })}
            label="Art.2 – Lotto unifamiliare con vincolo ≥ 3.000 m²"
            tooltip="Art. 2: abitazioni su aree destinate a case unifamiliari con prescrizione di lotti non inferiori a 3.000 m² (escluse zone agricole, anche se ammettono costruzioni residenziali)."
          />
          <LuxuryCheckRow
            checked={unit.art3_lowDensity ?? false}
            onChange={v => upd({ art3_lowDensity: v })}
            label="Art.3 – Fabbricato >2.000 mc e densità <25 mc v.p.p. per 100 m²"
            tooltip="Art. 3: fabbricato con cubatura >2.000 mc v.p.p. (vuoto per pieno) realizzato su lotto con densità <25 mc v.p.p. per ogni 100 m² di superficie asservita."
          />
          <LuxuryCheckRow
            checked={unit.art4_pool ?? false}
            onChange={v => upd({ art4_pool: v })}
            label="Art.4 – Piscina unifamiliare ≥ 80 m²"
            tooltip="Art. 4: abitazione unifamiliare dotata di piscina di almeno 80 m² di superficie. Si applica solo a case unifamiliari; per piscine condominiali usare Tab.o)."
          />
          <LuxuryCheckRow
            checked={unit.art4_tennis ?? false}
            onChange={v => upd({ art4_tennis: v })}
            label="Art.4 – Campo da tennis unifamiliare ≥ 650 m² (sottofondo drenato)"
            tooltip="Art. 4: abitazione unifamiliare con campo da tennis con sottofondo drenato di superficie non inferiore a 650 m²."
          />
          <LuxuryCheckRow
            checked={unit.art5_villa ?? false}
            onChange={v => upd({ art5_villa: v })}
            label="Art.5 – Casa unifamiliare >200 m² con area scoperta >6× area coperta"
            tooltip="Art. 5: casa unifamiliare con superficie utile >200 m² (esclusi balconi, terrazze, cantine, soffitte, scale e posto macchine) E con area scoperta di pertinenza >6× area coperta. Inserire la superficie del giardino nel campo seguente."
          />
          {(unit.art5_villa ?? false) && (
            <Box sx={{ pl: 4, mt: 0.5, mb: 1 }}>
              <TextField
                size="small"
                label="Superficie giardino / pertinenza scoperta (m²)"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={unit.gardenMq ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  upd({ gardenMq: isNaN(v) ? 0 : v });
                }}
                sx={{ maxWidth: 320 }}
                helperText={unitTotalMq > 0
                  ? `Rapporto attuale: ${gardenRatio.toFixed(2)}× (soglia >6×) — superficie interna: ${unitTotalMq.toFixed(1)} m²`
                  : 'Inserisci prima la geometria dei vani'}
              />
            </Box>
          )}
          <LuxuryAutoRow
            checked={unitTotalMq > 240}
            label={`Art.6 – Sup. utile >240 m² — calcolato automaticamente: ${unitTotalMq.toFixed(1)} m²`}
          />
          <LuxuryCheckRow
            checked={unit.art7_expensiveLand ?? false}
            onChange={v => upd({ art7_expensiveLand: v })}
            label="Art.7 – Costo terreno coperto >1,5× costo costruzione"
            tooltip="Art. 7: abitazioni in fabbricati dove il costo del terreno coperto e di pertinenza supera di una volta e mezzo il costo della sola costruzione."
          />
        </FormGroup>

        <Divider sx={{ mb: 1 }} />

        {/* B — Table characteristics */}
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
          B · Caratteristiche tabella (art. 8) — servono PIÙ DI 4 su 14 per essere di lusso
        </Typography>
        <FormGroup sx={{ pl: 1 }}>
          <LuxuryAutoRow
            checked={unitTotalMq > 160}
            label={`Tab.a) – Sup. appartamento >160 m² — calcolato: ${unitTotalMq.toFixed(1)} m²`}
          />
          <LuxuryAutoRow
            checked={unitTerrazzaMq > 65}
            label={`Tab.b) – Terrazze/balconi >65 m² — calcolato: ${unitTerrazzaMq.toFixed(1)} m² (inserisci vani "Terrazzo/Balcone")`}
          />
          <LuxuryCheckRow
            checked={unit.table_c_multiLift ?? false}
            onChange={v => upd({ table_c_multiLift: v })}
            label="Tab.c) – Più di 1 ascensore per scala (con <7 piani sopraelevati)"
            tooltip="Tab. c): quando vi sia più di un ascensore per ogni scala; ogni ascensore aggiuntivo conta per una caratteristica se la scala serve meno di 7 piani sopraelevati."
          />
          <LuxuryCheckRow
            checked={unit.table_d_serviceStairs ?? false}
            onChange={v => upd({ table_d_serviceStairs: v })}
            label="Tab.d) – Scala di servizio non obbligatoria per legge/regolamento"
            tooltip="Tab. d): scala di servizio quando non sia prescritta da leggi, regolamenti o necessità di prevenzione infortuni od incendi."
          />
          <LuxuryCheckRow
            checked={unit.table_e_serviceElevator ?? false}
            onChange={v => upd({ table_e_serviceElevator: v })}
            label="Tab.e) – Montacarichi o ascensore di servizio al servizio di <4 piani"
            tooltip="Tab. e): montacarichi o ascensore di servizio al servizio di meno di 4 piani."
          />
          <LuxuryCheckRow
            checked={unit.table_f_stairMaterials ?? false}
            onChange={v => upd({ table_f_stairMaterials: v })}
            label="Tab.f) – Scala principale con rivestimenti pregiati (>170 cm di media)"
            tooltip="Tab. f): scala principale con pareti rivestite di materiali pregiati per altezza >170 cm di media, oppure con pareti rivestite di materiali lavorati in modo pregiato."
          />
          <LuxuryCheckRow
            checked={unit.table_g_highCeilings ?? false}
            onChange={v => upd({ table_g_highCeilings: v })}
            label="Tab.g) – Altezza libera netta del piano >3,30 m"
            tooltip="Tab. g): altezza libera netta del piano superiore a 3,30 m, salvo che i regolamenti edilizi locali prevedano altezze minime superiori."
          />
          <LuxuryCheckRow
            checked={unit.table_h_fancyDoors ?? false}
            onChange={v => upd({ table_h_fancyDoors: v })}
            label="Tab.h) – Porte d'ingresso agli appartamenti in legno pregiato/intagliato"
            tooltip="Tab. h): porte di ingresso agli appartamenti da scala interna in legno pregiato massello o lastronato; in legno intagliato, scolpito o intarsiato; oppure con decorazioni pregiate sovrapposte od impresse."
          />
          <LuxuryCheckRow
            checked={unit.table_i_fancyInfissi ?? false}
            onChange={v => upd({ table_i_fancyInfissi: v })}
            label="Tab.i) – Infissi interni pregiati (>50% della superficie totale infissi)"
            tooltip="Tab. i): infissi interni con le stesse caratteristiche pregiate delle porte h), anche se tamburati, qualora la loro superficie complessiva superi il 50% della superficie totale degli infissi."
          />
          <LuxuryCheckRow
            checked={unit.table_l_fancyFloors ?? false}
            onChange={v => upd({ table_l_fancyFloors: v })}
            label="Tab.l) – Pavimenti pregiati (>50% della superficie utile totale)"
            tooltip="Tab. l): pavimenti in materiale pregiato o con materiali lavorati in modo pregiato, per superficie >50% della superficie utile totale dell'appartamento."
          />
          <LuxuryCheckRow
            checked={unit.table_m_fancyWalls ?? false}
            onChange={v => upd({ table_m_fancyWalls: v })}
            label="Tab.m) – Pareti con materiali pregiati/stoffe (>30% della superficie)"
            tooltip="Tab. m): pareti eseguite con materiali e lavori pregiati o rivestite di stoffe od altri materiali pregiati per oltre il 30% della loro superficie complessiva."
          />
          <LuxuryCheckRow
            checked={unit.table_n_decorCeilings ?? false}
            onChange={v => upd({ table_n_decorCeilings: v })}
            label="Tab.n) – Soffitti a cassettoni decorati o con stucchi dipinti a mano"
            tooltip="Tab. n): soffitti a cassettoni decorati oppure decorati con stucchi tirati sul posto dipinti a mano. Escluse le piccole sagome di distacco fra pareti e soffitti."
          />
          <LuxuryCheckRow
            checked={unit.table_o_condoPool ?? false}
            onChange={v => upd({ table_o_condoPool: v })}
            label="Tab.o) – Piscina in muratura al servizio di edificio/complesso <15 unità"
            tooltip="Tab. o): piscina coperta o scoperta in muratura al servizio di edificio o complesso comprendenti meno di 15 unità immobiliari. Per piscine unifamiliari usare Art.4."
          />
          <LuxuryCheckRow
            checked={unit.table_p_condoTennis ?? false}
            onChange={v => upd({ table_p_condoTennis: v })}
            label="Tab.p) – Campo da tennis al servizio di edificio/complesso <15 unità"
            tooltip="Tab. p): campo da tennis al servizio di edificio o complesso comprendenti meno di 15 unità immobiliari."
          />
        </FormGroup>
      </AccordionDetails>
    </Accordion>
  );
}

// ── Main UnitaTab ─────────────────────────────────────────────────────────────

export default function UnitaTab() {
  const { project, addUnit, updateUnit, deleteUnit, addFloor } = useProject();
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [addFloorDialogs, setAddFloorDialogs] = useState<Record<string, boolean>>({});
  const [newFloorNames, setNewFloorNames] = useState<Record<string, string>>({});

  const unitTypeBadge: Record<UnitType, 'primary' | 'secondary' | 'default'> = {
    DwellingA: 'primary',
    PertinenzaC: 'secondary',
    Other: 'default',
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Unità Immobiliari
      </Typography>

      {project.units.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aggiungi le unità immobiliari da fondere. Di solito: una o più abitazioni (Gruppo A) e,
          facoltativamente, una pertinenza (Gruppo C, es. C/2 magazzino/deposito).
          <br />
          <strong>Fonte dati geometria</strong>: la planimetria catastale di ciascuna unità è
          consultabile gratuitamente su{' '}
          <a href="https://sister.agenziaentrate.gov.it" target="_blank" rel="noopener noreferrer">
            sister.agenziaentrate.gov.it
          </a>{' '}
          inserendo i dati identificativi dell'immobile (Comune, foglio, particella, subalterno).
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => { setEditUnit(null); setUnitDialogOpen(true); }}
        sx={{ mb: 2 }}
      >
        Aggiungi Unità
      </Button>

      {project.units.map(unit => (
        <Accordion key={unit.id} sx={{ mb: 1 }} defaultExpanded={project.units.length === 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 2 }}>
              <ApartmentIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                {unit.name}
              </Typography>
              <Chip
                label={UNIT_TYPE_LABELS[unit.unitType]}
                size="small"
                color={unitTypeBadge[unit.unitType]}
              />
              {unit.unitType !== 'Other' && (
                <Chip
                  label={`${unit.targetCategory} cl.${unit.targetClass}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip
                label={`${unit.floors.length} piani · ${unit.floors.reduce((s, f) => s + f.rooms.length, 0)} vani`}
                size="small"
              />
              <Tooltip title="Modifica Unità">
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); setEditUnit(unit); setUnitDialogOpen(true); }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina Unità">
                <IconButton
                  size="small"
                  color="error"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm(`Eliminare l'unità "${unit.name}"?`)) deleteUnit(unit.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {unit.floors.map(floor => (
              <FloorSection key={floor.id} unitId={unit.id} floor={floor} />
            ))}

            {/* ── Luxury analysis panel (DM 2/8/1969) ── */}
            {unit.unitType === 'DwellingA' && (
              <UnitLuxuryPanel unit={unit} />
            )}

            <Divider sx={{ my: 1 }} />

            {/* Add floor */}
            {addFloorDialogs[unit.id] ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="Nome Piano"
                  value={newFloorNames[unit.id] ?? ''}
                  onChange={e => setNewFloorNames(prev => ({ ...prev, [unit.id]: e.target.value }))}
                  placeholder="es. Piano Terra, Primo Piano..."
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!newFloorNames[unit.id]?.trim()}
                  onClick={() => {
                    addFloor(unit.id, newFloorNames[unit.id].trim());
                    setNewFloorNames(prev => ({ ...prev, [unit.id]: '' }));
                    setAddFloorDialogs(prev => ({ ...prev, [unit.id]: false }));
                  }}
                >
                  Aggiungi
                </Button>
                <Button
                  size="small"
                  onClick={() => setAddFloorDialogs(prev => ({ ...prev, [unit.id]: false }))}
                >
                  Annulla
                </Button>
              </Stack>
            ) : (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddFloorDialogs(prev => ({ ...prev, [unit.id]: true }))}
                sx={{ mt: 1 }}
              >
                Aggiungi Piano
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Unit dialog: add */}
      <UnitDialog
        open={unitDialogOpen && !editUnit}
        onClose={() => setUnitDialogOpen(false)}
        onSave={(name, unitType, category, classe) => {
          addUnit(name, unitType, category, classe);
          setUnitDialogOpen(false);
        }}
      />

      {/* Unit dialog: edit */}
      {editUnit && (
        <UnitDialog
          open={unitDialogOpen}
          initial={editUnit}
          onClose={() => { setUnitDialogOpen(false); setEditUnit(null); }}
          onSave={(name, unitType, category, classe) => {
            updateUnit(editUnit.id, { name, unitType, targetCategory: category, targetClass: classe });
            setUnitDialogOpen(false);
            setEditUnit(null);
          }}
        />
      )}
    </Box>
  );
}

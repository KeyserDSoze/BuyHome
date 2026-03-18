import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Chip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoTooltip from './InfoTooltip';
import { useProject } from '../context/ProjectContext';
import { Tariff, TariffUnit, TariffSource, TARIFF_UNIT_LABELS } from '../models/types';

const CATEGORY_OPTIONS = [
  'A/1', 'A/2', 'A/3', 'A/4', 'A/5', 'A/6', 'A/7', 'A/8', 'A/9', 'A/10', 'A/11',
  'C/1', 'C/2', 'C/3', 'C/4', 'C/5', 'C/6', 'C/7',
];
const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];

function emptyForm() {
  return {
    category: 'A/3',
    classe: '1',
    value: '' as string | number,
    unit: 'euro_per_vano' as TariffUnit,
    sourceType: 'manual' as TariffSource,
    sourceNote: '',
  };
}

export default function TariffeTab() {
  const { project, addTariff, updateTariff, deleteTariff } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(t: Tariff) {
    setEditId(t.id);
    setForm({
      category: t.category,
      classe: t.classe,
      value: t.value,
      unit: t.unit,
      sourceType: t.sourceType,
      sourceNote: t.sourceNote,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    const v = Number(form.value);
    if (isNaN(v) || v <= 0) return;
    if (editId) {
      updateTariff(editId, { ...form, value: v });
    } else {
      addTariff(form.category, form.classe, v, form.unit, form.sourceType, form.sourceNote);
    }
    setDialogOpen(false);
  }

  const sourceColor: Record<TariffSource, 'default' | 'primary' | 'secondary'> = {
    manual: 'default',
    imported: 'primary',
    dataset: 'secondary',
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tariffe d'Estimo
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Inserire le tariffe d'estimo per ciascuna categoria/classe da calcolare.
      </Alert>

      <Accordion sx={{ mb: 2 }} defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={700}>
            📖 Come trovare le tariffe d'estimo
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            Le tariffe d'estimo sono pubblicate su base{' '}
            <strong>Comune → zona censuaria → categoria → classe</strong>. Per trovarle:
          </Typography>
          <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
            <Typography component="li" variant="body2">
              <strong>Portale Gazzetta Ufficiale</strong> — Cerca il DM 27/09/1991 (e successive
              rettifiche) nella banca dati NCEU. Il decreto contiene le tabelle per ogni Comune.
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Portale Sister (Agenzia delle Entrate)</strong> —{' '}
              <Link href="https://sister.agenziaentrate.gov.it" target="_blank" rel="noopener">sister.agenziaentrate.gov.it</Link>.
              Cerca la visura catastale attuale dell'immobile: nella sezione «Rendita» trovi
              la <em>rendita catastale corrente</em> e, dividendo per i vani, puoi ricavare la
              tariffa usata in quel momento (approccio inverso di verifica).
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Tecnico abilitato</strong> — Un geometra, ingegnere o architetto con accesso
              al software Docfa può estrarre direttamente le tariffe ufficiali per il tuo Comune
              e la tua zona censuaria.
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Sportello catastale</strong> — Presentandosi all'ufficio provinciale
              dell'Agenzia delle Entrate con i dati della visura, è possibile richiedere le
              tariffe aggiornate.
            </Typography>
          </Box>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Le tariffe differiscono per ogni combinazione Comune + zona censuaria + categoria +
            classe. Inserisci <strong>almeno una tariffa per scenario</strong> che intendi
            calcolare (es. A/3 classe 1 e C/2 classe 1).
          </Alert>
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openAdd}
        sx={{ mb: 2 }}
      >
        Aggiungi Tariffa
      </Button>

      {project.tariffs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          Nessuna tariffa inserita. Aggiungi le tariffe per calcolare la rendita.
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }}>Categoria</TableCell>
                <TableCell sx={{ color: 'white' }}>Classe</TableCell>
                <TableCell sx={{ color: 'white' }} align="right">
                  Valore
                </TableCell>
                <TableCell sx={{ color: 'white' }}>Unità</TableCell>
                <TableCell sx={{ color: 'white' }}>Fonte</TableCell>
                <TableCell sx={{ color: 'white' }}>Note</TableCell>
                <TableCell sx={{ color: 'white' }} align="center">
                  Azioni
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {project.tariffs.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <strong>{t.category}</strong>
                  </TableCell>
                  <TableCell>{t.classe}</TableCell>
                  <TableCell align="right">
                    <strong>{t.value.toFixed(4)}</strong>
                  </TableCell>
                  <TableCell>{TARIFF_UNIT_LABELS[t.unit]}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.sourceType}
                      size="small"
                      color={sourceColor[t.sourceType]}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.sourceNote}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifica">
                      <IconButton size="small" onClick={() => openEdit(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton size="small" color="error" onClick={() => deleteTariff(t.id)}>
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

      {/* ── Dialog ──────────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Modifica Tariffa' : 'Nuova Tariffa'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={form.category}
                  label="Categoria"
                  onChange={e => {
                    const cat = e.target.value;
                    setForm(f => ({
                      ...f,
                      category: cat,
                      unit: cat.startsWith('A') ? 'euro_per_vano' : 'euro_per_mq',
                    }));
                  }}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Classe</InputLabel>
                <Select
                  value={form.classe}
                  label="Classe"
                  onChange={e => setForm(f => ({ ...f, classe: e.target.value }))}
                >
                  {CLASS_OPTIONS.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <strong>Categoria</strong>: leggila dalla visura catastale attuale dell'unità che
              cambierà, o scegli la categoria target che ipotizzi dopo la fusione (es.
              A/3 = economica, A/2 = civile, A/1 = signorile, C/2 = magazzino/deposito).
              <br />
              <strong>Classe</strong>: anch'essa visibile in visura. Va da 1 (peggiore) a
              3–5 (migliore) a seconda del Comune. Se incerto, inserisci più righe con classi
              diverse per confrontare.
            </Alert>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Valore Tariffa"
                type="number"
                inputProps={{ step: '0.0001', min: '0' }}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                helperText={`Valore in ${TARIFF_UNIT_LABELS[form.unit]} — dal DM tariffe per questo Comune/zona/cat/classe`}
                InputProps={{
                  endAdornment: (
                    <InfoTooltip text={`La tariffa d'estimo si trova nel DM 27/09/1991 (e rettifiche) alla voce corrispondente a Comune, zona censuaria, categoria e classe. Unità: ${TARIFF_UNIT_LABELS[form.unit]}. Per le categorie A è in €/vano; per C in €/m². Valori tipici italiani: A/3 cl.1 ≈ 0.50–3 €/vano, ma variano molto per Comune.`} />
                  ),
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Unità</InputLabel>
                <Select
                  value={form.unit}
                  label="Unità"
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value as TariffUnit }))}
                >
                  <MenuItem value="euro_per_vano">€/vano (Gruppo A)</MenuItem>
                  <MenuItem value="euro_per_mq">€/m² (Gruppo C)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Fonte</InputLabel>
              <Select
                value={form.sourceType}
                label="Fonte"
                onChange={e => setForm(f => ({ ...f, sourceType: e.target.value as TariffSource }))}
              >
                <MenuItem value="manual">Inserimento manuale</MenuItem>
                <MenuItem value="imported">Importato da file</MenuItem>
                <MenuItem value="dataset">Dataset / fonte ufficiale</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Note fonte"
              value={form.sourceNote}
              onChange={e => setForm(f => ({ ...f, sourceNote: e.target.value }))}
              placeholder="es. DM 27/09/1991 – GU n. 232 – Comune Roma zona 1 – A/3 cl.1"
              helperText="Annota la provenienza esatta per poter verificare o aggiornare il dato in futuro"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.value || Number(form.value) <= 0}
          >
            {editId ? 'Salva' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

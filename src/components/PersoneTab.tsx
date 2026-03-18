import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useProject } from '../context/ProjectContext';
import { Person, TipoContratto, TIPO_CONTRATTO_LABELS } from '../models/types';

// ── Formatting helpers ────────────────────────────────────────────────────────

function eur(v: number) {
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

// ── Default form ──────────────────────────────────────────────────────────────

function emptyPerson(): Omit<Person, 'id'> {
  return {
    name: '',
    tipoContratto: 'dipendente',
    redditoNettoMensile: 0,
    notes: '',
  };
}

// ── Dialog ────────────────────────────────────────────────────────────────────

interface PersonDialogProps {
  open: boolean;
  initial?: Person;
  onClose: () => void;
  onSave: (data: Omit<Person, 'id'>) => void;
}

function PersonDialog({ open, initial, onClose, onSave }: PersonDialogProps) {
  const [form, setForm] = useState<Omit<Person, 'id'>>(
    initial ? { ...initial } : emptyPerson(),
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function handleClose() {
    setForm(initial ? { ...initial } : emptyPerson());
    onClose();
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave(form);
    setForm(emptyPerson());
  }

  const rataMassimaSostenibile = form.redditoNettoMensile * 0.33;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        {initial ? 'Modifica persona' : 'Aggiungi persona'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nome e cognome"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={!form.name.trim()}
            helperText={!form.name.trim() ? 'Campo obbligatorio' : ''}
            fullWidth
            autoFocus
          />

          <TextField
            select
            label="Tipo di contratto / reddito"
            value={form.tipoContratto}
            onChange={e => set('tipoContratto', e.target.value as TipoContratto)}
            fullWidth
          >
            {(Object.keys(TIPO_CONTRATTO_LABELS) as TipoContratto[]).map(k => (
              <MenuItem key={k} value={k}>{TIPO_CONTRATTO_LABELS[k]}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Reddito netto mensile (€)"
            type="number"
            value={form.redditoNettoMensile || ''}
            onChange={e => set('redditoNettoMensile', parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 100 }}
            helperText={
              form.redditoNettoMensile > 0
                ? `Rata mutuo max sostenibile (33%): ${eur(rataMassimaSostenibile)}/mese`
                : 'Importo mensile dopo imposte e contributi'
            }
            fullWidth
          />

          <TextField
            label="Note (opzionale)"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!form.name.trim() || form.redditoNettoMensile <= 0}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── PersonCard ────────────────────────────────────────────────────────────────

function PersonCard({ person, onEdit, onDelete }: {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rata33 = person.redditoNettoMensile * 0.33;
  const rata40 = person.redditoNettoMensile * 0.40;

  const tipoLabel = TIPO_CONTRATTO_LABELS[person.tipoContratto];

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">{person.name}</Typography>
          </Box>
          <Chip
            icon={<WorkIcon />}
            label={tipoLabel}
            size="small"
            variant="outlined"
            color="default"
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Reddito netto mensile</Typography>
            <Typography variant="h5" color="primary.main" fontWeight={700}>
              {eur(person.redditoNettoMensile)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Rata max sostenibile</Typography>
              <Tooltip title="Le banche normalmente non concedono mutui per cui la rata supera il 33–35% del reddito netto. Alcuni istituti arrivano al 40%.">
                <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
            <Typography variant="body1" fontWeight={600} color="success.dark">
              {eur(rata33)}<Typography component="span" variant="caption" color="text.secondary"> /mese (33%)</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max bankroll 40%: {eur(rata40)}/mese
            </Typography>
          </Grid>
        </Grid>

        {person.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            {person.notes}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" onClick={onEdit} color="primary">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onDelete} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

// ── PersoneTab ────────────────────────────────────────────────────────────────

export default function PersoneTab() {
  const { project, addPerson, updatePerson, deletePerson } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);

  const persons = project.persons ?? [];
  const totalReddito = persons.reduce((s, p) => s + p.redditoNettoMensile, 0);
  const totalRata33 = totalReddito * 0.33;

  return (
    <Box maxWidth={900} mx="auto">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Persone</Typography>
          <Typography variant="body2" color="text.secondary">
            Profili reddituali degli acquirenti — usati per la verifica di sostenibilità del mutuo
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditPerson(null); setDialogOpen(true); }}
        >
          Aggiungi persona
        </Button>
      </Box>

      {persons.length > 1 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Reddito combinato:</strong> {eur(totalReddito)}/mese&nbsp;·&nbsp;
          Rata mutuo max (33%): <strong>{eur(totalRata33)}/mese</strong>
        </Alert>
      )}

      {persons.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <PersonIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>Nessuna persona ancora</Typography>
          <Typography variant="body2" mb={3}>
            Aggiungi gli acquirenti con il loro reddito netto mensile per calcolare
            la sostenibilità del mutuo nei contratti.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Aggiungi la prima persona
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {persons.map(person => (
            <Grid item xs={12} md={6} key={person.id}>
              <PersonCard
                person={person}
                onEdit={() => { setEditPerson(person); setDialogOpen(true); }}
                onDelete={() => {
                  if (window.confirm(`Eliminare "${person.name}"?`)) deletePerson(person.id);
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <PersonDialog
        open={dialogOpen && !editPerson}
        onClose={() => setDialogOpen(false)}
        onSave={data => {
          addPerson(data.name, data.tipoContratto, data.redditoNettoMensile, data.notes);
          setDialogOpen(false);
        }}
      />

      {editPerson && (
        <PersonDialog
          open={dialogOpen}
          initial={editPerson}
          onClose={() => { setDialogOpen(false); setEditPerson(null); }}
          onSave={data => {
            updatePerson(editPerson.id, data);
            setDialogOpen(false);
            setEditPerson(null);
          }}
        />
      )}
    </Box>
  );
}

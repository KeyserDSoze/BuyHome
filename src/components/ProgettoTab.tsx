import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
  Alert,
  Link,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import InfoTooltip from './InfoTooltip';

export default function ProgettoTab() {
  const { project, updateName, updateJurisdiction, exportProject, importProject, resetProject } =
    useProject();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') importProject(ev.target.result);
    };
    reader.readAsText(file);
    // reset input so same file can be re-imported
    e.target.value = '';
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configurazione Progetto
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Avviso:</strong> I risultati sono stime a scopo indicativo. Il classamento definitivo
        e la rendita catastale vengono determinati dall'Agenzia delle Entrate – Territorio. Rivolgersi
        a un tecnico abilitato per la presentazione della pratica Docfa.
      </Alert>

      {/* ── Dati Progetto ──────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Dettagli Progetto
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nome Progetto"
              value={project.name}
              onChange={e => updateName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Creato il"
              value={new Date(project.createdAt).toLocaleDateString('it-IT')}
              disabled
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Ultima modifica"
              value={new Date(project.updatedAt).toLocaleDateString('it-IT')}
              disabled
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── Giurisdizione ─────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Giurisdizione Catastale
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Questi dati si trovano sulla <strong>visura catastale</strong> dell'immobile (ottenibile
          gratuitamente su{' '}
          <Link href="https://sister.agenziaentrate.gov.it" target="_blank" rel="noopener noreferrer">
            sister.agenziaentrate.gov.it
          </Link>{' '}
          oppure allo sportello dell'Agenzia delle Entrate). Cerca le voci
          &laquo;Comune&raquo; e &laquo;Zona Censuaria&raquo; nell'intestazione della visura.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Comune"
              value={project.jurisdiction.comune}
              onChange={e => updateJurisdiction({ comune: e.target.value })}
              placeholder="es. Roma"
              helperText="Nome del Comune dove si trova l'immobile, come riportato in visura catastale"
              InputProps={{
                endAdornment: (
                  <InfoTooltip text="Il Comune è riportato nell'intestazione della visura catastale, voce 'Comune'. Coincide con il Comune anagrafico ma usa la denominazione ufficiale del catasto (es. 'MILANO' in maiuscolo)." />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Zona Censuaria"
              value={project.jurisdiction.zonaCensuaria}
              onChange={e => updateJurisdiction({ zonaCensuaria: e.target.value })}
              placeholder="es. 1"
              helperText="Numero (o lettera) riportato nella visura catastale alla voce 'Zona Censuaria'"
              InputProps={{
                endAdornment: (
                  <InfoTooltip text="La Zona Censuaria è visibile nella visura catastale nella sezione 'Dati Identificativi' (es. 'Zona: 1'). Serve per trovare la tariffa d'estimo corretta: tariffe diverse si applicano a zone diverse dello stesso Comune." />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Note Giurisdizione"
              value={project.jurisdiction.note}
              onChange={e => updateJurisdiction({ note: e.target.value })}
              placeholder="es. Microzona 3, DM 1991 rettificato..."
              helperText="Campo libero: microzona, riferimento al decreto tariffe, ecc."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── Import / Export ───────────────────────────────────────────────── */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Gestione Dati
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportProject}
          >
            Esporta JSON
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileRef.current?.click()}
          >
            Importa JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <Button
            variant="outlined"
            color="error"
            startIcon={<RestartAltIcon />}
            onClick={resetProject}
          >
            Nuovo Progetto (reset)
          </Button>
        </Stack>
        <Alert severity="success" sx={{ mt: 2 }} icon={false}>
          <strong>Salvataggio automatico:</strong> ogni modifica viene salvata immediatamente nel
          browser (localStorage). I dati <em>non</em> vengono inviati a nessun server e rimangono
          solo su questo dispositivo/browser. Usa <strong>Esporta JSON</strong> per fare una copia
          di backup o per aprire il progetto su un altro computer.
        </Alert>
      </Paper>
    </Box>
  );
}

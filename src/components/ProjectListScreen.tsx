import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Grid, AppBar, Toolbar, Divider, Chip, Avatar, Tooltip,
  IconButton, Menu, MenuItem, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GoogleIcon from '@mui/icons-material/Google';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import {
  getAllProjects,
  saveProject,
  deleteProject,
  migrateLegacy,
} from '../storage/projectsStore';
import { Project } from '../models/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ThemeModeButton() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Tooltip title={mode === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'}>
      <IconButton color="inherit" onClick={toggleMode}>
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

// ── Auth button / user chip ───────────────────────────────────────────────────

function AuthSection() {
  const { user, isTokenValid, signIn, signOut, syncToDrive, syncFromDrive, isSyncing, lastSync, syncError, driveConfigured } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!driveConfigured) {
    return (
      <Tooltip title="Configura VITE_GOOGLE_CLIENT_ID nel file .env per abilitare il sync con Google Drive">
        <Chip
          icon={<CloudOffIcon />}
          label="Drive non configurato"
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
        />
      </Tooltip>
    );
  }

  if (!isTokenValid) {
    return (
      <Button
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={signIn}
        size="small"
        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
      >
        Accedi con Google
      </Button>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isSyncing && <CircularProgress size={18} sx={{ color: 'white' }} />}
      {!isSyncing && lastSync && (
        <Chip
          icon={<CloudDoneIcon />}
          label={`Sync ${lastSync.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', display: { xs: 'none', sm: 'flex' } }}
        />
      )}
      <Tooltip title={user?.email ?? ''}>
        <Avatar
          src={user?.picture}
          alt={user?.name}
          sx={{ width: 32, height: 32, cursor: 'pointer' }}
          onClick={e => setAnchorEl(e.currentTarget)}
        />
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>
          <Typography variant="body2">{user?.name}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { syncFromDrive(); setAnchorEl(null); }}>
          <CloudSyncIcon fontSize="small" sx={{ mr: 1 }} />
          Scarica da Drive
        </MenuItem>
        <MenuItem onClick={() => { syncToDrive(); setAnchorEl(null); }}>
          <CloudSyncIcon fontSize="small" sx={{ mr: 1 }} />
          Carica su Drive
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { signOut(); setAnchorEl(null); }}>
          Disconnetti
        </MenuItem>
      </Menu>
      {syncError && (
        <Chip label={syncError} size="small" color="error" sx={{ maxWidth: 200 }} />
      )}
    </Box>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function ProjectCard({ project, onOpen, onDelete, onExport }: ProjectCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const scenarioCount = project.scenarios?.length ?? 0;
  const unitCount = project.units?.length ?? 0;
  const contractCount = project.contracts?.length ?? 0;

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
      onClick={onOpen}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <HomeWorkIcon color="primary" />
            <Typography
              variant="h6"
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
              title={project.name}
            >
              {project.name}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={e => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={e => { (e as React.MouseEvent).stopPropagation?.(); setMenuAnchor(null); }}
            onClick={e => e.stopPropagation()}
          >
            <MenuItem onClick={() => { onExport(); setMenuAnchor(null); }}>
              Esporta JSON
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { onDelete(); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Elimina
            </MenuItem>
          </Menu>
        </Box>

        {project.jurisdiction?.comune && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            📍 {project.jurisdiction.comune}
            {project.jurisdiction.zonaCensuaria && ` — Zona ${project.jurisdiction.zonaCensuaria}`}
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`${unitCount} unità`} size="small" variant="outlined" />
          <Chip label={`${scenarioCount} scenari`} size="small" variant="outlined" />
          {contractCount > 0 && (
            <Chip label={`${contractCount} contratti`} size="small" variant="outlined" color="primary" />
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', pt: 0, px: 2, pb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Modificato: {formatDate(project.updatedAt)}
        </Typography>
        <Button size="small" variant="contained" startIcon={<FolderOpenIcon />} onClick={onOpen}>
          Apri
        </Button>
      </CardActions>
    </Card>
  );
}

// ── New project dialog ────────────────────────────────────────────────────────

function NewProjectDialog({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('Nuovo Progetto');

  function handleCreate() {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('Nuovo Progetto');
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nuovo progetto</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Nome del progetto"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
          Crea
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Default project factory (inline to avoid circular dep) ───────────────────

function makeNewProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    createdAt: now,
    updatedAt: now,
    jurisdiction: { comune: '', zonaCensuaria: '', note: '' },
    ruleSet: {
      accessoryDirectCoeff: 1 / 3,
      accessoryComplementaryCoeff: 1 / 4,
      applyLargeRoomRagguaglio: false,
      vanoMaxMq: 26,
      dipendenzePct: 0,
    },
    units: [],
    tariffs: [],
    scenarios: [],
    persons: [],
    contracts: [],
  };
}

// ── ProjectListScreen ─────────────────────────────────────────────────────────

interface ProjectListScreenProps {
  onOpen: (projectId: string) => void;
}

export default function ProjectListScreen({ onOpen }: ProjectListScreenProps) {
  const { isTokenValid, syncFromDrive, syncToDrive, isSyncing } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [snack, setSnack] = useState('');

  const reload = useCallback(() => {
    migrateLegacy();
    setProjects(getAllProjects());
  }, []);

  // Load on mount
  useEffect(() => { reload(); }, [reload]);

  // Auto-sync from Drive on first login
  useEffect(() => {
    if (!isTokenValid) return;
    syncFromDrive().then(remoteProjects => {
      if (remoteProjects && remoteProjects.length > 0) {
        reload();
        setSnack(`${remoteProjects.length} progetto/i sincronizzato/i da Drive`);
      }
    });
    // Only run when auth state changes to valid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenValid]);

  function handleCreate(name: string) {
    const project = makeNewProject(name);
    saveProject(project);
    setNewDialogOpen(false);
    onOpen(project.id);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Eliminare il progetto "${name}"?\nQuesta operazione non può essere annullata.`)) return;
    deleteProject(id);
    reload();
    if (isTokenValid) syncToDrive(); // keep Drive in sync
  }

  function handleExport(project: Project) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target?.result as string) as Project;
        // Assign a new ID to avoid overwriting existing projects
        const fresh: Project = {
          ...imported,
          id: uuidv4(),
          updatedAt: new Date().toISOString(),
          name: imported.name + ' (importato)',
        };
        saveProject(fresh);
        reload();
        setSnack(`Progetto "${fresh.name}" importato`);
      } catch {
        setSnack('File JSON non valido');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be chosen again
    e.target.value = '';
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── AppBar ── */}
      <AppBar position="sticky" elevation={2}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            🏠 BuyHome
          </Typography>
          <ThemeModeButton />
          {isSyncing && <CircularProgress size={20} sx={{ color: 'white' }} />}
          <AuthSection />
        </Toolbar>
      </AppBar>

      {/* ── Content ── */}
      <Box
        sx={{
          flex: 1,
          bgcolor: 'background.default',
          px: { xs: 2, sm: 4 },
          py: 4,
          maxWidth: 1100,
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              I tuoi progetti
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Seleziona un progetto per calcolarne la rendita catastale, pianificare l'acquisto e verificare la sostenibilità del mutuo.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Tooltip title="Importa progetto da file JSON">
              <Button
                component="label"
                variant="outlined"
                startIcon={<FileUploadIcon />}
              >
                Importa
                <input type="file" accept=".json" hidden onChange={handleImportFile} />
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewDialogOpen(true)}
            >
              Nuovo progetto
            </Button>
          </Box>
        </Box>

        {/* Empty state */}
        {projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
            <HomeWorkIcon sx={{ fontSize: 80, opacity: 0.2, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Nessun progetto ancora
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              Crea il tuo primo progetto per calcolare la rendita catastale,
              analizzare scenari e pianificare l'acquisto dell'immobile.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setNewDialogOpen(true)}
            >
              Crea il primo progetto
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <ProjectCard
                  project={p}
                  onOpen={() => onOpen(p.id)}
                  onDelete={() => handleDelete(p.id, p.name)}
                  onExport={() => handleExport(p)}
                />
              </Grid>
            ))}
            {/* New project card */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  minHeight: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  opacity: 0.6,
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                  '&:hover': { opacity: 1, boxShadow: 2 },
                }}
                onClick={() => setNewDialogOpen(true)}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <AddIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography color="primary" fontWeight={600}>
                    Nuovo progetto
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Drive info box (when not authenticated and configured) */}
        {!isTokenValid && (
          <Alert severity="info" sx={{ mt: 4 }} icon={<CloudOffIcon />}>
            <strong>Accedi con Google</strong> (pulsante in alto a destra) per sincronizzare automaticamente i tuoi progetti su Google Drive e ritrovarli da qualsiasi dispositivo.
          </Alert>
        )}
      </Box>

      {/* New project dialog */}
      <NewProjectDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreate={handleCreate}
      />

      {/* Snackbar feedback */}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}

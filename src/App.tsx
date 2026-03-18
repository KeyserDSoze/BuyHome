import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EuroIcon from '@mui/icons-material/Euro';
import ApartmentIcon from '@mui/icons-material/Apartment';
import TuneIcon from '@mui/icons-material/Tune';
import CompareIcon from '@mui/icons-material/Compare';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useThemeMode } from './context/ThemeModeContext';
import ProjectListScreen from './components/ProjectListScreen';
import ProgettoTab from './components/ProgettoTab';
import TariffeTab from './components/TariffeTab';
import UnitaTab from './components/UnitaTab';
import RegoleTab from './components/RegoleTab';
import ScenariTab from './components/ScenariTab';
import RisultatiTab from './components/RisultatiTab';
import PersoneTab from './components/PersoneTab';
import ContrattoTab from './components/ContrattoTab';
import ImportFromUrlDialog from './components/ImportFromUrlDialog';
import { decodeProject, extractShareParam } from './sharing/shareCodec';
import { Project } from './models/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ display: value === index ? 'block' : 'none' }}
    >
      {value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
    </Box>
  );
}

function SaveIndicator() {
  const { lastSaved } = useProject();
  if (!lastSaved) return null;
  return (
    <Chip
      icon={<CloudDoneIcon />}
      label={`Salvato ${lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
      size="small"
      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', mr: 1 }}
    />
  );
}

function ThemeModeButton() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Tooltip title={mode === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'}>
      <IconButton color="inherit" onClick={toggleMode} sx={{ mr: 1 }}>
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

function AppContent() {
  const [tab, setTab] = useState(0);
  const { project, closeProject } = useProject();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          <Tooltip title="Torna alla lista progetti">
            <IconButton
              color="inherit"
              edge="start"
              onClick={closeProject}
              sx={{ mr: 1 }}
              aria-label="indietro"
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
            🏠 BuyHome
          </Typography>
          <Typography
            variant="body2"
            sx={{ flex: 1, opacity: 0.85, display: { xs: 'none', sm: 'block' } }}
          >
            {project.name}
            {project.jurisdiction.comune && ` — ${project.jurisdiction.comune}`}
          </Typography>
          <ThemeModeButton />
          <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <SaveIndicator />
          </Box>
        </Toolbar>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          textColor="inherit"
          indicatorColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ bgcolor: 'primary.dark', borderRadius: 0 }}
        >
          {([
            { icon: <HomeIcon />, label: 'Progetto' },
            { icon: <EuroIcon />, label: 'Tariffe' },
            { icon: <ApartmentIcon />, label: 'Unità' },
            { icon: <TuneIcon />, label: 'Regole' },
            { icon: <CompareIcon />, label: 'Scenari' },
            { icon: <AssessmentIcon />, label: 'Risultati' },
            { icon: <PeopleIcon />, label: 'Persone' },
            { icon: <ArticleIcon />, label: 'Contratto' },
          ] as const).map(({ icon, label }) => (
            <Tab
              key={label}
              icon={icon}
              label={<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>}
              iconPosition="start"
              sx={{
                minWidth: { xs: 44, sm: 90 },
                px: { xs: 0.5, sm: 2 },
                '& .MuiTab-iconWrapper': { mr: { xs: 0, sm: 1 } },
              }}
            />
          ))}
        </Tabs>
      </AppBar>

      <Box sx={{ flex: 1, bgcolor: 'background.default' }}>
        <TabPanel value={tab} index={0}><ProgettoTab /></TabPanel>
        <TabPanel value={tab} index={1}><TariffeTab /></TabPanel>
        <TabPanel value={tab} index={2}><UnitaTab /></TabPanel>
        <TabPanel value={tab} index={3}><RegoleTab /></TabPanel>
        <TabPanel value={tab} index={4}><ScenariTab /></TabPanel>
        <TabPanel value={tab} index={5}><RisultatiTab /></TabPanel>
        <TabPanel value={tab} index={6}><PersoneTab /></TabPanel>
        <TabPanel value={tab} index={7}><ContrattoTab /></TabPanel>
      </Box>
    </Box>
  );
}

// ── AppInner: uses auth context to sync on close ──────────────────────────────

function AppInner() {
  const { isTokenValid, syncToDrive } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pendingLinkImport, setPendingLinkImport] = useState<Project | null>(null);
  const [urlImportError, setUrlImportError] = useState(false);

  // Detect ?i= share param on first mount
  useEffect(() => {
    const param = extractShareParam();
    if (!param) return;
    // Clean URL immediately so refresh doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);
    try {
      setPendingLinkImport(decodeProject(param));
    } catch {
      setUrlImportError(true);
    }
  }, []);

  function handleOpen(id: string) {
    setActiveProjectId(id);
  }

  function handleClose() {
    setActiveProjectId(null);
    // Push latest save to Drive when leaving the editor
    if (isTokenValid) syncToDrive();
  }

  if (activeProjectId === null) {
    return (
      <>
        <ProjectListScreen onOpen={handleOpen} />
        {pendingLinkImport && (
          <ImportFromUrlDialog
            open
            project={pendingLinkImport}
            onClose={() => setPendingLinkImport(null)}
            onImported={id => { setPendingLinkImport(null); handleOpen(id); }}
          />
        )}
        <Snackbar open={urlImportError} autoHideDuration={5000} onClose={() => setUrlImportError(false)}>
          <Alert severity="error" onClose={() => setUrlImportError(false)}>Link di condivisione non valido o corrotto.</Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <ProjectProvider
      key={activeProjectId}
      projectId={activeProjectId}
      onClose={handleClose}
    >
      <AppContent />
    </ProjectProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

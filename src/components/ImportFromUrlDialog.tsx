import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert, Chip, Divider,
} from '@mui/material';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import { Project } from '../models/types';
import { getAllProjects, saveProject, deleteProject } from '../storage/projectsStore';

interface ImportFromUrlDialogProps {
  open: boolean;
  project: Project;        // decoded project from URL
  onImported: (id: string) => void;  // called with the saved project's ID
  onClose: () => void;
}

export default function ImportFromUrlDialog({ open, project, onImported, onClose }: ImportFromUrlDialogProps) {
  const [name, setName] = useState(project.name);

  const existingProjects = useMemo(() => getAllProjects(), [open]); // refresh on open

  const duplicate = useMemo(
    () => existingProjects.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase()),
    [name, existingProjects],
  );

  function handleImport() {
    const finalProject: Project = {
      ...project,
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (duplicate && duplicate.id !== finalProject.id) {
      // Overwrite: reuse existing ID and remove old entry first
      finalProject.id = duplicate.id;
      deleteProject(duplicate.id);
    }
    saveProject(finalProject);
    onImported(finalProject.id);
  }

  const unitCount = project.units?.length ?? 0;
  const scenarioCount = project.scenarios?.length ?? 0;
  const contractCount = project.contracts?.length ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DownloadDoneIcon color="primary" />
        Importa progetto condiviso
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${unitCount} unità`} size="small" variant="outlined" />
            <Chip label={`${scenarioCount} scenari`} size="small" variant="outlined" />
            {contractCount > 0 && (
              <Chip label={`${contractCount} contratti`} size="small" variant="outlined" color="primary" />
            )}
            {project.jurisdiction?.comune && (
              <Chip label={`📍 ${project.jurisdiction.comune}`} size="small" variant="outlined" />
            )}
          </Box>

          <Divider />

          <TextField
            label="Salva con il nome"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            size="small"
            helperText="Puoi rinominarlo prima di salvarlo"
          />

          {duplicate && (
            <Alert severity="warning">
              Esiste già un progetto di nome <strong>"{duplicate.name}"</strong>.
              Importando con questo nome, il progetto esistente verrà <strong>sovrascritto</strong>.
              Cambia il nome sopra per salvarlo come nuovo progetto.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          variant="contained"
          color={duplicate ? 'warning' : 'primary'}
          onClick={handleImport}
          disabled={!name.trim()}
        >
          {duplicate ? 'Sovrascrivere e importare' : 'Importa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

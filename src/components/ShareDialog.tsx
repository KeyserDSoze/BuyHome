import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, Tooltip, Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ShareIcon from '@mui/icons-material/Share';
import CheckIcon from '@mui/icons-material/Check';
import { Project } from '../models/types';
import { buildShareUrl } from '../sharing/shareCodec';

interface ShareDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

export default function ShareDialog({ open, project, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    try {
      setShareUrl(buildShareUrl(project));
    } catch {
      setError('Errore nella generazione del link di condivisione.');
    }
  }, [open, project]);

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleWhatsApp() {
    const text = `🏠 BuyHome – Progetto "${project.name}"\nClicca per aprirlo:\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  const unitCount = project.units?.length ?? 0;
  const scenarioCount = project.scenarios?.length ?? 0;
  const tariffCount = project.tariffs?.length ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon color="primary" />
        Condividi progetto
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Condividi <strong>{project.name}</strong>
              {project.jurisdiction?.comune && ` (${project.jurisdiction.comune})`}{' '}
              con {unitCount} {unitCount === 1 ? 'unità' : 'unità'}, {scenarioCount} {scenarioCount === 1 ? 'scenario' : 'scenari'}, {tariffCount} {tariffCount === 1 ? 'tariffa' : 'tariffe'}.
              Chi apre il link potrà importarlo direttamente in BuyHome.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                value={shareUrl}
                slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 11 } } }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Tooltip title={copied ? 'Copiato!' : 'Copia link'}>
                <IconButton color={copied ? 'success' : 'default'} onClick={handleCopy}>
                  {copied ? <CheckIcon /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsApp}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, color: 'white' }}
              fullWidth
            >
              Invia su WhatsApp
            </Button>

            <Typography variant="caption" color="text.secondary">
              Il link contiene tutti i dati del progetto in forma compatta. Non richiede account né login per essere importato.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}

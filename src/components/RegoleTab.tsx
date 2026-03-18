import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useProject } from '../context/ProjectContext';

const DEFAULT_COEFF_DIRECT = 1 / 3;
const DEFAULT_COEFF_COMP = 1 / 4;

export default function RegoleTab() {
  const { project, updateRuleSet } = useProject();
  const rs = project.ruleSet;

  function handleReset() {
    updateRuleSet({
      accessoryDirectCoeff: DEFAULT_COEFF_DIRECT,
      accessoryComplementaryCoeff: DEFAULT_COEFF_COMP,
      applyLargeRoomRagguaglio: false,
      vanoMaxMq: 26,
      dipendenzePct: 0,
    });
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Regole e Parametri di Calcolo
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        I parametri predefiniti sono quelli previsti dal <strong>DPR 1 dicembre 1949 n. 1142 (NCEU)</strong>,
        artt. 7–9. Modificali solo se hai indicazioni specifiche dell'Ufficio Provinciale del Territorio
        (ex Catasto) per la tua zona censuaria, oppure se un tecnico abilitato ti ha fornito regole locali
        diverse.
      </Alert>
      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>Per la maggior parte dei casi, non modificare nulla</strong>: i valori di default
        sono corretti per tutte le zone censuarie italiane, salvo situazioni particolari.
      </Alert>

      {/* ── Coefficienti vani accessori ────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Coefficienti Vani Accessori
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          I vani accessori non contano come vani interi ma come frazioni. Il regolamento NCEU
          (art. 8, DPR 1142/1949) stabilisce:
          <br />• <strong>Accessori diretti</strong> (bagni, ingressi, corridoi, disimpegni, ripostigli): <strong>1/3 di vano</strong>
          <br />• <strong>Accessori complementari</strong> (cantine, soffitte, sgomberi separati): <strong>1/4 di vano</strong>
          <br />Fonte: GU n. 5 del 7 gennaio 1950, art. 8 NCEU.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Coefficiente Accessori Diretti"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', max: '1' }}
              value={rs.accessoryDirectCoeff.toFixed(4)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 1) updateRuleSet({ accessoryDirectCoeff: v });
              }}
              helperText="Default 1/3 ≈ 0.3333 — bagni, ingressi, corridoi, disimpegni"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Coefficiente Accessori Complementari"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', max: '1' }}
              value={rs.accessoryComplementaryCoeff.toFixed(4)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 1) updateRuleSet({ accessoryComplementaryCoeff: v });
              }}
              helperText="Default 1/4 = 0.25 — cantine, soffitte, sgomberi"
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label={`Diretti: ${(rs.accessoryDirectCoeff * 100).toFixed(1)}%`} color="info" />
          <Chip label={`Complementari: ${(rs.accessoryComplementaryCoeff * 100).toFixed(1)}%`} color="secondary" />
        </Stack>
      </Paper>

      {/* ── Arrotondamento ─────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Arrotondamento al Mezzo Vano
        </Typography>
        <Typography variant="body2" color="text.secondary">
          La consistenza viene arrotondata al mezzo vano (0.5) secondo le seguenti regole:
        </Typography>
        <Box sx={{ mt: 1, pl: 2 }}>
          <Typography variant="body2">• Parte decimale &lt; 0.25 → arrotondamento per difetto al vano intero</Typography>
          <Typography variant="body2">• Parte decimale 0.25–0.74 → arrotondamento a 0.5</Typography>
          <Typography variant="body2">• Parte decimale ≥ 0.75 → arrotondamento per eccesso al vano intero</Typography>
        </Box>
        <Alert severity="success" sx={{ mt: 2 }}>
          Questa regola è fissa e non modificabile (art. NCEU).
        </Alert>
      </Paper>

      {/* ── Ragguaglio stanze grandi ───────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ragguaglio Stanze Grandi
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se una stanza principale supera la superficie massima di riferimento per la zona censuaria,
          può essere contata come più vani (ragguaglio proporzionale). Questa regola non è universale:
          verificala nelle istruzioni specifiche della tua zona censuaria o nella documentazione
          dell'Ufficio Provinciale del Territorio. Il valore limite tipico è <strong>26 m²</strong>.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={rs.applyLargeRoomRagguaglio}
              onChange={e => updateRuleSet({ applyLargeRoomRagguaglio: e.target.checked })}
            />
          }
          label="Applica ragguaglio per stanze grandi"
        />
        {rs.applyLargeRoomRagguaglio && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Superficie massima vano standard (m²)"
              type="number"
              inputProps={{ step: '1', min: '10', max: '100' }}
              value={rs.vanoMaxMq}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) updateRuleSet({ vanoMaxMq: v });
              }}
              helperText={`Formula: vani = 1 + (area - ${rs.vanoMaxMq}) / ${rs.vanoMaxMq} se area > ${rs.vanoMaxMq} m²`}
              sx={{ maxWidth: 300 }}
            />
          </Box>
        )}
      </Paper>

      {/* ── Incremento dipendenze ──────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Incremento Dipendenze (%)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          In alcune zone censuarie si applica un incremento percentuale ai vani totali per le
          «dipendenze» dell'unità (spazi esclusivi condominiali come cortile, orto, lavatoi). Default 0.
          Informati presso il tuo Ufficio Provinciale del Territorio se si applica nella tua zona.
        </Typography>
        <TextField
          label="Incremento dipendenze (%)"
          type="number"
          inputProps={{ step: '0.5', min: '0', max: '10' }}
          value={(rs.dipendenzePct * 100).toFixed(1)}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0 && v <= 10) updateRuleSet({ dipendenzePct: v / 100 });
          }}
          helperText="Default 0% — intervallo tipico 0–10%"
          sx={{ maxWidth: 250 }}
        />
      </Paper>

      <Divider sx={{ mb: 2 }} />
      <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset}>
        Ripristina Valori Predefiniti
      </Button>
    </Box>
  );
}

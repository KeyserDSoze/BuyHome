import { Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InfoTooltipProps {
  text: string;
  size?: 'small' | 'medium';
}

export default function InfoTooltip({ text, size = 'small' }: InfoTooltipProps) {
  return (
    <Tooltip
      title={text}
      placement="top"
      arrow
      componentsProps={{
        tooltip: {
          sx: { maxWidth: 320, fontSize: '0.8rem', lineHeight: 1.5 },
        },
      }}
    >
      <IconButton size={size} tabIndex={-1} sx={{ p: 0.3, color: 'info.main' }}>
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

import { Button } from '@mui/material';
import useLang from './useLang';

export default function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <Button color="inherit" size="small" onClick={toggleLang} sx={{ ml: 1 }}>
      {lang === 'es' ? 'EN' : 'ES'}
    </Button>
  );
}

import { Box, Container, IconButton, Stack, Typography } from '@mui/material';

const links = [
  { href: 'https://github.com', label: 'GitHub', icon: '/images/github.png' },
  { href: 'https://linkedin.com', label: 'LinkedIn', icon: '/images/linkedin.png' }
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: theme => `1px solid ${theme.palette.divider}`, py: 2, mt: 4 }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Penca. Todos los derechos reservados.
          </Typography>
          <Stack direction="row" spacing={1}>
            {links.map(link => (
              <IconButton
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                <Box component="img" src={link.icon} alt={link.label} sx={{ width: 24, height: 24 }} />
              </IconButton>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

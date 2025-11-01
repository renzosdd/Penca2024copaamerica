import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupTable from './GroupTable';
import { buildStageSections, countMatchesInStage } from './matchSections';
import { isGroupStage } from './stageOrdering';

export default function StageAccordionList({
  matches,
  groups = [],
  t,
  matchTimeValue,
  renderMatch,
  loading = false,
  emptyMessage = '',
  showGroupTables = false,
  stageLabelForKey
}) {
  const sections = useMemo(
    () =>
      buildStageSections(matches, {
        t,
        matchTimeValue,
        stageLabelForKey
      }),
    [matchTimeValue, matches, stageLabelForKey, t]
  );

  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const sectionRefs = useRef({});

  useEffect(() => {
    if (!sections.length) {
      setExpandedKeys([]);
      setSelectedKey('');
      sectionRefs.current = {};
      return;
    }

    sectionRefs.current = {};
    setExpandedKeys(prev => prev.filter(key => sections.some(section => section.key === key)));
  }, [sections]);

  useEffect(() => {
    if (!sections.some(section => section.key === selectedKey)) {
      setSelectedKey('');
    }
  }, [sections, selectedKey]);

  const registerSectionRef = (key, node) => {
    if (node) {
      sectionRefs.current[key] = node;
    } else if (sectionRefs.current[key]) {
      delete sectionRefs.current[key];
    }
  };

  const handleToggle = (key, expanded) => {
    setExpandedKeys(prev => {
      const filtered = prev.filter(item => item !== key);
      return expanded ? [...filtered, key] : filtered;
    });
  };

  const handleJump = value => {
    setSelectedKey(value);
    if (!value) {
      setExpandedKeys([]);
      return;
    }
    setExpandedKeys([value]);
    setTimeout(() => {
      const node = sectionRefs.current?.[value];
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          {t('loading')}
        </Typography>
      </Stack>
    );
  }

  if (!sections.length) {
    return emptyMessage ? (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {emptyMessage}
      </Typography>
    ) : null;
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {sections.length > 1 && (
        <TextField
          select
          size="small"
          label={t('jumpToStage')}
          value={selectedKey}
          onChange={e => handleJump(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">{t('jumpToStagePlaceholder')}</MenuItem>
          {sections.map(section => (
            <MenuItem key={section.key} value={section.key}>
              {section.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      {sections.map(section => (
        <Accordion
          key={section.key}
          expanded={expandedKeys.includes(section.key)}
          onChange={(_, expanded) => handleToggle(section.key, expanded)}
          disableGutters
          square
          ref={node => registerSectionRef(section.key, node)}
          sx={{
            borderRadius: 2,
            boxShadow: 0,
            backgroundColor: 'transparent',
            '&:before': { display: 'none' },
            '& .MuiAccordionSummary-root': { px: 1 },
            '& .MuiAccordionDetails-root': { px: 1 }
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
              <Typography variant="subtitle2">{section.label}</Typography>
              <Chip size="small" label={t('matchesCountLabel', { count: countMatchesInStage(section) })} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2} sx={{ pb: 1 }}>
              {section.dates.map(date => (
                <Stack key={date.key} spacing={1.5}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {date.label}
                  </Typography>
                  <Stack spacing={1.5}>
                    {date.matches.map(match => (
                      <Box key={match._id}>{renderMatch(match, section)}</Box>
                    ))}
                  </Stack>
                </Stack>
              ))}
              {showGroupTables &&
                Array.isArray(groups) &&
                groups.length > 0 &&
                isGroupStage(section.key) &&
                groups.some(gr => gr.group === section.key) && (
                  <GroupTable groups={groups.filter(gr => gr.group === section.key)} />
                )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}

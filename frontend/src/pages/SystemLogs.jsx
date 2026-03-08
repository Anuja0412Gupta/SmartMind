import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip,
  TextField, InputAdornment, Skeleton, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip,
} from '@mui/material';
import { Search, Refresh, Circle as CircleIcon } from '@mui/icons-material';
import { getSystemLogs } from '../services/api';

const LEVEL_CONFIG = {
  info: { color: '#0077B6', bg: '#E3F2FD' },
  warn: { color: '#FF8C00', bg: '#FFF3E0' },
  error: { color: '#E20015', bg: '#FFEBEE' },
  debug: { color: '#8884D8', bg: '#F3E5F5' },
};

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [serviceFilter, setServiceFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (serviceFilter) filters.service = serviceFilter;
      if (levelFilter) filters.level = levelFilter;
      if (eventSearch) filters.event = eventSearch;

      const data = await getSystemLogs(page + 1, rowsPerPage, filters);
      setLogs(data.logs);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Logs error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, rowsPerPage, serviceFilter, levelFilter]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') fetchLogs();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>System Logs</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>
            Monitor system events across all services
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchLogs} sx={{ bgcolor: 'rgba(226,0,21,0.06)' }}>
            <Refresh sx={{ color: '#E20015' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', py: 2 }}>
          <TextField
            size="small"
            placeholder="Search events..."
            value={eventSearch}
            onChange={e => setEventSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#999' }} /></InputAdornment>,
            }}
            sx={{ minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Service</InputLabel>
            <Select
              value={serviceFilter}
              onChange={e => { setServiceFilter(e.target.value); setPage(0); }}
              label="Service"
              sx={{ borderRadius: 2.5 }}
            >
              <MenuItem value="">All Services</MenuItem>
              <MenuItem value="api-service">API Service</MenuItem>
              <MenuItem value="worker-service">Worker Service</MenuItem>
              <MenuItem value="ai-service">AI Service</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Level</InputLabel>
            <Select
              value={levelFilter}
              onChange={e => { setLevelFilter(e.target.value); setPage(0); }}
              label="Level"
              sx={{ borderRadius: 2.5 }}
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warn">Warn</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>Level</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Metadata</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="textSecondary">No logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => {
                    const levelConf = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                    return (
                      <TableRow key={log._id || idx} hover>
                        <TableCell>
                          <Chip
                            icon={<CircleIcon sx={{ fontSize: '8px !important' }} />}
                            label={log.level?.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: levelConf.bg,
                              color: levelConf.color,
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.service}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                            {log.event}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: '#5F6368',
                            }}
                          >
                            {log.metadata ? JSON.stringify(log.metadata) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: '#999', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

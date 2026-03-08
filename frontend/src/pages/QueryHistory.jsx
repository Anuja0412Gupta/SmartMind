import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip,
  TextField, InputAdornment, Skeleton,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { getQueryHistory } from '../services/api';

const STATUS_COLORS = {
  completed: 'success',
  processing: 'warning',
  queued: 'info',
  failed: 'error',
  escalated: 'warning',
};

export default function QueryHistory() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getQueryHistory(page + 1, rowsPerPage);
      setQueries(data.queries);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [page, rowsPerPage]);

  const filteredQueries = search
    ? queries.filter(q => q.queryText?.toLowerCase().includes(search.toLowerCase()))
    : queries;

  const getConfidenceColor = (c) => {
    if (c >= 0.8) return '#00884A';
    if (c >= 0.6) return '#FF8C00';
    return '#E20015';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Query History</Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#5F6368' }}>
        Browse all submitted support queries and their AI responses
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #E0E0E0' }}>
            <TextField
              size="small"
              placeholder="Filter queries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#999' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '30%' }}>Query</TableCell>
                  <TableCell sx={{ width: '30%' }}>Response</TableCell>
                  <TableCell align="center">Confidence</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredQueries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="textSecondary">
                        No queries found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQueries.map((q) => (
                    <TableRow key={q._id} hover sx={{ '&:hover': { bgcolor: '#FAFAFA' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.queryText}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5F6368' }}>
                          {q.responseText || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {q.confidence != null ? (
                          <Chip
                            label={`${(q.confidence * 100).toFixed(0)}%`}
                            size="small"
                            sx={{
                              bgcolor: `${getConfidenceColor(q.confidence)}15`,
                              color: getConfidenceColor(q.confidence),
                              fontWeight: 600,
                              minWidth: 52,
                            }}
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={q.status}
                          size="small"
                          color={STATUS_COLORS[q.status] || 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(q.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
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
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

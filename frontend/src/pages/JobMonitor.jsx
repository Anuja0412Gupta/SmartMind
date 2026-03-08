import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Grid, Paper, Skeleton,
  IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllJobs } from '../services/api';

const STATUS_CONFIG = {
  completed: { color: 'success', bg: '#E8F5E9' },
  processing: { color: 'warning', bg: '#FFF3E0' },
  queued: { color: 'info', bg: '#E3F2FD' },
  failed: { color: 'error', bg: '#FFEBEE' },
  escalated: { color: 'warning', bg: '#FFF8E1' },
};

export default function JobMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const result = await getAllJobs();
      setData(result);
    } catch (err) {
      console.error('Jobs error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.queueMetrics || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Job Monitor</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>
            Monitor background inference jobs and queue health
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchJobs} sx={{ bgcolor: 'rgba(226,0,21,0.06)' }}>
            <RefreshIcon sx={{ color: '#E20015' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Queue Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Waiting', value: metrics.waiting || 0, color: '#0077B6' },
          { label: 'Active', value: metrics.active || 0, color: '#FF8C00' },
          { label: 'Completed', value: metrics.completed || 0, color: '#00884A' },
          { label: 'Failed', value: metrics.failed || 0, color: '#E20015' },
          { label: 'Delayed', value: metrics.delayed || 0, color: '#8884D8' },
        ].map(m => (
          <Grid item xs={6} sm={4} md key={m.label}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', border: '1px solid #E0E0E0', borderRadius: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: m.color }}>
                {m.value}
              </Typography>
              <Typography variant="caption" sx={{ color: '#999' }}>{m.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Jobs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Query</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Category</TableCell>
                  <TableCell align="center">Processing Time</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                ) : !data?.jobs?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="textSecondary">No jobs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.jobs.map(job => (
                    <TableRow key={job.jobId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#5F6368' }}>
                          {job.jobId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.queryText}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={job.status}
                          size="small"
                          color={STATUS_CONFIG[job.status]?.color || 'default'}
                          sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={job.category || 'general'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: '#5F6368' }}>
                          {job.processingTime ? `${job.processingTime}s` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(job.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

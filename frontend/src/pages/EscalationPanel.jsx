import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Skeleton,
  Alert, IconButton, Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon, CheckCircle, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getEscalations, resolveEscalation } from '../services/api';

export default function EscalationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [resolveText, setResolveText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const result = await getEscalations();
      setData(result);
    } catch (err) {
      console.error('Escalation error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEscalations(); }, []);

  const handleResolve = async () => {
    if (!selectedQuery || !resolveText.trim()) return;
    setResolving(true);
    try {
      await resolveEscalation(selectedQuery.jobId, resolveText);
      setDialogOpen(false);
      setResolveText('');
      setSelectedQuery(null);
      fetchEscalations();
    } catch (err) {
      console.error('Resolve error:', err);
    }
    setResolving(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Escalation Panel</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>
            Review and resolve low-confidence AI responses
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {data && (
            <Chip
              icon={<WarningIcon />}
              label={`Threshold: ${((data.confidenceThreshold || 0.65) * 100).toFixed(0)}%`}
              color="warning"
              variant="outlined"
              size="small"
            />
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={fetchEscalations} sx={{ bgcolor: 'rgba(226,0,21,0.06)' }}>
              <RefreshIcon sx={{ color: '#E20015' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {data?.queries?.length === 0 && !loading && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ borderRadius: 3, mb: 3 }}
        >
          No escalations pending. All AI responses are above the confidence threshold.
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Query</TableCell>
                  <TableCell>AI Response</TableCell>
                  <TableCell align="center">Confidence</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                ) : (
                  data?.queries?.map(q => (
                    <TableRow key={q.jobId} hover sx={{ bgcolor: 'rgba(255,152,0,0.03)' }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {q.jobId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {q.queryText}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5F6368' }}>
                          {q.responseText || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${((q.confidence || 0) * 100).toFixed(0)}%`}
                          size="small"
                          sx={{ bgcolor: '#FFEBEE', color: '#E20015', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(q.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => { setSelectedQuery(q); setDialogOpen(true); }}
                          sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem' }}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Resolve Escalation
        </DialogTitle>
        <DialogContent>
          {selectedQuery && (
            <>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Original Query:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#5F6368', bgcolor: '#F5F5F5', p: 2, borderRadius: 2 }}>
                {selectedQuery.queryText}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                AI Response (Confidence: {((selectedQuery.confidence || 0) * 100).toFixed(0)}%):
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: '#5F6368', bgcolor: '#FFF3E0', p: 2, borderRadius: 2, fontSize: '0.85rem' }}>
                {selectedQuery.responseText?.substring(0, 300) || '—'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Admin Approved Response"
                placeholder="Provide the correct response..."
                value={resolveText}
                onChange={e => setResolveText(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleResolve}
            disabled={!resolveText.trim() || resolving}
          >
            {resolving ? 'Resolving...' : 'Approve & Resolve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

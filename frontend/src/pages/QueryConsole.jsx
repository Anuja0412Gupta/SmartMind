import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Chip,
  LinearProgress, Fade, Paper, IconButton, Rating, Divider,
  Alert, Skeleton, Collapse,
} from '@mui/material';
import {
  Send as SendIcon, Psychology as AIIcon, Source as SourceIcon,
  ThumbUp, ThumbDown, Speed as SpeedIcon, CachedOutlined,
  CheckCircle, AccessTime, ErrorOutline,
} from '@mui/icons-material';
import { submitQuery, getJobStatus, submitFeedback } from '../services/api';

const STATUS_CONFIG = {
  queued: { color: 'info', icon: <AccessTime />, label: 'Queued' },
  processing: { color: 'warning', icon: <SpeedIcon />, label: 'Processing...' },
  completed: { color: 'success', icon: <CheckCircle />, label: 'Completed' },
  failed: { color: 'error', icon: <ErrorOutline />, label: 'Failed' },
  escalated: { color: 'warning', icon: <ErrorOutline />, label: 'Escalated' },
};

export default function QueryConsole() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Polling for job status
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed' || status === 'escalated') return;

    const interval = setInterval(async () => {
      try {
        const data = await getJobStatus(jobId);
        setStatus(data.status);
        setPollCount(prev => prev + 1);

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'escalated') {
          setResult(data);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('queued');
    setFeedbackSent(false);
    setPollCount(0);

    try {
      const data = await submitQuery(query);
      
      if (data.cached) {
        setResult(data);
        setStatus('completed');
        setJobId(data.jobId);
        setLoading(false);
      } else {
        setJobId(data.jobId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit query');
      setLoading(false);
      setStatus(null);
    }
  };

  const handleFeedback = async (rating) => {
    if (!jobId || feedbackSent) return;
    try {
      await submitFeedback(jobId, rating);
      setFeedbackSent(true);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#00884A';
    if (confidence >= 0.6) return '#FF8C00';
    return '#E20015';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5, color: '#1B1B1B' }}>
        Query Console
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: '#5F6368' }}>
        Submit technical support queries for AI-powered analysis and resolution
      </Typography>

      {/* Input Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={6}
              placeholder="Ask a technical support question... (e.g., 'How do I reset my device?' or 'Network error NET_002')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: '#F8F9FA',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              sx={{
                minWidth: 120,
                height: 56,
                borderRadius: 3,
                fontSize: '0.95rem',
              }}
              startIcon={<SendIcon />}
            >
              Submit
            </Button>
          </Box>

          {/* Quick Examples */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#999', mr: 1, lineHeight: '32px' }}>
              Try:
            </Typography>
            {[
              'How do I reset my device?',
              'Network error NET_002',
              'MEMORY_OVERFLOW in error logs',
              'How to update firmware?',
            ].map((example) => (
              <Chip
                key={example}
                label={example}
                size="small"
                onClick={() => setQuery(example)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: 'rgba(226,0,21,0.06)',
                  color: '#E20015',
                  '&:hover': { bgcolor: 'rgba(226,0,21,0.12)' },
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Error */}
      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      </Collapse>

      {/* Processing Status */}
      <Collapse in={loading}>
        <Card sx={{ mb: 3, overflow: 'visible' }}>
          <LinearProgress
            color={status === 'processing' ? 'warning' : 'primary'}
            sx={{ borderRadius: '16px 16px 0 0' }}
          />
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(226,0,21,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                }}
              >
                <AIIcon sx={{ color: '#E20015' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B1B1B' }}>
                  {STATUS_CONFIG[status]?.label || 'Processing...'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Job ID: {jobId} • Poll #{pollCount}
                </Typography>
              </Box>
              {status && STATUS_CONFIG[status] && (
                <Chip
                  icon={STATUS_CONFIG[status].icon}
                  label={STATUS_CONFIG[status].label}
                  color={STATUS_CONFIG[status].color}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      {/* Result */}
      <Collapse in={!!result && !loading}>
        <Fade in={!!result && !loading}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(0,136,74,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AIIcon sx={{ color: '#00884A' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B1B1B' }}>
                    AI Response
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    {result?.cached && (
                      <Chip
                        icon={<CachedOutlined />}
                        label="Cached"
                        size="small"
                        sx={{ bgcolor: 'rgba(0,119,182,0.1)', color: '#0077B6', height: 24 }}
                      />
                    )}
                    {result?.confidence != null && (
                      <Chip
                        label={`Confidence: ${(result.confidence * 100).toFixed(1)}%`}
                        size="small"
                        sx={{
                          bgcolor: `${getConfidenceColor(result.confidence)}15`,
                          color: getConfidenceColor(result.confidence),
                          fontWeight: 600,
                          height: 24,
                        }}
                      />
                    )}
                  </Box>
                </Box>
                {result?.processingTime != null && (
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    {result.processingTime}s
                  </Typography>
                )}
              </Box>

              {/* Response Text */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: '#F8F9FA',
                  borderRadius: 3,
                  mb: 2,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  fontSize: '0.9rem',
                }}
              >
                {result?.response}
              </Paper>

              {/* Sources */}
              {result?.sources?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <SourceIcon sx={{ fontSize: 16, color: '#999' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#999' }}>
                      SOURCES
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {result.sources.map((src, idx) => (
                      <Chip
                        key={idx}
                        label={src}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Feedback */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Was this helpful?
                </Typography>
                <IconButton
                  onClick={() => handleFeedback('up')}
                  disabled={feedbackSent}
                  sx={{ color: feedbackSent ? '#00884A' : '#9AA0A6' }}
                >
                  <ThumbUp fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => handleFeedback('down')}
                  disabled={feedbackSent}
                  sx={{ color: feedbackSent ? '#E20015' : '#9AA0A6' }}
                >
                  <ThumbDown fontSize="small" />
                </IconButton>
                {feedbackSent && (
                  <Typography variant="caption" sx={{ color: '#00884A' }}>
                    Thanks for your feedback!
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Collapse>
    </Box>
  );
}

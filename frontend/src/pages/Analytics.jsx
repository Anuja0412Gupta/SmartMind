import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Skeleton, Chip,
} from '@mui/material';
import {
  TrendingUp, Speed, Verified, Today, CachedOutlined,
  Warning, ThumbUp, ThumbDown,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { getAnalyticsSummary } from '../services/api';

const COLORS = ['#E20015', '#0077B6', '#00884A', '#FF8C00', '#8884D8', '#82CA9D'];

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: color || '#1B1B1B' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#999', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${color || '#E20015'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.cloneElement(icon, { sx: { color: color || '#E20015', fontSize: 22 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summary = await getAnalyticsSummary();
        setData(summary);
      } catch (err) {
        console.error('Analytics error:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Analytics</Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const dailyData = data?.dailyQueries?.map(d => ({
    date: d._id?.slice(5),
    queries: d.count,
  })) || [];

  const categoryData = data?.categoryBreakdown?.map(c => ({
    name: c._id || 'unknown',
    value: c.count,
  })) || [];

  const statusData = data?.statusBreakdown?.map(s => ({
    name: s._id,
    value: s.count,
  })) || [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Analytics Dashboard</Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#5F6368' }}>
        System performance metrics and query insights
      </Typography>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Queries Today" value={data?.queriesToday || 0} icon={<Today />} color="#E20015" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Total Queries" value={data?.totalQueries || 0} icon={<TrendingUp />} color="#0077B6" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Avg Latency" value={`${data?.avgLatency || 0}s`} icon={<Speed />} color="#FF8C00" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Accuracy" value={`${((data?.accuracy || 0) * 100).toFixed(0)}%`} icon={<Verified />} color="#00884A" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Cache Hit Rate" value={`${((data?.cacheHitRate || 0) * 100).toFixed(0)}%`} icon={<CachedOutlined />} color="#8884D8" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="Escalation Rate" value={`${((data?.escalationRate || 0) * 100).toFixed(0)}%`} icon={<Warning />} color="#FF5722" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Daily Queries */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Queries Per Day</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E20015" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#E20015" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="queries" stroke="#E20015" fill="url(#colorQueries)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Query Categories</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Status Distribution</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {statusData.map((entry, idx) => {
                      const c = { completed: '#00884A', failed: '#E20015', processing: '#FF8C00', queued: '#0077B6', escalated: '#FF5722' };
                      return <Cell key={idx} fill={c[entry.name] || '#8884D8'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Feedback Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>User Feedback</Typography>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', py: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(0,136,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                    <ThumbUp sx={{ color: '#00884A', fontSize: 32 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#00884A' }}>
                    {data?.feedbackSummary?.upVotes || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>Helpful</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(226,0,21,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                    <ThumbDown sx={{ color: '#E20015', fontSize: 32 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#E20015' }}>
                    {data?.feedbackSummary?.downVotes || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>Not Helpful</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(0,119,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                    <Verified sx={{ color: '#0077B6', fontSize: 32 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0077B6' }}>
                    {data?.feedbackSummary?.total || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>Total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

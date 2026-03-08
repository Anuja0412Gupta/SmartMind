import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Layout from './components/Layout';
import QueryConsole from './pages/QueryConsole';
import QueryHistory from './pages/QueryHistory';
import Analytics from './pages/Analytics';
import JobMonitor from './pages/JobMonitor';
import EscalationPanel from './pages/EscalationPanel';
import SystemLogs from './pages/SystemLogs';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<QueryConsole />} />
            <Route path="/history" element={<QueryHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/jobs" element={<JobMonitor />} />
            <Route path="/escalation" element={<EscalationPanel />} />
            <Route path="/logs" element={<SystemLogs />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;

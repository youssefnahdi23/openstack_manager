import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { instancesAPI, monitoringAPI } from '../api/axios';
import ServerIcon from '@mui/icons-material/Dns';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [instancesRes, metricsRes] = await Promise.all([
        instancesAPI.list(),
        monitoringAPI.getSystemMetrics(),
      ]);
      setInstances(instancesRes.data.instances || []);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runningInstances = instances.filter(i => i.status === 'ACTIVE').length;
  const totalInstances = instances.length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ServerIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Instances</Typography>
              </Box>
              <Typography variant="h4">{totalInstances}</Typography>
              <Typography variant="body2" color="text.secondary">
                {runningInstances} running
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">CPU</Typography>
              </Box>
              <Typography variant="h4">
                {metrics?.cpu?.percent?.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics?.cpu?.count} cores
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Memory</Typography>
              </Box>
              <Typography variant="h4">
                {metrics?.memory?.percent?.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(metrics?.memory?.used / 1024 / 1024 / 1024)?.toFixed(1)} GB used
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkCheckIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Network</Typography>
              </Box>
              <Typography variant="h4">
                {(metrics?.network?.bytes_recv / 1024 / 1024)?.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                MB received
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Metrics
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[metrics]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu.percent" stroke="#1a73e8" name="CPU %" />
                <Line type="monotone" dataKey="memory.percent" stroke="#ff6d00" name="Memory %" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
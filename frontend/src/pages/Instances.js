import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { instancesAPI } from '../api/axios';

function Instances() {
  const [instances, setInstances] = useState([]);
  const [images, setImages] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [newInstance, setNewInstance] = useState({
    name: '',
    image_id: '',
    flavor_id: '',
    network_id: '',
  });

  useEffect(() => {
    fetchInstances();
    fetchResources();
  }, []);

  const fetchInstances = async () => {
    try {
      const response = await instancesAPI.list();
      setInstances(response.data.instances || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const [imagesRes, flavorsRes, networksRes] = await Promise.all([
        instancesAPI.listImages(),
        instancesAPI.listFlavors(),
        instancesAPI.listNetworks(),
      ]);
      setImages(imagesRes.data.images || []);
      setFlavors(flavorsRes.data.flavors || []);
      setNetworks(networksRes.data.networks || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handleAction = async (instanceId, action) => {
    try {
      await instancesAPI.action(instanceId, action);
      fetchInstances();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const handleDelete = async (instanceId) => {
    if (window.confirm('Are you sure you want to delete this instance?')) {
      try {
        await instancesAPI.delete(instanceId);
        fetchInstances();
      } catch (error) {
        console.error('Error deleting instance:', error);
      }
    }
  };

  const handleCreate = async () => {
    try {
      await instancesAPI.create(newInstance);
      setOpenCreate(false);
      setNewInstance({ name: '', image_id: '', flavor_id: '', network_id: '' });
      fetchInstances();
    } catch (error) {
      console.error('Error creating instance:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SHUTOFF': return 'error';
      case 'SUSPENDED': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Instances</Typography>
        <Box>
          <IconButton onClick={fetchInstances} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreate(true)}
          >
            Create Instance
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {instances.map((instance) => (
          <Grid item xs={12} sm={6} md={4} key={instance.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{instance.name}</Typography>
                  <Chip
                    label={instance.status}
                    color={getStatusColor(instance.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ID: {instance.id.substring(0, 8)}...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(instance.created).toLocaleDateString()}
                </Typography>
                {instance.addresses && Object.entries(instance.addresses).map(([network, addrs]) => (
                  <Typography key={network} variant="body2" color="text.secondary">
                    {network}: {addrs.join(', ')}
                  </Typography>
                ))}
              </CardContent>
              <CardActions>
                {instance.status === 'SHUTOFF' && (
                  <IconButton onClick={() => handleAction(instance.id, 'start')} color="success">
                    <PlayArrowIcon />
                  </IconButton>
                )}
                {instance.status === 'ACTIVE' && (
                  <IconButton onClick={() => handleAction(instance.id, 'stop')} color="error">
                    <StopIcon />
                  </IconButton>
                )}
                <IconButton onClick={() => handleAction(instance.id, 'reboot')}>
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(instance.id)} color="error">
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Instance</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Instance Name"
            fullWidth
            value={newInstance.name}
            onChange={(e) => setNewInstance({ ...newInstance, name: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Image</InputLabel>
            <Select
              value={newInstance.image_id}
              onChange={(e) => setNewInstance({ ...newInstance, image_id: e.target.value })}
            >
              {images.map((image) => (
                <MenuItem key={image.id} value={image.id}>{image.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Flavor</InputLabel>
            <Select
              value={newInstance.flavor_id}
              onChange={(e) => setNewInstance({ ...newInstance, flavor_id: e.target.value })}
            >
              {flavors.map((flavor) => (
                <MenuItem key={flavor.id} value={flavor.id}>
                  {flavor.name} (RAM: {flavor.ram}MB, vCPUs: {flavor.vcpus})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Network</InputLabel>
            <Select
              value={newInstance.network_id}
              onChange={(e) => setNewInstance({ ...newInstance, network_id: e.target.value })}
            >
              {networks.map((network) => (
                <MenuItem key={network.id} value={network.id}>{network.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Instances;
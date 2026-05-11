import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';

function Settings() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          OpenStack Configuration
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Auth URL"
              secondary={process.env.REACT_APP_API_URL || 'http://192.168.91.128:5000/api'}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="OpenStack Host"
              secondary="192.168.91.128"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="Username"
              secondary="admin"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}

export default Settings;
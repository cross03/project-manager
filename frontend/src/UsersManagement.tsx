import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Button, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Box, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function UsersManagement({ token, onBack }: { token: string; onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ email: '', role: '' });
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const response = await axios.get(`${API_URL}/api/users?username=${token}`);
    setUsers(response.data);
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditForm({ email: user.email, role: user.role });
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    await axios.put(`${API_URL}/api/users/${selectedUser.username}?username=${token}`, editForm);
    loadUsers();
    setOpenEditDialog(false);
    setMessage({ type: 'success', text: 'User updated successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.password || !createForm.email) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    try {
      await axios.post(`${API_URL}/api/admin/users?admin_username=${token}`, createForm);
      loadUsers();
      setOpenCreateDialog(false);
      setCreateForm({ username: '', email: '', password: '', role: 'user' });
      setMessage({ type: 'success', text: `User ${createForm.username} created successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Error creating user' });
    }
  };

  const handleDelete = async (username: string) => {
    if (window.confirm(`Delete user ${username}?`)) {
      await axios.delete(`${API_URL}/api/users/${username}?username=${token}`);
      loadUsers();
      setMessage({ type: 'success', text: `User ${username} deleted` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminPanelSettingsIcon fontSize="small" />;
      case 'editor': return <EditNoteIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      default: return 'default';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      default: return 'User';
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users Management</Typography>
        <Box>
          <Button variant="contained" onClick={() => setOpenCreateDialog(true)} startIcon={<AddIcon />} sx={{ mr: 2 }}>
            Create User
          </Button>
          <Button variant="outlined" onClick={onBack}>Back to Dashboard</Button>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.username}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={getRoleName(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(user)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(user.username)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Role"
            select
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            slotProps={{ select: { native: true } }}
          >
            <option value="user">User (только просмотр)</option>
            <option value="editor">Editor (может создавать/редактировать)</option>
            <option value="admin">Admin (полный доступ)</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Username (login)"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Role"
            select
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            slotProps={{ select: { native: true } }}
          >
            <option value="user">User (только просмотр)</option>
            <option value="editor">Editor (может создавать/редактировать)</option>
            <option value="admin">Admin (полный доступ)</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UsersManagement;

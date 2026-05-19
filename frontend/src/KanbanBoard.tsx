import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, IconButton,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Autocomplete, Tooltip,
  Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import axios from 'axios';
import TaskDetailDialog from './TaskDetailDialog';

const API_URL = 'http://10.221.8.140:8000';

const statuses = [
  { id: 'todo', title: 'To Do', color: '#ffffff', borderColor: '#e0e0e0' },
  { id: 'in_progress', title: 'In Progress', color: '#fff3e0', borderColor: '#ff9800' },
  { id: 'review', title: 'On Hold', color: '#e3f2fd', borderColor: '#2196f3' },
  { id: 'done', title: 'Completed', color: '#e8f5e9', borderColor: '#4caf50' }
];

const priorities = [
  { id: 'low', title: 'Low', icon: '🟢', color: '#4caf50' },
  { id: 'medium', title: 'Medium', icon: '🟠', color: '#ff9800' },
  { id: 'high', title: 'High', icon: '🔴', color: '#f44336' },
  { id: 'urgent', title: 'Urgent', icon: '🟣', color: '#9c27b0' }
];

function KanbanBoard({ projectId, token, userRole }: { projectId: number; token: string; userRole: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTaskDetail, setOpenTaskDetail] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as const });
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'todo', priority: 'medium', tags: [] as string[], assignee: '', due_date: ''
  });
  const [newTag, setNewTag] = useState('');

  const loadTasks = useCallback(async () => {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks?username=${token}`);
    setTasks(response.data);
  }, [projectId, token]);

  const loadUsers = useCallback(async () => {
    const response = await axios.get(`${API_URL}/api/all-users?username=${token}`);
    setUsers(response.data);
  }, [token]);

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  const canEdit = () => userRole === 'admin' || userRole === 'editor';
  const canDelete = () => userRole === 'admin' || userRole === 'editor';

  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: task.id, status: task.status, priority: task.priority }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const { id, status: oldStatus, priority: oldPriority } = JSON.parse(data);
    if (oldStatus === newStatus) return;

    try {
      const updateData: any = { status: newStatus };

      // Если задача перемещена в "Completed", меняем приоритет на Low
      if (newStatus === 'done' && oldPriority !== 'low') {
        updateData.priority = 'low';
        setSnackbar({ open: true, message: `Task completed! Priority automatically changed to Low 🟢`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `Task moved to ${statuses.find(s => s.id === newStatus)?.title}`, severity: 'success' });
      }

      await axios.put(`${API_URL}/api/tasks/${id}?username=${token}`, updateData);
      await loadTasks();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to move task', severity: 'success' });
    }
  };

  const handleSave = async () => {
    try {
      if (editingTask) {
        await axios.put(`${API_URL}/api/tasks/${editingTask.id}?username=${token}`, formData);
      } else {
        await axios.post(`${API_URL}/api/tasks?username=${token}`, { ...formData, project_id: projectId, created_by: token });
      }
      await loadTasks();
      handleCloseDialog();
      setSnackbar({ open: true, message: editingTask ? 'Task updated!' : 'Task created!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save task', severity: 'success' });
    }
  };

  const handleDelete = async (taskId: number) => {
    if (window.confirm('Delete this task?')) {
      await axios.delete(`${API_URL}/api/tasks/${taskId}?username=${token}`);
      await loadTasks();
      setSnackbar({ open: true, message: 'Task deleted!', severity: 'success' });
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setFormData({ title: '', description: '', status: 'todo', priority: 'medium', tags: [], assignee: '', due_date: '' });
    setNewTag('');
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const getPriorityInfo = (priorityId: string) => {
    return priorities.find(p => p.id === priorityId) || priorities[1];
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks - Drag and drop between columns</Typography>
        {canEdit() && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>Add Task</Button>}
      </Box>

      <Grid container spacing={2}>
        {statuses.map(status => (
          <Grid size={{ xs: 12, md: 3 }} key={status.id}>
            <Card sx={{ bgcolor: status.color, minHeight: 500, maxHeight: 650, overflow: 'auto', border: `1px solid ${status.borderColor}` }}
              onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status.id)}>
              <CardContent>
                <Typography variant="h6" sx={{ color: status.id === 'todo' ? '#000' : status.id === 'in_progress' ? '#e65100' : status.id === 'review' ? '#0d47a1' : '#1b5e20' }}>
                  {status.title} ({getTasksByStatus(status.id).length})
                  {status.id === 'done' && <Typography component="span" variant="caption" sx={{ ml: 1, color: 'success.main' }}>(Auto Low Priority)</Typography>}
                </Typography>
                {getTasksByStatus(status.id).map(task => {
                  const priorityInfo = getPriorityInfo(task.priority);
                  const overdue = isOverdue(task.due_date) && task.status !== 'done';
                  return (
                    <Card key={task.id} draggable={canEdit()} onDragStart={(e) => handleDragStart(e, task)}
                      sx={{ mb: 1, bgcolor: '#fff', cursor: 'grab', '&:hover': { boxShadow: 3 }, borderLeft: overdue ? '4px solid #f44336' : 'none' }}>
                      <CardContent sx={{ py: 1 }} onClick={() => setSelectedTask(task)}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{task.title}</Typography>
                          <Tooltip title={`Priority: ${priorityInfo.title}`}>
                            <Typography sx={{ fontSize: 18 }}>{priorityInfo.icon}</Typography>
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{task.description?.substring(0, 50)}</Typography>
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {task.assignee && <Chip label={task.assignee} size="small" />}
                          <Box>
                            {canEdit() && <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingTask(task); setFormData({ ...task, tags: task.tags || [] }); setOpenDialog(true); }}><EditIcon fontSize="small" /></IconButton>}
                            {canDelete() && <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}><DeleteIcon fontSize="small" /></IconButton>}
                          </Box>
                        </Box>
                        {task.due_date && (
                          <Typography variant="caption" sx={{ color: overdue ? 'error.main' : 'text.secondary', fontWeight: overdue ? 'bold' : 'normal' }}>
                            Due: {new Date(task.due_date).toLocaleDateString()}{overdue && ' ⚠️ OVERDUE'}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <TextField fullWidth margin="dense" label="Description" multiline rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              {statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
              {priorities.map(p => <MenuItem key={p.id} value={p.id}>{p.icon} {p.title}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {formData.tags.map(tag => <Chip key={tag} label={tag} size="small" onDelete={() => removeTag(tag)} icon={<LocalOfferIcon />} />)}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" placeholder="New tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag()} />
              <Button onClick={addTag} variant="outlined" size="small">Add Tag</Button>
            </Box>
          </Box>
          <Autocomplete fullWidth options={users} value={formData.assignee || null} onChange={(e, v) => setFormData({ ...formData, assignee: v || '' })} renderInput={(params) => <TextField {...params} margin="dense" label="Assignee" />} />
          <TextField fullWidth margin="dense" label="Due Date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {selectedTask && <TaskDetailDialog task={selectedTask} open={openTaskDetail} onClose={() => setOpenTaskDetail(false)} onUpdate={loadTasks} token={token} users={users} />}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default KanbanBoard;

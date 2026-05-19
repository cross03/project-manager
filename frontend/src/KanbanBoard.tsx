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
  { id: 'todo', title: 'To Do', color: '#ffffff', borderColor: '#e0e0e0', textColor: '#000000' },
  { id: 'in_progress', title: 'In Progress', color: '#fff3e0', borderColor: '#ff9800', textColor: '#e65100' },
  { id: 'review', title: 'On Hold', color: '#e3f2fd', borderColor: '#2196f3', textColor: '#0d47a1' },
  { id: 'done', title: 'Completed', color: '#e8f5e9', borderColor: '#4caf50', textColor: '#1b5e20' }
];

const priorities = [
  { id: 'low', title: 'Low', icon: '🟢' },
  { id: 'medium', title: 'Medium', icon: '🟠' },
  { id: 'high', title: 'High', icon: '🔴' },
  { id: 'urgent', title: 'Urgent', icon: '🟣' }
];

function getTaskCardColor(task: any): string {
  if (task.status === 'done') return '#e8f5e9';
  if (task.due_date) {
    const today = new Date();
    const dueDate = new Date(task.due_date);
    if (dueDate < today) return '#ffebee';
  }
  switch (task.status) {
    case 'todo': return '#ffffff';
    case 'in_progress': return '#fff3e0';
    case 'review': return '#e3f2fd';
    default: return '#ffffff';
  }
}

function getStatusBorderColor(task: any): string {
  if (task.status === 'done') return '#4caf50';
  if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done') return '#f44336';
  switch (task.status) {
    case 'todo': return '#e0e0e0';
    case 'in_progress': return '#ff9800';
    case 'review': return '#2196f3';
    default: return '#e0e0e0';
  }
}

function AutoExpandingTextarea({ value, onChange, placeholder, margin = 'dense', minRows = 2, maxRows = 10 }: any) {
  const [rows, setRows] = useState<number>(minRows);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    const text = e.target.value;
    const lines = text.split('\n');
    let lineCount = lines.length;
    for (const line of lines) {
      lineCount += Math.floor(line.length / 50);
    }
    const newRows = Math.min(maxRows, Math.max(minRows, lineCount));
    setRows(newRows);
  };

  return (
    <TextField
      fullWidth
      margin={margin}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      multiline
      rows={rows}
      sx={{
        '& textarea': {
          resize: 'vertical',
          overflow: rows >= maxRows ? 'auto' : 'hidden'
        }
      }}
    />
  );
}

function KanbanBoard({ projectId, token, userRole }: { projectId: number; token: string; userRole: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<string[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTaskDetail, setOpenTaskDetail] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [] as string[],
    assignees: [] as string[],
    due_date: ''
  });
  const [newTag, setNewTag] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks?username=${token}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [projectId, token]);

  const loadProjectUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/users?username=${token}`);
      setProjectUsers(response.data);
    } catch (error) {
      console.error('Failed to load project users:', error);
    }
  }, [projectId, token]);

  useEffect(() => {
    loadTasks();
    loadProjectUsers();
  }, [loadTasks, loadProjectUsers]);

  const canEdit = () => userRole === 'admin' || userRole === 'editor';
  const canDelete = () => userRole === 'admin';

  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(task));
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskData = e.dataTransfer.getData('text/plain');
    if (!taskData) return;
    const task = JSON.parse(taskData);
    if (task.status === targetStatus) return;

    try {
      const updateData: any = { status: targetStatus };
      if (targetStatus === 'done' && task.priority !== 'low') {
        updateData.priority = 'low';
        setSnackbar({
          open: true,
          message: `Task "${task.title}" moved to Completed. Priority changed to Low 🟢`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Task "${task.title}" moved to ${statuses.find(s => s.id === targetStatus)?.title}`,
          severity: 'info'
        });
      }
      await axios.put(`${API_URL}/api/tasks/${task.id}?username=${token}`, updateData);
      await loadTasks();
    } catch (error) {
      console.error('Failed to move task:', error);
      setSnackbar({ open: true, message: 'Failed to move task', severity: 'error' });
    }
    setDraggedTask(null);
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleEditClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority || 'medium',
      tags: task.tags || [],
      assignees: task.assignees || [],
      due_date: task.due_date || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags,
        assignees: formData.assignees,
        due_date: formData.due_date,
        project_id: projectId,
        created_by: token
      };

      if (editingTask) {
        await axios.put(`${API_URL}/api/tasks/${editingTask.id}?username=${token}`, taskData);
      } else {
        await axios.post(`${API_URL}/api/tasks?username=${token}`, taskData);
      }
      await loadTasks();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save task:', error);
      setSnackbar({ open: true, message: 'Failed to save task', severity: 'error' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    if (window.confirm('Delete this task?')) {
      try {
        await axios.delete(`${API_URL}/api/tasks/${taskId}?username=${token}`);
        await loadTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setFormData({ title: '', description: '', status: 'todo', priority: 'medium', tags: [], assignees: [], due_date: '' });
    setNewTag('');
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t: string) => t !== tag) });
  };

  const getPriorityInfo = (priorityId: string) => priorities.find(p => p.id === priorityId) || priorities[1];

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setOpenTaskDetail(true);
  };

  const onTaskUpdate = () => loadTasks();

  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = tasks.filter(task => task.status === status.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks - Drag and drop between columns</Typography>
        {canEdit() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
            Add Task
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {statuses.map(status => (
          <Grid size={{ xs: 12, md: 3 }} key={status.id}>
            <Card sx={{ bgcolor: status.color, minHeight: 500, maxHeight: 650, overflow: 'auto', border: `2px solid ${status.borderColor}` }}
              onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status.id)}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: status.textColor }}>
                  {status.title} ({tasksByStatus[status.id]?.length || 0})
                  {status.id === 'done' && <Typography component="span" variant="caption" sx={{ ml: 1, color: 'success.main' }}>(Auto Low Priority)</Typography>}
                </Typography>
                {tasksByStatus[status.id]?.map((task: any) => {
                  const priorityInfo = getPriorityInfo(task.priority || 'medium');
                  const cardBgColor = getTaskCardColor(task);
                  const borderColor = getStatusBorderColor(task);
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                  return (
                    <Card key={task.id} draggable={canEdit()} onDragStart={(e) => handleDragStart(e, task)}
                      sx={{ mb: 1, bgcolor: cardBgColor, cursor: 'grab', '&:hover': { boxShadow: 3 }, borderLeft: `4px solid ${borderColor}` }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1, cursor: 'pointer' }} onClick={() => handleTaskClick(task)}>
                            {task.title}
                          </Typography>
                          <Tooltip title={`Priority: ${priorityInfo.title}`}><Typography sx={{ fontSize: 18 }}>{priorityInfo.icon}</Typography></Tooltip>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {task.description?.substring(0, 50)}{task.description?.length > 50 ? '...' : ''}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {task.assignees?.map((assignee: string) => (
                            <Chip key={assignee} label={assignee} size="small" />
                          ))}
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <IconButton size="small" onClick={(e) => handleEditClick(e, task)}><EditIcon fontSize="small" /></IconButton>
                          {canDelete() && (
                            <IconButton size="small" onClick={(e) => handleDelete(e, task.id)}><DeleteIcon fontSize="small" /></IconButton>
                          )}
                        </Box>
                        {task.due_date && (
                          <Typography variant="caption" sx={{ color: isOverdue ? 'error.main' : 'text.secondary', display: 'block', mt: 0.5, fontWeight: isOverdue ? 'bold' : 'normal' }}>
                            Due: {new Date(task.due_date).toLocaleDateString()}{isOverdue && ' ⚠️ OVERDUE'}
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
          <TextField fullWidth margin="dense" label="Title" value={formData.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })} />
          <AutoExpandingTextarea margin="dense" placeholder="Description" value={formData.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })} />
          <FormControl fullWidth margin="dense"><InputLabel>Status</InputLabel>
            <Select value={formData.status} label="Status" onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}>
              {statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense"><InputLabel>Priority</InputLabel>
            <Select value={formData.priority} label="Priority" onChange={(e: any) => setFormData({ ...formData, priority: e.target.value })}>
              {priorities.map(p => <MenuItem key={p.id} value={p.id}>{p.icon} {p.title}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2">Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {formData.tags.map((tag: string) => <Chip key={tag} label={tag} size="small" onDelete={() => removeTag(tag)} icon={<LocalOfferIcon />} />)}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" placeholder="New tag" value={newTag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)} onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && addTag()} />
              <Button onClick={addTag} variant="outlined" size="small">Add Tag</Button>
            </Box>
          </Box>
          <Autocomplete
            multiple
            fullWidth
            options={projectUsers}
            value={formData.assignees}
            onChange={(_event: any, newValue: string[]) => setFormData({ ...formData, assignees: newValue })}
            renderInput={(params: any) => <TextField {...params} margin="dense" label="Assignees" placeholder="Select project members" />}
          />
          <TextField fullWidth margin="dense" label="Due Date" type="date" value={formData.due_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          userRole={userRole}
          open={openTaskDetail}
          onClose={() => setOpenTaskDetail(false)}
          onUpdate={onTaskUpdate}
          token={token}
          users={projectUsers}
        />
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default KanbanBoard;

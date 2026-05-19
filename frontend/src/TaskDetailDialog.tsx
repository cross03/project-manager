import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Avatar, Divider, List, ListItem, ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

const statuses = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' }
];

const priorities = [
  { id: 'low', title: 'Low', icon: '🟢' },
  { id: 'medium', title: 'Medium', icon: '🟠' },
  { id: 'high', title: 'High', icon: '🔴' },
  { id: 'urgent', title: 'Urgent', icon: '🟣' }
];

function AutoExpandingTextarea({ value, onChange, placeholder, margin = 'dense', minRows = 2, maxRows = 10 }: any) {
  const [rows, setRows] = useState(minRows);

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

export default function TaskDetailDialog({ task, open, onClose, onUpdate, token, users }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editForm, setEditForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    tags: task?.tags || [],
    assignee: task?.assignee || '',
    due_date: task?.due_date || ''
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (task && open) {
      loadComments();
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        tags: task.tags || [],
        assignee: task.assignee || '',
        due_date: task.due_date || ''
      });
    }
  }, [task, open]);

  const loadComments = async () => {
    const response = await axios.get(`${API_URL}/api/tasks/${task.id}/comments?username=${token}`);
    setComments(response.data);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    await axios.post(`${API_URL}/api/comments?username=${token}`, {
      task_id: task.id,
      user: token,
      text: newComment
    });
    setNewComment('');
    loadComments();
  };

  const saveTask = async () => {
    await axios.put(`${API_URL}/api/tasks/${task.id}?username=${token}`, editForm);
    onUpdate();
    onClose();
  };

  const addTag = () => {
    if (newTag && !editForm.tags.includes(newTag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setEditForm({ ...editForm, tags: editForm.tags.filter((t: string) => t !== tag) });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Task Details</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          margin="dense"
          label="Title"
          value={editForm.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, title: e.target.value })}
        />
        <AutoExpandingTextarea
          margin="dense"
          placeholder="Description"
          value={editForm.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, description: e.target.value })}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Status</InputLabel>
          <Select
            value={editForm.status}
            label="Status"
            onChange={(e: any) => setEditForm({ ...editForm, status: e.target.value })}
          >
            {statuses.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Priority</InputLabel>
          <Select
            value={editForm.priority}
            label="Priority"
            onChange={(e: any) => setEditForm({ ...editForm, priority: e.target.value })}
          >
            {priorities.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.icon} {p.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="subtitle2">Tags</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {editForm.tags.map((tag: string) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => removeTag(tag)}
                icon={<LocalOfferIcon />}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="New tag"
              value={newTag}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} variant="outlined" size="small">Add Tag</Button>
          </Box>
        </Box>
        <Autocomplete
          fullWidth
          options={users}
          value={editForm.assignee || null}
          onChange={(_event: any, newValue: string | null) => {
            setEditForm({ ...editForm, assignee: newValue || '' });
          }}
          renderInput={(params) => (
            <TextField {...params} margin="dense" label="Assignee" />
          )}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Due Date"
          type="date"
          value={editForm.due_date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, due_date: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Comments</Typography>
        <List>
          {comments.map((comment: any) => (
            <ListItem key={comment.id} alignItems="flex-start">
              <Avatar sx={{ mr: 2 }}>{comment.user[0].toUpperCase()}</Avatar>
              <ListItemText
                primary={comment.user}
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {comment.text}
                    </Typography>
                    <br />
                    <Typography component="span" variant="caption" color="text.secondary">
                      {new Date(comment.created_at).toLocaleString()}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && sendComment()}
          />
          <Button variant="contained" onClick={sendComment} endIcon={<SendIcon />}>Send</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={saveTask} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Avatar, Divider, List, ListItem, ListItemText, Popper, Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

const statuses = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'On Hold' },
  { id: 'done', title: 'Completed' }
];

const priorities = [
  { id: 'low', title: 'Low', icon: '🟢' },
  { id: 'medium', title: 'Medium', icon: '🟠' },
  { id: 'high', title: 'High', icon: '🔴' },
  { id: 'urgent', title: 'Urgent', icon: '🟣' }
];

function AutoExpandingTextarea({ value, onChange, placeholder, margin = 'dense', minRows = 2, maxRows = 10, disabled = false }: any) {
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
      disabled={disabled}
      sx={{
        '& textarea': {
          resize: 'vertical',
          overflow: rows >= maxRows ? 'auto' : 'hidden'
        }
      }}
    />
  );
}

// Компонент для комментария с подсветкой тегов
function CommentWithMentions({ comment, onMentionClick }: any) {
  const formatText = (text: string) => {
    // Регулярное выражение для поиска @username (username может содержать буквы, цифры, точки, дефисы)
    const mentionRegex = /@([\w.]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(`@${match[1]}`);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <Chip
            key={index}
            label={part}
            size="small"
            color="primary"
            variant="outlined"
            onClick={() => onMentionClick(part.substring(1))}
            sx={{ cursor: 'pointer', mx: 0.5 }}
          />
        );
      }
      return part;
    });
  };

  return (
    <ListItem alignItems="flex-start">
      <Avatar sx={{ mr: 2 }}>{comment.user[0].toUpperCase()}</Avatar>
      <ListItemText
        primary={comment.user}
        secondary={
          <React.Fragment>
            <Typography component="span" variant="body2" color="text.primary" sx={{ wordBreak: 'break-word' }}>
              {formatText(comment.text)}
            </Typography>
            <br />
            <Typography component="span" variant="caption" color="text.secondary">
              {new Date(comment.created_at).toLocaleString()}
            </Typography>
          </React.Fragment>
        }
      />
    </ListItem>
  );
}

// Компонент для ввода комментария с подсказками @username
function CommentInput({ onSend, users }: { onSend: (text: string) => void; users: string[] }) {
  const [value, setValue] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState<null | HTMLElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    // Показываем подсказки сразу после @, даже если ничего не введено
    const showMentions = lastAtIndex !== -1 &&
                         cursorPos > lastAtIndex &&
                         !textBeforeCursor.substring(lastAtIndex + 1).includes(' ');

    if (showMentions) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      setMentionQuery(query);
      setMentionAnchor(e.target);
      setMentionOpen(true);
      setCursorPosition(cursorPos);
      return;
    }
    setMentionOpen(false);
  };

  const selectUser = (selectedUser: string) => {
    const beforeMention = value.substring(0, cursorPosition);
    const lastAtIndex = beforeMention.lastIndexOf('@');
    const newValue = beforeMention.substring(0, lastAtIndex) + `@${selectedUser} ` + value.substring(cursorPosition);
    setValue(newValue);
    setMentionOpen(false);
  };

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  // Фильтруем пользователей по введённому запросу (поддерживаем точки)
  const filteredUsers = users.filter((user: string) =>
    user.toLowerCase().includes(mentionQuery.toLowerCase()) && user !== ''
  );

  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 2, position: 'relative' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Write a comment... Use @ to mention someone"
        value={value}
        onChange={handleChange}
        onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        multiline
        maxRows={3}
      />
      <Button variant="contained" onClick={handleSend} endIcon={<SendIcon />}>Send</Button>

      <Popper open={mentionOpen} anchorEl={mentionAnchor} placement="top-start" style={{ zIndex: 1300 }}>
        <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <Button
                key={user}
                onClick={() => selectUser(user)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  width: '100%',
                  justifyContent: 'flex-start',
                  textTransform: 'none'
                }}
              >
                <Avatar sx={{ width: 24, height: 24 }}>{user[0].toUpperCase()}</Avatar>
                {user}
              </Button>
            ))
          ) : (
            <Box sx={{ p: 1, color: 'text.secondary' }}>Type to search users...</Box>
          )}
        </Paper>
      </Popper>
    </Box>
  );
}

export default function TaskDetailDialog({ task, open, onClose, onUpdate, token, users, userRole }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    tags: task?.tags || [],
    assignees: task?.assignees || [],
    due_date: task?.due_date || ''
  });
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');

  const canEdit = userRole === 'admin' || userRole === 'editor';

  useEffect(() => {
    if (task && open) {
      loadComments();
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        tags: task.tags || [],
        assignees: task.assignees || [],
        due_date: task.due_date || ''
      });
    }
  }, [task, open]);

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/${task.id}/comments?username=${token}`);
      setComments(response.data);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
    }
  };

  const sendComment = async (text: string) => {
    try {
      await axios.post(`${API_URL}/api/comments?username=${token}`, {
        task_id: task.id,
        user: token,
        text: text
      });
      loadComments();
    } catch (err) {
      console.error('Failed to send comment:', err);
      setError('Failed to send comment');
    }
  };

  const saveTask = async () => {
    if (!canEdit) return;
    try {
      await axios.put(`${API_URL}/api/tasks/${task.id}?username=${token}`, editForm);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Failed to save task');
    }
  };

  const addTag = () => {
    if (!canEdit) return;
    if (newTag && !editForm.tags.includes(newTag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    if (!canEdit) return;
    setEditForm({ ...editForm, tags: editForm.tags.filter((t: string) => t !== tag) });
  };

  const handleMentionClick = (username: string) => {
    console.log(`Clicked on @${username}`);
    alert(`Send message to ${username}? (Will be implemented in next step)`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Task Details
            {!canEdit && (
              <Chip label="Read Only" size="small" sx={{ ml: 2 }} />
            )}
          </Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}

        <TextField
          fullWidth
          margin="dense"
          label="Title"
          value={editForm.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, title: e.target.value })}
          disabled={!canEdit}
        />

        <AutoExpandingTextarea
          margin="dense"
          placeholder="Description"
          value={editForm.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, description: e.target.value })}
          disabled={!canEdit}
        />

        <FormControl fullWidth margin="dense" disabled={!canEdit}>
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

        <FormControl fullWidth margin="dense" disabled={!canEdit}>
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
                onDelete={canEdit ? () => removeTag(tag) : undefined}
                icon={<LocalOfferIcon />}
              />
            ))}
          </Box>
          {canEdit && (
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
          )}
        </Box>

        <Autocomplete
          multiple
          fullWidth
          options={users}
          value={editForm.assignees}
          onChange={(_event: any, newValue: string[]) => canEdit && setEditForm({ ...editForm, assignees: newValue })}
          renderInput={(params: any) => <TextField {...params} margin="dense" label="Assignees" placeholder="Select project members" />}
          disabled={!canEdit}
        />

        <TextField
          fullWidth
          margin="dense"
          label="Due Date"
          type="date"
          value={editForm.due_date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, due_date: e.target.value })}
          disabled={!canEdit}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Comments</Typography>
        <List>
          {comments.map((comment: any) => (
            <CommentWithMentions key={comment.id} comment={comment} onMentionClick={handleMentionClick} />
          ))}
          {comments.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No comments yet. Be the first to comment!
            </Typography>
          )}
        </List>

        <CommentInput onSend={sendComment} users={users} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {canEdit && (
          <Button onClick={saveTask} variant="contained">Save Changes</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

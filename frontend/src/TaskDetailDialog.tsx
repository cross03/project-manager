import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Avatar, Divider, List, ListItem, ListItemText, Popper, Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
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

function CommentThread({ comment, onMentionClick, onReply, currentUser, isHighlighted, level = 0 }: any) {
  const replies = comment.replies || [];

  const formatText = (text: string) => {
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
    <Box sx={{ ml: level * 4 }}>
      <ListItem
        alignItems="flex-start"
        sx={{
          position: 'relative',
          backgroundColor: isHighlighted ? '#e3f2fd' : 'inherit',
          transition: 'background-color 0.5s',
          borderRadius: 1,
          mb: 1,
          borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none'
        }}
        ref={isHighlighted ? (el) => {
          if (el) {
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
          }
        } : undefined}
      >
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
        <IconButton
          size="small"
          onClick={() => onReply(comment.user, comment.id)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          title={`Reply to ${comment.user}`}
        >
          <ReplyIcon fontSize="small" />
        </IconButton>
      </ListItem>

      {replies.length > 0 && (
        <Box sx={{ ml: 2 }}>
          {replies.map((reply: any) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onMentionClick={onMentionClick}
              onReply={onReply}
              currentUser={currentUser}
              level={level + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function CommentInput({ onSend, users, replyTo, clearReply }: any) {
  const [value, setValue] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState<null | HTMLElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (replyTo) {
      setValue(`@${replyTo.user} `);
    }
  }, [replyTo]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

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
      if (clearReply) clearReply();
    }
  };

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

      <Popper open={mentionOpen} anchorEl={mentionAnchor} placement="top-start" style={{ zIndex: 10000 }}>
        <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user: string) => (
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

export default function TaskDetailDialog({ task, open, onClose, onUpdate, token, users, userRole, highlightCommentId }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<{ user: string; parentId: number } | null>(null);
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
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | undefined>(highlightCommentId);
  const [isHighlightCleared, setIsHighlightCleared] = useState(false);

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
      setHighlightedCommentId(highlightCommentId);
      setIsHighlightCleared(false);
    }
  }, [task, open, highlightCommentId]);

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/${task.id}/comments?username=${token}`);
      const flatComments = response.data;
      const commentMap = new Map();
      const roots: any[] = [];

      flatComments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      flatComments.forEach((c: any) => {
        commentMap.set(c.id, { ...c, replies: [] });
      });

      flatComments.forEach((c: any) => {
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies.push(commentMap.get(c.id));
          }
        } else {
          roots.push(commentMap.get(c.id));
        }
      });

      setComments(roots);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
    }
  };

  const sendComment = async (text: string) => {
    try {
      const payload: any = {
        task_id: task.id,
        user: token,
        text: text
      };
      if (replyTo?.parentId) {
        payload.parent_id = replyTo.parentId;
      }
      await axios.post(`${API_URL}/api/comments?username=${token}`, payload);
      await loadComments();
      setError('');
      if (highlightedCommentId) {
        setHighlightedCommentId(undefined);
      }
      setReplyTo(null);
    } catch (err: any) {
      console.error('Failed to send comment:', err);
      setError(err.response?.data?.detail || 'Failed to send comment');
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
    setReplyTo({ user: username, parentId: 0 });
  };

  const handleReply = (username: string, parentId: number) => {
    setReplyTo({ user: username, parentId });
  };

  const clearReply = () => {
    setReplyTo(null);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Task Details
            {!canEdit && (
              <Chip label="Read Only" size="small" sx={{ ml: 2 }} />
            )}
          </Typography>
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
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
            <CommentThread
              key={comment.id}
              comment={comment}
              onMentionClick={handleMentionClick}
              onReply={handleReply}
              currentUser={token}
              isHighlighted={highlightedCommentId === comment.id && !isHighlightCleared}
            />
          ))}
          {comments.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No comments yet. Be the first to comment!
            </Typography>
          )}
        </List>

        <CommentInput onSend={sendComment} users={users} replyTo={replyTo} clearReply={clearReply} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {canEdit && (
          <Button onClick={saveTask} variant="contained">Save Changes</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
  Paper, Chip, Autocomplete
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function Comments({ type, targetId, token, username, users }: {
  type: string;
  targetId: number;
  token: string;
  username: string;
  users?: string[];
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  useEffect(() => {
    loadComments();
    if (users && users.length > 0) {
      setAllUsers(users);
    } else {
      loadUsers();
    }
  }, []);

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/comments/${type}/${targetId}?username=${token}`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/all-users?username=${token}`);
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpace = query.includes(' ');
      if (!hasSpace && query.length < 30 && query.length >= 0) {
        setMentionQuery(query);
        setShowMentions(true);
        setCursorPosition(cursorPos);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: string) => {
    const beforeMention = newComment.substring(0, cursorPosition);
    const afterCursor = newComment.substring(cursorPosition);
    const lastAtIndex = beforeMention.lastIndexOf('@');
    const beforeAt = beforeMention.substring(0, lastAtIndex);
    const newText = `${beforeAt}@${user} ${afterCursor}`;
    setNewComment(newText);
    setShowMentions(false);
  };

  const sendComment = async () => {
    if (!newComment.trim()) {
      console.log('Comment is empty');
      return;
    }

    console.log('Sending comment:', { type, targetId, user: username, text: newComment });

    try {
      const response = await axios.post(`${API_URL}/api/comments?username=${token}`, {
        type: type,
        target_id: targetId,
        user: username,
        text: newComment
      });
      console.log('Comment sent:', response.data);
      setNewComment('');
      await loadComments();
    } catch (error: any) {
      console.error('Failed to send comment:', error.response?.data || error.message);
      alert('Ошибка при отправке комментария: ' + (error.response?.data?.detail || error.message));
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u !== username && u.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const renderCommentText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const userName = part.substring(1);
        if (allUsers.includes(userName)) {
          return (
            <Chip
              key={idx}
              label={part}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mx: 0.5, cursor: 'pointer', display: 'inline-flex' }}
            />
          );
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Комментарии {type === 'project' ? 'к проекту' : 'к задаче'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        💡 Используйте @имя_пользователя чтобы упомянуть коллегу
      </Typography>

      <Card>
        <CardContent>
          <List>
            {comments.length === 0 ? (
              <ListItem>
                <ListItemText primary="Нет комментариев" sx={{ textAlign: 'center', color: 'text.secondary' }} />
              </ListItem>
            ) : (
              comments.map(comment => (
                <ListItem key={comment.id} alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>{comment.user[0].toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2">{comment.user}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                        {renderCommentText(comment.text)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>

          <Box sx={{ position: 'relative', mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Напишите комментарий... Используйте @ для упоминания"
              value={newComment}
              onChange={handleCommentChange}
              multiline
              rows={3}
              sx={{ mb: 1 }}
            />

            {showMentions && filteredUsers.length > 0 && (
              <Paper
                sx={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: 200,
                  overflow: 'auto',
                  zIndex: 10,
                  boxShadow: 3,
                  mb: 1
                }}
              >
                <List dense>
                  {filteredUsers.map(user => (
                    <ListItem
                      key={user}
                      onClick={() => insertMention(user)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{user[0].toUpperCase()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={user} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={sendComment}
                endIcon={<SendIcon />}
                size="small"
              >
                Отправить
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Comments;

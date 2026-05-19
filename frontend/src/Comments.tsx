import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Avatar, List, ListItem, ListItemAvatar, ListItemText, Popper, Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function Comments({ projectId, token, username }: { projectId: number; token: string; username: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState<null | HTMLElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    loadComments();
    loadUsers();
  }, []);

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/comments?username=${token}`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/all-users?username=${token}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API_URL}/api/comments-project?username=${token}`, {
        project_id: projectId,
        user: username,
        text: newComment
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to send comment:', error);
      alert('Failed to send comment');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNewComment(newValue);

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
    const beforeMention = newComment.substring(0, cursorPosition);
    const lastAtIndex = beforeMention.lastIndexOf('@');
    const newValue = beforeMention.substring(0, lastAtIndex) + `@${selectedUser} ` + newComment.substring(cursorPosition);
    setNewComment(newValue);
    setMentionOpen(false);
  };

  const filteredUsers = users.filter(user =>
    user.toLowerCase().includes(mentionQuery.toLowerCase()) && user !== ''
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>Comments</Typography>
      <Card>
        <CardContent>
          <List>
            {comments.map(comment => (
              <ListItem key={comment.id} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar>{comment.user[0].toUpperCase()}</Avatar>
                </ListItemAvatar>
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
          <Box sx={{ display: 'flex', gap: 1, mt: 2, position: 'relative' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Write a comment... Use @ to mention someone"
              value={newComment}
              onChange={handleChange}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendComment()}
              multiline
              maxRows={3}
            />
            <Button variant="contained" onClick={sendComment} endIcon={<SendIcon />}>
              Send
            </Button>

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
        </CardContent>
      </Card>
    </Box>
  );
}

export default Comments;

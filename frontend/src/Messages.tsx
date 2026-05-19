import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, TextField, IconButton, Paper, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Autocomplete
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function Messages({ username, allUsers, initialChatWith }: { username: string; allUsers: string[]; initialChatWith?: string | null }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(initialChatWith || null);
  const [newMessage, setNewMessage] = useState('');
  const [openNewChat, setOpenNewChat] = useState(false);
  const [selectedNewUser, setSelectedNewUser] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  useEffect(() => {
    loadMessages();
    loadAvailableUsers();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/${username}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/all-users?username=${username}`);
      const users = response.data;
      setAvailableUsers(users.filter((u: string) => u !== username));
    } catch (error) {
      console.error('Failed to load users:', error);
      if (allUsers && allUsers.length > 0) {
        setAvailableUsers(allUsers.filter(u => u !== username));
      }
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      await axios.put(`${API_URL}/api/messages/${messageId}/read?username=${username}`);
      loadMessages();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    try {
      await axios.post(`${API_URL}/api/messages?current_user=${username}`, {
        from_user: username,
        to_user: selectedUser,
        text: newMessage
      });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const startNewChat = async () => {
    if (!selectedNewUser) return;
    setSelectedUser(selectedNewUser);
    setOpenNewChat(false);
    setSelectedNewUser(null);
  };

  const conversations = () => {
    const users = new Set<string>();
    messages.forEach(m => {
      if (m.from_user !== username) users.add(m.from_user);
      if (m.to_user !== username) users.add(m.to_user);
    });
    return Array.from(users);
  };

  const getConversation = () => {
    if (!selectedUser) return [];
    return messages.filter(m =>
      (m.from_user === selectedUser && m.to_user === username) ||
      (m.from_user === username && m.to_user === selectedUser)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getUnreadCount = (user: string) => {
    return messages.filter(m => m.from_user === user && m.to_user === username && !m.read).length;
  };

  const conversationMessages = getConversation();

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)', gap: 2 }}>
      <Paper sx={{ width: 300, overflow: 'auto' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Чаты</Typography>
          <IconButton onClick={() => setOpenNewChat(true)} size="small">
            <PersonAddIcon />
          </IconButton>
        </Box>
        <List>
          {conversations().map(user => (
            <ListItem
              key={user}
              onClick={() => {
                setSelectedUser(user);
                messages.filter(m => m.from_user === user && m.to_user === username && !m.read)
                  .forEach(m => markAsRead(m.id));
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                bgcolor: selectedUser === user ? 'action.selected' : 'transparent'
              }}
            >
              <ListItemAvatar>
                <Avatar>{user[0].toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user}
                secondary={getUnreadCount(user) > 0 ? `${getUnreadCount(user)} непрочитанных` : ''}
              />
              {getUnreadCount(user) > 0 && (
                <Badge color="error" variant="dot" />
              )}
            </ListItem>
          ))}
          {conversations().length === 0 && (
            <ListItem>
              <ListItemText primary="Нет чатов" sx={{ textAlign: 'center', color: 'text.secondary' }} />
            </ListItem>
          )}
        </List>
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedUser ? (
          <>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'primary.main', color: 'white', borderRadius: '4px 4px 0 0' }}>
              <Typography variant="h6">Чат с {selectedUser}</Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: 400 }}>
              {conversationMessages.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  Напишите первое сообщение
                </Typography>
              ) : (
                conversationMessages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.from_user === username ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Paper
                      sx={{
                        maxWidth: '70%',
                        p: 1.5,
                        bgcolor: msg.from_user === username ? 'primary.light' : 'grey.100',
                        color: msg.from_user === username ? 'white' : 'text.primary',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body2">{msg.text}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                        {new Date(msg.created_at).toLocaleString()}
                        {msg.read && msg.to_user === username && ' ✓ Прочитано'}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <IconButton color="primary" onClick={sendMessage}>
                <SendIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">Выберите чат для начала общения</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={openNewChat} onClose={() => setOpenNewChat(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новый чат</DialogTitle>
        <DialogContent>
          <Autocomplete
            fullWidth
            options={availableUsers}
            value={selectedNewUser}
            onChange={(event, newValue) => setSelectedNewUser(newValue)}
            renderInput={(params) => (
              <TextField {...params} margin="dense" label="Выберите пользователя" placeholder="Начните вводить имя..." />
            )}
            noOptionsText="Нет доступных пользователей"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewChat(false)}>Отмена</Button>
          <Button onClick={startNewChat} variant="contained">Начать чат</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Messages;

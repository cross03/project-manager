import React, { useState, useEffect } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem,
  ListItemText, Button, TextField, Avatar, Paper
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function NotificationCenter({ token, username }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [anchorElMsg, setAnchorElMsg] = useState<null | HTMLElement>(null);
  const [openChat, setOpenChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [readNotifications, setReadNotifications] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('readNotifications');
    if (saved) {
      setReadNotifications(new Set(JSON.parse(saved)));
    }
    loadNotifications();
    loadMessages();
    const interval = setInterval(() => {
      loadNotifications();
      loadMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/${username}?current_user=${token}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/${username}?current_user=${token}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markNotificationRead = async (id: number) => {
    const newRead = new Set(readNotifications);
    newRead.add(id);
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(newRead)));
    await axios.put(`${API_URL}/api/notifications/${id}/read?current_user=${token}`);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    for (const notif of notifications) {
      if (!readNotifications.has(notif.id) && !notif.read) {
        await markNotificationRead(notif.id);
      }
    }
  };

  const handleGoToTask = async (notif: any) => {
    setAnchorElNotif(null);
    if (notif.task_id) {
      await markNotificationRead(notif.id);
      try {
        const taskResponse = await axios.get(`${API_URL}/api/tasks/${notif.task_id}?username=${token}`);
        const task = taskResponse.data;
        if (task && task.project_id) {
          window.open(`/project?projectId=${task.project_id}&taskId=${notif.task_id}`, '_blank');
        }
      } catch (error) {
        console.error('Failed to get task info:', error);
      }
    }
  };

  const handleGoToComment = async (notif: any) => {
    setAnchorElNotif(null);
    if (notif.task_id && notif.comment_id) {
      await markNotificationRead(notif.id);
      try {
        const taskResponse = await axios.get(`${API_URL}/api/tasks/${notif.task_id}?username=${token}`);
        const task = taskResponse.data;
        if (task && task.project_id) {
          window.open(`/project?projectId=${task.project_id}&taskId=${notif.task_id}&commentId=${notif.comment_id}`, '_blank');
        }
      } catch (error) {
        console.error('Failed to get task info:', error);
      }
    }
  };

  const sendMessage = async (toUser: string, text: string) => {
    if (!text.trim()) return;
    await axios.post(`${API_URL}/api/messages?current_user=${token}`, {
      from_user: token,
      to_user: toUser,
      text: text,
      read: false
    });
    if (openChat?.from_user === toUser || openChat?.to_user === toUser) {
      loadChat(toUser);
    }
    loadMessages();
  };

  const loadChat = async (otherUser: string) => {
    const response = await axios.get(`${API_URL}/api/messages/${username}?current_user=${token}`);
    const allMessages = response.data;
    const chatMsgs = allMessages.filter((m: any) =>
      (m.from_user === otherUser && m.to_user === username) ||
      (m.from_user === username && m.to_user === otherUser)
    );
    setChatMessages(chatMsgs.sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));
  };

  const openChatWindow = async (otherUser: string) => {
    setOpenChat({ from_user: otherUser, to_user: otherUser });
    await loadChat(otherUser);
    setAnchorElMsg(null);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !openChat) return;
    await sendMessage(openChat.from_user, chatInput);
    setChatInput('');
    await loadChat(openChat.from_user);
  };

  const unreadNotifications = notifications.filter(n => !readNotifications.has(n.id) && !n.read).length;
  const unreadMessages = messages.filter(m => !m.read && m.to_user === username).length;

  const messageGroups = messages.reduce((acc: any, msg: any) => {
    const otherUser = msg.from_user === username ? msg.to_user : msg.from_user;
    if (!acc[otherUser]) {
      acc[otherUser] = {
        lastMessage: msg.text,
        lastTime: msg.created_at,
        unread: !msg.read && msg.to_user === username
      };
    }
    return acc;
  }, {});

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorElNotif(e.currentTarget)}>
        <Badge badgeContent={unreadNotifications} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <IconButton color="inherit" onClick={(e) => setAnchorElMsg(e.currentTarget)}>
        <Badge badgeContent={unreadMessages} color="error">
          <MessageIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorElNotif)}
        anchorEl={anchorElNotif}
        onClose={() => setAnchorElNotif(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 500, maxHeight: 400, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Уведомления</Typography>
            {unreadNotifications > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Пометить все как прочитанные
              </Button>
            )}
          </Box>
          {notifications.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              Нет уведомлений
            </Typography>
          ) : (
            notifications.map(notif => {
              let message = notif.message;
              const match = message.match(/(\w+) mentioned you in task "([^"]+)"/);
              let displayMessage = message;
              if (match) {
                displayMessage = `${match[1]} упомянул вас в задаче "${match[2]}"`;
              }

              const isUnread = !readNotifications.has(notif.id) && !notif.read;

              return (
                <ListItem
                  key={notif.id}
                  sx={{
                    bgcolor: isUnread ? '#e3f2fd' : 'inherit',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #e0e0e0',
                    p: 2
                  }}
                >
                  <ListItemText
                    primary={displayMessage}
                    secondary={new Date(notif.created_at).toLocaleString()}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleGoToTask(notif)}
                      >
                        Перейти к задаче
                      </Button>
                      {notif.comment_id && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleGoToComment(notif)}
                        >
                          Открыть комментарий
                        </Button>
                      )}
                    </Box>
                    {isUnread && (
                      <Button
                        size="small"
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        Прочитано
                      </Button>
                    )}
                  </Box>
                </ListItem>
              );
            })
          )}
        </Paper>
      </Popover>

      <Popover
        open={Boolean(anchorElMsg)}
        anchorEl={anchorElMsg}
        onClose={() => setAnchorElMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            Сообщения
          </Typography>
          {Object.keys(messageGroups).length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              Нет сообщений
            </Typography>
          ) : (
            Object.entries(messageGroups).map(([user, data]: [string, any]) => (
              <ListItem
                key={user}
                sx={{
                  bgcolor: data.unread ? '#e3f2fd' : 'inherit',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => openChatWindow(user)}
              >
                <Avatar sx={{ mr: 1 }}>{user[0].toUpperCase()}</Avatar>
                <ListItemText
                  primary={user}
                  secondary={
                    <>
                      {data.lastMessage.length > 40 ? data.lastMessage.substring(0, 40) + '...' : data.lastMessage}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(data.lastTime).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                {data.unread && <Badge variant="dot" color="error" />}
              </ListItem>
            ))
          )}
        </Paper>
      </Popover>

      {openChat && (
        <Paper sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 350,
          height: 450,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          boxShadow: 3
        }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">Чат с {openChat.from_user}</Typography>
            <IconButton size="small" onClick={() => setOpenChat(null)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {chatMessages.map((msg, idx) => (
              <Box key={idx} sx={{ mb: 1, display: 'flex', justifyContent: msg.from_user === username ? 'flex-end' : 'flex-start' }}>
                <Paper sx={{ p: 1, maxWidth: '80%', bgcolor: msg.from_user === username ? 'primary.light' : 'grey.100' }}>
                  <Typography variant="body2">{msg.text}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Напишите сообщение..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <IconButton color="primary" onClick={sendChatMessage}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
}

export default NotificationCenter;

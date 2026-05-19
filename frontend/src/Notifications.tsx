import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, IconButton, Badge, Popover, Button, Divider
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

function Notifications({ username, onOpenChat, onOpenProject }: {
  username: string;
  onOpenChat?: (user: string) => void;
  onOpenProject?: (projectId: number, commentId?: number) => void;
}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/${username}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notificationId}/read?username=${username}`);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await axios.delete(`${API_URL}/api/notifications/${notificationId}?username=${username}`);
      loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    console.log('Notification clicked:', notification);

    // Помечаем как прочитанное
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Закрываем попап
    setAnchorEl(null);

    // Обрабатываем разные типы уведомлений
    if (notification.type === 'message' && onOpenChat) {
      // Извлекаем имя отправителя
      const match = notification.title.match(/@([a-zA-Z0-9._]+)/);
      if (match) {
        const fromUser = match[1];
        console.log('Opening chat with:', fromUser);
        onOpenChat(fromUser);
      }
    } else if (notification.type === 'mention' && onOpenProject) {
      // Извлекаем ID проекта из ссылки
      const linkMatch = notification.link?.match(/\/(\w+)\/(\d+)/);
      if (linkMatch) {
        const type = linkMatch[1];
        const id = parseInt(linkMatch[2]);
        console.log('Opening project:', id);
        onOpenProject(id);
      } else {
        // Если нет ссылки, показываем алерт
        alert(`Вы были упомянуты: ${notification.content}`);
      }
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'message':
        return '✉️';
      case 'task_assigned':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 380, maxWidth: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Уведомления</Typography>
            <Button size="small" onClick={() => {
              notifications.forEach(n => {
                if (!n.read) markAsRead(n.id);
              });
            }}>
              Прочитать всё
            </Button>
          </Box>

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="Нет уведомлений" sx={{ textAlign: 'center', color: 'text.secondary' }} />
              </ListItem>
            ) : (
              notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': { bgcolor: 'action.selected', cursor: 'pointer' }
                    }}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    }
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: notification.read ? 'grey.400' : 'primary.main' }}>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {notification.content}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>

          <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <Button size="small" onClick={handleClose}>
              Закрыть
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export default Notifications;

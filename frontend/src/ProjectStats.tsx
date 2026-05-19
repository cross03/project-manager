import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  IconButton, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TaskIcon from '@mui/icons-material/Task';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import axios from 'axios';

const API_URL = 'http://10.221.8.140:8000';

interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  overdue: number;
  completionRate: number;
}

function ProjectStats({ projectId, token }: { projectId: number; token: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    overdue: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogTasks, setDialogTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks?username=${token}`);
      const taskList = response.data;
      setTasks(taskList);
      calculateStats(taskList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList: any[]) => {
    const total = taskList.length;
    const todo = taskList.filter(t => t.status === 'todo').length;
    const in_progress = taskList.filter(t => t.status === 'in_progress').length;
    const review = taskList.filter(t => t.status === 'review').length;
    const done = taskList.filter(t => t.status === 'done').length;

    const byPriority = {
      low: taskList.filter(t => t.priority === 'low').length,
      medium: taskList.filter(t => t.priority === 'medium').length,
      high: taskList.filter(t => t.priority === 'high').length,
      urgent: taskList.filter(t => t.priority === 'urgent').length
    };

    const today = new Date();
    const overdue = taskList.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      return new Date(t.due_date) < today;
    }).length;

    const completionRate = total === 0 ? 0 : (done / total) * 100;

    setStats({
      total,
      todo,
      in_progress,
      review,
      done,
      byPriority,
      overdue,
      completionRate
    });
  };

  const showTasksByType = (type: 'total' | 'todo' | 'in_progress' | 'review' | 'done' | 'overdue' | 'priority', priorityType?: string) => {
    let filteredTasks: any[] = [];
    let title = '';

    switch (type) {
      case 'total':
        filteredTasks = tasks;
        title = 'All Tasks';
        break;
      case 'todo':
        filteredTasks = tasks.filter(t => t.status === 'todo');
        title = 'To Do Tasks';
        break;
      case 'in_progress':
        filteredTasks = tasks.filter(t => t.status === 'in_progress');
        title = 'In Progress Tasks';
        break;
      case 'review':
        filteredTasks = tasks.filter(t => t.status === 'review');
        title = 'On Hold Tasks';
        break;
      case 'done':
        filteredTasks = tasks.filter(t => t.status === 'done');
        title = 'Completed Tasks';
        break;
      case 'overdue':
        filteredTasks = tasks.filter(t => {
          if (!t.due_date || t.status === 'done') return false;
          return new Date(t.due_date) < new Date();
        });
        title = 'Overdue Tasks';
        break;
      case 'priority':
        filteredTasks = tasks.filter(t => t.priority === priorityType);
        title = `${priorityType?.toUpperCase()} Priority Tasks`;
        break;
    }

    setDialogTitle(title);
    setDialogTasks(filteredTasks);
    setDialogOpen(true);
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'review': return 'On Hold';
      case 'done': return 'Done';
      default: return status;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return '🟢';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'urgent': return '🟣';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Диалог со списком задач */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {dialogTitle}
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {dialogTasks.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No tasks found
            </Typography>
          ) : (
            <List>
              {dialogTasks.map((task, idx) => (
                <React.Fragment key={task.id}>
                  <ListItem
                    onClick={() => {
                      setDialogOpen(false);
                      handleTaskClick(task);
                    }}
                    sx={{
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: task.status === 'done' ? 'success.main' : 'primary.main' }}>
                        <TaskIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                          <Chip label={getStatusLabel(task.status)} size="small" />
                          <Chip label={`${getPriorityIcon(task.priority)} ${task.priority || 'medium'}`} size="small" />
                          {task.assignee && <Chip label={`👤 ${task.assignee}`} size="small" />}
                          {task.due_date && (
                            <Chip
                              label={`📅 ${new Date(task.due_date).toLocaleDateString()}`}
                              size="small"
                              color={new Date(task.due_date) < new Date() && task.status !== 'done' ? 'error' : 'default'}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < dialogTasks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог с деталями задачи */}
      <Dialog open={taskDetailOpen} onClose={() => setTaskDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Task Details
            <IconButton onClick={() => setTaskDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedTask.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedTask.description || 'No description'}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Status:</strong> {getStatusLabel(selectedTask.status)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Priority:</strong> {getPriorityIcon(selectedTask.priority)} {selectedTask.priority || 'medium'}
              </Typography>
              {selectedTask.assignee && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Assignee:</strong> 👤 {selectedTask.assignee}
                </Typography>
              )}
              {selectedTask.due_date && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Due Date:</strong> 📅 {new Date(selectedTask.due_date).toLocaleDateString()}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Created:</strong> {new Date(selectedTask.created_at).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Created by:</strong> {selectedTask.created_by}
              </Typography>
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <strong>Tags:</strong>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {selectedTask.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Grid container spacing={3}>
        {/* Completion Progress */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Project Completion</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {stats.completionRate.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                sx={{ height: 10, borderRadius: 5 }}
                color={stats.completionRate === 100 ? 'success' : 'primary'}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {stats.done} of {stats.total} tasks completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)', transition: 'all 0.2s' } }}
            onClick={() => showTasksByType('total')}
          >
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tasks
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click to view all
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)', transition: 'all 0.2s' } }}
            onClick={() => showTasksByType('done')}
          >
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {stats.done}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click to view completed tasks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              cursor: 'pointer',
              bgcolor: stats.overdue > 0 ? '#ffebee' : 'inherit',
              '&:hover': { boxShadow: 6, transform: 'translateY(-2px)', transition: 'all 0.2s' }
            }}
            onClick={() => showTasksByType('overdue')}
          >
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: stats.overdue > 0 ? 'error.main' : 'text.primary' }}>
                {stats.overdue}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overdue Tasks
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click to view overdue tasks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Task Status Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TaskIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Task Status</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showTasksByType('todo')}
                >
                  <Chip label="To Do" size="small" sx={{ bgcolor: '#f0f0f0', cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.todo}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(stats.todo / stats.total) * 100} sx={{ height: 6 }} />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, cursor: 'pointer' }}
                  onClick={() => showTasksByType('in_progress')}
                >
                  <Chip label="In Progress" size="small" sx={{ bgcolor: '#fff3e0', cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.in_progress}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(stats.in_progress / stats.total) * 100} sx={{ height: 6 }} />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, cursor: 'pointer' }}
                  onClick={() => showTasksByType('review')}
                >
                  <Chip label="On Hold" size="small" sx={{ bgcolor: '#e3f2fd', cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.review}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(stats.review / stats.total) * 100} sx={{ height: 6 }} />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, cursor: 'pointer' }}
                  onClick={() => showTasksByType('done')}
                >
                  <Chip label="Done" size="small" sx={{ bgcolor: '#e8f5e9', cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.done}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(stats.done / stats.total) * 100} sx={{ height: 6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Priority Distribution</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showTasksByType('priority', 'low')}
                >
                  <Chip label="🟢 Low" size="small" sx={{ cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.byPriority.low}</Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showTasksByType('priority', 'medium')}
                >
                  <Chip label="🟠 Medium" size="small" sx={{ cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.byPriority.medium}</Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showTasksByType('priority', 'high')}
                >
                  <Chip label="🔴 High" size="small" sx={{ cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.byPriority.high}</Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showTasksByType('priority', 'urgent')}
                >
                  <Chip label="🟣 Urgent" size="small" sx={{ cursor: 'pointer' }} />
                  <Typography sx={{ fontWeight: 'bold' }}>{stats.byPriority.urgent}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ProjectStats;

// Добавляем в компонент кнопку обновления
// и убеждаемся что loadTasks использует правильный projectId

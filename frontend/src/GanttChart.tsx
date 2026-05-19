import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Switch, FormControlLabel,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import axios from 'axios';
import MiniCalendar from './MiniCalendar';

const API_URL = 'http://10.221.8.140:8000';

function GanttChart({ projectId, token, userRole, onTaskUpdate }: { projectId: number; token: string; userRole: string; onTaskUpdate?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [viewStartDate, setViewStartDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [viewEndDate, setViewEndDate] = useState<Date>(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 60);
    return end;
  });

  const [dragActive, setDragActive] = useState(false);
  const [dragTask, setDragTask] = useState<any>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTaskId, setDragStartTaskId] = useState<number | null>(null);
  const [dragOriginalStart, setDragOriginalStart] = useState<Date | null>(null);
  const [dragOriginalEnd, setDragOriginalEnd] = useState<Date | null>(null);
  const [dragCurrentOffset, setDragCurrentOffset] = useState(0);
  const [dragRestricted, setDragRestricted] = useState(false);

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollStartDate, setScrollStartDate] = useState<Date | null>(null);
  // Сохраняем позицию скролла
  const savedScrollLeft = useRef(0);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const taskBarRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const CELL_WIDTH = 40;

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  // Сохраняем позицию скролла после загрузки задач
  useEffect(() => {
    if (scrollContainerRef.current && !dragActive) {
      scrollContainerRef.current.scrollLeft = savedScrollLeft.current;
    }
  }, [tasks, viewStartDate]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks?username=${token}`);
      let taskList = response.data;

      if (!showCompleted) {
        taskList = taskList.filter((t: any) => t.status !== 'done');
      }

      const sortedTasks = taskList.sort((a: any, b: any) => {
        const dateA = new Date(a.start_date || a.created_at);
        const dateB = new Date(b.start_date || b.created_at);
        return dateA.getTime() - dateB.getTime();
      });

      setTasks(sortedTasks);
      setError(null);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [showCompleted]);

  const updateTaskDates = async (taskId: number, startDate: Date, endDate: Date) => {
    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      await axios.put(`${API_URL}/api/tasks/${taskId}?username=${token}`, {
        start_date: startStr,
        due_date: endStr
      });
      await loadTasks();
      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Failed to update task dates:', error);
    }
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      start_date: task.start_date || task.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      due_date: task.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: task.status,
      priority: task.priority || 'medium'
    });
    setEditDialogOpen(true);
  };

  const handleDeleteTask = async (task: any) => {
    if (window.confirm(`Delete task "${task.title}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API_URL}/api/tasks/${task.id}?username=${token}`);
        await loadTasks();
        if (onTaskUpdate) onTaskUpdate();
        setSnackbar({
          open: true,
          message: `Task "${task.title}" deleted successfully!`,
          severity: 'success'
        });
        setEditDialogOpen(false);
      } catch (error) {
        console.error('Failed to delete task:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete task',
          severity: 'error'
        });
      }
    }
  };

  const [editForm, setEditForm] = useState({
    title: '',
    start_date: '',
    due_date: '',
    status: '',
    priority: ''
  });

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API_URL}/api/tasks/${selectedTask.id}?username=${token}`, {
        title: editForm.title,
        start_date: editForm.start_date,
        due_date: editForm.due_date,
        status: editForm.status,
        priority: editForm.priority
      });
      await loadTasks();
      setEditDialogOpen(false);
      if (onTaskUpdate) onTaskUpdate();
      setSnackbar({
        open: true,
        message: 'Task updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update task',
        severity: 'error'
      });
    }
  };

  const getTaskOffset = (startDate: Date) => {
    return Math.floor((startDate.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const goToDate = (targetDate: Date) => {
    targetDate.setHours(0, 0, 0, 0);
    const newStart = new Date(targetDate);
    newStart.setDate(targetDate.getDate());
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 60);
    setViewStartDate(newStart);
    setViewEndDate(newEnd);
  };

  const handleTaskMouseDown = (e: React.MouseEvent, task: any) => {
    if (userRole !== 'admin' && userRole !== 'editor') return;
    e.preventDefault();
    e.stopPropagation();

    // Сохраняем текущую позицию скролла
    if (scrollContainerRef.current) {
      savedScrollLeft.current = scrollContainerRef.current.scrollLeft;
    }

    const startDate = new Date(task.start_date || task.created_at?.split('T')[0]);
    const endDate = new Date(task.due_date || task.start_date);

    setDragActive(true);
    setDragTask(task);
    setDragStartTaskId(task.id);
    setDragStartX(e.clientX);
    setDragOriginalStart(new Date(startDate));
    setDragOriginalEnd(new Date(endDate));
    setDragCurrentOffset(0);
    setDragRestricted(false);

    const taskElement = taskBarRefs.current.get(task.id);
    if (taskElement) {
      taskElement.style.opacity = '0.5';
    }
  };

  const handleTaskMouseMove = (e: MouseEvent) => {
    if (!dragActive || !dragTask || !dragOriginalStart || !dragOriginalEnd) return;

    const deltaX = e.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / CELL_WIDTH);

    if (deltaDays === dragCurrentOffset) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newStart = new Date(dragOriginalStart);
    newStart.setDate(dragOriginalStart.getDate() + deltaDays);

    let restricted = false;
    if (newStart < today) {
      restricted = true;
    }

    setDragRestricted(restricted);
    setDragCurrentOffset(deltaDays);

    const taskElement = taskBarRefs.current.get(dragTask.id);
    if (taskElement && dragOriginalStart && dragOriginalEnd) {
      let visualOffset = deltaDays;
      if (restricted) {
        const todayOffset = getTaskOffset(today);
        const originalOffset = getTaskOffset(dragOriginalStart);
        visualOffset = todayOffset - originalOffset;
      }
      const newOffset = getTaskOffset(dragOriginalStart) + visualOffset;
      taskElement.style.left = `${newOffset * CELL_WIDTH}px`;
      taskElement.style.transition = 'left 0.05s linear';

      if (restricted) {
        taskElement.style.backgroundColor = '#f44336';
        taskElement.style.opacity = '0.7';
      } else {
        taskElement.style.backgroundColor = getTaskColor(dragTask);
        taskElement.style.opacity = '0.5';
      }
    }
  };

  const handleTaskMouseUp = async (e: MouseEvent) => {
    if (!dragActive || !dragTask || !dragOriginalStart || !dragOriginalEnd) {
      if (dragStartTaskId) {
        const taskElement = taskBarRefs.current.get(dragStartTaskId);
        if (taskElement) {
          taskElement.style.opacity = '1';
          taskElement.style.backgroundColor = getTaskColor(dragTask);
        }
      }
      setDragActive(false);
      setDragTask(null);
      setDragStartTaskId(null);
      setDragOriginalStart(null);
      setDragOriginalEnd(null);
      setDragCurrentOffset(0);
      setDragRestricted(false);
      return;
    }

    const deltaX = e.clientX - dragStartX;
    let deltaDays = Math.round(deltaX / CELL_WIDTH);

    const taskElement = taskBarRefs.current.get(dragTask.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newStartRaw = new Date(dragOriginalStart);
    newStartRaw.setDate(dragOriginalStart.getDate() + deltaDays);

    let finalDelta = deltaDays;
    if (newStartRaw < today) {
      const todayStart = new Date(today);
      const todayStartDays = Math.floor((todayStart.getTime() - dragOriginalStart.getTime()) / (1000 * 60 * 60 * 24));
      finalDelta = todayStartDays;
    }

    if (taskElement) {
      taskElement.style.opacity = '1';
      taskElement.style.transition = '';
      taskElement.style.backgroundColor = getTaskColor(dragTask);
    }

    if (finalDelta !== 0) {
      const duration = Math.ceil((dragOriginalEnd.getTime() - dragOriginalStart.getTime()) / (1000 * 60 * 60 * 24));
      const newStart = new Date(dragOriginalStart);
      newStart.setDate(dragOriginalStart.getDate() + finalDelta);
      const newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + duration);

      await updateTaskDates(dragTask.id, newStart, newEnd);
    }

    setDragActive(false);
    setDragTask(null);
    setDragStartTaskId(null);
    setDragOriginalStart(null);
    setDragOriginalEnd(null);
    setDragCurrentOffset(0);
    setDragRestricted(false);
  };

  const handleScrollStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScrolling(true);
    setScrollStartX(e.clientX);
    setScrollStartDate(new Date(viewStartDate));

    const container = scrollContainerRef.current?.parentElement;
    if (container) {
      container.style.cursor = 'grabbing';
    }
  };

  const handleScrollMove = (e: MouseEvent) => {
    if (!isScrolling || !scrollStartDate) return;

    const deltaX = e.clientX - scrollStartX;
    const deltaDays = Math.round(deltaX / CELL_WIDTH);

    if (deltaDays === 0) return;

    const newStart = new Date(scrollStartDate);
    newStart.setDate(scrollStartDate.getDate() - deltaDays);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 60);

    setViewStartDate(newStart);
    setViewEndDate(newEnd);
    setScrollStartDate(newStart);
    setScrollStartX(e.clientX);
  };

  const handleScrollEnd = () => {
    setIsScrolling(false);
    setScrollStartDate(null);

    const container = scrollContainerRef.current?.parentElement;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  useEffect(() => {
    if (dragActive) {
      document.addEventListener('mousemove', handleTaskMouseMove);
      document.addEventListener('mouseup', handleTaskMouseUp);
    } else {
      document.removeEventListener('mousemove', handleTaskMouseMove);
      document.removeEventListener('mouseup', handleTaskMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleTaskMouseMove);
      document.removeEventListener('mouseup', handleTaskMouseUp);
    };
  }, [dragActive, dragTask, dragStartX, dragOriginalStart, dragOriginalEnd, dragCurrentOffset]);

  useEffect(() => {
    if (isScrolling) {
      document.addEventListener('mousemove', handleScrollMove);
      document.addEventListener('mouseup', handleScrollEnd);
    } else {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [isScrolling, scrollStartX, scrollStartDate]);

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    document.addEventListener('mousemove', handleSidebarResizeMove);
    document.addEventListener('mouseup', handleSidebarResizeEnd);
  };

  const handleSidebarResizeMove = (e: MouseEvent) => {
    if (!isResizingSidebar) return;
    const delta = e.clientX - startXRef.current;
    let newWidth = startWidthRef.current + delta;
    newWidth = Math.min(Math.max(newWidth, 280), 600);
    setSidebarWidth(newWidth);
  };

  const handleSidebarResizeEnd = () => {
    setIsResizingSidebar(false);
    document.removeEventListener('mousemove', handleSidebarResizeMove);
    document.removeEventListener('mouseup', handleSidebarResizeEnd);
  };

  const getTaskColor = (task: any) => {
    if (task.status === 'done') return '#4caf50';
    if (task.status === 'in_progress') return '#ff9800';
    if (task.status === 'review') return '#2196f3';
    return '#9e9e9e';
  };

  const dayCount = Math.ceil((viewEndDate.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const days = Array.from({ length: Math.max(30, dayCount) }, (_, i) => {
    const date = new Date(viewStartDate);
    date.setDate(viewStartDate.getDate() + i);
    return date;
  });

  const months: { name: string; startIndex: number; days: number }[] = [];
  let currentMonth = '';
  let monthStartIndex = 0;
  let monthDays = 0;

  days.forEach((day, idx) => {
    const monthName = day.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (monthName !== currentMonth) {
      if (currentMonth) {
        months.push({ name: currentMonth, startIndex: monthStartIndex, days: monthDays });
      }
      currentMonth = monthName;
      monthStartIndex = idx;
      monthDays = 1;
    } else {
      monthDays++;
    }
  });
  if (currentMonth) {
    months.push({ name: currentMonth, startIndex: monthStartIndex, days: monthDays });
  }

  const scrollLeft = () => {
    // Сохраняем позицию скролла перед изменением дат
    if (scrollContainerRef.current) {
      savedScrollLeft.current = scrollContainerRef.current.scrollLeft;
    }
    const newStart = new Date(viewStartDate);
    newStart.setDate(viewStartDate.getDate() - 30);
    const newEnd = new Date(viewEndDate);
    newEnd.setDate(viewEndDate.getDate() - 30);
    setViewStartDate(newStart);
    setViewEndDate(newEnd);
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      savedScrollLeft.current = scrollContainerRef.current.scrollLeft;
    }
    const newStart = new Date(viewStartDate);
    newStart.setDate(viewStartDate.getDate() + 30);
    const newEnd = new Date(viewEndDate);
    newEnd.setDate(viewEndDate.getDate() + 30);
    setViewStartDate(newStart);
    setViewEndDate(newEnd);
  };

  const goToToday = () => {
    if (scrollContainerRef.current) {
      savedScrollLeft.current = scrollContainerRef.current.scrollLeft;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    goToDate(today);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Gantt chart...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">📅 Gantt Chart - Project Timeline</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 220 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  size="small"
                />
              }
              label={showCompleted ? "✓ Showing completed" : "◯ Hiding completed"}
            />
          </Box>
          <MiniCalendar
            currentDate={viewStartDate}
            onDateSelect={goToDate}
            tasks={tasks}
          />
          <Button size="small" startIcon={<ChevronLeftIcon />} onClick={scrollLeft}>Back 30d</Button>
          <Button size="small" startIcon={<TodayIcon />} onClick={goToToday}>Today</Button>
          <Button size="small" endIcon={<ChevronRightIcon />} onClick={scrollRight}>Forward 30d</Button>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        🟢 Completed | 🟠 In Progress | 🔵 On Hold | ⚪ To Do |
        👆 Click on task to edit | 🖱️ Drag task bar LEFT/RIGHT to move |
        ✋ Drag calendar LEFT/RIGHT to scroll | 📅 Click calendar to jump to date
      </Typography>

      <Box
        ref={scrollContainerRef}
        sx={{
          overflowX: 'auto',
          width: '100%',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          bgcolor: 'white',
          cursor: isScrolling ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleScrollStart}
      >
        <Box
          sx={{
            minWidth: Math.max(1000, days.length * CELL_WIDTH + sidebarWidth + 10),
            position: 'relative',
            pointerEvents: dragActive ? 'auto' : 'none'
          }}
        >
          <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa', pointerEvents: 'none' }}>
            <Box
              sx={{
                width: sidebarWidth,
                flexShrink: 0,
                p: 1,
                fontWeight: 'bold',
                borderRight: '1px solid #e0e0e0',
                position: 'relative',
                userSelect: 'none',
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              Task List
              <Box
                sx={{
                  position: 'absolute',
                  right: -4,
                  top: 0,
                  width: 8,
                  height: '100%',
                  cursor: 'col-resize',
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                }}
                onMouseDown={handleSidebarResizeStart}
              />
            </Box>
            <Box sx={{ display: 'flex', flex: 1 }}>
              {months.map((month, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: month.days * CELL_WIDTH,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    p: 1,
                    borderLeft: idx > 0 ? '1px solid #e0e0e0' : 'none',
                    bgcolor: '#f5f5f5'
                  }}
                >
                  {month.name}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa', pointerEvents: 'none' }}>
            <Box sx={{ width: sidebarWidth, flexShrink: 0, borderRight: '1px solid #e0e0e0', p: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
              Task
            </Box>
            <Box sx={{ display: 'flex', flex: 1 }}>
              {days.map((day, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: CELL_WIDTH,
                    minWidth: CELL_WIDTH,
                    textAlign: 'center',
                    fontSize: 10,
                    borderLeft: '1px solid #e0e0e0',
                    py: 0.5,
                    bgcolor: day.getDay() === 0 || day.getDay() === 6 ? '#f5f5f5' : 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  {day.getDate()}
                </Box>
              ))}
            </Box>
          </Box>

          {tasks.map(task => {
            const startDate = new Date(task.start_date || task.created_at?.split('T')[0]);
            const endDate = new Date(task.due_date || task.start_date);

            let startOffset = Math.floor((startDate.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24));
            let duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

            const visibleStart = Math.max(0, startOffset);
            const visibleEnd = Math.min(days.length, startOffset + duration);
            const visibleStartOffset = visibleStart;
            const visibleDuration = visibleEnd - visibleStart;

            if (visibleDuration <= 0) return null;

            return (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid #e0e0e0',
                  minHeight: 60,
                  '&:hover': { bgcolor: '#fafafa' },
                  pointerEvents: 'auto'
                }}
              >
                <Box
                  sx={{
                    width: sidebarWidth,
                    flexShrink: 0,
                    p: 1,
                    borderRight: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f0f0f0' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleTaskClick(task)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', wordBreak: 'break-word', pr: 1 }}>
                      {task.title}
                    </Typography>
                    <Tooltip title="Edit task">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleTaskClick(task); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {task.assignee && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word' }}>
                      👤 {task.assignee}
                    </Typography>
                  )}
                  {task.due_date && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      📅 Due: {new Date(task.due_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flex: 1,
                    position: 'relative',
                    minHeight: 60,
                    cursor: dragActive && dragTask?.id === task.id ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => handleTaskMouseDown(e, task)}
                >
                  <Box
                    ref={(el: HTMLDivElement | null) => {
                      if (el) taskBarRefs.current.set(task.id, el);
                      else taskBarRefs.current.delete(task.id);
                    }}
                    sx={{
                      position: 'absolute',
                      left: visibleStartOffset * CELL_WIDTH,
                      width: visibleDuration * CELL_WIDTH - 2,
                      height: 36,
                      top: 12,
                      bgcolor: getTaskColor(task),
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                      transition: dragActive && dragTask?.id === task.id ? 'left 0.05s linear' : 'none',
                      zIndex: 1,
                      opacity: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      px: 1,
                      boxSizing: 'border-box'
                    }}
                  >
                    <Typography variant="caption" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      textAlign: 'center'
                    }}>
                      {task.title.length > 15 ? task.title.substring(0, 12) + '...' : task.title}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Edit Task
            <Box>
              {(userRole === 'admin' || userRole === 'editor') && selectedTask && (
                <IconButton
                  onClick={() => handleDeleteTask(selectedTask)}
                  color="error"
                  sx={{ mr: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
              <IconButton onClick={() => setEditDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Start Date"
            type="date"
            value={editForm.start_date}
            onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Due Date"
            type="date"
            value={editForm.due_date}
            onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={editForm.status}
              label="Status"
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="review">On Hold</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={editForm.priority}
              label="Priority"
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              <MenuItem value="low">🟢 Low</MenuItem>
              <MenuItem value="medium">🟠 Medium</MenuItem>
              <MenuItem value="high">🔴 High</MenuItem>
              <MenuItem value="urgent">🟣 Urgent</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default GanttChart;

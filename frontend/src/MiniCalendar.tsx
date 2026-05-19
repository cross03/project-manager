import React, { useState } from 'react';
import {
  Box, Paper, IconButton, Typography, Grid, Button,
  Popover
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: any[];
}

function MiniCalendar({ currentDate, onDateSelect, tasks }: MiniCalendarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date(currentDate));

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setDisplayMonth(new Date(currentDate));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Функция для нормализации даты (без часового пояса)
  const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getDayColor = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    const dateStr = normalizedDate.toISOString().split('T')[0];

    const tasksOnDay = tasks.filter(task => {
      const startDate = task.start_date ? normalizeDate(new Date(task.start_date)) : null;
      const endDate = task.due_date ? normalizeDate(new Date(task.due_date)) : null;

      if (!startDate || !endDate) return false;

      return normalizedDate >= startDate && normalizedDate <= endDate;
    });

    if (tasksOnDay.length === 0) return '#ffffff';

    const hasCompleted = tasksOnDay.some(t => t.status === 'done');
    const hasInProgress = tasksOnDay.some(t => t.status === 'in_progress');
    const hasReview = tasksOnDay.some(t => t.status === 'review');

    if (hasCompleted && !hasInProgress && !hasReview) return '#e8f5e9';
    if (hasInProgress) return '#fff3e0';
    if (hasReview) return '#e3f2fd';
    return '#f5f5f5';
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    const startWeekday = firstDay.getDay();
    const adjustedStartWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
    for (let i = 0; i < adjustedStartWeekday; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(displayMonth);
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const prevMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(displayMonth.getMonth() - 1);
    setDisplayMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(displayMonth.getMonth() + 1);
    setDisplayMonth(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onDateSelect(today);
    handleClose();
  };

  const selectDate = (date: Date) => {
    const normalized = normalizeDate(date);
    onDateSelect(normalized);
    handleClose();
  };

  const isSelectedDate = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    const normalizedCurrent = normalizeDate(currentDate);
    return normalizedDate.toDateString() === normalizedCurrent.toDateString();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CalendarTodayIcon />}
        onClick={handleOpen}
        size="small"
        sx={{ textTransform: 'none' }}
      >
        {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Paper sx={{ p: 2, width: 320 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={prevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="subtitle1">
              {displayMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={nextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Grid container spacing={0.5}>
            {weekDays.map(day => (
              <Grid size={{ xs: 12/7 }} key={day}>
                <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', fontWeight: 'bold', fontSize: 11 }}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {days.map((day, idx) => (
              <Grid size={{ xs: 12/7 }} key={idx}>
                {day ? (
                  <Button
                    variant="text"
                    size="small"
                    sx={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: isSelectedDate(day)
                        ? 'primary.main'
                        : getDayColor(day),
                      color: isSelectedDate(day)
                        ? 'white'
                        : 'text.primary',
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'white'
                      }
                    }}
                    onClick={() => selectDate(day)}
                  >
                    {day.getDate()}
                  </Button>
                ) : (
                  <Box sx={{ height: 32 }} />
                )}
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button size="small" onClick={goToToday}>
              Сегодня
            </Button>
            <Button size="small" onClick={handleClose}>
              Закрыть
            </Button>
          </Box>

          <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              📅 Легенда:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 1 }} />
                <Typography variant="caption">Выполненные</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#fff3e0', border: '1px solid #ff9800', borderRadius: 1 }} />
                <Typography variant="caption">В процессе</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: 1 }} />
                <Typography variant="caption">На паузе</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Popover>
    </>
  );
}

export default MiniCalendar;

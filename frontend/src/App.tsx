import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CommentIcon from '@mui/icons-material/Comment';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import HomeIcon from '@mui/icons-material/Home';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Autocomplete from '@mui/material/Autocomplete';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import ForumIcon from '@mui/icons-material/Forum';
import axios from 'axios';
import UsersManagement from './UsersManagement';
import KanbanBoard from './KanbanBoard';
import Comments from './Comments';
import ProjectStats from './ProjectStats';
import GanttChart from './GanttChart';
import Notifications from './Notifications';
import Messages from './Messages';

const API_URL = 'http://10.221.8.140:8000';

function App() {
  const [user, setUser] = useState<any>(null);
  const [showUsersManagement, setShowUsersManagement] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [openChatWith, setOpenChatWith] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadAllUsers();
    loadProjects();
  }, []);

  const loadAllUsers = async () => {
    if (!user?.username) return;
    try {
      const response = await axios.get(`${API_URL}/api/all-users?username=${user.username}`);
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadProjects = async () => {
    if (!user?.username) return;
    try {
      const response = await axios.get(`${API_URL}/api/projects?username=${user.username}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleOpenProjectFromNotification = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
    }
  };

  if (!user) {
    return <Login onLogin={(userData: any) => {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      loadAllUsers();
      loadProjects();
    }} />;
  }

  if (showUsersManagement && user.role === 'admin') {
    return <UsersManagement token={user.username} onBack={() => {
      setShowUsersManagement(false);
      loadAllUsers();
    }} />;
  }

  if (showMessages) {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              💬 Сообщения
            </Typography>
            <Button color="inherit" onClick={() => {
              setShowMessages(false);
              setOpenChatWith(null);
            }}>Назад</Button>
          </Toolbar>
        </AppBar>
        <Container sx={{ mt: 4, mb: 4 }}>
          <Messages username={user.username} allUsers={allUsers} initialChatWith={openChatWith} />
        </Container>
      </>
    );
  }

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} user={user} onBack={() => setSelectedProject(null)} allUsers={allUsers} />;
  }

  return <Dashboard
    user={user}
    onLogout={() => {
      setUser(null);
      localStorage.removeItem('user');
    }}
    onManageUsers={() => setShowUsersManagement(true)}
    onSelectProject={setSelectedProject}
    allUsers={allUsers}
    onUserCreated={loadAllUsers}
    onOpenMessages={(chatUser?: string) => {
      setOpenChatWith(chatUser || null);
      setShowMessages(true);
    }}
    onOpenProject={handleOpenProjectFromNotification}
    projects={projects}
  />;
}

function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        await axios.post(`${API_URL}/api/register`, { username, password, email });
      }
      const response = await axios.post(`${API_URL}/api/login`, { username, password });
      if (response.data.success) {
        onLogin(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Typography>
          {error && (
            <Typography color="error" align="center" gutterBottom>
              {error}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {isRegister && (
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{ mt: 2, mb: 1 }}
          >
            {isRegister ? 'Register' : 'Login'}
          </Button>
          <Button fullWidth onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Back to Login' : 'Create Account'}
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}

function Dashboard({ user, onLogout, onManageUsers, onSelectProject, allUsers, onUserCreated, onOpenMessages, onOpenProject, projects }: any) {
  const [projectsList, setProjectsList] = useState<any[]>(projects || []);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    assignees: [] as string[],
    deadline: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const response = await axios.get(`${API_URL}/api/projects?username=${user.username}`);
    setProjectsList(response.data);
  };

  const canEdit = () => user.role === 'admin' || user.role === 'editor';
  const canDelete = () => user.role === 'admin';

  const handleSave = async () => {
    if (editingProject) {
      await axios.put(`${API_URL}/api/projects/${editingProject.id}?username=${user.username}`, formData);
    } else {
      await axios.post(`${API_URL}/api/projects?username=${user.username}`, formData);
    }
    loadProjects();
    handleCloseDialog();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this project?')) {
      await axios.delete(`${API_URL}/api/projects/${id}?username=${user.username}`);
      loadProjects();
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
    setFormData({ name: '', description: '', status: 'active', assignees: [], deadline: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'planning': return 'info';
      case 'completed': return 'default';
      case 'on_hold': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'planning': return 'Planning';
      case 'completed': return 'Completed';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminPanelSettingsIcon fontSize="small" />;
      case 'editor': return <EditNoteIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      default: return 'User';
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            📊 Project Manager
          </Typography>
          <Notifications
            username={user.username}
            onOpenChat={onOpenMessages}
            onOpenProject={onOpenProject}
          />
          <IconButton color="inherit" onClick={() => onOpenMessages()}>
            <ForumIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, mr: 2 }}>
            {getRoleIcon(user.role)}
            <Typography>{user.username}</Typography>
            <Chip label={getRoleName(user.role)} size="small" />
          </Box>
          {user.role === 'admin' && (
            <Button color="inherit" onClick={onManageUsers} startIcon={<PeopleIcon />}>
              Users
            </Button>
          )}
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Projects</Typography>
          {canEdit() && (
            <Fab color="primary" onClick={() => setOpenDialog(true)}>
              <AddIcon />
            </Fab>
          )}
        </Box>

        <Grid container spacing={3}>
          {projectsList.map((project) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => onSelectProject(project)}>
                  <Typography variant="h5" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    {project.description || 'No description'}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={getStatusLabel(project.status)}
                      color={getStatusColor(project.status) as any}
                      size="small"
                    />
                  </Box>
                  {project.assignees && project.assignees.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Assignees:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {project.assignees.map((a: string) => (
                          <Chip key={a} label={a} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {project.created_at && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
                {canEdit() && (
                  <CardActions>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project);
                        setFormData({
                          name: project.name,
                          description: project.description || '',
                          status: project.status,
                          assignees: project.assignees || [],
                          deadline: project.deadline || ''
                        });
                        setOpenDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    {canDelete() && (
                      <IconButton onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>

        {projectsList.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No projects yet.
            </Typography>
          </Box>
        )}

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Project Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Status"
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              slotProps={{ select: { native: true } }}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </TextField>
            <TextField
              fullWidth
              margin="dense"
              label="Deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Autocomplete
              multiple
              fullWidth
              options={allUsers}
              value={formData.assignees}
              onChange={(event, newValue) => {
                setFormData({ ...formData, assignees: newValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  margin="dense"
                  label="Assignees"
                  placeholder="Select users"
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

function ProjectDetail({ project, user, onBack, allUsers }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { id: 'tasks', label: 'Tasks', icon: <ViewKanbanIcon /> },
    { id: 'comments', label: 'Comments', icon: <CommentIcon /> },
    { id: 'stats', label: 'Statistics', icon: <AssessmentIcon /> },
    { id: 'gantt', label: 'Gantt Chart', icon: <TimelineIcon /> }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuContent = (
    <List>
      {tabs.map((tab) => (
        <ListItemButton
          key={tab.id}
          selected={activeTab === tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            if (isMobile) setMobileOpen(false);
          }}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            '&.Mui-selected': {
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
              '&:hover': {
                bgcolor: 'primary.main',
              },
            },
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ color: activeTab === tab.id ? 'white' : 'inherit' }}>
            {tab.icon}
          </ListItemIcon>
          <ListItemText primary={tab.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {project.name}
          </Typography>
          <Button color="inherit" onClick={onBack}>Back to Projects</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f5f5' }}>
        {!isMobile && (
          <Paper
            elevation={0}
            sx={{
              width: 280,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
              position: 'sticky',
              top: 0,
              height: 'calc(100vh - 64px)',
              overflowY: 'auto',
            }}
          >
            {menuContent}
          </Paper>
        )}

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, pl: 2 }}>
              Menu
            </Typography>
            {menuContent}
          </Box>
        </Drawer>

        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            overflow: 'auto',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: 2,
              minHeight: 'calc(100vh - 120px)',
              bgcolor: 'white',
            }}
          >
            {activeTab === 'overview' && (
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>{project.name}</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{project.description || 'No description'}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Status: {project.status}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Created: {new Date(project.created_at).toLocaleString()}</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>Created by: {project.created_by}</Typography>
                  {project.assignees && project.assignees.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Assignees:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {project.assignees.map((a: string) => (
                          <Chip key={a} label={a} size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'tasks' && (
              <KanbanBoard projectId={project.id} token={user.username} userRole={user.role} />
            )}

            {activeTab === 'comments' && (
              <Comments projectId={project.id} token={user.username} username={user.username} />
            )}

            {activeTab === 'stats' && (
              <ProjectStats projectId={project.id} token={user.username} />
            )}

            {activeTab === 'gantt' && (
              <GanttChart projectId={project.id} token={user.username} userRole={user.role} />
            )}
          </Paper>
        </Box>
      </Box>
    </>
  );
}

export default App;

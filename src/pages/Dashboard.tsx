import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FolderKanban, MessageSquare, 
  Bell, Settings, Plus, Trash2, ExternalLink, 
  CheckCircle2, Clock, AlertCircle, X, Camera, Loader2, Edit2
} from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, where } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; type: 'project' | 'message' | 'notification' }>({ 
    isOpen: false, id: '', type: 'project' 
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    displayName: '',
    bio: '',
    about: '',
    github: '',
    linkedin: '',
    twitter: '',
    facebook: ''
  });

  // New Project Form State
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'Web',
    status: 'In Progress',
    thumbnail: '',
    techStack: '',
    liveLink: '',
    githubLink: '',
    problemSolved: ''
  });

  useEffect(() => {
    if (profile) {
      setSettingsForm({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        about: profile.about || '',
        github: profile.socials?.github || '',
        linkedin: profile.socials?.linkedin || '',
        twitter: profile.socials?.twitter || '',
        facebook: profile.socials?.facebook || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const qProjects = query(collection(db, 'projects'), orderBy('timestamp', 'desc'));
    const qTeam = query(collection(db, 'team'), orderBy('timestamp', 'desc'));
    const qMessages = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    const qNotifications = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.uid, 'admin', 'sksjakaria@gmail.com']),
      orderBy('timestamp', 'desc')
    );

    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const unsubTeam = onSnapshot(qTeam, (snapshot) => {
      setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'team'));

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for current user or admin-specific notifications
      const isAdminUser = profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com';
      
      if (isAdminUser) {
        const qUsers = query(collection(db, 'users'), orderBy('email', 'asc'));
        onSnapshot(qUsers, (snap) => {
          setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }

      const filtered = allNotifs.filter((n: any) => 
        n.userId === user.uid || 
        (isAdminUser && (n.userId === 'admin' || n.userId === 'sksjakaria@gmail.com'))
      );
      setNotifications(filtered);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    return () => {
      unsubProjects();
      unsubTeam();
      unsubMessages();
      unsubNotifications();
    };
  }, [user, profile]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const projectData = {
        ...newProject,
        techStack: newProject.techStack.split(',').map(s => s.trim()).filter(s => s),
        timestamp: editingProject?.timestamp || serverTimestamp()
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), projectData);
      }

      setIsAddingProject(false);
      setEditingProject(null);
      setNewProject({
        title: '', description: '', category: 'Web', status: 'In Progress',
        thumbnail: '', techStack: '', liveLink: '', githubLink: '', problemSolved: ''
      });
    } catch (err) {
      handleFirestoreError(err, editingProject ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setNewProject({
      title: project.title,
      description: project.description,
      category: project.category,
      status: project.status,
      thumbnail: project.thumbnail || '',
      techStack: Array.isArray(project.techStack) ? project.techStack.join(', ') : (project.techStack || ''),
      liveLink: project.liveLink || '',
      githubLink: project.githubLink || '',
      problemSolved: project.problemSolved || ''
    });
    setIsAddingProject(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      let collectionName = '';
      if (deleteConfirm.type === 'project') collectionName = 'projects';
      else if (deleteConfirm.type === 'message') collectionName = 'messages';
      else if (deleteConfirm.type === 'notification') collectionName = 'notifications';
      
      await deleteDoc(doc(db, collectionName, deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, id: '', type: 'project' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${deleteConfirm.type}s/${deleteConfirm.id}`);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'messages', id), { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `messages/${id}`);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: settingsForm.displayName,
        bio: settingsForm.bio,
        about: settingsForm.about,
        socials: {
          github: settingsForm.github,
          linkedin: settingsForm.linkedin,
          twitter: settingsForm.twitter,
          facebook: settingsForm.facebook
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const tabs = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: FolderKanban, label: 'Projects' },
    { icon: Users, label: 'Team Members' },
    ...(profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com' ? [{ icon: Users, label: 'Users' }] : []),
    { icon: MessageSquare, label: 'Messages' },
    { icon: Bell, label: 'Notifications' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-muted/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Welcome, {profile?.displayName || 'Member'}</h1>
            <p className="text-muted-foreground">Here's what's happening with Softthikners today.</p>
          </div>
          <button 
            onClick={() => setIsAddingProject(true)}
            className="px-6 py-3 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow flex items-center gap-2"
          >
            <Plus size={20} /> New Project
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {tabs.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-medium transition-all relative group ${
                  activeTab === item.label 
                    ? 'bg-accent text-white shadow-lg' 
                    : 'glass text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon size={20} />
                {item.label}
                {item.label === 'Notifications' && notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute right-4 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background group-hover:border-accent/10 transition-colors">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'Overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Active Projects', value: projects.length, trend: `+${projects.filter(p => p.status === 'In Progress').length} in progress` },
                      { label: 'Team Members', value: teamMembers.length, trend: 'Active contributors' },
                      { label: 'Unread Messages', value: messages.filter(m => !m.isRead).length, trend: `${messages.length} total` },
                      { label: 'Notifications', value: notifications.filter(n => !n.isRead).length, trend: `${notifications.length} total` },
                    ].map((stat, i) => (
                      <div key={i} className="glass p-6 rounded-3xl border-accent/10">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{stat.label}</p>
                        <h3 className="text-3xl font-display font-bold mb-2">{stat.value}</h3>
                        <p className="text-[10px] text-accent font-bold">{stat.trend}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div className="glass p-8 rounded-[32px] border-accent/10">
                    <h3 className="text-xl font-bold mb-6">Recent Projects</h3>
                    <div className="space-y-6">
                      {projects.slice(0, 4).map((project, i) => (
                        <div key={i} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 overflow-hidden">
                            {project.thumbnail ? (
                              <img src={project.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-accent">
                                <FolderKanban size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold">{project.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{project.category} • {project.status}</p>
                          </div>
                          <Link to="/works" className="p-2 glass rounded-full hover:text-accent transition-colors">
                            <ExternalLink size={16} />
                          </Link>
                        </div>
                      ))}
                      {projects.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No projects found.</p>
                      )}
                    </div>
                  </div>

                  {/* Team Announcements */}
                  <div className="glass p-8 rounded-[32px] border-accent/10">
                    <h3 className="text-xl font-bold mb-6">Team Announcements</h3>
                    <div className="bg-accent/5 border border-accent/20 p-6 rounded-2xl">
                      <p className="text-sm font-medium text-accent mb-2">📢 Important: Weekly Sync</p>
                      <p className="text-sm text-muted-foreground">
                        Our weekly sync meeting is moved to Friday at 4:00 PM in the CSE Lab. Please update your project status before the meeting.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Projects' && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Manage Projects</h3>
                    <span className="text-xs font-bold text-muted-foreground">{projects.length} Total</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project) => (
                      <div key={project.id} className="glass p-6 rounded-3xl border-accent/10 group relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            project.status === 'Live' ? 'bg-green-500/10 text-green-500' :
                            project.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {project.status}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditProject(project)}
                              className="p-2 text-muted-foreground hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm({ isOpen: true, id: project.id, type: 'project' })}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold mb-2">{project.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {project.techStack?.slice(0, 3).map((tech: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-muted/50 rounded-md text-[10px] font-medium">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'Messages' && (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold">Contact Inquiries</h3>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`glass p-6 rounded-3xl border-accent/10 transition-all ${!msg.isRead ? 'ring-1 ring-accent/50 bg-accent/5' : ''}`}
                        onClick={() => !msg.isRead && markAsRead(msg.id)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                              {msg.name[0]}
                            </div>
                            <div>
                              <p className="font-bold">{msg.name}</p>
                              <p className="text-xs text-muted-foreground">{msg.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-muted-foreground">
                              {msg.timestamp?.toDate().toLocaleDateString()}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ isOpen: true, id: msg.id, type: 'message' });
                              }}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold mb-2">{msg.subject}</p>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center py-12 glass rounded-3xl border-dashed border-2 border-border">
                        <MessageSquare size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground">No messages yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'Users' && (
                <motion.div
                  key="users-tab"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">User Management</h3>
                    <span className="text-xs font-bold text-muted-foreground">{users.length} Registered Users</span>
                  </div>
                  <div className="glass overflow-hidden rounded-[32px] border-accent/10">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-accent/5 border-b border-accent/10">
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">User</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Role</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Email</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-accent/5">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-accent/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                                  className="w-8 h-8 rounded-full border border-accent/20" 
                                  alt=""
                                />
                                <span className="font-bold text-sm">{u.displayName || 'Anonymous'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                                u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                              }`}>
                                {u.role || 'visitor'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={async () => {
                                  const newRole = u.role === 'admin' ? 'member' : 'admin';
                                  try {
                                    await updateDoc(doc(db, 'users', u.id), { role: newRole });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `users/${u.id}`);
                                  }
                                }}
                                className="text-xs font-bold text-accent hover:underline"
                              >
                                Make {u.role === 'admin' ? 'Member' : 'Admin'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Team Members' && (
                <motion.div
                  key="team"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Team Directory</h3>
                    <Link to="/team" className="text-xs font-bold text-accent hover:underline">Manage Team</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="glass p-6 rounded-3xl border-accent/10 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-accent/20">
                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="font-bold">{member.name}</p>
                          <p className="text-xs text-accent font-medium">{member.role}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{member.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'Notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Notifications</h3>
                    <span className="text-xs font-bold text-muted-foreground">{notifications.filter(n => !n.isRead).length} Unread</span>
                  </div>
                  <div className="space-y-4">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`glass p-6 rounded-3xl border-accent/10 flex items-start gap-4 transition-all ${!notif.isRead ? 'ring-1 ring-accent/50 bg-accent/5' : ''}`}
                        onClick={() => !notif.isRead && markNotificationRead(notif.id)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          notif.type === 'success' ? 'bg-green-500/10 text-green-500' :
                          notif.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                          notif.type === 'error' ? 'bg-red-500/10 text-red-500' :
                          'bg-accent/10 text-accent'
                        }`}>
                          {notif.type === 'success' ? <CheckCircle2 size={20} /> :
                           notif.type === 'warning' ? <AlertCircle size={20} /> :
                           notif.type === 'error' ? <X size={20} /> :
                           <Bell size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm">{notif.title}</h4>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-muted-foreground">
                                {notif.timestamp?.toDate().toLocaleTimeString()}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ isOpen: true, id: notif.id, type: 'notification' });
                                }}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          {notif.link && (
                            <Link to={notif.link} className="text-xs text-accent font-bold mt-3 inline-flex items-center gap-1 hover:underline">
                              View Details <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-12 glass rounded-3xl border-dashed border-2 border-border">
                        <Bell size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground">No notifications yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'Settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <h3 className="text-xl font-bold">Profile Settings</h3>
                  <form onSubmit={handleSaveSettings} className="space-y-8">
                    <div className="glass p-8 rounded-[32px] border-accent/10 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Display Name</label>
                          <input
                            type="text"
                            value={settingsForm.displayName}
                            onChange={e => setSettingsForm(prev => ({ ...prev, displayName: e.target.value }))}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Email (Read-only)</label>
                          <input
                            disabled
                            type="email"
                            value={user.email || ''}
                            className="w-full px-6 py-4 bg-muted/20 border border-transparent rounded-2xl text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Short Bio</label>
                        <input
                          type="text"
                          value={settingsForm.bio}
                          onChange={e => setSettingsForm(prev => ({ ...prev, bio: e.target.value }))}
                          className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          placeholder="A brief tagline about you"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">About</label>
                        <textarea
                          rows={4}
                          value={settingsForm.about}
                          onChange={e => setSettingsForm(prev => ({ ...prev, about: e.target.value }))}
                          className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                          placeholder="Tell us more about yourself..."
                        />
                      </div>
                    </div>

                    <div className="glass p-8 rounded-[32px] border-accent/10 space-y-6">
                      <h4 className="font-bold">Social Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">GitHub URL</label>
                          <input
                            type="url"
                            value={settingsForm.github}
                            onChange={e => setSettingsForm(prev => ({ ...prev, github: e.target.value }))}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">LinkedIn URL</label>
                          <input
                            type="url"
                            value={settingsForm.linkedin}
                            onChange={e => setSettingsForm(prev => ({ ...prev, linkedin: e.target.value }))}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Twitter URL</label>
                          <input
                            type="url"
                            value={settingsForm.twitter}
                            onChange={e => setSettingsForm(prev => ({ ...prev, twitter: e.target.value }))}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Facebook URL</label>
                          <input
                            type="url"
                            value={settingsForm.facebook}
                            onChange={e => setSettingsForm(prev => ({ ...prev, facebook: e.target.value }))}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isSavingSettings}
                      type="submit"
                      className={`w-full py-4 rounded-2xl font-bold transition-all neon-glow flex items-center justify-center gap-2 disabled:opacity-50 ${
                        saveSuccess ? 'bg-green-500 text-white' : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {isSavingSettings ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={20} /> : <Settings size={20} />}
                      {isSavingSettings ? 'Saving Settings...' : saveSuccess ? 'Settings Saved!' : 'Save Changes'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* New Project Modal */}
        <AnimatePresence>
          {isAddingProject && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingProject(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass w-full max-w-2xl p-8 rounded-[40px] relative z-10 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => {
                    setIsAddingProject(false);
                    setEditingProject(null);
                    setNewProject({
                      title: '', description: '', category: 'Web', status: 'In Progress',
                      thumbnail: '', techStack: '', liveLink: '', githubLink: '', problemSolved: ''
                    });
                  }}
                  className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>

                <h2 className="text-3xl font-display font-bold mb-8">{editingProject ? 'Edit Project' : 'Add New Project'}</h2>

                <form onSubmit={handleAddProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Title</label>
                      <input
                        required
                        type="text"
                        value={newProject.title}
                        onChange={e => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="Project Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Category</label>
                      <select
                        value={newProject.category}
                        onChange={e => setNewProject(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white appearance-none"
                      >
                        <option value="Web">Web</option>
                        <option value="App">App</option>
                        <option value="AI/ML">AI/ML</option>
                        <option value="Tools">Tools</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white uppercase tracking-widest">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newProject.description}
                      onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                      placeholder="Brief overview of the project..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Status</label>
                      <select
                        value={newProject.status}
                        onChange={e => setNewProject(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white appearance-none"
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Tech Stack (comma separated)</label>
                      <input
                        type="text"
                        value={newProject.techStack}
                        onChange={e => setNewProject(prev => ({ ...prev, techStack: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="React, Firebase, Tailwind..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white uppercase tracking-widest">Thumbnail URL</label>
                    <input
                      type="url"
                      value={newProject.thumbnail}
                      onChange={e => setNewProject(prev => ({ ...prev, thumbnail: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Live Link</label>
                      <input
                        type="url"
                        value={newProject.liveLink}
                        onChange={e => setNewProject(prev => ({ ...prev, liveLink: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">GitHub Link</label>
                      <input
                        type="url"
                        value={newProject.githubLink}
                        onChange={e => setNewProject(prev => ({ ...prev, githubLink: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (editingProject ? <CheckCircle2 size={20} /> : <Plus size={20} />)}
                    {isSubmitting ? (editingProject ? 'Saving...' : 'Creating...') : (editingProject ? 'Save Changes' : 'Create Project')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '', type: 'project' })}
          onConfirm={handleDelete}
          title={`Delete ${deleteConfirm.type === 'project' ? 'Project' : 'Message'}`}
          message={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
        />
      </div>
    </div>
  );
}

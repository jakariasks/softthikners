import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, ExternalLink, X, CheckCircle2, Clock, Check, Users, Plus, Loader2, Image as ImageIcon, Sparkles, Wand2, Trash2, AlertTriangle, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import ConfirmModal from '../components/ConfirmModal';

const compressImage = (base64Str: string, maxWidth = 1280, maxHeight = 720, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const categories = ['All', 'Web', 'App', 'AI/ML', 'Tools'];
const statuses = ['Live', 'In Progress', 'Completed'];

export default function Works() {
  const [filter, setFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  
  const { isAdmin } = useAuth();

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    thumbnail: '',
    techStack: '',
    status: 'Live',
    category: 'Web',
    liveLink: '#',
    githubLink: '#',
    problemSolved: '',
    teamMembers: '',
    timeline: [] as any[]
  });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleGenerateAIImage = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: aiPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const fullBase64 = `data:image/png;base64,${base64Data}`;
            const compressedUrl = await compressImage(fullBase64);
            setNewProject(prev => ({ ...prev, thumbnail: compressedUrl }));
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64);
      setNewProject(prev => ({ ...prev, thumbnail: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const projectToSave = {
        title: newProject.title,
        description: newProject.description,
        thumbnail: newProject.thumbnail,
        techStack: newProject.techStack.split(',').map(s => s.trim()).filter(Boolean),
        status: newProject.status,
        category: newProject.category,
        liveLink: newProject.liveLink,
        githubLink: newProject.githubLink,
        problemSolved: newProject.problemSolved,
        teamMembers: newProject.teamMembers.split(',').map(s => s.trim()).filter(Boolean),
        timeline: newProject.timeline.length > 0 ? newProject.timeline : [
          { label: 'Project Kickoff', date: 'Month 1', status: 'completed' },
          { label: 'Research & Planning', date: 'Month 2', status: 'completed' },
          { label: 'Development Phase', date: 'Month 3', status: 'current' },
          { label: 'Testing & QA', date: 'Month 4', status: 'upcoming' },
          { label: 'Final Launch', date: 'Month 5', status: 'upcoming' }
        ],
        timestamp: editingProject?.timestamp || serverTimestamp()
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectToSave);
      } else {
        await addDoc(collection(db, 'projects'), projectToSave);
      }

      setShowAddModal(false);
      setEditingProject(null);
      setNewProject({
        title: '',
        description: '',
        thumbnail: '',
        techStack: '',
        status: 'Live',
        category: 'Web',
        liveLink: '#',
        githubLink: '#',
        problemSolved: '',
        teamMembers: '',
        timeline: []
      });
      setAiPrompt('');
    } catch (error) {
      handleFirestoreError(error, editingProject ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setNewProject({
      title: project.title,
      description: project.description,
      thumbnail: project.thumbnail,
      techStack: project.techStack.join(', '),
      status: project.status,
      category: project.category,
      liveLink: project.liveLink,
      githubLink: project.githubLink,
      problemSolved: project.problemSolved,
      teamMembers: project.teamMembers.join(', '),
      timeline: project.timeline || []
    });
    setShowAddModal(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, 'projects', deleteConfirm.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${deleteConfirm.id}`);
    }
  };

  const filteredProjects = projects.filter(p => 
    filter === 'All' || p.category === filter
  );

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold mb-6"
          >
            Our <span className="gradient-text">Works</span>
          </motion.h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Explore the innovative products and services built by the Softthikners team.
          </p>

          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowAddModal(true)}
              className="mt-8 px-8 py-3 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={20} /> Add New Project
            </motion.button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                filter === cat 
                  ? 'bg-accent text-white neon-glow' 
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ 
                      type: 'spring',
                      duration: 0.5,
                      bounce: 0.3,
                      opacity: { duration: 0.2 }
                    }}
                    whileHover={{ y: -8, scale: 1.01 }}
                    className="glass rounded-[40px] overflow-hidden border-accent/10 hover:border-accent/30 hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)] transition-all duration-300 group flex flex-col md:flex-row h-full cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="md:w-1/2 relative overflow-hidden">
                      <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                          project.status === 'Live' ? 'bg-green-500 text-white' : 
                          project.status === 'In Progress' ? 'bg-amber-500 text-white' : 
                          'bg-blue-500 text-white'
                        }`}>
                          {project.status} {project.status === 'Live' ? '✅' : 
                           project.status === 'In Progress' ? '🔄' : 
                           '🏁'}
                        </span>
                      </div>
                      
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(project);
                            }}
                            className="p-2 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-full transition-all backdrop-blur-md"
                            title="Edit Project"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, project.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md"
                            title="Delete Project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="md:w-1/2 p-8 flex flex-col">
                      <span className="text-accent text-xs font-bold uppercase tracking-widest mb-2">{project.category}</span>
                      <h3 className="text-2xl font-bold mb-4">{project.title}</h3>
                      <p className="text-muted-foreground text-sm mb-6 line-clamp-3 leading-relaxed">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-8">
                        {project.techStack?.map((tech: string) => (
                          <span key={tech} className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex gap-3">
                        <button
                          className="flex-1 py-3 bg-accent/10 text-accent rounded-2xl font-bold hover:bg-accent hover:text-white transition-all text-sm"
                        >
                          View Details
                        </button>
                        <Link
                          to={`/team?members=${project.teamMembers?.join(',')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-3 glass text-muted-foreground rounded-2xl font-bold hover:bg-white/10 hover:text-foreground transition-all flex items-center justify-center"
                          title="View Team"
                        >
                          <Users size={18} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground">
                    <X size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No projects found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters to see more projects.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add Project Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl glass rounded-[40px] p-8 shadow-2xl border-accent/20 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProject(null);
                    setNewProject({
                      title: '',
                      description: '',
                      thumbnail: '',
                      techStack: '',
                      status: 'Live',
                      category: 'Web',
                      liveLink: '#',
                      githubLink: '#',
                      problemSolved: '',
                      teamMembers: '',
                      timeline: []
                    });
                  }}
                  className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all"
                >
                  <X size={24} />
                </button>

                <h2 className="text-3xl font-display font-bold mb-8">{editingProject ? 'Edit' : 'Add New'} <span className="text-accent">Project</span></h2>
                
                <form onSubmit={handleAddProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Title</label>
                      <input
                        required
                        type="text"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="Project Title"
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Category</label>
                      <select
                        value={newProject.category}
                        onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none"
                      >
                        {categories.filter(c => c !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Short Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="What is this project about?"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Problem Solved</label>
                    <textarea
                      required
                      rows={2}
                      value={newProject.problemSolved}
                      onChange={(e) => setNewProject({ ...newProject, problemSolved: e.target.value })}
                      placeholder="What problem does this solve?"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Status</label>
                      <select
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none"
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Tech Stack (comma separated)</label>
                      <input
                        required
                        type="text"
                        value={newProject.techStack}
                        onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value })}
                        placeholder="React, Node.js, Firebase"
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Live Link</label>
                      <input
                        type="text"
                        value={newProject.liveLink}
                        onChange={(e) => setNewProject({ ...newProject, liveLink: e.target.value })}
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">GitHub Link</label>
                      <input
                        type="text"
                        value={newProject.githubLink}
                        onChange={(e) => setNewProject({ ...newProject, githubLink: e.target.value })}
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Team Members (comma separated)</label>
                    <input
                      required
                      type="text"
                      value={newProject.teamMembers}
                      onChange={(e) => setNewProject({ ...newProject, teamMembers: e.target.value })}
                      placeholder="Alex Rivera, Jordan Smith"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Project Thumbnail</label>
                      <div className="flex flex-col gap-4">
                        {!newProject.thumbnail ? (
                          <label className="w-full h-40 border-2 border-dashed border-accent/20 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group">
                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                              <ImageIcon size={24} />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold">Click to upload thumbnail</p>
                              <p className="text-[10px] text-muted-foreground">PNG, JPG or WEBP (Max 5MB)</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="relative group rounded-2xl overflow-hidden h-48 border border-accent/20">
                            <img 
                              src={newProject.thumbnail} 
                              alt="Preview" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <label className="p-2 bg-white text-slate-950 rounded-full hover:scale-110 transition-transform cursor-pointer">
                                <ImageIcon size={20} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setNewProject(prev => ({ ...prev, thumbnail: '' }))}
                                className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                      <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <Sparkles size={12} /> Generate Thumbnail with AI
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe the project thumbnail..."
                          className="flex-1 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                        />
                        <button
                          type="button"
                          disabled={isGenerating || !aiPrompt}
                          onClick={handleGenerateAIImage}
                          className="px-4 bg-accent text-white rounded-xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting || !newProject.thumbnail}
                    type="submit"
                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (editingProject ? <Check size={20} /> : <Plus size={20} />)}
                    {isSubmitting ? (editingProject ? 'Saving...' : 'Creating Project...') : (editingProject ? 'Save Changes' : 'Create Project')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Details Modal */}
        <AnimatePresence>
          {selectedProject && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProject(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl glass rounded-[40px] overflow-hidden shadow-2xl border-accent/20 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all z-10"
                >
                  <X size={24} />
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="h-64 lg:h-auto">
                    <img src={selectedProject.thumbnail} alt={selectedProject.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-8 lg:p-12">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-accent text-xs font-bold uppercase tracking-widest">{selectedProject.category}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        selectedProject.status === 'Live' ? 'bg-green-500 text-white' : 
                        selectedProject.status === 'In Progress' ? 'bg-amber-500 text-white' : 
                        'bg-blue-500 text-white'
                      }`}>
                        {selectedProject.status} {selectedProject.status === 'Live' ? '✅' : 
                         selectedProject.status === 'In Progress' ? '🔄' : 
                         '🏁'}
                      </span>
                    </div>
                    <h2 className="text-3xl font-display font-bold mb-6">{selectedProject.title}</h2>
                    
                    <div className="space-y-8">
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-muted-foreground">The Problem</h4>
                        <p className="text-sm leading-relaxed">{selectedProject.problemSolved}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-muted-foreground">The Solution</h4>
                        <p className="text-sm leading-relaxed">{selectedProject.description}</p>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-muted-foreground">Tech Stack</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.techStack?.map((tech: string) => (
                            <span key={tech} className="px-4 py-1.5 bg-accent/10 text-accent text-xs font-bold rounded-full border border-accent/20">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-6 text-muted-foreground">Project Timeline</h4>
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-accent/20 before:to-transparent">
                          {(selectedProject.timeline || [
                            { label: 'Project Kickoff', date: 'Month 1', status: 'completed' },
                            { label: 'Research & Planning', date: 'Month 2', status: 'completed' },
                            { label: 'Development Phase', date: 'Month 3', status: 'current' },
                            { label: 'Testing & QA', date: 'Month 4', status: 'upcoming' },
                            { label: 'Final Launch', date: 'Month 5', status: 'upcoming' }
                          ]).map((item: any, i: number) => (
                            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full border border-accent/20 glass shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-500",
                                item.status === 'completed' ? 'bg-accent text-white' : 
                                item.status === 'current' ? 'bg-accent/20 text-accent animate-pulse' : 
                                'bg-muted text-muted-foreground'
                              )}>
                                {item.status === 'completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-4 rounded-2xl border-accent/10 transition-all hover:border-accent/30">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                  <div className="font-bold text-sm">{item.label}</div>
                                  <time className="font-mono text-[10px] text-accent">{item.date}</time>
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">{item.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-3 text-muted-foreground">Team Members</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {selectedProject.teamMembers?.map((member: string) => (
                            <span key={member} className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">
                              {member}
                            </span>
                          ))}
                        </div>
                        <Link
                          to={`/team?members=${selectedProject.teamMembers?.join(',')}`}
                          className="w-full py-4 bg-accent/10 text-accent rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all"
                        >
                          <Users size={18} /> View Team Profiles
                        </Link>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <a 
                          href={selectedProject.liveLink === '#' ? undefined : selectedProject.liveLink} 
                          onClick={(e) => {
                            if (selectedProject.liveLink === '#') {
                              e.preventDefault();
                              alert('Live demo coming soon!');
                            }
                          }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-4 bg-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition-all neon-glow"
                        >
                          <ExternalLink size={18} /> Live Demo
                        </a>
                        <a 
                          href={selectedProject.githubLink === '#' ? undefined : selectedProject.githubLink} 
                          onClick={(e) => {
                            if (selectedProject.githubLink === '#') {
                              e.preventDefault();
                              alert('Source code will be available soon!');
                            }
                          }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-4 glass rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                        >
                          <Github size={18} /> Source Code
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmDelete}
          title="Delete Project"
          message="Are you sure you want to delete this project? This action cannot be undone."
        />
      </div>
    </div>
  );
}


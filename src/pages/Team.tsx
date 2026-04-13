import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Linkedin, MessageCircle, ExternalLink, Users, X, Briefcase, Award, Globe, User, Plus, Trash2, Loader2, Camera, Sparkles, Wand2, Twitter, Facebook, Search, Edit2, Check } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { db, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import ConfirmModal from '../components/ConfirmModal';

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
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

const categories = ['All', 'Frontend', 'Backend', 'Designer', 'ML/AI'];

export default function Team() {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedMembers = searchParams.get('members')?.split(',') || [];
  
  const { isAdmin } = useAuth();

  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    category: 'Frontend',
    image: '',
    bio: '',
    about: '',
    skills: '',
    funFact: '',
    github: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    behance: '',
    web: '',
    scholar: '',
    contributions: [] as { project: string; role: string; description: string }[]
  });

  useEffect(() => {
    const q = query(collection(db, 'team'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamMembers(members);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'team');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setNewMember(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.image) {
      alert('Please upload an image');
      return;
    }

    setIsSubmitting(true);
    try {
      const skillsArray = newMember.skills.split(',').map(s => s.trim()).filter(s => s !== '');
      
      const memberData = {
        name: newMember.name,
        role: newMember.role,
        category: newMember.category,
        image: newMember.image,
        bio: newMember.bio,
        about: newMember.about,
        skills: skillsArray,
        funFact: newMember.funFact,
        socials: {
          github: newMember.github,
          linkedin: newMember.linkedin,
          twitter: newMember.twitter,
          facebook: newMember.facebook,
          behance: newMember.behance,
          web: newMember.web,
          scholar: newMember.scholar
        },
        contributions: newMember.contributions,
        timestamp: editingMember?.timestamp || serverTimestamp()
      };

      if (editingMember) {
        await updateDoc(doc(db, 'team', editingMember.id), memberData);
      } else {
        await addDoc(collection(db, 'team'), memberData);
      }

      setShowAddModal(false);
      setEditingMember(null);
      setNewMember({
        name: '', role: '', category: 'Frontend', image: '', bio: '', about: '',
        skills: '', funFact: '', github: '', linkedin: '', twitter: '', facebook: '',
        behance: '', web: '', scholar: '', contributions: []
      });
    } catch (error) {
      handleFirestoreError(error, editingMember ? OperationType.UPDATE : OperationType.CREATE, 'team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (member: any) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      role: member.role,
      category: member.category,
      image: member.image,
      bio: member.bio,
      about: member.about,
      skills: member.skills.join(', '),
      funFact: member.funFact || '',
      github: member.socials?.github || '',
      linkedin: member.socials?.linkedin || '',
      twitter: member.socials?.twitter || '',
      facebook: member.socials?.facebook || '',
      behance: member.socials?.behance || '',
      web: member.socials?.web || '',
      scholar: member.socials?.scholar || '',
      contributions: member.contributions || []
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
      await deleteDoc(doc(db, 'team', deleteConfirm.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `team/${deleteConfirm.id}`);
    }
  };

  const filteredMembers = teamMembers.filter(m => {
    const matchesFilter = filter === 'All' || m.category === filter;
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {highlightedMembers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-6 glass border-accent/30 rounded-[32px] flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Project Team Members</h2>
                <p className="text-sm text-muted-foreground">Showing the experts behind the project.</p>
              </div>
            </div>
            <button 
              onClick={() => setSearchParams({})}
              className="text-xs font-bold text-accent hover:underline"
            >
              Show All Team
            </button>
          </motion.div>
        )}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold mb-6"
          >
            Meet the <span className="gradient-text">Softthikners</span>
          </motion.h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg mb-8">
            A group of dedicated students pushing the boundaries of what's possible with code.
          </p>

          <div className="max-w-md mx-auto mb-12 relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-muted/30 border border-accent/10 rounded-2xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all glass text-lg"
            />
          </div>

          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={20} /> Add New Member
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

        {/* Team Grid */}
        {filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((member) => {
                const isHighlighted = highlightedMembers.includes(member.name);
                return (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      boxShadow: isHighlighted ? '0 0 30px rgba(6, 182, 212, 0.3)' : 'none'
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`group perspective-1000 h-[400px] ${isHighlighted ? 'z-10' : ''}`}
                  >
                    <div className={`relative w-full h-full transition-transform duration-700 preserve-3d group-hover:rotate-y-180 ${isHighlighted ? 'ring-2 ring-accent rounded-[32px]' : ''}`}>
                      {/* Front Side */}
                      <div className={`absolute inset-0 backface-hidden glass rounded-[32px] p-8 flex flex-col items-center text-center border-accent/10 ${isHighlighted ? 'bg-accent/5' : ''}`}>
                        {isHighlighted && (
                          <div className="absolute top-4 right-4 bg-accent text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                            Team Member
                          </div>
                        )}
                        
                        {isAdmin && (
                          <div className="absolute top-4 right-4 flex gap-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(member);
                              }}
                              className="p-2 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-full transition-all backdrop-blur-md"
                              title="Edit Member"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, member.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md"
                              title="Delete Member"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        <div className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-accent/20 group-hover:ring-accent transition-all duration-500">
                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                        <p className="text-accent text-sm font-medium mb-4">{member.role}</p>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                          {member.bio}
                        </p>
                        <div className="mt-auto flex gap-3">
                          <a href={member.socials?.github} target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-full hover:text-accent transition-colors" title="GitHub"><Github size={16} /></a>
                          <a href={member.socials?.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-full hover:text-accent transition-colors" title="LinkedIn"><Linkedin size={16} /></a>
                          {member.socials?.twitter && (
                            <a href={member.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-full hover:text-accent transition-colors" title="Twitter"><Twitter size={16} /></a>
                          )}
                          {member.socials?.facebook && (
                            <a href={member.socials.facebook} target="_blank" rel="noopener noreferrer" className="p-2 glass rounded-full hover:text-accent transition-colors" title="Facebook"><Facebook size={16} /></a>
                          )}
                          <Link to="/contact" className="p-2 glass rounded-full hover:text-accent transition-colors" title="Contact"><MessageCircle size={16} /></Link>
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-[32px] p-8 flex flex-col items-center justify-center text-center border-accent/30 bg-accent/5">
                        <h4 className="font-bold mb-4">Skills</h4>
                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                          {member.skills.slice(0, 4).map(skill => (
                            <span key={skill} className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold rounded-full border border-accent/20">
                              {skill}
                            </span>
                          ))}
                          {member.skills.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{member.skills.length - 4} more</span>
                          )}
                        </div>
                        <h4 className="font-bold mb-2">Fun Fact</h4>
                        <p className="text-sm text-muted-foreground italic mb-6">
                          "{member.funFact}"
                        </p>
                        <button 
                          onClick={() => setSelectedMember(member)}
                          className="flex items-center gap-2 text-xs font-bold text-accent hover:underline"
                        >
                          View Full Profile <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 glass rounded-[40px] border-accent/10"
          >
            <Users size={48} className="mx-auto text-accent/20 mb-4" />
            <h3 className="text-xl font-bold mb-2">No members found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            <button 
              onClick={() => { setSearchTerm(''); setFilter('All'); }}
              className="mt-6 text-accent font-bold hover:underline"
            >
              Clear all filters
            </button>
          </motion.div>
        )}

        {/* Member Modal */}
        <AnimatePresence>
          {selectedMember && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMember(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl glass rounded-[40px] overflow-hidden shadow-2xl border-accent/20 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all z-10"
                >
                  <X size={24} />
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3">
                  <div className="lg:col-span-1 bg-accent/5 p-8 flex flex-col items-center text-center border-r border-accent/10">
                    <div className="w-40 h-40 rounded-full overflow-hidden mb-6 ring-4 ring-accent/20">
                      <img src={selectedMember.image} alt={selectedMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{selectedMember.name}</h2>
                    <p className="text-accent font-medium mb-6">{selectedMember.role}</p>
                    
                    <div className="flex flex-wrap gap-3 mb-8">
                      {selectedMember.socials?.github && (
                        <a href={selectedMember.socials.github} target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-2xl hover:text-accent transition-all" title="GitHub"><Github size={20} /></a>
                      )}
                      {selectedMember.socials?.linkedin && (
                        <a href={selectedMember.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-2xl hover:text-accent transition-all" title="LinkedIn"><Linkedin size={20} /></a>
                      )}
                      {selectedMember.socials?.twitter && (
                        <a href={selectedMember.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-2xl hover:text-accent transition-all" title="Twitter"><Twitter size={20} /></a>
                      )}
                      {selectedMember.socials?.facebook && (
                        <a href={selectedMember.socials.facebook} target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-2xl hover:text-accent transition-all" title="Facebook"><Facebook size={20} /></a>
                      )}
                      {selectedMember.socials?.web && (
                        <a href={selectedMember.socials.web} target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-2xl hover:text-accent transition-all" title="Website"><Globe size={20} /></a>
                      )}
                    </div>

                    <div className="w-full space-y-4">
                      <div className="p-4 glass rounded-2xl text-left">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                          <Award size={14} /> Top Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMember.skills?.map((skill: string) => (
                            <span key={skill} className="px-2 py-1 bg-accent/10 text-accent text-[9px] font-bold rounded-md">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 p-8 lg:p-12">
                    <div className="space-y-10">
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <User size={20} className="text-accent" /> About Me
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedMember.about}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                          <Briefcase size={20} className="text-accent" /> Project Contributions
                        </h3>
                        <div className="space-y-6">
                          {selectedMember.contributions?.map((item: any, idx: number) => (
                            <div key={idx} className="relative pl-6 border-l-2 border-accent/20">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent neon-glow" />
                              <h4 className="font-bold text-lg mb-1">{item.project}</h4>
                              <p className="text-accent text-xs font-bold uppercase tracking-wider mb-2">{item.role}</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6">
                        <Link 
                          to="/contact"
                          className="w-full py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={20} /> Get in Touch
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Member Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl glass rounded-[40px] overflow-hidden shadow-2xl border-accent/20 max-h-[90vh] overflow-y-auto"
              >
                <div className="p-8 md:p-12">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                          {editingMember ? <Edit2 size={24} /> : <User size={24} />}
                        </div>
                        <div>
                          <h2 className="text-3xl font-display font-bold">{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h2>
                          <p className="text-muted-foreground text-sm">{editingMember ? 'Update the profile details.' : 'Create a new profile for the team.'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingMember(null);
                          setNewMember({
                            name: '', role: '', category: 'Frontend', image: '', bio: '', about: '',
                            skills: '', funFact: '', github: '', linkedin: '', twitter: '', facebook: '',
                            behance: '', web: '', scholar: ''
                          });
                        }}
                        className="p-3 glass rounded-2xl hover:bg-destructive hover:text-white transition-all"
                      >
                        <X size={24} />
                      </button>
                    </div>

                  <form onSubmit={handleAddMember} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column: Basic Info */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Full Name</label>
                          <input
                            required
                            type="text"
                            value={newMember.name}
                            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                            placeholder="e.g. Alex Rivera"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Role</label>
                          <input
                            required
                            type="text"
                            value={newMember.role}
                            onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                            placeholder="e.g. Lead Developer"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Category</label>
                          <select
                            value={newMember.category}
                            onChange={(e) => setNewMember({ ...newMember, category: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none"
                          >
                            {categories.filter(c => c !== 'All').map(cat => (
                              <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Short Bio</label>
                          <textarea
                            required
                            rows={3}
                            value={newMember.bio}
                            onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                            placeholder="A catchy one-liner..."
                          />
                        </div>
                      </div>

                      {/* Right Column: Image & Skills */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Profile Image</label>
                          <div className="relative group cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full h-48 bg-muted/50 border-2 border-dashed border-accent/20 rounded-2xl flex flex-col items-center justify-center group-hover:border-accent/50 transition-all overflow-hidden">
                              {newMember.image ? (
                                <img src={newMember.image} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <Camera size={40} className="text-accent/40 mb-2" />
                                  <span className="text-xs font-bold text-accent/60">Click to upload photo</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Skills (comma separated)</label>
                          <input
                            required
                            type="text"
                            value={newMember.skills}
                            onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                            placeholder="e.g. React, Node.js, Python"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Fun Fact</label>
                          <input
                            type="text"
                            value={newMember.funFact}
                            onChange={(e) => setNewMember({ ...newMember, funFact: e.target.value })}
                            className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                            placeholder="Something interesting..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground">Full About Me</label>
                      <textarea
                        required
                        rows={4}
                        value={newMember.about}
                        onChange={(e) => setNewMember({ ...newMember, about: e.target.value })}
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                        placeholder="Tell the story of this team member..."
                      />
                    </div>

                    {/* Social Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Github size={14} /> GitHub URL</label>
                        <input
                          type="url"
                          value={newMember.github}
                          onChange={(e) => setNewMember({ ...newMember, github: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://github.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Linkedin size={14} /> LinkedIn URL</label>
                        <input
                          type="url"
                          value={newMember.linkedin}
                          onChange={(e) => setNewMember({ ...newMember, linkedin: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Twitter size={14} /> Twitter URL</label>
                        <input
                          type="url"
                          value={newMember.twitter}
                          onChange={(e) => setNewMember({ ...newMember, twitter: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Facebook size={14} /> Facebook URL</label>
                        <input
                          type="url"
                          value={newMember.facebook}
                          onChange={(e) => setNewMember({ ...newMember, facebook: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Globe size={14} /> Website URL</label>
                        <input
                          type="url"
                          value={newMember.web}
                          onChange={(e) => setNewMember({ ...newMember, web: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Award size={14} /> Behance URL</label>
                        <input
                          type="url"
                          value={newMember.behance}
                          onChange={(e) => setNewMember({ ...newMember, behance: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://behance.net/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Award size={14} /> Google Scholar URL</label>
                        <input
                          type="url"
                          value={newMember.scholar}
                          onChange={(e) => setNewMember({ ...newMember, scholar: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                          placeholder="https://scholar.google.com/..."
                        />
                      </div>
                    </div>

                    {/* Contributions Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                          <Briefcase size={16} /> Project Contributions
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewMember(prev => ({
                            ...prev,
                            contributions: [...prev.contributions, { project: '', role: '', description: '' }]
                          }))}
                          className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Contribution
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {newMember.contributions.map((contribution, index) => (
                          <div key={index} className="p-6 glass border-accent/10 rounded-2xl space-y-4 relative group">
                            <button
                              type="button"
                              onClick={() => setNewMember(prev => ({
                                ...prev,
                                contributions: prev.contributions.filter((_, i) => i !== index)
                              }))}
                              className="absolute top-4 right-4 p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project Name</label>
                                <input
                                  type="text"
                                  value={contribution.project}
                                  onChange={(e) => {
                                    const updated = [...newMember.contributions];
                                    updated[index].project = e.target.value;
                                    setNewMember(prev => ({ ...prev, contributions: updated }));
                                  }}
                                  className="w-full px-4 py-2 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                                  placeholder="e.g. AI Portfolio"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role in Project</label>
                                <input
                                  type="text"
                                  value={contribution.role}
                                  onChange={(e) => {
                                    const updated = [...newMember.contributions];
                                    updated[index].role = e.target.value;
                                    setNewMember(prev => ({ ...prev, contributions: updated }));
                                  }}
                                  className="w-full px-4 py-2 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                                  placeholder="e.g. Lead Frontend"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contribution Description</label>
                              <textarea
                                rows={2}
                                value={contribution.description}
                                onChange={(e) => {
                                  const updated = [...newMember.contributions];
                                  updated[index].description = e.target.value;
                                  setNewMember(prev => ({ ...prev, contributions: updated }));
                                }}
                                className="w-full px-4 py-2 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm resize-none"
                                placeholder="What did you do in this project?"
                              />
                            </div>
                          </div>
                        ))}
                        {newMember.contributions.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4 border-2 border-dashed border-accent/10 rounded-2xl">
                            No contributions added yet. Click "Add Contribution" to showcase work.
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={isSubmitting}
                      type="submit"
                      className="w-full py-5 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          {editingMember ? <Check size={20} /> : <Plus size={20} />}
                          {editingMember ? 'Save Changes' : 'Add Member to Team'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmDelete}
          title="Delete Team Member"
          message="Are you sure you want to delete this team member? This action cannot be undone."
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, Tag, ArrowRight, Search, Filter, Plus, X, Image as ImageIcon, Type, Layout, Clock, Sparkles, Wand2, Loader2, Trash2, AlertTriangle, Edit2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
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

const CATEGORIES = ['All', 'Technology', 'Development', 'Design', 'Infrastructure'];

interface BlogForm {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  readTime: string;
  metaTitle: string;
  metaDescription: string;
}

export default function Blog() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModalPrompt, setAiModalPrompt] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [form, setForm] = useState<BlogForm>({
    title: '',
    excerpt: '',
    content: '',
    category: 'Technology',
    image: '',
    readTime: '5 min read',
    metaTitle: '',
    metaDescription: ''
  });

  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com';

  useEffect(() => {
    const q = query(collection(db, 'blogs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blogData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date
      }));
      setBlogs(blogData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const blogData = {
        ...form,
        author: user.displayName || 'Anonymous',
        authorId: user.uid,
        date: editingBlog?.date ? (typeof editingBlog.date === 'string' ? new Date(editingBlog.date) : editingBlog.date) : serverTimestamp(),
      };

      if (editingBlog) {
        await updateDoc(doc(db, 'blogs', editingBlog.id), blogData);
      } else {
        await addDoc(collection(db, 'blogs'), blogData);
      }

      setIsModalOpen(false);
      setEditingBlog(null);
      setForm({
        title: '',
        excerpt: '',
        content: '',
        category: 'Technology',
        image: '',
        readTime: '5 min read',
        metaTitle: '',
        metaDescription: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingBlog ? OperationType.UPDATE : OperationType.CREATE, 'blogs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      category: blog.category,
      image: blog.image,
      readTime: blog.readTime,
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || ''
    });
    setIsModalOpen(true);
  };

  const handleGenerateAIImage = async (prompt: string, isFromDedicatedModal: boolean = false) => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
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
            
            // Compress image to stay under Firestore 1MB limit
            const compressedUrl = await compressImage(fullBase64);
            setForm(prev => ({ ...prev, image: compressedUrl }));
            
            if (isFromDedicatedModal) {
              setIsAiModalOpen(false);
              setIsModalOpen(true);
              setAiModalPrompt('');
            }
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, 'blogs', deleteConfirm.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `blogs/${deleteConfirm.id}`);
    }
  };

  const filteredPosts = blogs.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-32 pb-20 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-accent font-bold uppercase tracking-widest text-sm mb-4 block"
          >
            Our Insights
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-display font-bold mb-6"
          >
            The <span className="gradient-text">Softthikners</span> Blog
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-lg mb-8"
          >
            Stay updated with the latest trends in technology, development, and design from our expert team.
          </motion.p>

          {isAdmin && (
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 bg-accent text-white rounded-2xl font-bold neon-glow flex items-center gap-2"
              >
                <Plus size={20} />
                Add New Blog
              </motion.button>

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAiModalOpen(true)}
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
              >
                <Sparkles size={20} className="text-accent" />
                AI Image Generator
              </motion.button>
            </div>
          )}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all border",
                  selectedCategory === category 
                    ? "bg-accent text-white border-accent neon-glow" 
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-accent/30"
                )}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
            />
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-[32px] h-[450px] animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-[32px] overflow-hidden flex flex-col group hover:border-accent/30 transition-all"
              >
                <div className="relative h-60 overflow-hidden">
                  <img 
                    src={post.image || 'https://picsum.photos/seed/blog/800/600'} 
                    alt={post.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-4 py-1.5 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full neon-glow">
                      {post.category}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(post);
                        }}
                        className="p-2 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-full transition-all backdrop-blur-md"
                        title="Edit Blog Post"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, post.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md"
                        title="Delete Blog Post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={14} />
                      {post.author}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-display font-bold mb-4 group-hover:text-accent transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <Link 
                    to={`/blog/${post.id}`}
                    className="flex items-center gap-2 text-accent font-bold text-sm group/link"
                  >
                    Read More
                    <ArrowRight size={16} className="transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-2">No articles found</h3>
            <p className="text-muted-foreground">Try searching for something else or changing the category.</p>
          </div>
        )}
      </div>

      {/* Create Blog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-background border border-border rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                    {editingBlog ? <Edit2 size={24} /> : <Plus size={24} />}
                  </div>
                  <h2 className="text-2xl font-display font-bold">{editingBlog ? 'Edit Blog Post' : 'Create New Blog'}</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBlog(null);
                    setForm({
                      title: '',
                      excerpt: '',
                      content: '',
                      category: 'Technology',
                      image: '',
                      readTime: '5 min read',
                      metaTitle: '',
                      metaDescription: ''
                    });
                  }}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <label htmlFor="blog-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <Type size={16} /> Blog Title
                  </label>
                  <input
                    id="blog-title"
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter a catchy title..."
                    className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="blog-category" className="text-sm font-bold text-white flex items-center gap-2">
                      <Layout size={16} /> Category
                    </label>
                    <select
                      id="blog-category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none text-white"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="blog-readtime" className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock size={16} /> Read Time
                    </label>
                    <input
                      id="blog-readtime"
                      type="text"
                      value={form.readTime}
                      onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                      placeholder="e.g. 5 min read"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="blog-image" className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon size={16} /> Featured Image URL
                    </label>
                    <input
                      id="blog-image"
                      type="url"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all text-white"
                    />
                  </div>

                  <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                    <label htmlFor="ai-prompt" className="text-xs font-bold text-white uppercase tracking-widest mb-2 block flex items-center gap-2">
                      <Sparkles size={12} /> Generate Image with AI
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input
                        id="ai-prompt"
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the blog cover image..."
                        className="flex-1 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-all text-sm text-white"
                      />
                      <button
                        type="button"
                        disabled={isGenerating || !aiPrompt}
                        onClick={() => handleGenerateAIImage(aiPrompt)}
                        className="px-4 bg-accent text-white rounded-xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      </button>
                    </div>

                    {form.image && (
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-border group">
                        <img 
                          src={form.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                          className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-accent/5 rounded-[32px] border border-accent/10 space-y-4">
                    <h3 className="text-sm font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                      <Search size={16} /> SEO Settings
                    </h3>
                    
                    <div className="space-y-2">
                      <label htmlFor="blog-meta-title" className="text-xs font-bold text-muted-foreground">Meta Title</label>
                      <input
                        id="blog-meta-title"
                        type="text"
                        value={form.metaTitle}
                        onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                        placeholder="SEO Title (defaults to blog title)"
                        className="w-full px-5 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="blog-meta-desc" className="text-xs font-bold text-muted-foreground">Meta Description</label>
                      <textarea
                        id="blog-meta-desc"
                        rows={2}
                        value={form.metaDescription}
                        onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                        placeholder="Brief summary for search engines..."
                        className="w-full px-5 py-3 bg-muted/30 border border-transparent rounded-xl focus:outline-none focus:border-accent transition-all text-sm text-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="blog-excerpt" className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowRight size={16} /> Short Excerpt
                  </label>
                  <textarea
                    id="blog-excerpt"
                    required
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Briefly describe what the article is about..."
                    className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="blog-content" className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus size={16} /> Content (HTML supported)
                  </label>
                  <textarea
                    id="blog-content"
                    required
                    rows={8}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write your blog content here..."
                    className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none font-mono text-sm text-white"
                  />
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-5 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {editingBlog ? <Check size={20} /> : <Plus size={20} />}
                      {editingBlog ? 'Save Changes' : 'Publish Blog Post'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Image Generator Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-background border border-border rounded-[40px] shadow-2xl p-8"
            >
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">AI Image Generator</h2>
                  <p className="text-sm text-muted-foreground">Create a cover for your blog</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="ai-modal-prompt" className="text-sm font-bold text-white uppercase tracking-widest">
                    Image Prompt
                  </label>
                  <textarea
                    id="ai-modal-prompt"
                    rows={4}
                    value={aiModalPrompt}
                    onChange={(e) => setAiModalPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate (e.g., 'A futuristic city with neon lights, digital art style')..."
                    className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none text-white"
                  />
                </div>

                <button
                  disabled={isGenerating || !aiModalPrompt}
                  onClick={() => handleGenerateAIImage(aiModalPrompt, true)}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={20} />
                      Generate & Start Blog
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This action cannot be undone."
      />
    </div>
  );
}


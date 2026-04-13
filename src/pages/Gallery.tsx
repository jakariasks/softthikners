import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, Plus, Camera, Trash2, Loader2, Sparkles, Wand2, AlertTriangle, Edit2, Check } from 'lucide-react';
import { db, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { GoogleGenAI } from "@google/genai";
import ConfirmModal from '../components/ConfirmModal';

const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
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

const categories = ['All', 'Team Events', 'Hackathons', 'Projects', 'Behind the Scenes'];

export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const { isAdmin } = useAuth();

  // Form state
  const [newImage, setNewImage] = useState({
    title: '',
    category: 'Team Events',
    image: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGalleryItems(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleGenerateAIImage = async (isFromDedicatedModal = false) => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: aiPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
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
            setNewImage(prev => ({ ...prev, image: compressedUrl }));
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setNewImage(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage.title || !newImage.image) return;

    setIsSubmitting(true);
    try {
      const itemData = {
        ...newImage,
        timestamp: editingItem?.timestamp || serverTimestamp()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'gallery', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'gallery'), itemData);
      }

      setShowAddModal(false);
      setEditingItem(null);
      setNewImage({ title: '', category: 'Team Events', image: '' });
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'gallery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setNewImage({
      title: item.title,
      category: item.category,
      image: item.image
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
      await deleteDoc(doc(db, 'gallery', deleteConfirm.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gallery/${deleteConfirm.id}`);
    }
  };

  const filteredItems = galleryItems.filter(item => 
    filter === 'All' || item.category === filter
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
            Our <span className="gradient-text">Gallery</span>
          </motion.h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Capturing moments of innovation, collaboration, and fun.
          </p>

          {isAdmin && (
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowAddModal(true)}
                className="px-8 py-3 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center gap-2"
              >
                <Plus size={20} /> Add New Image
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  setAiPrompt('');
                  setNewImage({ title: '', category: 'Team Events', image: '' });
                  setShowAiModal(true);
                }}
                className="px-8 py-3 glass text-accent border-accent/20 rounded-2xl font-bold hover:bg-accent hover:text-white transition-all flex items-center gap-2 group"
              >
                <Sparkles size={20} className="group-hover:animate-pulse" /> Generate with AI
              </motion.button>
            </div>
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

        {/* Masonry Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group cursor-pointer overflow-hidden rounded-[32px] glass border-accent/10"
                  onClick={() => setSelectedImage(item)}
                >
                  <img src={item.image} alt={item.title} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="p-2 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-full transition-all backdrop-blur-md"
                        title="Edit Image"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-md"
                        title="Delete Image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white mb-4 scale-0 group-hover:scale-100 transition-transform duration-300">
                      <ZoomIn size={24} />
                    </div>
                    <span className="text-accent text-[10px] font-bold uppercase tracking-widest mb-1">{item.category}</span>
                    <h4 className="text-white font-bold">{item.title}</h4>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-20 glass rounded-[40px] border-dashed border-2 border-accent/20">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No images found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or add a new memory.</p>
          </div>
        )}

        {/* AI Generation Modal */}
        <AnimatePresence>
          {showAiModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAiModal(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl glass rounded-[40px] p-8 shadow-2xl border-accent/20 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setShowAiModal(false)}
                  className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all"
                >
                  <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-bold">AI Image <span className="text-accent">Generator</span></h2>
                    <p className="text-muted-foreground text-sm">Create unique memories with Gemini 2.5 Flash</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">What should I create?</label>
                    <div className="flex gap-2">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., A group of students celebrating a hackathon win in a futuristic lab, cinematic lighting, high detail..."
                        className="flex-1 px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all min-h-[100px] resize-none"
                      />
                    </div>
                    <button
                      disabled={isGenerating || !aiPrompt}
                      onClick={() => handleGenerateAIImage(true)}
                      className="w-full py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                      {isGenerating ? 'Generating Magic...' : 'Generate Image'}
                    </button>
                  </div>

                  {newImage.image && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 pt-6 border-t border-accent/10"
                    >
                      <div className="rounded-[32px] overflow-hidden aspect-square max-w-sm mx-auto border-4 border-accent/20 shadow-2xl relative group">
                        <img src={newImage.image} alt="AI Generated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Sparkles className="text-white w-12 h-12 animate-pulse" />
                        </div>
                      </div>

                      <form onSubmit={handleAddImage} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Title</label>
                            <input
                              required
                              type="text"
                              value={newImage.title}
                              onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                              placeholder="Name this memory"
                              className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Category</label>
                            <select
                              value={newImage.category}
                              onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                              className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none"
                            >
                              {categories.filter(c => c !== 'All').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          disabled={isSubmitting}
                          type="submit"
                          className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                          {isSubmitting ? 'Saving...' : 'Add to Gallery'}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Image Modal */}
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
                className="relative w-full max-w-lg glass rounded-[40px] p-8 shadow-2xl border-accent/20"
              >
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setNewImage({ title: '', category: 'Team Events', image: '' });
                  }}
                  className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all"
                >
                  <X size={24} />
                </button>

                <h2 className="text-3xl font-display font-bold mb-8">{editingItem ? 'Edit' : 'Add New'} <span className="text-accent">Memory</span></h2>
                
                <form onSubmit={handleAddImage} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Title</label>
                    <input
                      required
                      type="text"
                      value={newImage.title}
                      onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                      placeholder="e.g., Team Lunch at the Park"
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Category</label>
                    <select
                      value={newImage.category}
                      onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all appearance-none"
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-1">Image Source</label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="gallery-upload"
                        />
                        <label
                          htmlFor="gallery-upload"
                          className="w-full px-6 py-4 bg-accent/5 border border-dashed border-accent/20 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:bg-accent/10 transition-all group"
                        >
                          <Camera size={20} className="text-accent group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-bold">Upload from device</span>
                        </label>
                      </div>
                      
                      <div className="relative flex items-center">
                        <div className="flex-grow border-t border-accent/10"></div>
                        <span className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">or use URL</span>
                        <div className="flex-grow border-t border-accent/10"></div>
                      </div>

                      <input
                        type="url"
                        value={newImage.image.startsWith('data:') ? '' : newImage.image}
                        onChange={(e) => setNewImage({ ...newImage, image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-accent/10">
                    <label className="text-sm font-bold text-accent uppercase tracking-widest ml-1 mb-3 block flex items-center gap-2">
                      <Sparkles size={14} /> Generate with AI
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the image you want..."
                        className="flex-1 px-6 py-4 bg-accent/5 border border-accent/10 rounded-2xl focus:outline-none focus:border-accent transition-all text-sm"
                      />
                      <button
                        type="button"
                        disabled={isGenerating || !aiPrompt}
                        onClick={handleGenerateAIImage}
                        className="px-6 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Generate Image"
                      >
                        {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                      Powered by Gemini 2.5 Flash Image
                    </p>
                  </div>

                  {newImage.image && (
                    <div className="rounded-2xl overflow-hidden h-40 border border-accent/20">
                      <img src={newImage.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold neon-glow hover:bg-accent-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? <Check size={20} /> : <Plus size={20} />)}
                    {isSubmitting ? (editingItem ? 'Saving...' : 'Adding...') : (editingItem ? 'Save Changes' : 'Add to Gallery')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Lightbox */}
        <AnimatePresence>
          {selectedImage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedImage(null)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              >
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white hover:text-accent transition-colors"
                >
                  <X size={32} />
                </button>
                <img src={selectedImage.image} alt={selectedImage.title} className="w-full h-full object-contain rounded-2xl" referrerPolicy="no-referrer" />
                <div className="mt-6 text-center text-white">
                  <span className="text-accent text-xs font-bold uppercase tracking-widest mb-2 block">{selectedImage.category}</span>
                  <h3 className="text-2xl font-display font-bold">{selectedImage.title}</h3>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmDelete}
          title="Delete Image"
          message="Are you sure you want to delete this image? This action cannot be undone."
        />
      </div>
    </div>
  );
}

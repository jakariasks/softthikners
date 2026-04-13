import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, Cpu, Code, Smartphone, Palette, Cloud, Shield, Zap, 
  ArrowRight, CheckCircle2, Plus, Trash2, X, Layout, Layers, 
  Database, Terminal, Settings, Activity, ChevronDown, Users, Sparkles, Edit2, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import ConfirmModal from '../components/ConfirmModal';

const iconMap: Record<string, any> = {
  Globe, Cpu, Code, Smartphone, Palette, Cloud, Shield, Zap, Layout, Layers, Database, Terminal, Settings, Activity
};

export default function Services() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com';
  const [services, setServices] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

  // Form state
  const [newService, setNewService] = useState({
    title: '',
    desc: '',
    iconName: 'Globe',
    features: [''],
    color: 'text-accent',
    bg: 'bg-accent/10'
  });

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(servicesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });

    return () => unsubscribe();
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);

    try {
      const filteredFeatures = newService.features.filter(f => f.trim() !== '');
      const serviceData = {
        ...newService,
        features: filteredFeatures,
        timestamp: editingService?.timestamp || serverTimestamp()
      };

      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), serviceData);
      } else {
        await addDoc(collection(db, 'services'), serviceData);
      }

      setIsAdding(false);
      setEditingService(null);
      setNewService({
        title: '',
        desc: '',
        iconName: 'Globe',
        features: [''],
        color: 'text-accent',
        bg: 'bg-accent/10'
      });
    } catch (error) {
      handleFirestoreError(error, editingService ? OperationType.UPDATE : OperationType.CREATE, 'services');
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setNewService({
      title: service.title,
      desc: service.desc,
      iconName: service.iconName,
      features: service.features.length > 0 ? service.features : [''],
      color: service.color,
      bg: service.bg
    });
    setIsAdding(true);
  };

  const handleDeleteService = (id: string) => {
    if (!isAdmin) return;
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, 'services', deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, id: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `services/${deleteConfirm.id}`);
    }
  };

  const addFeatureField = () => {
    setNewService(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const updateFeatureField = (index: number, value: string) => {
    const newFeatures = [...newService.features];
    newFeatures[index] = value;
    setNewService(prev => ({ ...prev, features: newFeatures }));
  };

  const removeFeatureField = (index: number) => {
    if (newService.features.length <= 1) return;
    const newFeatures = newService.features.filter((_, i) => i !== index);
    setNewService(prev => ({ ...prev, features: newFeatures }));
  };

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-accent font-bold uppercase tracking-widest text-sm mb-4 block">Our Expertise</span>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              Solutions for the <span className="gradient-text">Digital Era</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              We combine technical excellence with creative thinking to deliver products that drive growth and solve real-world problems.
            </p>
          </motion.div>

          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAdding(true)}
              className="mt-12 px-8 py-3 bg-accent text-white rounded-2xl font-bold flex items-center gap-2 mx-auto neon-glow"
            >
              <Plus size={20} />
              Add New Service
            </motion.button>
          )}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
          {services.map((service, i) => {
            const Icon = iconMap[service.iconName] || Globe;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  y: -12,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  borderColor: "rgba(var(--accent), 0.4)"
                }}
                viewport={{ once: true }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: i * 0.1 
                }}
                className="glass p-8 rounded-[32px] border-accent/10 transition-colors group relative"
              >
                {isAdmin && (
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditService(service)}
                      className="p-2 text-muted-foreground hover:text-accent transition-colors"
                      title="Edit Service"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                <div className={`w-14 h-14 ${service.bg || 'bg-accent/10'} ${service.color || 'text-accent'} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  {service.desc}
                </p>
                <ul className="space-y-3">
                  {service.features?.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 size={16} className="text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}

          {services.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 glass rounded-[32px] border-dashed border-2 border-border">
              <p className="text-muted-foreground">No services added yet.</p>
              {isAdmin && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-4 text-accent font-bold hover:underline"
                >
                  Create your first service
                </button>
              )}
            </div>
          )}
        </div>

        {/* Why Choose Us Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Why Choose Softthikners?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">We don't just build software; we build solutions that empower your business.</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: "Fast Delivery",
                desc: "We prioritize efficiency without compromising quality, ensuring your project launches on schedule."
              },
              {
                icon: Shield,
                title: "Secure by Design",
                desc: "Security is integrated from day one, protecting your data and your users with industry best practices."
              },
              {
                icon: Users,
                title: "User-Centric",
                desc: "Every line of code is written with the end-user in mind, resulting in intuitive and engaging experiences."
              },
              {
                icon: Sparkles,
                title: "Cutting Edge",
                desc: "We leverage the latest technologies and AI to give you a competitive advantage in the digital landscape."
              }
            ].map((advantage, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-3xl border-accent/5 hover:border-accent/20 transition-all group"
              >
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <advantage.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{advantage.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{advantage.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add Service Modal */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
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
                    setIsAdding(false);
                    setEditingService(null);
                    setNewService({
                      title: '',
                      desc: '',
                      iconName: 'Globe',
                      features: [''],
                      color: 'text-accent',
                      bg: 'bg-accent/10'
                    });
                  }}
                  className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>

                <h2 className="text-3xl font-display font-bold mb-8">{editingService ? 'Edit Service' : 'Add New Service'}</h2>

                <form onSubmit={handleAddService} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="service-title" className="text-sm font-bold text-white uppercase tracking-widest">Title</label>
                      <input
                        id="service-title"
                        required
                        type="text"
                        value={newService.title}
                        onChange={e => setNewService(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="e.g. Web Development"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="service-icon" className="text-sm font-bold text-white uppercase tracking-widest">Icon</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                          className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 flex items-center justify-between focus:outline-none focus:border-accent transition-colors text-white"
                        >
                          <div className="flex items-center gap-3">
                            {React.createElement(iconMap[newService.iconName], { size: 20, className: "text-accent" })}
                            <span>{newService.iconName}</span>
                          </div>
                          <ChevronDown size={20} className={`transition-transform ${isIconDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isIconDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsIconDropdownOpen(false)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-900 border border-border rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto"
                              >
                                {Object.keys(iconMap).map(iconName => {
                                  const IconComp = iconMap[iconName];
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      onClick={() => {
                                        setNewService(prev => ({ ...prev, iconName }));
                                        setIsIconDropdownOpen(false);
                                      }}
                                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-accent/10 transition-colors text-white text-left"
                                    >
                                      <IconComp size={20} className="text-accent" />
                                      <span>{iconName}</span>
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="service-desc" className="text-sm font-bold text-white uppercase tracking-widest">Description</label>
                    <textarea
                      id="service-desc"
                      required
                      rows={3}
                      value={newService.desc}
                      onChange={e => setNewService(prev => ({ ...prev, desc: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                      placeholder="Describe the service..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-white uppercase tracking-widest block">Features</label>
                    {newService.features.map((feature, idx) => (
                      <div key={idx} className="space-y-2">
                        <label htmlFor={`feature-${idx}`} className="text-xs font-bold text-white uppercase tracking-widest">Feature {idx + 1}</label>
                        <div className="flex gap-2">
                          <input
                            id={`feature-${idx}`}
                            required
                            type="text"
                            value={feature}
                            onChange={e => updateFeatureField(idx, e.target.value)}
                            className="flex-grow bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                            placeholder={`Feature ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeFeatureField(idx)}
                            className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFeatureField}
                      className="text-accent text-sm font-bold flex items-center gap-2 hover:underline"
                    >
                      <Plus size={16} /> Add Feature
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="service-color" className="text-sm font-bold text-white uppercase tracking-widest">Text Color Class</label>
                      <input
                        id="service-color"
                        type="text"
                        value={newService.color}
                        onChange={e => setNewService(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="e.g. text-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="service-bg" className="text-sm font-bold text-white uppercase tracking-widest">BG Color Class</label>
                      <input
                        id="service-bg"
                        type="text"
                        value={newService.bg}
                        onChange={e => setNewService(prev => ({ ...prev, bg: e.target.value }))}
                        className="w-full bg-slate-900/50 border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-accent transition-colors text-white"
                        placeholder="e.g. bg-blue-500/10"
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (editingService ? <CheckCircle2 size={20} /> : <Plus size={20} />)}
                    {loading ? (editingService ? 'Saving...' : 'Creating...') : (editingService ? 'Save Changes' : 'Create Service')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Process Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">How We Work</h2>
            <p className="text-muted-foreground">Our streamlined process ensures quality and efficiency at every step.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Discovery', desc: 'We dive deep into your requirements and goals.' },
              { step: '02', title: 'Planning', desc: 'Strategy and architecture design for the solution.' },
              { step: '03', title: 'Development', desc: 'Agile building process with regular updates.' },
              { step: '04', title: 'Deployment', desc: 'Rigorous testing and successful launch.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-8 glass rounded-3xl text-center"
              >
                <span className="text-5xl font-display font-black text-accent/10 absolute top-4 left-1/2 -translate-x-1/2">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold mb-3 relative z-10">{item.title}</h3>
                <p className="text-muted-foreground text-sm relative z-10">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Frequently Asked <span className="gradient-text">Questions</span></h2>
            <p className="text-muted-foreground">Everything you need to know about our services and process.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "How long does a typical project take?",
                a: "Project timelines vary based on complexity. A standard MVP usually takes 4-8 weeks, while more complex enterprise solutions can take 3-6 months. We prioritize agile delivery to get you to market faster."
              },
              {
                q: "Do you provide post-launch support?",
                a: "Yes, we offer various maintenance and support packages to ensure your product remains secure, updated, and performs optimally after launch."
              },
              {
                q: "Can you work with existing codebases?",
                a: "Absolutely. We can audit, maintain, and expand existing applications, helping you modernize your tech stack or add new features to your current product."
              },
              {
                q: "What technologies do you specialize in?",
                a: "We are experts in React, Next.js, Node.js, Python, and various cloud platforms like AWS and Firebase. We always choose the best tool for the specific problem we're solving."
              }
            ].map((faq, i) => (
              <details key={i} className="glass rounded-2xl border border-accent/10 group overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-bold hover:bg-accent/5 transition-colors list-none">
                  {faq.q}
                  <ChevronDown size={20} className="text-accent transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-6 pt-0 text-muted-foreground text-sm leading-relaxed border-t border-accent/5">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-8">
            Have a project in mind?
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Let's collaborate to build something that makes a difference. Our team is ready to turn your vision into reality.
          </p>
          <Link 
            to="/contact" 
            className="inline-flex items-center gap-2 px-10 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow"
          >
            Start a Conversation
            <ArrowRight size={20} />
          </Link>
        </motion.div>

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmDelete}
          title="Delete Service"
          message="Are you sure you want to delete this service? This action cannot be undone."
        />
      </div>
    </div>
  );
}


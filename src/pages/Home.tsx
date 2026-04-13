import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Code, Cpu, Globe, Users, CheckCircle2, Star, Target, Lightbulb, Rocket, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, collection, query, orderBy, limit, onSnapshot } from '../lib/firebase';

const goals = [
  {
    icon: Target,
    title: 'Solve Real-World Problems',
    desc: 'We focus on building products that address actual pain points in society and industry.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Globe,
    title: 'Build Scalable Products',
    desc: 'Our engineering approach ensures that every solution we build can grow with its users.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Users,
    title: 'Empower Communities',
    desc: 'We believe in sharing knowledge and building tech that uplifts the community around us.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Zap,
    title: 'Collaborate & Grow',
    desc: 'Continuous learning and teamwork are at the heart of everything we do.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

export default function Home() {
  const [latestBlogs, setLatestBlogs] = useState<any[]>([]);
  const [featuredWorks, setFeaturedWorks] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { label: 'Projects Completed', value: '0' },
    { label: 'Team Members', value: '0' },
    { label: 'Technologies Used', value: '0' },
    { label: 'Happy Clients', value: '0' },
  ]);

  useEffect(() => {
    const qBlogs = query(collection(db, 'blogs'), orderBy('date', 'desc'), limit(3));
    const unsubscribeBlogs = onSnapshot(qBlogs, (snapshot) => {
      const blogData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Just now'
      }));
      setLatestBlogs(blogData);
    });

    const qWorks = query(collection(db, 'projects'), orderBy('timestamp', 'desc'));
    const unsubscribeWorks = onSnapshot(qWorks, (snapshot) => {
      const worksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeaturedWorks(worksData.slice(0, 3));
      
      // Update stats
      const techSet = new Set<string>();
      worksData.forEach((p: any) => {
        if (p.techStack) p.techStack.forEach((t: string) => techSet.add(t));
      });

      setStats(prev => [
        { ...prev[0], value: `${worksData.length}+` },
        prev[1], // Team members updated below
        { ...prev[2], value: `${techSet.size}+` },
        prev[3],
      ]);
    });

    const qTeam = query(collection(db, 'team'));
    const unsubscribeTeam = onSnapshot(qTeam, (snapshot) => {
      setStats(prev => [
        prev[0],
        { ...prev[1], value: `${snapshot.size}` },
        prev[2],
        prev[3],
      ]);
    });

    return () => {
      unsubscribeBlogs();
      unsubscribeWorks();
      unsubscribeTeam();
    };
  }, []);

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-bold mb-6 border border-accent/20"
          >
            Innovating the Future
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-heading font-extrabold mb-8 leading-tight"
          >
            We Think. We Build. <br />
            <span className="gradient-text">We Solve.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            A university CSE student team building real-life problem-solving products. From concept to deployment, we turn ideas into impact.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/works" className="w-full sm:w-auto px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow flex items-center justify-center gap-2 group">
              Explore Our Work
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/services" className="w-full sm:w-auto px-8 py-4 glass rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Our Services
            </Link>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Scroll to explore</span>
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center p-1">
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 bg-accent rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <h3 className="text-3xl md:text-4xl font-display font-bold text-accent mb-1">{stat.value}</h3>
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Story Section (from About) */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-accent font-bold uppercase tracking-widest text-sm mb-4 block">Our Story</span>
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight">
                From a Classroom Idea to a <span className="gradient-text">Tech Powerhouse.</span>
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  Softthikners started as a small group of passionate CSE students who wanted to do more than just pass exams. We wanted to build things that matter.
                </p>
                <p>
                  Today, we are a diverse team of developers, designers, and problem solvers working together to bridge the gap between theoretical knowledge and real-world application.
                </p>
                <blockquote className="border-l-4 border-accent pl-6 py-2 italic text-foreground font-medium text-lg">
                  "Our mission is to empower communities through innovative technology and collaborative excellence."
                </blockquote>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-[40px] overflow-hidden glass p-4">
                <img 
                  src="https://picsum.photos/seed/team-work/1000/1000" 
                  alt="Team working" 
                  className="w-full h-full object-cover rounded-[32px]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 glass p-6 rounded-3xl shadow-xl hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white">
                    <Rocket size={24} />
                  </div>
                  <div>
                    <p className="font-bold">20+ Projects</p>
                    <p className="text-xs text-muted-foreground">Launched successfully</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features/Services Teaser */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">What We Do</h2>
              <p className="text-muted-foreground">We specialize in various domains of technology to provide comprehensive solutions.</p>
            </div>
            <Link to="/services" className="text-accent font-bold flex items-center gap-2 hover:underline">
              View All Services <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: 'Web Development', desc: 'Building scalable, high-performance web applications with modern stacks.' },
              { icon: Cpu, title: 'AI & ML Solutions', desc: 'Implementing intelligent systems to solve complex data-driven problems.' },
              { icon: Code, title: 'Software Engineering', desc: 'Crafting robust software architectures for real-world efficiency.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 glass rounded-3xl border-accent/10 hover:border-accent/30 transition-all group"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-white transition-colors">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Goals (from Goal) */}
      <section className="py-24 px-6 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-display font-bold mb-4"
            >
              Our Vision & <span className="gradient-text">Goals</span>
            </motion.h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We are driven by a clear set of objectives that guide our innovation and development process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {goals.map((goal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-[32px] border-accent/10 hover:border-accent/30 transition-all group"
              >
                <div className={`w-14 h-14 ${goal.bg} ${goal.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <goal.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{goal.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{goal.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack (from About) */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Our Tech Stack</h2>
            <p className="text-muted-foreground">The tools and technologies we use to build high-quality products.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'Firebase', 'Tailwind CSS', 'Framer Motion', 'PostgreSQL', 'Docker', 'AWS', 'Git'].map((tech, i) => (
              <motion.span
                key={tech}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.1, backgroundColor: 'var(--color-accent)', color: 'white' }}
                className="px-6 py-3 glass rounded-full text-sm font-bold border-accent/20 cursor-default transition-all"
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Works */}
      <section className="py-24 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Featured Works</h2>
              <p className="text-muted-foreground">A glimpse into some of our most impactful projects built by the team.</p>
            </div>
            <Link to="/works" className="text-accent font-bold flex items-center gap-2 hover:underline">
              View All Projects <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredWorks.map((work, i) => (
              <motion.div
                key={work.id || i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-3xl aspect-[4/3]"
              >
                <img src={work.thumbnail || work.image} alt={work.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                  <span className="text-accent text-xs font-bold uppercase tracking-widest mb-2">{work.category}</span>
                  <h4 className="text-white text-xl font-bold">{work.title}</h4>
                </div>
              </motion.div>
            ))}
            {featuredWorks.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground glass rounded-3xl">
                No featured projects yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">What People <span className="gradient-text">Say</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Feedback from our collaborators and the community about our work and impact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Ariful Islam",
                role: "Professor, CSE Dept",
                content: "The Softthikners team demonstrates exceptional problem-solving skills. Their ability to translate complex academic concepts into functional tech products is truly impressive.",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arif"
              },
              {
                name: "Sarah Jenkins",
                role: "Startup Founder",
                content: "Working with this student team was a breath of fresh air. They are professional, innovative, and delivered a high-quality MVP that exceeded our expectations.",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
              },
              {
                name: "Tanvir Ahmed",
                role: "Community Lead",
                content: "Their commitment to open-source and community empowerment is inspiring. The tools they've built have genuinely helped local students in their learning journey.",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvir"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-[32px] border-accent/10 relative group"
              >
                <div className="flex gap-1 text-amber-500 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-muted-foreground italic mb-8 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent/20">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest from Blog */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Latest Insights</h2>
              <p className="text-muted-foreground">Fresh perspectives on technology, design, and our building journey.</p>
            </div>
            <Link to="/blog" className="text-accent font-bold flex items-center gap-2 hover:underline">
              Read All Articles <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestBlogs.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-3xl overflow-hidden group hover:border-accent/30 transition-all"
              >
                <div className="h-48 overflow-hidden">
                  <img src={post.image || 'https://picsum.photos/seed/blog/800/600'} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-accent text-[10px] font-bold uppercase tracking-widest">{post.category}</span>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest">{post.date}</span>
                  </div>
                  <h4 className="text-lg font-bold mb-4 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h4>
                  <Link to={`/blog/${post.id}`} className="text-sm font-bold flex items-center gap-2 group/link">
                    Read Article <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
            {latestBlogs.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No articles published yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Journey & Vision (from About/Goal) */}
      <section className="py-24 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Our Journey</h2>
          </div>

          <div className="space-y-12 relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-border before:hidden md:before:block mb-32">
            {[
              { year: '2023', title: 'The Genesis', desc: 'Team Softthikners was formed with 5 founding members.' },
              { year: '2024', title: 'First Hackathon Win', desc: 'Won 1st prize at the National University Hackathon.' },
              { year: '2024', title: 'Expansion', desc: 'Grew to 12 members and established our core domains.' },
              { year: '2025', title: 'Product Launch', desc: 'Successfully launched our first commercial SaaS product.' },
            ].map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="flex-1 text-center md:text-left">
                  <div className={`glass p-8 rounded-3xl border-accent/10 ${i % 2 === 0 ? 'md:text-right' : ''}`}>
                    <span className="text-accent font-bold text-xl mb-2 block">{milestone.year}</span>
                    <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                    <p className="text-muted-foreground text-sm">{milestone.desc}</p>
                  </div>
                </div>
                <div className="w-4 h-4 bg-accent rounded-full ring-4 ring-accent/20 shrink-0 z-10 hidden md:block" />
                <div className="flex-1" />
              </motion.div>
            ))}
          </div>

          {/* Vision Statement (from Goal) */}
          <div className="glass rounded-[40px] p-12 md:p-24 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-8 relative z-10">
              "To be the leading student-led tech incubator that transforms academic potential into global impact."
            </h2>
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" />
                <span className="font-bold">Innovation First</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" />
                <span className="font-bold">User Centric</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-accent" />
                <span className="font-bold">Open Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Roadmap (from Goal) */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-16 text-center">Future Roadmap</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { phase: 'Phase 1: 2025 Q3', title: 'Open Source Initiative', desc: 'Releasing 5 core internal tools as open-source projects for the community.' },
              { phase: 'Phase 2: 2025 Q4', title: 'Tech Summit', desc: 'Hosting our first inter-university tech summit and hackathon.' },
              { phase: 'Phase 3: 2026 Q1', title: 'Incubation Lab', desc: 'Establishing a physical lab space for rapid prototyping and research.' },
            ].map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative pl-8 border-l-2 border-accent/20"
              >
                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-accent rounded-full" />
                <span className="text-accent text-xs font-bold uppercase tracking-widest mb-2 block">{item.phase}</span>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial/Quote */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8 text-accent">
            <Star size={32} fill="currentColor" />
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-medium italic leading-relaxed mb-8">
            "Softthikners isn't just a team; it's a hub of innovation where we challenge ourselves to solve the unsolvable."
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent/20">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Softthikners" alt="Team Lead" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-left">
              <p className="font-bold">Team Lead</p>
              <p className="text-sm text-muted-foreground">Softthikners</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto glass rounded-[40px] p-12 md:p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-accent/5 -z-10" />
          <h2 className="text-3xl md:text-6xl font-display font-bold mb-8">Ready to build something <br /><span className="text-accent">extraordinary?</span></h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">Join us in our journey or collaborate with us on your next big idea.</p>
          <div className="flex flex-col sm:row items-center justify-center gap-4">
            <Link to="/contact" className="w-full sm:w-auto px-10 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow">
              Get In Touch
            </Link>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-4 border border-border rounded-2xl font-bold hover:bg-muted transition-all"
            >
              Back to Top
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

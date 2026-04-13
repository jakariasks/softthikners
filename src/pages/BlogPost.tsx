import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, Tag, ArrowLeft, Share2, MessageSquare, Clock, Send, Trash2, LogIn, Edit2, Check, X as CloseIcon, Twitter, Facebook, Linkedin, Copy, Reply } from 'lucide-react';
import { db, doc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, updateDoc } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyValue, setReplyValue] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com';

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({
            id: docSnap.id,
            ...data,
            date: data.date?.toDate?.()?.toISOString() || data.date
          });

          // Update SEO Meta Tags
          const title = data.metaTitle || data.title || 'Blog Post';
          const description = data.metaDescription || data.excerpt || '';
          
          document.title = `${title} | Softthikners`;
          
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', description);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `blogs/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();

    // Cleanup SEO tags on unmount
    return () => {
      document.title = 'Softthikners | Innovative Tech Solutions';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Softthikners - Building the future with innovative technology solutions.');
      }
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'comments'),
      where('blogId', '==', id),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
      }));
      setComments(commentData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });
    
    return () => unsubscribe();
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const commentText = parentId ? replyValue : newComment;
    if (!user || !commentText.trim() || !id) return;

    setIsSubmitting(true);
    try {
      const commentRef = await addDoc(collection(db, 'comments'), {
        blogId: id,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        text: commentText.trim(),
        timestamp: serverTimestamp(),
        parentId: parentId
      });

      // Create Notification for Blog Author
      if (post && post.authorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          title: 'New Comment on your Post',
          message: `${user.displayName || 'Someone'} commented on your post "${post.title}".`,
          type: 'info',
          link: `/blog/${id}`,
          isRead: false,
          timestamp: serverTimestamp()
        });
      }
      if (parentId) {
        setReplyValue('');
        setReplyingToId(null);
      } else {
        setNewComment('');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditValue(comment.text);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editValue.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        text: editValue.trim(),
        timestamp: serverTimestamp(),
        isEdited: true
      });
      setEditingCommentId(null);
      setEditValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || 'Check out this blog post!';
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const renderComment = (comment: any, isReply = false) => {
    const replies = comments.filter(c => c.parentId === comment.id).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`flex gap-4 group ${isReply ? 'ml-12 mt-4' : ''}`}
      >
        <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-accent/20 overflow-hidden shrink-0`}>
          <img src={comment.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorName}`} alt={comment.authorName} referrerPolicy="no-referrer" />
        </div>
        <div className="flex-grow">
          <div className="glass p-6 rounded-[24px] rounded-tl-none relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{comment.authorName}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                {comment.timestamp ? new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                {comment.isEdited && (
                  <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded italic lowercase">edited</span>
                )}
              </span>
            </div>
            
            {editingCommentId === comment.id ? (
              <div className="space-y-3">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-accent/30 rounded-xl focus:outline-none focus:border-accent transition-all resize-none text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateComment(comment.id)}
                    className="px-4 py-1.5 bg-accent text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-accent-hover transition-all"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={() => setEditingCommentId(null)}
                    className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-muted/80 transition-all"
                  >
                    <CloseIcon size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {comment.text}
                </p>
                
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {user && (
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyValue('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-accent hover:border-accent/50 transition-all shadow-sm"
                    >
                      <Reply size={12} />
                      Reply
                    </button>
                  )}
                  {user && user.uid === comment.authorId && (
                    <button
                      onClick={() => handleStartEdit(comment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-accent hover:border-accent/50 transition-all shadow-sm"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                  )}
                  {(isAdmin || (user && user.uid === comment.authorId)) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-all shadow-sm"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reply Form */}
          <AnimatePresence>
            {replyingToId === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 ml-6"
              >
                <form onSubmit={(e) => handleCommentSubmit(e, comment.id)} className="space-y-3">
                  <textarea
                    autoFocus
                    required
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                    placeholder={`Reply to ${comment.authorName}...`}
                    className="w-full px-4 py-3 bg-muted/30 border border-accent/20 rounded-xl focus:outline-none focus:border-accent transition-all resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={isSubmitting || !replyValue.trim()}
                      type="submit"
                      className="px-4 py-1.5 bg-accent text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-accent-hover transition-all disabled:opacity-50"
                    >
                      <Send size={14} /> Post Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingToId(null)}
                      className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-muted/80 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          {replies.length > 0 && (
            <div className="space-y-4">
              {replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !post?.content) return;

    const preBlocks = contentRef.current.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-button')) return;

      const button = document.createElement('button');
      button.className = 'copy-button absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10 backdrop-blur-sm z-10 flex items-center gap-2';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span class="text-[10px] font-bold uppercase tracking-wider hidden md:block">Copy</span>
      `;
      
      button.onclick = async () => {
        const code = pre.querySelector('code')?.innerText || pre.innerText;
        try {
          await navigator.clipboard.writeText(code);
          const originalHTML = button.innerHTML;
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="text-[10px] font-bold uppercase tracking-wider">Copied!</span>
          `;
          button.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
          
          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('bg-green-500/20', 'text-green-400', 'border-green-500/30');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy!', err);
        }
      };

      pre.appendChild(button);
    });
  }, [post?.content]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-32 pb-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Post not found</h2>
        <Link to="/blog" className="text-accent font-bold hover:underline">Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors mb-12 group"
        >
          <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          Back to Blog
        </Link>

        {/* Post Header */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="px-4 py-1.5 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest rounded-full border border-accent/20">
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={14} />
              {post.readTime}
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight"
          >
            {post.title}
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between py-6 border-y border-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} alt={post.author} referrerPolicy="no-referrer" />
              </div>
              <div>
                <p className="font-bold text-sm">{post.author}</p>
                <p className="text-xs text-muted-foreground">
                  {post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Just now'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 relative">
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className={`p-2 rounded-full transition-all ${showShareMenu ? 'bg-accent text-white neon-glow' : 'hover:bg-muted text-muted-foreground hover:text-accent'}`}
                  title="Share post"
                >
                  <Share2 size={20} />
                </button>

                <AnimatePresence>
                  {showShareMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowShareMenu(false)}
                        className="fixed inset-0 z-40"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-4 w-64 glass rounded-3xl p-4 shadow-2xl border-accent/20 z-50 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">Share this post</p>
                          
                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2]">
                              <Twitter size={16} />
                            </div>
                            Share on Twitter
                          </button>

                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                              <Facebook size={16} />
                            </div>
                            Share on Facebook
                          </button>

                          <button
                            onClick={() => handleShare('linkedin')}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center text-[#0A66C2]">
                              <Linkedin size={16} />
                            </div>
                            Share on LinkedIn
                          </button>

                          <div className="h-px bg-border my-2" />

                          <button
                            onClick={copyToClipboard}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-green-500/10 text-green-500' : 'bg-accent/10 text-accent'}`}>
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                            </div>
                            {copied ? 'Link Copied!' : 'Copy Link'}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare size={20} />
                <span className="text-sm font-bold">{comments.length}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Featured Image */}
        {post.image && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-[40px] overflow-hidden mb-16 shadow-2xl"
          >
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-auto"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}

        {/* Post Content */}
        <motion.div 
          ref={contentRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-blockquote:border-accent prose-blockquote:bg-accent/5 prose-blockquote:p-8 prose-blockquote:rounded-3xl prose-blockquote:not-italic prose-blockquote:text-xl prose-img:rounded-3xl prose-pre:relative"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Comments Section */}
        <div className="mt-24 border-t border-border pt-16">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-3xl font-display font-bold">Comments ({comments.length})</h3>
          </div>

          {/* Comment Form */}
          <div className="mb-16">
            {user ? (
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 overflow-hidden shrink-0">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow space-y-4">
                    <textarea
                      required
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full px-6 py-4 bg-muted/50 border border-transparent rounded-2xl focus:outline-none focus:border-accent transition-all resize-none"
                    />
                    <button
                      disabled={isSubmitting || !newComment.trim()}
                      type="submit"
                      className="px-8 py-3 bg-accent text-white rounded-xl font-bold neon-glow hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={18} />
                          Post Comment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-8 glass rounded-3xl text-center">
                <p className="text-muted-foreground mb-6">Please sign in to join the conversation.</p>
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-xl font-bold neon-glow"
                >
                  <LogIn size={18} />
                  Sign In to Comment
                </Link>
              </div>
            )}
          </div>

          {/* Comments List */}
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {comments.filter(c => !c.parentId).map((comment) => renderComment(comment))}
            </AnimatePresence>
            
            {comments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic">
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </div>
        </div>

        {/* Footer / Author Bio */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-24 p-10 glass rounded-[40px] flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-24 h-24 rounded-full bg-accent/20 overflow-hidden shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} alt={post.author} referrerPolicy="no-referrer" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-xl font-bold mb-2">Written by {post.author}</h4>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Member of the Softthikners team, passionate about building products that solve real-world problems and sharing knowledge with the developer community.
            </p>
            <div className="flex justify-center md:justify-start gap-4">
              <Link to={`/team?members=${post.author}`} className="text-xs font-bold text-accent hover:underline uppercase tracking-widest">Follow Author</Link>
              <Link to={`/team?members=${post.author}`} className="text-xs font-bold text-accent hover:underline uppercase tracking-widest">View Profile</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

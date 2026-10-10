import { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Tag, CheckCircle, Clock, XCircle, Eye, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, formatTimeAgo } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { BlogPost, BlogPostStatus } from '../lib/types';

const STATUS_CONFIG: Record<BlogPostStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', badge: 'badge-offline', icon: <Edit size={11} /> },
  pending: { label: 'Pending Review', badge: 'badge-warning', icon: <Clock size={11} /> },
  published: { label: 'Published', badge: 'badge-good', icon: <CheckCircle size={11} /> },
  rejected: { label: 'Rejected', badge: 'badge-critical', icon: <XCircle size={11} /> },
};

export default function ResearchBlog() {
  const { user } = useAppStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<BlogPostStatus | 'all'>('published');
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<BlogPost[]>('/blog')
      .then((r) => setPosts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase()) &&
        !p.tags.join(' ').toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleNew = () => {
    setSelected(null);
    setEditing(true);
    setEditTitle('');
    setEditBody('# New Research Post\n\n## Problem Statement\n\n## Method\n\n## Results\n\n## Limitations\n\n## References\n');
    setEditTags('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/blog/${selected.id}`, {
          title: editTitle, body_md: editBody,
          tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        });
      } else {
        await api.post('/blog', {
          title: editTitle, body_md: editBody,
          tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        });
      }
      const res = await api.get<BlogPost[]>('/blog');
      setPosts(res.data);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleModerate = async (id: number, action: 'publish' | 'reject') => {
    await api.post(`/blog/${id}/moderate`, { action });
    const res = await api.get<BlogPost[]>('/blog');
    setPosts(res.data);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'operator';

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* Post list */}
      <div className="flex flex-col w-full md:w-72 bg-white dark:bg-navy border-r border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Research Blog</h1>
            <button id="btn-new-post" onClick={handleNew} className="btn-primary py-1.5 px-2">
              <Plus size={13} /> New
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts..."
              className="input pl-8 text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['all', 'published', 'pending', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  filterStatus === s
                    ? 'bg-ocean text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-ocean border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">No posts found</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                id={`post-${p.id}`}
                onClick={() => { setSelected(p); setEditing(false); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-navy-light transition-colors ${
                  selected?.id === p.id && !editing ? 'bg-ocean/5 dark:bg-ocean/10' : ''
                }`}
              >
                <div className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-2">{p.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`${STATUS_CONFIG[p.status].badge} flex items-center gap-1`}>
                    {STATUS_CONFIG[p.status].icon}
                    {STATUS_CONFIG[p.status].label}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{p.author_name} · {formatTimeAgo(p.created_at)}</div>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail / Editor */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {editing ? (
          <div className="max-w-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white">
                {selected ? 'Edit Post' : 'New Post'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Submit for Review'}
                </button>
              </div>
            </div>
            <input
              type="text"
              className="input text-lg font-bold"
              placeholder="Post title..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Tags (comma-separated)..."
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Markdown</div>
                <textarea
                  className="input font-mono text-xs resize-none"
                  rows={20}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Preview</div>
                <div className="prose prose-sm dark:prose-invert max-w-none border border-slate-200 dark:border-slate-600 rounded-xl p-4 min-h-[200px] bg-white dark:bg-navy-light text-slate-800 dark:text-slate-100 text-sm">
                  <ReactMarkdown>{editBody}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="max-w-2xl space-y-5 animate-fade-in">
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${STATUS_CONFIG[selected.status].badge} flex items-center gap-1`}>
                      {STATUS_CONFIG[selected.status].icon}
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                    {selected.status === 'pending' && (
                      <span className="badge-warning text-[10px]">⚠️ Unverified claims</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selected.title}</h2>
                  <div className="text-xs text-slate-500 mt-1">
                    By {selected.author_name} · {new Date(selected.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-ocean/10 text-ocean dark:text-ocean-light px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(user?.id === selected.author_id || isAdmin) && (
                    <button
                      onClick={() => {
                        setEditing(true);
                        setEditTitle(selected.title);
                        setEditBody(selected.body_md);
                        setEditTags(selected.tags.join(', '));
                      }}
                      className="btn-ghost py-1.5 px-2"
                    >
                      <Edit size={13} />
                    </button>
                  )}
                </div>
              </div>

              {isAdmin && selected.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <button onClick={() => handleModerate(selected.id, 'publish')} className="btn-primary">
                    <CheckCircle size={13} /> Publish
                  </button>
                  <button onClick={() => handleModerate(selected.id, 'reject')} className="btn-danger">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-100">
                <ReactMarkdown>{selected.body_md}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <BookOpen size={40} strokeWidth={1} />
            <p className="text-sm">Select a post to read it</p>
            <button onClick={handleNew} className="btn-primary">
              <Plus size={14} /> Write a new post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

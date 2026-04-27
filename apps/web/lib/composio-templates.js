// ─── Composio-Powered Thinklet Templates ─────────────────────────────────────
// Each template.code is a self-contained React component (function App)
// that runs inside the Thinklet iframe runtime. All composioApi, aiApi,
// useMutation, useToast, TQL globals are pre-injected by the runtime.
// ─────────────────────────────────────────────────────────────────────────────

// ── Template 1: Content Autopilot ────────────────────────────────────────────
const CODE_CONTENT_AUTOPILOT = `
function App({ content, updateContent }) {
  const PLATFORMS = [
    { id: 'twitter',  label: 'X / Twitter', short: 'Twitter',  icon: '𝕏',  color: '#60A5FA', limit: 280  },
    { id: 'linkedin', label: 'LinkedIn',    short: 'LinkedIn', icon: '💼', color: '#0A66C2', limit: 3000 },
    { id: 'youtube',  label: 'YouTube',     short: 'YouTube',  icon: '▶',  color: '#EF4444', limit: 5000 },
  ];

  const [draft, setDraft]   = React.useState('');
  const [tab, setTab]       = React.useState('twitter');
  const [posting, setPosting] = React.useState({});
  const adapted = content.adapted || {};
  const posted  = content.posted  || {};
  const { toast } = useToast();

  const unwrapComposio = (res) => {
    const execution = res && res.data ? res.data : res;
    const message = (res && res.error) || (execution && execution.error) || (execution && execution.successful === false ? 'Connected-app execution failed' : '');
    if (message) throw new Error(message);
    return execution && execution.data ? execution.data : (execution || {});
  };

  const adaptAll = useMutation({
    mutationFn: async () => {
      if (!draft.trim()) throw new Error('Paste some content first');
      const [tw, li, yt] = await Promise.all([
        aiApi.generate({ prompt: 'Twitter post max 255 chars, punchy hook, 1-2 emojis, no hashtag spam: ' + draft }),
        aiApi.generate({ prompt: 'LinkedIn post 180-250 words, professional story (hook + insight + CTA question): ' + draft }),
        aiApi.generate({ prompt: 'YouTube video description: 2-sentence hook, 3 short paragraphs, 5 relevant hashtags: ' + draft }),
      ]);
      return { twitter: tw, linkedin: li, youtube: yt };
    },
    onSuccess: (r) => updateContent(TQL.set('adapted', r)),
    onError:   (e) => toast({ title: 'Adapt failed', description: e.message, variant: 'destructive' }),
  });

  const publish = async (id) => {
    setPosting(p => Object.assign({}, p, { [id]: true }));
    try {
      const text = adapted[id];
      if (!text || !text.trim()) throw new Error('Nothing to publish yet');
      if (id === 'twitter')  unwrapComposio(await composioApi.execute('TWITTER_CREATION_OF_A_POST', { text }));
      if (id === 'linkedin') {
        const info = unwrapComposio(await composioApi.execute('LINKEDIN_GET_MY_INFO', {}));
        const linkedInId = info.id || info.sub || info.personId;
        const payload = { commentary: text, visibility: 'PUBLIC', lifecycleState: 'PUBLISHED' };
        if (linkedInId) payload.author = String(linkedInId).startsWith('urn:') ? String(linkedInId) : 'urn:li:person:' + linkedInId;
        unwrapComposio(await composioApi.execute('LINKEDIN_CREATE_LINKED_IN_POST', payload));
      }
      updateContent(TQL.set('posted', Object.assign({}, posted, { [id]: true })));
      toast({ title: 'Published!', description: 'Posted to ' + id });
    } catch(e) { toast({ title: 'Publish failed', description: e.message, variant: 'destructive' }); }
    setPosting(p => Object.assign({}, p, { [id]: false }));
  };

  const plt = PLATFORMS.find(p => p.id === tab);
  const adaptedText = adapted[tab] || '';
  const over = adaptedText.length > plt.limit;

  return (
    <div style={{ height:'100vh', background:'#060912', color:'#e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'16px 22px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, background:'linear-gradient(90deg,#a78bfa,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.01em' }}>Content Autopilot</div>
          <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>AI-adapted cross-platform publishing</div>
        </div>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          {PLATFORMS.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color: posted[p.id] ? '#34d399' : '#334155', transition:'color 0.3s' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background: posted[p.id] ? '#34d399' : adapted[p.id] ? '#94a3b8' : '#1e293b', border:'1px solid ' + (posted[p.id] ? '#34d399' : adapted[p.id] ? '#475569' : '#334155'), transition:'all 0.3s' }} />
              {p.short}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1.6fr', overflow:'hidden' }}>
        {/* Left Panel */}
        <div style={{ borderRight:'1px solid rgba(255,255,255,0.06)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:18, overflowY:'auto' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#475569', marginBottom:8 }}>Source content</div>
            <textarea
              value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Paste an article, rough notes, or idea to adapt across platforms…"
              style={{ width:'100%', height:150, background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'11px 13px', color:'#e2e8f0', fontSize:12.5, lineHeight:1.65, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
              <span style={{ fontSize:11, color:'#334155' }}>{draft.length} chars</span>
              <button
                onClick={() => adaptAll.mutate()} disabled={!draft.trim() || adaptAll.isPending}
                style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', background: !draft.trim() || adaptAll.isPending ? '#1a1f2e' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: !draft.trim() || adaptAll.isPending ? '#475569' : '#fff', fontSize:12, fontWeight:600, transition:'all 0.2s', letterSpacing:'-0.01em' }}
              >
                {adaptAll.isPending ? '✦ Adapting…' : '✦ Adapt for all'}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#475569', marginBottom:8 }}>Publish status</div>
            {PLATFORMS.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.025)', borderRadius:9, border:'1px solid rgba(255,255,255,0.05)', marginBottom:6 }}>
                <span style={{ fontSize:14, width:20, textAlign:'center' }}>{p.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#cbd5e1' }}>{p.label}</div>
                  <div style={{ fontSize:10, marginTop:2, color: posted[p.id] ? '#34d399' : adapted[p.id] ? '#94a3b8' : '#334155' }}>
                    {posted[p.id] ? '✓ Published' : adapted[p.id] ? 'Ready to publish' : 'Not yet adapted'}
                  </div>
                </div>
                {adapted[p.id] && !posted[p.id] && p.id !== 'youtube' && (
                  <button onClick={() => publish(p.id)} disabled={posting[p.id]} style={{ padding:'4px 12px', borderRadius:6, border:'1px solid ' + p.color + '50', background: p.color + '18', color:p.color, fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', opacity: posting[p.id] ? 0.5 : 1 }}>
                    {posting[p.id] ? '…' : 'Post'}
                  </button>
                )}
                {posted[p.id] && <span style={{ color:'#34d399', fontWeight:700, fontSize:16 }}>✓</span>}
                {p.id === 'youtube' && adapted[p.id] && !posted[p.id] && (
                  <span style={{ fontSize:10, color:'#475569' }}>Copy</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', gap:4, marginBottom:14, flexShrink:0 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setTab(p.id)} style={{ flex:1, padding:'7px 6px', borderRadius:8, border: tab === p.id ? '1px solid ' + p.color + '55' : '1px solid rgba(255,255,255,0.06)', background: tab === p.id ? p.color + '15' : 'transparent', color: tab === p.id ? p.color : '#475569', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <span>{p.icon}</span><span>{p.short}</span>
              </button>
            ))}
          </div>

          <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', minHeight:0 }}>
            {!adaptedText && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:1 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:12 }}>✦</div>
                <div style={{ fontSize:13, fontWeight:500, color:'#334155' }}>Adapted copy appears here</div>
                <div style={{ fontSize:11, color:'#1e293b', marginTop:4 }}>Paste content and click Adapt</div>
              </div>
            )}
            <textarea
              value={adaptedText}
              onChange={e => updateContent(TQL.set('adapted', Object.assign({}, adapted, { [tab]: e.target.value })))}
              style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid ' + (over ? '#ef4444' : 'rgba(255,255,255,0.07)'), borderRadius:10, padding:'13px 15px', color:'#e2e8f0', fontSize:13, lineHeight:1.7, resize:'none', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box', minHeight:220 }}
            />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, flexShrink:0 }}>
            <span style={{ fontSize:11, color: over ? '#ef4444' : '#334155' }}>
              {adaptedText.length} / {plt.limit}{over ? ' · over limit' : ''}
            </span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {plt.id === 'youtube' && adaptedText && (
                <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(adaptedText); toast({ title: 'Copied!', description: 'YouTube description copied to clipboard' }); }} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:'#fca5a5', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  Copy Description
                </button>
              )}
              {adaptedText && !posted[tab] && tab !== 'youtube' && (
                <button onClick={() => publish(tab)} disabled={posting[tab] || over} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', background: posting[tab] || over ? '#1a1f2e' : 'linear-gradient(135deg,' + plt.color + ',' + plt.color + 'bb)', color: posting[tab] || over ? '#475569' : '#fff', fontSize:12, fontWeight:600, opacity: posting[tab] || over ? 0.6 : 1, transition:'all 0.2s' }}>
                  {posting[tab] ? 'Publishing…' : 'Publish to ' + plt.short}
                </button>
              )}
              {posted[tab] && <span style={{ fontSize:12, color:'#34d399', fontWeight:700 }}>✓ Published</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// ── Template 2: Inbox Zero Machine ───────────────────────────────────────────
const CODE_INBOX_ZERO = `
function App({ content, updateContent }) {
  const [loading, setLoading]   = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [drafting, setDrafting] = React.useState(false);
  const emails  = content.emails  || [];
  const triaged = content.triaged || {};
  const { toast } = useToast();

  const CATS = [
    { id: 'action',     label: 'Action Required', color: '#F59E0B', dot: '#F59E0B' },
    { id: 'fyi',        label: 'FYI',             color: '#60A5FA', dot: '#60A5FA' },
    { id: 'newsletter', label: 'Newsletter',      color: '#A78BFA', dot: '#A78BFA' },
    { id: 'invoice',    label: 'Invoice',         color: '#34D399', dot: '#34D399' },
    { id: 'other',      label: 'Other',           color: '#6B7280', dot: '#6B7280' },
  ];

  const fetchAndTriage = async () => {
    setLoading(true);
    try {
      const result = await composioApi.execute('GMAIL_FETCH_EMAILS', { query: 'is:unread in:inbox', maxResults: 20 });
      const raw = result.data || result || [];
      const list = Array.isArray(raw) ? raw : (raw.messages || []);
      const classified = [];
      for (let i = 0; i < Math.min(list.length, 8); i++) {
        const email = list[i];
        const subject = email.subject || email.snippet || 'No subject';
        const from = email.from || email.sender || 'Unknown sender';
        const body = email.body || email.snippet || '';
        const cat = await aiApi.generate({ prompt: 'Classify this email into exactly one category (action/fyi/newsletter/invoice/other). Reply with only the category word. Subject: ' + subject + ' From: ' + from + ' Preview: ' + body.slice(0,200) });
        const catId = (cat.trim().toLowerCase().replace(/[^a-z]/g, '')) in { action:1, fyi:1, newsletter:1, invoice:1 } ? cat.trim().toLowerCase().replace(/[^a-z]/g, '') : 'other';
        classified.push({ id: email.id || String(i), subject: subject.slice(0,80), from: from.slice(0,50), preview: body.slice(0,200), category: catId, threadId: email.threadId });
      }
      updateContent(TQL.batch([TQL.set('emails', classified), TQL.set('triaged', {})]));
      toast({ title: emails.length + ' emails triaged', description: 'Click any email to take action' });
    } catch(e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const draftReply = async () => {
    if (!selected) return;
    setDrafting(true);
    try {
      const email = emails.find(e => e.id === selected);
      const draft = await aiApi.generate({ prompt: 'Write a professional, concise reply to this email. Subject: ' + email.subject + '. From: ' + email.from + '. Keep it to 3-4 sentences max.' });
      await composioApi.execute('GMAIL_CREATE_EMAIL_DRAFT', { to: email.from, subject: 'Re: ' + email.subject, body: draft, threadId: email.threadId });
      updateContent(TQL.set('triaged', Object.assign({}, triaged, { [selected]: 'drafted' })));
      toast({ title: 'Draft created', description: 'Reply draft saved to Gmail' });
    } catch(e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    setDrafting(false);
  };

  const archive = async (id) => {
    try {
      const email = emails.find(e => e.id === id);
      await composioApi.execute('GMAIL_BATCH_MODIFY_MESSAGES', { ids: [email.id], removeLabelIds: ['INBOX', 'UNREAD'] });
      updateContent(TQL.set('triaged', Object.assign({}, triaged, { [id]: 'archived' })));
      toast({ title: 'Archived' });
    } catch(e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  const catCounts = CATS.map(c => ({ ...c, count: emails.filter(e => e.category === c.id).length }));
  const selectedEmail = emails.find(e => e.id === selected);
  const initials = (str) => str.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{ height:'100vh', background:'#04080C', color:'#e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>Inbox <span style={{ color:'#10b981' }}>Zero</span> Machine</div>
          <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>AI-powered Gmail triage</div>
        </div>
        <button onClick={fetchAndTriage} disabled={loading} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', background: loading ? '#1a2e22' : 'linear-gradient(135deg,#059669,#10b981)', color: loading ? '#374151' : '#fff', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          {loading ? '⟳ Triaging…' : '⚡ Triage Inbox'}
        </button>
      </div>

      {/* Stats bar */}
      {emails.length > 0 && (
        <div style={{ padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:6, flexShrink:0, overflowX:'auto' }}>
          {catCounts.filter(c => c.count > 0).map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, border:'1px solid ' + c.color + '35', background: c.color + '10', whiteSpace:'nowrap' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:c.color }} />
              <span style={{ fontSize:11, color:c.color, fontWeight:600 }}>{c.count}</span>
              <span style={{ fontSize:11, color:'#6b7280' }}>{c.label}</span>
            </div>
          ))}
          <div style={{ marginLeft:'auto', fontSize:11, color:'#374151', alignSelf:'center', whiteSpace:'nowrap' }}>
            {Object.keys(triaged).length}/{emails.length} acted on
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns: emails.length ? '320px 1fr' : '1fr', overflow:'hidden' }}>
        {/* Email list */}
        {emails.length > 0 && (
          <div style={{ borderRight:'1px solid rgba(255,255,255,0.05)', overflowY:'auto' }}>
            {emails.map(email => {
              const cat = CATS.find(c => c.id === email.category) || CATS[4];
              const done = triaged[email.id];
              return (
                <div key={email.id} onClick={() => setSelected(email.id)} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', background: selected === email.id ? 'rgba(16,185,129,0.06)' : done ? 'rgba(255,255,255,0.01)' : 'transparent', borderLeft: selected === email.id ? '2px solid #10b981' : '2px solid transparent', opacity: done ? 0.5 : 1, transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background: cat.color + '25', border:'1px solid ' + cat.color + '40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cat.color, flexShrink:0 }}>
                      {initials(email.from)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
                        <div style={{ fontSize:11, color:cat.color, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', fontSize:9 }}>{cat.label}</div>
                        {done && <span style={{ fontSize:9, color:'#374151', marginLeft:'auto' }}>{done}</span>}
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color: done ? '#4b5563' : '#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{email.subject}</div>
                      <div style={{ fontSize:11, color:'#6b7280', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{email.from}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview / Empty */}
        {!emails.length ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#374151' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:16 }}>📧</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#6b7280' }}>Connect Gmail to start</div>
            <div style={{ fontSize:12, color:'#374151', marginTop:6, textAlign:'center', maxWidth:260 }}>Click Triage Inbox to fetch and AI-classify your unread emails</div>
          </div>
        ) : !selectedEmail ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'#374151', fontSize:13 }}>Select an email to preview</div>
        ) : (
          <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', lineHeight:1.3 }}>{selectedEmail.subject}</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:5 }}>From: <span style={{ color:'#94a3b8' }}>{selectedEmail.from}</span></div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.025)', borderRadius:10, padding:'14px 16px', fontSize:13, color:'#94a3b8', lineHeight:1.7, border:'1px solid rgba(255,255,255,0.05)' }}>
              {selectedEmail.preview || 'No preview available.'}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!triaged[selectedEmail.id] && (
                <>
                  <button onClick={draftReply} disabled={drafting} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.1)', color:'#34d399', fontSize:12, fontWeight:600, cursor:'pointer', opacity: drafting ? 0.5 : 1 }}>
                    {drafting ? '⟳ Drafting…' : '✏ Draft Reply'}
                  </button>
                  <button onClick={() => archive(selectedEmail.id)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Archive
                  </button>
                  <button onClick={() => { updateContent(TQL.set('triaged', Object.assign({}, triaged, { [selectedEmail.id]: 'labeled' }))); toast({ title: 'Labeled' }); }} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Mark Done
                  </button>
                </>
              )}
              {triaged[selectedEmail.id] && (
                <div style={{ padding:'9px 16px', borderRadius:8, background:'rgba(55,65,81,0.5)', color:'#6b7280', fontSize:12, fontWeight:600 }}>
                  ✓ {triaged[selectedEmail.id]}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

// ── Template 3: LinkedIn Studio ───────────────────────────────────────────────
const CODE_LINKEDIN_STUDIO = `
function App({ content, updateContent }) {
  const [section, setSection] = React.useState('hook');
  const [posting, setPosting] = React.useState(false);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const hook    = content.hook    || '';
  const body    = content.body    || '';
  const cta     = content.cta     || '';
  const posted  = content.posted  || false;
  const stats   = content.stats   || null;
  const profile = content.profile || { name: 'Your Name', headline: 'Your Headline' };
  const { toast } = useToast();

  const fullPost = [hook, body, cta].filter(Boolean).join('\\n\\n');
  const charCount = fullPost.length;

  const SECTIONS = [
    { id: 'hook', label: 'Hook', placeholder: 'The first 2 lines — make them stop scrolling. Be bold or ask a question.', color: '#F59E0B' },
    { id: 'body', label: 'Body', placeholder: 'Your story, insight, or argument. 3-5 short paragraphs. Specific beats generic.', color: '#60A5FA' },
    { id: 'cta',  label: 'CTA',  placeholder: 'End with a question or call to action. Drives comments = more reach.', color: '#A78BFA' },
  ];

  const unwrapComposio = (res) => {
    const execution = res && res.data ? res.data : res;
    const message = (res && res.error) || (execution && execution.error) || (execution && execution.successful === false ? 'Connected-app execution failed' : '');
    if (message) throw new Error(message);
    return execution && execution.data ? execution.data : (execution || {});
  };

  const generate = useMutation({
    mutationFn: async () => {
      const topic = [hook, body, cta].filter(Boolean).join(' ');
      if (!topic.trim()) throw new Error('Add some notes first');
      const [h, b, c] = await Promise.all([
        aiApi.generate({ prompt: 'Write a powerful LinkedIn hook (2 lines max, bold statement or question, no fluff): ' + topic }),
        aiApi.generate({ prompt: 'Write the body of a LinkedIn post (3-4 short paragraphs, personal insight, specific example, conversational): ' + topic }),
        aiApi.generate({ prompt: 'Write a LinkedIn CTA (1 sentence question that invites comments, related to this topic): ' + topic }),
      ]);
      return { hook: h, body: b, cta: c };
    },
    onSuccess: (r) => updateContent(TQL.batch([TQL.set('hook', r.hook), TQL.set('body', r.body), TQL.set('cta', r.cta)])),
    onError:   (e) => toast({ title: 'Generation failed', description: e.message, variant: 'destructive' }),
  });

  const publish = async () => {
    if (!fullPost.trim()) return;
    setPosting(true);
    try {
      const info = unwrapComposio(await composioApi.execute('LINKEDIN_GET_MY_INFO', {}));
      const linkedInId = info.id || info.sub || info.personId;
      const payload = { commentary: fullPost, visibility: 'PUBLIC', lifecycleState: 'PUBLISHED' };
      if (linkedInId) payload.author = String(linkedInId).startsWith('urn:') ? String(linkedInId) : 'urn:li:person:' + linkedInId;
      unwrapComposio(await composioApi.execute('LINKEDIN_CREATE_LINKED_IN_POST', payload));
      updateContent(TQL.set('posted', true));
      toast({ title: '🎉 Published!', description: 'Your post is live on LinkedIn' });
    } catch(e) { toast({ title: 'Publish failed', description: e.message, variant: 'destructive' }); }
    setPosting(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const info = unwrapComposio(await composioApi.execute('LINKEDIN_GET_MY_INFO', {}));
      const first = info.firstName || info.localizedFirstName || '';
      const last = info.lastName || info.localizedLastName || '';
      updateContent(TQL.set('profile', { name: (first + ' ' + last).trim() || 'LinkedIn Member', headline: info.headline || 'LinkedIn Member' }));
      toast({ title: 'Profile loaded' });
    } catch(e) { toast({ title: 'Could not load profile', description: e.message, variant: 'destructive' }); }
    setLoadingStats(false);
  };

  const curSection = SECTIONS.find(s => s.id === section);

  return (
    <div style={{ height:'100vh', background:'#060A14', color:'#e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#0A66C2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>in</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>LinkedIn Studio</div>
            <div style={{ fontSize:11, color:'#334155', marginTop:1 }}>Compose • Preview • Publish</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchStats} disabled={loadingStats} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {loadingStats ? '⟳' : '⟳ Sync Profile'}
          </button>
          <button onClick={() => generate.mutate()} disabled={generate.isPending} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', background: generate.isPending ? '#1a1f2e' : 'linear-gradient(135deg,#1d4ed8,#0A66C2)', color: generate.isPending ? '#475569' : '#fff', fontSize:12, fontWeight:600 }}>
            {generate.isPending ? '✦ Writing…' : '✦ AI Write'}
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>
        {/* Left: Composer */}
        <div style={{ borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Section tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{ flex:1, padding:'10px 8px', border:'none', background:'transparent', color: section === s.id ? s.color : '#334155', fontSize:12, fontWeight:600, cursor:'pointer', borderBottom: section === s.id ? '2px solid ' + s.color : '2px solid transparent', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, opacity: section === s.id ? 1 : 0.3 }} />
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            key={section}
            value={content[section] || ''}
            onChange={e => updateContent(TQL.set(section, e.target.value))}
            placeholder={curSection.placeholder}
            style={{ flex:1, background:'transparent', border:'none', padding:'16px 20px', color:'#e2e8f0', fontSize:13.5, lineHeight:1.75, resize:'none', outline:'none', fontFamily:'inherit' }}
          />
          <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ fontSize:11, color: charCount > 3000 ? '#ef4444' : '#334155' }}>{charCount}/3000 chars</span>
            {!posted ? (
              <button onClick={publish} disabled={posting || !fullPost.trim()} style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', background: !fullPost.trim() || posting ? '#1a1f2e' : 'linear-gradient(135deg,#0A66C2,#1d4ed8)', color: !fullPost.trim() || posting ? '#334155' : '#fff', fontSize:12, fontWeight:700, transition:'all 0.2s' }}>
                {posting ? 'Publishing…' : '→ Publish Now'}
              </button>
            ) : (
              <div style={{ display:'flex', align:'center', gap:6 }}>
                <span style={{ fontSize:12, color:'#34d399', fontWeight:700 }}>✓ Published</span>
                <button onClick={() => updateContent(TQL.batch([TQL.set('hook',''),TQL.set('body',''),TQL.set('cta',''),TQL.set('posted',false)]))} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#475569', fontSize:11, cursor:'pointer' }}>New Post</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div style={{ background:'#0D1117', overflowY:'auto', padding:'20px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#334155', marginBottom:14 }}>Live Preview</div>
          <div style={{ background:'#fff', borderRadius:12, padding:'16px', maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.4)' }}>
            {/* LinkedIn post card */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#0A66C2,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {profile.name.charAt(0) || 'Y'}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#000' }}>{profile.name || 'Your Name'}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{profile.headline || 'Your Headline'}</div>
                <div style={{ fontSize:10, color:'#999', marginTop:1 }}>Just now · 🌐</div>
              </div>
            </div>
            {fullPost ? (
              <div style={{ fontSize:13, color:'#191919', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {fullPost.length > 180 ? fullPost.slice(0,180) + '…' : fullPost}
                {fullPost.length > 180 && <span style={{ color:'#0A66C2', fontSize:12, cursor:'pointer' }}> see more</span>}
              </div>
            ) : (
              <div style={{ fontSize:13, color:'#b0b0b0', fontStyle:'italic' }}>Your post will appear here as you write…</div>
            )}
            <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid #e0e0e0', display:'flex', gap:16 }}>
              {['👍 Like','💬 Comment','↗ Repost','✉ Send'].map(a => (
                <div key={a} style={{ fontSize:11, color:'#666', cursor:'pointer', fontWeight:600 }}>{a}</div>
              ))}
            </div>
          </div>
          {stats && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#334155', marginBottom:10 }}>Last post performance</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['Impressions',stats.impressions||0],['Clicks',stats.clicks||0],['Reactions',stats.reactions||0]].map(([l,v]) => (
                  <div key={l} style={{ background:'rgba(10,102,194,0.08)', borderRadius:9, padding:'10px 12px', border:'1px solid rgba(10,102,194,0.2)' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:'#60a5fa' }}>{v.toLocaleString()}</div>
                    <div style={{ fontSize:10, color:'#475569', marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

// ── Template 4: Sprint Commander ──────────────────────────────────────────────
const CODE_SPRINT_COMMANDER = `
function App({ content, updateContent }) {
  const [addingIssue, setAddingIssue] = React.useState(false);
  const [newIssue, setNewIssue] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const issues  = content.issues  || [];
  const sprint  = content.sprint  || { name: 'Sprint 1', start: 'Apr 21', end: 'May 5' };
  const { toast } = useToast();

  const COLS = [
    { id: 'todo',       label: 'To Do',       color: '#6B7280', accent: '#374151' },
    { id: 'inprogress', label: 'In Progress',  color: '#F59E0B', accent: '#451a03' },
    { id: 'review',     label: 'In Review',    color: '#60A5FA', accent: '#1e3a5f' },
    { id: 'done',       label: 'Done',         color: '#34D399', accent: '#052e16' },
  ];

  const LABELS = [
    { id: 'bug',     label: 'Bug',     color: '#ef4444' },
    { id: 'feature', label: 'Feature', color: '#a78bfa' },
    { id: 'docs',    label: 'Docs',    color: '#60a5fa' },
    { id: 'chore',   label: 'Chore',   color: '#6b7280' },
  ];

  const moveIssue = (id, col) => {
    updateContent(TQL.set('issues', issues.map(i => i.id === id ? { ...i, status: col } : i)));
  };

  const addIssue = () => {
    if (!newIssue.trim()) return;
    const issue = { id: generateId(), title: newIssue, status: 'todo', label: 'feature', assignee: '' };
    updateContent(TQL.push('issues', issue));
    setNewIssue('');
    setAddingIssue(false);
  };

  const syncFromGitHub = async () => {
    setLoading(true);
    try {
      const owner = prompt('GitHub owner/org?');
      const repo  = prompt('Repository name?');
      if (!owner || !repo) { setLoading(false); return; }
      const result = await composioApi.execute('GITHUB_ADD_LABELS_TO_AN_ISSUE', { owner, repo, issue_number: 1, labels: ['sprint'] });
      toast({ title: 'Synced', description: 'Issues imported from ' + owner + '/' + repo });
    } catch(e) { toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const postToSlack = async () => {
    const done = issues.filter(i => i.status === 'done').length;
    const inProg = issues.filter(i => i.status === 'inprogress').length;
    const text = sprint.name + ' update: ' + done + ' done, ' + inProg + ' in progress. ' + issues.filter(i => i.status === 'todo').length + ' remaining.';
    try {
      await composioApi.execute('SLACK_SEND_MESSAGE', { channel: prompt('Slack channel (e.g. #engineering)?') || '#general', text });
      toast({ title: 'Posted to Slack!' });
    } catch(e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  const totalIssues = issues.length;
  const doneCount   = issues.filter(i => i.status === 'done').length;
  const progress    = totalIssues ? Math.round((doneCount / totalIssues) * 100) : 0;

  return (
    <div style={{ height:'100vh', background:'#060800', color:'#e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Sprint header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>{sprint.name}</div>
            <div style={{ fontSize:11, color:'#6b7280' }}>{sprint.start} – {sprint.end}</div>
            <div style={{ fontSize:11, color:'#f59e0b', fontWeight:600 }}>{progress}% complete</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={postToSlack} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#94a3b8', fontSize:11, fontWeight:600, cursor:'pointer' }}>📣 Post to Slack</button>
            <button onClick={syncFromGitHub} disabled={loading} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.08)', color:'#f59e0b', fontSize:11, fontWeight:600, cursor:'pointer' }}>
              {loading ? '⟳' : '⬇ Import from GitHub'}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width: progress + '%', background:'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius:2, transition:'width 0.4s ease' }} />
        </div>
        <div style={{ display:'flex', gap:16, marginTop:8 }}>
          {COLS.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:c.color }} />
              <span style={{ color:'#6b7280' }}>{issues.filter(i => i.status === c.id).length} {c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, overflow:'hidden', background:'rgba(255,255,255,0.03)' }}>
        {COLS.map(col => {
          const colIssues = issues.filter(i => i.status === col.id);
          return (
            <div key={col.id} style={{ background:'#060800', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:col.color }} />
                  <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', fontSize:10 }}>{col.label}</span>
                </div>
                <span style={{ fontSize:11, color:'#374151', fontWeight:600 }}>{colIssues.length}</span>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'10px 10px' }}>
                {colIssues.map(issue => {
                  const lbl = LABELS.find(l => l.id === issue.label) || LABELS[0];
                  return (
                    <div key={issue.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:9, padding:'10px 12px', marginBottom:8, border:'1px solid rgba(255,255,255,0.06)', cursor:'default' }}>
                      <div style={{ fontSize:12, color:'#e2e8f0', lineHeight:1.4, marginBottom:8 }}>{issue.title}</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:lbl.color, background: lbl.color + '18', padding:'2px 7px', borderRadius:4 }}>{lbl.label}</span>
                        {col.id !== 'done' && (
                          <button onClick={() => moveIssue(issue.id, COLS[COLS.findIndex(c => c.id === col.id) + 1]?.id || col.id)} style={{ fontSize:10, color:'#475569', background:'transparent', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:4 }}>→</button>
                        )}
                        {col.id !== 'todo' && (
                          <button onClick={() => moveIssue(issue.id, COLS[COLS.findIndex(c => c.id === col.id) - 1]?.id || col.id)} style={{ fontSize:10, color:'#374151', background:'transparent', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:4 }}>←</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {col.id === 'todo' && (
                  addingIssue ? (
                    <div style={{ background:'rgba(245,158,11,0.06)', borderRadius:9, padding:'10px', border:'1px solid rgba(245,158,11,0.2)' }}>
                      <input value={newIssue} onChange={e => setNewIssue(e.target.value)} onKeyDown={e => { if(e.key==='Enter') addIssue(); if(e.key==='Escape') setAddingIssue(false); }} placeholder="Issue title…" autoFocus style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontSize:12, fontFamily:'inherit', marginBottom:8, boxSizing:'border-box' }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={addIssue} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'#f59e0b', color:'#000', fontSize:11, fontWeight:700, cursor:'pointer' }}>Add</button>
                        <button onClick={() => setAddingIssue(false)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#6b7280', fontSize:11, cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingIssue(true)} style={{ width:'100%', padding:'8px', borderRadius:9, border:'1px dashed rgba(255,255,255,0.08)', background:'transparent', color:'#374151', fontSize:12, cursor:'pointer', textAlign:'left' }}>
                      + Add issue
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

// ── Template 5: Notion Brain ──────────────────────────────────────────────────
const CODE_NOTION_BRAIN = `
function App({ content, updateContent }) {
  const [source, setSource] = React.useState('gmail');
  const [capturing, setCapturing] = React.useState(false);
  const [pushing, setPushing] = React.useState(null);
  const captures = content.captures || [];
  const { toast } = useToast();

  const SOURCES = [
    { id: 'gmail', label: 'Gmail', icon: '📧', color: '#EA4335' },
    { id: 'slack', label: 'Slack', icon: '💬', color: '#A78BFA' },
  ];

  const TYPE_COLORS = {
    decision: '#F59E0B',
    research: '#60A5FA',
    action:   '#34D399',
    idea:     '#A78BFA',
    other:    '#6B7280',
  };

  const capture = async () => {
    setCapturing(true);
    try {
      let items = [];
      if (source === 'gmail') {
        const result = await composioApi.execute('GMAIL_FETCH_EMAILS', { query: 'is:unread label:important', maxResults: 6 });
        const raw = (result.data || result || {}).messages || result.data || [];
        items = Array.isArray(raw) ? raw.slice(0,5) : [];
      } else {
        const result = await composioApi.execute('SLACK_ASSISTANT_SEARCH_CONTEXT', { query: 'decision OR action item OR important', count: 5 });
        const raw = result.data || result || {};
        items = (raw.messages || []).slice(0,5);
      }
      const newCaptures = [];
      for (const item of items) {
        const text = item.subject || item.text || item.snippet || '';
        if (!text.trim()) continue;
        const analysis = await aiApi.generate({ prompt: 'In JSON: {"type":"decision|research|action|idea|other","title":"<8 word title>","summary":"<1 sentence>"}. Analyze: ' + text.slice(0,300) });
        let parsed = { type: 'other', title: text.slice(0,50), summary: text.slice(0,100) };
        try { parsed = JSON.parse(analysis.match(/\\{[^}]+\\}/)?.[0] || '{}'); } catch(e) {}
        newCaptures.push({ id: generateId(), type: parsed.type || 'other', title: parsed.title || text.slice(0,60), summary: parsed.summary || text.slice(0,120), source: source, raw: text.slice(0,400), pushed: false, ts: Date.now() });
      }
      if (newCaptures.length) {
        updateContent(TQL.set('captures', [...captures, ...newCaptures]));
        toast({ title: newCaptures.length + ' items captured', description: 'Click → Notion to save any to your knowledge base' });
      } else {
        toast({ title: 'Nothing new', description: 'No unread important items found' });
      }
    } catch(e) { toast({ title: 'Capture failed', description: e.message, variant: 'destructive' }); }
    setCapturing(false);
  };

  const pushToNotion = async (captureId) => {
    const item = captures.find(c => c.id === captureId);
    if (!item) return;
    setPushing(captureId);
    try {
      const dbId = prompt('Notion database ID (paste from Notion URL)?');
      if (!dbId) { setPushing(null); return; }
      await composioApi.execute('NOTION_INSERT_ROW_DATABASE', {
        database_id: dbId,
        properties: {
          Title: item.title,
          Type: item.type,
          Source: item.source,
          Summary: item.summary,
        }
      });
      updateContent(TQL.set('captures', captures.map(c => c.id === captureId ? { ...c, pushed: true } : c)));
      toast({ title: '→ Saved to Notion', description: item.title });
    } catch(e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    setPushing(null);
  };

  const clearAll = () => updateContent(TQL.set('captures', []));

  return (
    <div style={{ height:'100vh', background:'#040C0C', color:'#e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.01em' }}>
            <span style={{ background:'linear-gradient(90deg,#22d3ee,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Notion</span>
            <span style={{ color:'#fff' }}> Brain</span>
          </div>
          <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>Auto-capture decisions & knowledge to Notion</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
            {SOURCES.map(s => (
              <button key={s.id} onClick={() => setSource(s.id)} style={{ padding:'6px 14px', border:'none', background: source === s.id ? s.color + '25' : 'transparent', color: source === s.id ? s.color : '#475569', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, borderRight: s.id !== 'slack' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          <button onClick={capture} disabled={capturing} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', background: capturing ? '#0a2020' : 'linear-gradient(135deg,#0e7490,#06b6d4)', color: capturing ? '#374151' : '#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            {capturing ? '⟳ Capturing…' : '⚡ Capture Now'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {captures.length > 0 && (
        <div style={{ padding:'8px 22px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => {
            const count = captures.filter(c => c.type === type).length;
            if (!count) return null;
            return (
              <div key={type} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:12, background: color + '12', border:'1px solid ' + color + '30' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:color }} />
                <span style={{ fontSize:10, color:color, fontWeight:600 }}>{count} {type}</span>
              </div>
            );
          })}
          <span style={{ marginLeft:'auto', fontSize:11, color:'#374151', cursor:'pointer' }} onClick={clearAll}>Clear all</span>
        </div>
      )}

      {/* Captures list */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 22px' }}>
        {captures.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#374151' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:16 }}>🧠</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#4b5563' }}>Your knowledge feed is empty</div>
            <div style={{ fontSize:12, color:'#374151', marginTop:6, textAlign:'center', maxWidth:300 }}>Select Gmail or Slack and click Capture Now to start building your second brain</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {captures.map(item => {
              const typeColor = TYPE_COLORS[item.type] || '#6b7280';
              const src = SOURCES.find(s => s.id === item.source);
              return (
                <div key={item.id} style={{ background: item.pushed ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.035)', borderRadius:12, padding:'14px 16px', border:'1px solid ' + (item.pushed ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)'), display:'flex', gap:14, alignItems:'flex-start', transition:'all 0.2s' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background: typeColor + '18', border:'1px solid ' + typeColor + '35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, fontWeight:700 }}>
                    {item.type === 'decision' ? '⚡' : item.type === 'research' ? '🔬' : item.type === 'action' ? '✓' : item.type === 'idea' ? '💡' : '📌'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:typeColor, background: typeColor + '15', padding:'2px 7px', borderRadius:4 }}>{item.type}</span>
                      <span style={{ fontSize:10, color:'#374151' }}>{src && src.icon} {src && src.label}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:4 }}>{item.title}</div>
                    <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>{item.summary}</div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {item.pushed ? (
                      <div style={{ padding:'5px 10px', borderRadius:7, background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)', color:'#06b6d4', fontSize:11, fontWeight:600 }}>✓ In Notion</div>
                    ) : (
                      <button onClick={() => pushToNotion(item.id)} disabled={pushing === item.id} style={{ padding:'5px 10px', borderRadius:7, border:'1px solid rgba(6,182,212,0.3)', background:'rgba(6,182,212,0.08)', color:'#22d3ee', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', opacity: pushing === item.id ? 0.5 : 1 }}>
                        {pushing === item.id ? '…' : '→ Notion'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
`;

// ─── Templates Registry ───────────────────────────────────────────────────────
export const COMPOSIO_TEMPLATES = [
  {
    id:           'content-autopilot',
    name:         'Content Autopilot',
    description:  'Write once, AI adapts for Twitter, LinkedIn & YouTube. One-click publish with engagement tracking.',
    category:     'Social',
    emoji:        '🚀',
    gradientA:    '#7C3AED',
    gradientB:    '#2563EB',
    services:     ['Twitter', 'LinkedIn', 'YouTube'],
    defaultWidth:  920,
    defaultHeight: 680,
    code:          CODE_CONTENT_AUTOPILOT,
  },
  {
    id:           'inbox-zero',
    name:         'Inbox Zero Machine',
    description:  'AI triages your Gmail — categorizes, drafts replies, and archives. Reach inbox zero in seconds.',
    category:     'Productivity',
    emoji:        '📧',
    gradientA:    '#059669',
    gradientB:    '#10B981',
    services:     ['Gmail'],
    defaultWidth:  900,
    defaultHeight: 660,
    code:          CODE_INBOX_ZERO,
  },
  {
    id:           'linkedin-studio',
    name:         'LinkedIn Studio',
    description:  'Structured Hook/Body/CTA composer with live post preview and one-click publishing.',
    category:     'Social',
    emoji:        '💼',
    gradientA:    '#0A66C2',
    gradientB:    '#1D4ED8',
    services:     ['LinkedIn'],
    defaultWidth:  880,
    defaultHeight: 700,
    code:          CODE_LINKEDIN_STUDIO,
  },
  {
    id:           'sprint-commander',
    name:         'Sprint Commander',
    description:  'Visual kanban board that syncs with GitHub issues and posts updates to Slack. Full sprint management in one Thinklet.',
    category:     'Developer',
    emoji:        '⚡',
    gradientA:    '#D97706',
    gradientB:    '#F59E0B',
    services:     ['GitHub', 'Slack', 'Notion'],
    defaultWidth:  960,
    defaultHeight: 700,
    code:          CODE_SPRINT_COMMANDER,
  },
  {
    id:           'notion-brain',
    name:         'Notion Brain',
    description:  'Pulls important Gmail and Slack content, Claude extracts decisions/actions, one-click save to Notion database.',
    category:     'Productivity',
    emoji:        '🧠',
    gradientA:    '#0E7490',
    gradientB:    '#06B6D4',
    services:     ['Gmail', 'Slack', 'Notion'],
    defaultWidth:  860,
    defaultHeight: 660,
    code:          CODE_NOTION_BRAIN,
  },
];

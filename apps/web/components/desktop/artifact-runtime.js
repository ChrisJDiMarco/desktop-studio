// ─── Utility Functions ──────────────────────────────────────────────────────

// Injected into every artifact iframe to prevent self-navigation back to the
// parent app. Link clicks open in a new tab; location.assign/replace are
// redirected to window.open so the iframe never navigates away from its srcDoc.
const IFRAME_NAV_GUARD = `<script>(function(){
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href === '' || href.charAt(0) === '#' || href.startsWith('javascript:')) return;
    e.preventDefault();
    try { window.open(a.href || href, '_blank', 'noopener,noreferrer'); } catch(x) {}
  }, true);
  try {
    ['assign','replace'].forEach(function(m) {
      var orig = location[m].bind(location);
      location[m] = function(url) {
        if (url && String(url).charAt(0) !== '#') {
          try { window.open(String(url), '_blank', 'noopener,noreferrer'); } catch(x) {}
        } else { orig(url); }
      };
    });
  } catch(e) {}
  // Prevent iframe JS from scrolling the parent desktop canvas.
  // Overwrite window.parent.scrollTo so it is a no-op from inside the iframe.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.scrollTo = function() {};
      window.parent.scroll   = function() {};
      window.parent.scrollBy = function() {};
    }
  } catch(e) {}
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'font-size:set') return;
    var fs = e.data.fontSize;
    var el = document.getElementById('__font-size-ctrl__');
    if (!el) { el = document.createElement('style'); el.id = '__font-size-ctrl__'; (document.head || document.body).appendChild(el); }
    el.textContent = 'html { font-size: ' + fs + '% !important; }';
  });
})()<\/script>`;

export const addIframeNavGuard = (html) => {
  if (!html) return html;
  // Inject as the very first child of <head> so it runs before any page script
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head[^>]*>/i, m => m + IFRAME_NAV_GUARD);
  }
  if (/<body[\s>]/i.test(html)) {
    return html.replace(/<body[^>]*>/i, m => m + IFRAME_NAV_GUARD);
  }
  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html[^>]*>/i, m => `${m}<head>${IFRAME_NAV_GUARD}</head>`);
  }
  return IFRAME_NAV_GUARD + html;
};

// ─── Visual Editor iframe injection ──────────────────────────────────────────
// Works for both static HTML artifacts and React Thinklets. Three-step flow:
//   1. assignIds — walks every element under <body> and stamps a data-ve-id.
//   2. MutationObserver — re-runs assignIds whenever React adds/removes nodes,
//      so freshly rendered elements pick up an id without a remount. Also
//      re-positions the selection overlay when the selected element's box
//      changes (layout shifts during streaming, font-size scrubs, hover, etc.)
//   3. window.message bridge — parent posts ve:apply-style / ve:set-text /
//      ve:deselect; child posts ve:select (tag/text/outerHTML/computed styles).
// Idempotent: if the script tag is already present (e.g. injected by a parent
// extractHtmlImageDataUrls pass), the second injection is a no-op.
const VISUAL_EDITOR_SCRIPT = `<script data-ve-injected="1">(function(){
  if(window.__veInjected)return;window.__veInjected=true;
  var K='data-ve-id',i=0,hov=null,sel=null;
  function isInternal(el){return!el||!el.tagName||el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.hasAttribute('data-ve-injected')||el.id==='__ve_h_ov'||el.id==='__ve_s_ov';}
  function assignIds(){
    var nodes=document.querySelectorAll('body *');
    for(var j=0;j<nodes.length;j++){var el=nodes[j];if(isInternal(el))continue;if(!el.hasAttribute(K))el.setAttribute(K,String(i++));}
  }
  function mk(id,bc,bg){var d=document.createElement('div');d.id=id;d.style.cssText='position:fixed;pointer-events:none;z-index:2147483640;box-sizing:border-box;border:2px solid '+bc+';background:'+bg+';display:none;border-radius:2px;transition:left .08s,top .08s,width .08s,height .08s;';return d;}
  var hOv=mk('__ve_h_ov','#3b82f6','rgba(59,130,246,0.07)'),sOv=mk('__ve_s_ov','#8b5cf6','rgba(139,92,246,0.09)');
  var lbl=document.createElement('div');lbl.style.cssText='position:absolute;top:-20px;left:-2px;background:#3b82f6;color:#fff;font-size:10px;padding:1px 6px;border-radius:3px 3px 3px 0;white-space:nowrap;font-family:monospace;line-height:16px;';
  hOv.appendChild(lbl);document.documentElement.appendChild(hOv);document.documentElement.appendChild(sOv);
  function posOv(ov,el){if(!el||!el.getBoundingClientRect)return;var r=el.getBoundingClientRect();ov.style.left=r.left+'px';ov.style.top=r.top+'px';ov.style.width=r.width+'px';ov.style.height=r.height+'px';ov.style.display='block';}
  function skip(el){return!el||el===document.documentElement||el===document.body||el===hOv||el===sOv||hOv.contains(el)||sOv.contains(el)||el.tagName==='SCRIPT'||el.tagName==='STYLE';}
  function elTag(el){var s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;else if(el.className&&typeof el.className==='string'&&el.className.trim())s+='.'+el.className.trim().split(' ')[0];return s;}
  function cap(el){var c=window.getComputedStyle(el);return{fontSize:c.fontSize,fontWeight:c.fontWeight,color:c.color,backgroundColor:c.backgroundColor,paddingTop:c.paddingTop,paddingRight:c.paddingRight,paddingBottom:c.paddingBottom,paddingLeft:c.paddingLeft,marginTop:c.marginTop,marginRight:c.marginRight,marginBottom:c.marginBottom,marginLeft:c.marginLeft,borderRadius:c.borderRadius,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,textAlign:c.textAlign,opacity:c.opacity};}
  document.addEventListener('mousemove',function(e){var el=e.target;if(skip(el)){hOv.style.display='none';hov=null;return;}if(el===hov)return;hov=el;posOv(hOv,el);lbl.textContent=elTag(el);},true);
  document.addEventListener('mouseleave',function(){hOv.style.display='none';hov=null;});
  var _origOuter={};
  document.addEventListener('click',function(e){var el=e.target;if(skip(el))return;e.preventDefault();e.stopPropagation();sel=el;posOv(sOv,el);var vid=el.getAttribute(K)||'';if(!_origOuter[vid])_origOuter[vid]=el.outerHTML;window.parent.postMessage({type:'ve:select',veId:vid,tag:el.tagName.toLowerCase(),text:(el.textContent||'').substring(0,120).trim(),outerHTML:el.outerHTML.substring(0,3000),hasChildren:el.children.length>0,styles:cap(el)},'*');},true);
  window.addEventListener('message',function(e){var d=e.data;if(!d||typeof d.type!=='string')return;if(d.type==='ve:apply-style'){var el=document.querySelector('['+K+'="'+d.veId+'"]');if(!el)return;var s=d.styles||{};Object.keys(s).forEach(function(k){el.style[k]=s[k];});if(sel===el)posOv(sOv,el);}if(d.type==='ve:set-text'){var el=document.querySelector('['+K+'="'+d.veId+'"]');if(el)el.textContent=d.text;}if(d.type==='ve:deselect'){sOv.style.display='none';sel=null;}});
  // Re-id on every DOM mutation so React renders are picked up.
  if(typeof MutationObserver!=='undefined'){
    var mo=new MutationObserver(function(){assignIds();if(sel&&sel.isConnected)posOv(sOv,sel);else if(sel){sOv.style.display='none';sel=null;}});
    function startObserver(){if(document.body){mo.observe(document.body,{childList:true,subtree:true});assignIds();}else{setTimeout(startObserver,30);}}
    startObserver();
  }
  // Recompute selection overlay on resize/scroll so it tracks layout shifts.
  window.addEventListener('resize',function(){if(sel&&sel.isConnected)posOv(sOv,sel);});
  window.addEventListener('scroll',function(){if(sel&&sel.isConnected)posOv(sOv,sel);},true);
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',assignIds);}else{assignIds();}
})();<\/script>`;

export const injectVisualEditor = (html) => {
  if (!html) return html;
  // Idempotent: skip if a previous pass already injected the script.
  if (/data-ve-injected="1"/.test(html)) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, VISUAL_EDITOR_SCRIPT + '</body>');
  return html + VISUAL_EDITOR_SCRIPT;
};

// HTML artifacts can carry 3-6 inlined Imagen data URLs (~1.7MB each), which
// bloats the iframe srcdoc to 5MB+. The browser handles it, but every visual-edit
// reload, font-size change, or CSS rewrite re-serializes the whole srcdoc — that
// stalls the main thread and wastes memory. Extract data URLs into a small JSON
// map injected once, swap them for short tokens in the HTML, and resolve at
// DOMContentLoaded time. Mirrors what buildThinkletHtml already does for React.
export const extractHtmlImageDataUrls = (html) => {
  if (!html || typeof html !== 'string') return html;
  if (!/data:image\/[a-zA-Z+\-.]+;base64,/i.test(html)) return html;

  const urlToToken = new Map();
  const tokenToUrl = {};
  let counter = 0;
  // Match the same shape as the React-side extractor in buildThinkletHtml. Stop
  // at quote/apostrophe/whitespace/paren so attribute boundaries terminate the
  // capture cleanly.
  const dataUrlRe = /data:image\/[A-Za-z0-9+\-.]+;base64,[A-Za-z0-9+/=]+/g;
  const tokenized = html.replace(dataUrlRe, (match) => {
    let token = urlToToken.get(match);
    if (!token) {
      token = '__IMG_RUNTIME_' + (counter++) + '__';
      urlToToken.set(match, token);
      tokenToUrl[token] = match;
    }
    return token;
  });
  if (counter === 0) return html;

  // Resolver script: walks elements once on DOMContentLoaded and after any
  // mutation that adds new <img>/<source>/<video poster> nodes. Also covers
  // background-image url("__IMG_RUNTIME_N__") in inline styles.
  const resolver =
    '<script>(function(){\n' +
    '  var M=' + JSON.stringify(tokenToUrl) + ';\n' +
    '  var TOK=/__IMG_RUNTIME_\\d+__/g;\n' +
    '  function swap(s){if(typeof s!=="string"||s.indexOf("__IMG_RUNTIME_")<0)return s;return s.replace(TOK,function(t){return M[t]||t;});}\n' +
    '  function fix(root){\n' +
    '    var nodes=root.querySelectorAll("img[src*=\\"__IMG_RUNTIME_\\"],source[src*=\\"__IMG_RUNTIME_\\"],source[srcset*=\\"__IMG_RUNTIME_\\"],video[poster*=\\"__IMG_RUNTIME_\\"],a[href*=\\"__IMG_RUNTIME_\\"],[style*=\\"__IMG_RUNTIME_\\"]");\n' +
    '    for(var i=0;i<nodes.length;i++){var n=nodes[i];\n' +
    '      if(n.hasAttribute("src"))n.setAttribute("src",swap(n.getAttribute("src")));\n' +
    '      if(n.hasAttribute("srcset"))n.setAttribute("srcset",swap(n.getAttribute("srcset")));\n' +
    '      if(n.hasAttribute("poster"))n.setAttribute("poster",swap(n.getAttribute("poster")));\n' +
    '      if(n.hasAttribute("href"))n.setAttribute("href",swap(n.getAttribute("href")));\n' +
    '      var st=n.getAttribute("style");if(st&&st.indexOf("__IMG_RUNTIME_")>=0)n.setAttribute("style",swap(st));\n' +
    '    }\n' +
    '  }\n' +
    '  function run(){fix(document);}\n' +
    '  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();\n' +
    '  // Re-run if the page injects nodes after first paint (deferred image grids, hydration, etc.)\n' +
    '  if(typeof MutationObserver!=="undefined"){var mo=new MutationObserver(function(){fix(document);});mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src","srcset","poster","href","style"]});setTimeout(function(){mo.disconnect();},5000);}\n' +
    '})();<\/script>';

  if (/<\/body>/i.test(tokenized)) return tokenized.replace(/<\/body>/i, resolver + '</body>');
  if (/<\/html>/i.test(tokenized)) return tokenized.replace(/<\/html>/i, resolver + '</html>');
  return tokenized + resolver;
};

// ─── Thinklet iframe runner ──────────────────────────────────────────────────
// Wraps raw React JSX code into a self-contained HTML page with:
//   • React 18 + ReactDOM CDN
//   • Babel standalone (JSX transform)
//   • Tailwind CDN play
//   • All Thinklet API mocks (useAIStreaming, useMutation, aiApi, useToast, etc.)
//   • framer-motion stub, lucide icon stubs
//   • TQL-backed content/updateContent state
export const buildThinkletHtml = (reactCode) => {
  if (!reactCode) return '';

  // ── Guard: LLM sometimes returns a full HTML document instead of just function App ──
  // Detect by DOCTYPE or <html>…<body> pattern and try to recover the function.
  const looksLikeFullHtml = /<!doctype\s+html/i.test(reactCode) ||
    (/<html[\s>]/i.test(reactCode) && /<body[\s>]/i.test(reactCode));

  let inputCode = reactCode;
  if (looksLikeFullHtml) {
    // Try to extract everything from `function App` onwards, stopping before any </script> tag
    const fnStart = inputCode.search(/\bfunction\s+App\s*\(/);
    if (fnStart !== -1) {
      // Cut from function App to the first closing </script> that follows it
      let extracted = inputCode.slice(fnStart);
      const scriptClose = extracted.search(/<\/script/i);
      if (scriptClose !== -1) extracted = extracted.slice(0, scriptClose);
      inputCode = extracted.trim();
    } else {
      // Can't rescue — render an error Thinklet so the user sees a message instead of blank
      inputCode = `function App() {
  return (
    <div style={{padding:24,fontFamily:'system-ui',color:'#ef4444',background:'#1e1e2e',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontWeight:700,fontSize:16}}>Invalid Thinklet Code</div>
      <div style={{fontSize:13,color:'#94a3b8',textAlign:'center',maxWidth:360}}>
        The last update returned a full HTML document instead of a React component.
        Use Auto-Improve or CRISPR to regenerate.
      </div>
    </div>
  );
}`;
    }
  }

  // Strip ES module imports/exports — all globals are injected by the runtime
  const rawClean = inputCode
    .replace(/^\s*import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+(?=function|class|const|let|var|\(|async)/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"]\s*)?;?\s*$/gm, '')
    .trim();

  // ── Data URL extraction ───────────────────────────────────────────────────
  // Imagen base64 images are 1–3 MB each. Inlining them into the JSX makes the
  // resulting source multi-MB, which Babel-standalone chokes on (silent
  // cross-origin "Script error."). Extract them out, replace with short tokens
  // in the source, and inject the actual URLs as a runtime map. A
  // React.createElement override (below) resolves tokens in src/href/poster
  // props and style.backgroundImage at element creation time.
  const __urlToToken = new Map();
  const __tokenToUrl = {};
  let __tokenCounter = 0;
  const __DATA_URL_RE = /data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g;
  const cleanCode = rawClean.replace(__DATA_URL_RE, (match) => {
    let token = __urlToToken.get(match);
    if (!token) {
      token = '__IMG_RUNTIME_' + (__tokenCounter++) + '__';
      __urlToToken.set(match, token);
      __tokenToUrl[token] = match;
    }
    return token;
  });
  const __hasRuntimeImages = __tokenCounter > 0;

  // Prevent the string </script from ending the outer script tag early
  const safeCode = cleanCode.replace(/<\/script/gi, '<\\/script');

  // NOTE: backtick in template-literal body — inner JS code uses string concat to avoid
  // nested template-literal escaping complexity.
  const needsThreeJs = /\bTHREE\b/.test(cleanCode);

  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="UTF-8"/>\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n' +
    '<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><' + '/script>\n' +
    '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><' + '/script>\n' +
    '<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><' + '/script>\n' +
    '<script src="https://cdn.tailwindcss.com"><' + '/script>\n' +
    (needsThreeJs ? '<script src="https://unpkg.com/three@0.160.0/build/three.min.js"><' + '/script>\n' : '') +
    '<style>*{box-sizing:border-box}html,body{height:100%;margin:0;padding:0}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:auto}#__tr{height:100%}</style>\n' +
    '<script>window.addEventListener("error",function(e){try{parent.postMessage({type:"artifact:react-error",message:e.message||String(e.error||e),stack:e.error&&e.error.stack||"",source:e.filename,line:e.lineno,column:e.colno},"*");}catch(_){}});window.addEventListener("unhandledrejection",function(e){try{var r=e.reason||{};parent.postMessage({type:"artifact:react-error",message:r.message||String(r),stack:r.stack||""},"*");}catch(_){}});<' + '/script>\n' +
    (__hasRuntimeImages ? '<script>window.__IMG_MAP=' + JSON.stringify(__tokenToUrl) + ';<' + '/script>\n' : '') +
    '</head>\n' +
    '<body>\n' +
    '<div id="__tr" style="height:100%;display:flex;flex-direction:column"></div>\n' +
    '<script type="text/babel" data-presets="react">\n' +
    // ── Runtime image-token resolver ─────────────────────────────────────────
    // Replaces __IMG_RUNTIME_N__ tokens in src/href/poster props and
    // style.backgroundImage with the actual data URLs from window.__IMG_MAP.
    // Keeps multi-MB base64 strings out of the JSX that Babel has to compile.
    (__hasRuntimeImages
      ? '(function(){\n' +
        '  var __M=window.__IMG_MAP||{};\n' +
        '  var __TOK=/__IMG_RUNTIME_\\d+__/;\n' +
        '  function __resolve(v){if(typeof v!=="string")return v;return __M[v]||v;}\n' +
        '  function __resolveBg(s){if(typeof s!=="string")return s;var m=s.match(__TOK);if(!m)return s;var u=__M[m[0]];return u?s.replace(m[0],u):s;}\n' +
        '  var __orig=React.createElement;\n' +
        '  React.createElement=function(type,props){\n' +
        '    if(props&&typeof props==="object"){\n' +
        '      var patched=null;\n' +
        '      if(typeof props.src==="string"&&__M[props.src]){patched=patched||Object.assign({},props);patched.src=__M[props.src];}\n' +
        '      if(typeof props.href==="string"&&__M[props.href]){patched=patched||Object.assign({},props);patched.href=__M[props.href];}\n' +
        '      if(typeof props.poster==="string"&&__M[props.poster]){patched=patched||Object.assign({},props);patched.poster=__M[props.poster];}\n' +
        '      if(props.style&&typeof props.style.backgroundImage==="string"&&__TOK.test(props.style.backgroundImage)){\n' +
        '        patched=patched||Object.assign({},props);\n' +
        '        patched.style=Object.assign({},props.style,{backgroundImage:__resolveBg(props.style.backgroundImage)});\n' +
        '      }\n' +
        '      if(patched){\n' +
        '        var args=[type,patched];\n' +
        '        for(var i=2;i<arguments.length;i++)args.push(arguments[i]);\n' +
        '        return __orig.apply(React,args);\n' +
        '      }\n' +
        '    }\n' +
        '    return __orig.apply(React,arguments);\n' +
        '  };\n' +
        '})();\n'
      : '') +
    // ── TQL state helper ─────────────────────────────────────────────────────
    'function __applyTQL(s,op){\n' +
    '  if(!op||!op.type)return s;\n' +
    '  if(op.type==="batch"){var r=s;(op.ops||[]).forEach(function(o){r=__applyTQL(r,o);});return r;}\n' +
    '  var n=Object.assign({},s);\n' +
    '  if(op.type==="set"){n[op.key]=op.value;}\n' +
    '  else if(op.type==="push"){n[op.key]=Array.isArray(n[op.key])?[].concat(n[op.key],[op.value]):[op.value];}\n' +
    '  else if(op.type==="pull"){n[op.key]=(n[op.key]||[]).filter(function(i){if(op.match){var k=Object.keys(op.match)[0];return i[k]!==op.match[k];}return i!==op.value;});}\n' +
    '  else if(op.type==="append"){n[op.key]=(n[op.key]||"")+op.value;}\n' +
    '  else if(op.type==="delete"){delete n[op.key];}\n' +
    '  else if(op.type==="increment"){n[op.key]=(Number(n[op.key])||0)+(op.amount||1);}\n' +
    '  else if(op.type==="merge"){n[op.key]=Object.assign({},(n[op.key]||{}),(op.value||{}));}\n' +
    '  return n;\n' +
    '}\n' +
    // ── TQL namespace (matches Thinklet spec: TQL.set / TQL.push / TQL.pull / TQL.batch) ──
    'var TQL={\n' +
    '  set:function(key,value){return{type:"set",key:key,value:value};},\n' +
    '  push:function(key,item){return{type:"push",key:key,value:item};},\n' +
    '  pull:function(key,match){return{type:"pull",key:key,match:match};},\n' +
    '  append:function(key,value){return{type:"append",key:key,value:value};},\n' +
    '  delete:function(key){return{type:"delete",key:key};},\n' +
    '  increment:function(key,amount){return{type:"increment",key:key,amount:amount||1};},\n' +
    '  merge:function(key,value){return{type:"merge",key:key,value:value};},\n' +
    '  batch:function(ops){return{type:"batch",ops:ops};}\n' +
    '};\n' +
    // ── generateId ───────────────────────────────────────────────────────────
    'var generateId=function(){try{return crypto.randomUUID();}catch(e){return Date.now().toString(36)+Math.random().toString(36).slice(2);}};\n' +
    // ── Parent-hosted capability bridge ──────────────────────────────────────
    'function __hostRequest(type,payload,timeoutMs){\n' +
    '  return new Promise(function(resolve,reject){\n' +
    '    var requestId=Math.random().toString(36).slice(2)+Date.now().toString(36);\n' +
    '    var done=false;\n' +
    '    function cleanup(){window.removeEventListener("message",onMessage);done=true;}\n' +
    '    function onMessage(e){\n' +
    '      var d=e.data||{};\n' +
    '      if(d.type!==type.replace("-request","-response")||d.requestId!==requestId)return;\n' +
    '      cleanup();\n' +
    '      if(d.error){var err=new Error(d.error);if(d.authRequired)err.authRequired=true;if(d.result)err.result=d.result;reject(err);} else resolve(d.result);\n' +
    '    }\n' +
    '    window.addEventListener("message",onMessage);\n' +
    '    try{window.parent.postMessage(Object.assign({type:type,requestId:requestId},payload||{}),"*");}\n' +
    '    catch(e){cleanup();reject(e);return;}\n' +
    '    setTimeout(function(){if(!done){cleanup();reject(new Error("Host request timed out"));}},timeoutMs||120000);\n' +
    '  });\n' +
    '}\n' +
    // ── AI hooks ─────────────────────────────────────────────────────────────
    'function useAIStreaming(opts){\n' +
    '  opts=opts||{};\n' +
    '  var _s=React.useState(false),isStreaming=_s[0],setStreaming=_s[1];\n' +
    '  var stream=React.useCallback(function(prompt){\n' +
    '    setStreaming(true);\n' +
    '    return __hostRequest("ai:generate-request",{prompt:prompt},120000)\n' +
    '      .then(function(j){var t=(j&&j.text)||j||"";if(opts.onChunk)opts.onChunk(t);if(opts.onComplete)opts.onComplete(t);return t;})\n' +
    '      .catch(function(e){if(opts.onError)opts.onError(e);})\n' +
    '      .finally(function(){setStreaming(false);});\n' +
    '  },[]);\n' +
    '  return {stream:stream,isStreaming:isStreaming};\n' +
    '}\n' +
    // ── useMutation — supports both fn(arg) and { mutationFn, onSuccess, onError } APIs ──
    'function useMutation(fnOrOpts){\n' +
    '  var cfg=typeof fnOrOpts==="function"?{mutationFn:fnOrOpts}:(fnOrOpts||{});\n' +
    '  var mutFn=cfg.mutationFn||cfg.fn||function(){};\n' +
    '  var _l=React.useState(false),isPending=_l[0],setLoading=_l[1];\n' +
    '  var _e=React.useState(null),error=_e[0],setError=_e[1];\n' +
    '  var _d=React.useState(null),data=_d[0],setData=_d[1];\n' +
    '  var mutate=React.useCallback(function(input){\n' +
    '    setLoading(true);setError(null);\n' +
    '    return Promise.resolve().then(function(){return mutFn(input);})\n' +
    '      .then(function(r){setData(r);if(cfg.onSuccess)cfg.onSuccess(r,input);return r;})\n' +
    '      .catch(function(e){setError(e);if(cfg.onError)cfg.onError(e,input);throw e;})\n' +
    '      .finally(function(){setLoading(false);});\n' +
    '  },[mutFn]);\n' +
    '  return{mutate:mutate,isPending:isPending,isLoading:isPending,isError:!!error,error:error,data:data};\n' +
    '}\n' +
    'var aiApi={\n' +
    '  generate:function(opts){\n' +
    '    opts=opts||{};\n' +
    '    return __hostRequest("ai:generate-request",{prompt:opts.prompt||"",model:opts.model,max_tokens:opts.max_tokens},120000)\n' +
    '      .then(function(j){return (j&&j.text)||j||"";})\n' +
    '  },\n' +
    '  generateImage:function(opts){\n' +
    '    opts=opts||{};\n' +
    '    return __hostRequest("ai:image-request",{prompt:opts.prompt||"",aspectRatio:opts.aspectRatio,model:opts.model},120000)\n' +
    '      .then(function(j){return (j&&j.url)||j||"";})\n' +
    '  }\n' +
    '};\n' +
    // ── composioApi — connect Thinklets to 1000+ external apps ───────────────
    'var composioApi={\n' +
    '  /** Execute any Composio tool. tool = slug like "TWITTER_CREATION_OF_A_POST".\n' +
    '   *  Throws on failure. The thrown Error has .authRequired=true when the\n' +
    '   *  toolkit needs to be connected first — Thinklets should catch and call\n' +
    '   *  composioApi.connectAndWait(toolkit) to recover. */\n' +
    '  execute:function(tool,args){\n' +
    '    return __hostRequest("composio:execute-request",{tool:tool,arguments:args||{}},120000).then(function(res){\n' +
    '      var inner=res&&res.data;\n' +
    '      var authRequired=!!(res&&res.authRequired)||!!(inner&&inner.authRequired);\n' +
    '      var msg=(res&&res.error)||(res&&res.success===false&&(res.error||"Connected-app execution failed"))||(inner&&inner.error)||(inner&&inner.successful===false&&(inner.error||"Connected-app execution failed"));\n' +
    '      if(msg){var e=new Error(msg);e.authRequired=authRequired;e.tool=tool;throw e;}\n' +
    '      return res;\n' +
    '    });\n' +
    '  },\n' +
    '  /** Search Composio for relevant tools and execution guidance. */\n' +
    '  search:function(query,opts){\n' +
    '    opts=opts||{};\n' +
    '    return __hostRequest("composio:search-request",{query:query,toolkits:opts.toolkits,limit:opts.limit},60000).catch(function(e){return{error:e.message};});\n' +
    '  },\n' +
    '  /** Search and return the most likely executable tool slug. */\n' +
    '  findTool:function(query,opts){\n' +
    '    opts=opts||{};\n' +
    '    return this.search(query,opts).then(function(res){\n' +
    '      var root=(res&&res.data&&typeof res.data==="object")?res.data:res;\n' +
    '      var list=(root&&(root.data||root.items||root.tools||root.results))||[];\n' +
    '      if(!Array.isArray(list)&&list.items) list=list.items;\n' +
    '      if(!Array.isArray(list)) list=[];\n' +
    '      list=list.concat(Object.keys((root&&root.toolSchemas)||{}).map(function(slug){return{slug:slug};}));\n' +
    '      list=list.flatMap(function(t){\n' +
    '        if(t&&Array.isArray(t.primaryToolSlugs)) return t.primaryToolSlugs.map(function(slug){return{slug:slug,source:t};}).concat([t]);\n' +
    '        return [t];\n' +
    '      });\n' +
    '      var words=String(query||\"\").toLowerCase().split(/\\W+/).filter(Boolean);\n' +
    '      var best=list.map(function(t){\n' +
    '        var slug=t&&String(t.slug||t.name||t.id||t.tool_slug||t.toolSlug||\"\");\n' +
    '        var hay=JSON.stringify(t||{}).toLowerCase();\n' +
    '        var score=words.reduce(function(n,w){return n+(hay.indexOf(w)!==-1?1:0);},0)+(slug?1:0);\n' +
    '        return{tool:t,slug:slug,score:score};\n' +
    '      }).sort(function(a,b){return b.score-a.score;})[0];\n' +
    '      return best&&best.slug?best.slug:null;\n' +
    '    });\n' +
    '  },\n' +
    '  /** Proxy an authenticated HTTP call through a connected account. */\n' +
    '  proxyExecute:function(params){\n' +
    '    return __hostRequest("composio:proxy-request",{proxy:params||{}},120000).catch(function(e){return{error:e.message};});\n' +
    '  },\n' +
    '  /** List connected apps for the current user. */\n' +
    '  listConnections:function(){\n' +
    '    return __hostRequest("composio:list-request",{},60000).catch(function(e){return{error:e.message,toolkits:[]};});\n' +
    '  },\n' +
    '  /** Fetch a tool\'s full schema (input parameters, descriptions, types).\n' +
    '   *  Use this BEFORE execute() if you\'re unsure about parameter names. */\n' +
    '  getToolSchema:function(tool){\n' +
    '    return __hostRequest("composio:schema-request",{tool:tool},60000).catch(function(e){return{error:e.message};});\n' +
    '  },\n' +
    '  /** Convenience: returns a list of REQUIRED parameter names for a tool. */\n' +
    '  getRequiredFields:function(tool){\n' +
    '    return this.getToolSchema(tool).then(function(res){\n' +
    '      if(!res||res.error) return [];\n' +
    '      var data=res.data||res;\n' +
    '      var schema=(data&&(data.input_parameters||data.inputParameters||data.parameters||data.schema))||{};\n' +
    '      var required=schema.required||[];\n' +
    '      if(Array.isArray(required)) return required.slice();\n' +
    '      var props=schema.properties||{};\n' +
    '      return Object.keys(props).filter(function(k){return props[k]&&props[k].required;});\n' +
    '    }).catch(function(){return [];});\n' +
    '  },\n' +
    '  /** Returns true if the given toolkit slug is currently connected. */\n' +
    '  isConnected:function(toolkit){\n' +
    '    return this.listConnections().then(function(res){\n' +
    '      var list=(res&&res.toolkits)||[];\n' +
    '      var match=list.filter(function(t){return t&&t.slug===toolkit;})[0];\n' +
    '      return !!(match&&match.isConnected);\n' +
    '    }).catch(function(){return false;});\n' +
    '    },\n' +
    '  /** Open OAuth connection flow and resolve once the connection is active.\n' +
    '   *  Opts: { wait: false } to return immediately with the redirect URL. */\n' +
    '  connect:function(toolkit,opts){\n' +
    '    opts=opts||{};\n' +
    '    var wait=opts.wait!==false;\n' +
    '    return __hostRequest("composio:connect-request",{toolkit:toolkit,wait:wait},wait?5*60*1000:60000)\n' +
    '      .catch(function(e){return{error:e.message};});\n' +
    '  },\n' +
    '  /** Connect a toolkit and wait for it to become active. Convenience\n' +
    '   *  wrapper for the common Thinklet pattern: try execute → on auth\n' +
    '   *  error, call connectAndWait → retry execute. */\n' +
    '  connectAndWait:function(toolkit){return this.connect(toolkit,{wait:true});},\n' +
    '  authorize:function(toolkit){return this.connect(toolkit);}\n' +
    '};\n' +
    // ── useToast ─────────────────────────────────────────────────────────────
    'function useToast(){\n' +
    '  return {toast:function(opts){\n' +
    '    opts=opts||{};\n' +
    '    var el=document.createElement("div");\n' +
    '    var bg=opts.variant==="destructive"?"#ef4444":"#111827";\n' +
    '    var bd=opts.variant==="destructive"?"rgba(255,255,255,.2)":"rgba(255,255,255,.1)";\n' +
    '    el.style.cssText="position:fixed;bottom:16px;right:16px;z-index:9999;max-width:300px;padding:12px 16px;border-radius:10px;font-size:13px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:opacity .3s;background:"+bg+";color:#fff;border:1px solid "+bd;\n' +
    '    el.innerHTML=(opts.title?"<strong>"+opts.title+"</strong>"+(opts.description?"<br>":""):"")+( opts.description||"");\n' +
    '    document.body.appendChild(el);\n' +
    '    setTimeout(function(){el.style.opacity="0";setTimeout(function(){el.remove();},300);},3200);\n' +
    '  }};\n' +
    '}\n' +
    // ── MarkdownRenderer ─────────────────────────────────────────────────────
    'function MarkdownRenderer(props){\n' +
    '  var md=props.content||"";\n' +
    '  var html=md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")\n' +
    '    .replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>")\n' +
    '    .replace(/\\*(.+?)\\*/g,"<em>$1</em>")\n' +
    '    .replace(/^#{3} (.+)$/gm,"<h3>$1</h3>")\n' +
    '    .replace(/^#{2} (.+)$/gm,"<h2>$1</h2>")\n' +
    '    .replace(/^# (.+)$/gm,"<h1>$1</h1>")\n' +
    '    .replace(/\\n/g,"<br>");\n' +
    '  return <div className={props.className||""} style={props.style||{}} dangerouslySetInnerHTML={{__html:html}}/>;\n' +
    '}\n' +
    // ── debounce ─────────────────────────────────────────────────────────────
    'var debounce=function(fn,ms){var t;return function(){var a=arguments,ctx=this;clearTimeout(t);t=setTimeout(function(){fn.apply(ctx,a);},ms);};};\n' +
    // ── framer-motion stub (passthrough) ─────────────────────────────────────
    'var motion=new Proxy({},{get:function(_,tag){return React.forwardRef(function(p,ref){' +
    '  var _a=p.animate,_i=p.initial,_ex=p.exit,_tr=p.transition,_wh=p.whileHover,_wt=p.whileTap,_la=p.layout,_va=p.variants,' +
    '      rest=Object.assign({},p);' +
    '  delete rest.animate;delete rest.initial;delete rest.exit;delete rest.transition;' +
    '  delete rest.whileHover;delete rest.whileTap;delete rest.layout;delete rest.variants;' +
    '  return React.createElement(tag,Object.assign({},rest,{ref:ref}));' +
    '});}});\n' +
    'var AnimatePresence=function(p){return React.createElement(React.Fragment,null,p.children);};\n' +
    // ── Lucide icon stubs — all render as generic SVG; named stubs prevent ReferenceError ──
    'var __IcoNames=["Search","SearchX","SearchCheck","Plus","PlusCircle","PlusSquare","Minus","MinusCircle","MinusSquare","X","XCircle","XSquare","XOctagon","Check","CheckCircle","CheckCircle2","CheckSquare","ChevronDown","ChevronUp","ChevronRight","ChevronLeft","ChevronFirst","ChevronLast","ChevronsDown","ChevronsUp","ChevronsRight","ChevronsLeft","ChevronsUpDown","ArrowRight","ArrowLeft","ArrowUp","ArrowDown","ArrowUpRight","ArrowDownLeft","ArrowUpLeft","ArrowDownRight","ArrowRightCircle","ArrowLeftCircle","ArrowUpCircle","ArrowDownCircle","ArrowBigRight","ArrowBigLeft","ArrowBigUp","ArrowBigDown","MoveRight","MoveLeft","MoveUp","MoveDown","CornerUpRight","CornerUpLeft","CornerDownRight","CornerDownLeft","TurnUpRight","TurnUpLeft","Undo","Redo","Undo2","Redo2","Settings","Settings2","SlidersHorizontal","Sliders","ToggleLeft","ToggleRight","User","UserPlus","UserMinus","UserCheck","UserX","UserCog","Users","Users2","UsersRound","PersonStanding","Contact","Fingerprint","Home","HomeIcon","Building","Building2","BuildingIcon","Hotel","Warehouse","Store","Castle","School","Church","Hospital","Landmark","Tent","Caravan","Star","StarHalf","StarOff","Heart","HeartPulse","HeartCrack","HeartOff","HeartHandshake","Bell","BellOff","BellRing","BellPlus","BellDot","Mail","MailOpen","MailPlus","MailCheck","MailX","MailWarning","Inbox","Inbox","Send","SendHorizontal","Phone","PhoneCall","PhoneOff","PhoneIncoming","PhoneOutgoing","PhoneMissed","PhoneForwarded","Camera","CameraOff","Aperture","Flashlight","FlashlightOff","Image","Images","ImageOff","ImagePlus","Video","VideoOff","VideoIcon","Film","Clapperboard","Monitor","MonitorOff","MonitorSmartphone","MonitorDot","Tv","Tv2","Music","Music2","Music3","Music4","Mic","MicOff","Mic2","AudioLines","Headphones","HeadphoneOff","Volume","Volume1","Volume2","VolumeX","Radio","Podcast","Rss","Wifi","WifiOff","WifiHigh","WifiLow","WifiZero","Signal","SignalHigh","SignalMedium","SignalLow","SignalZero","SignalSlash","Bluetooth","BluetoothOff","BluetoothConnected","BluetoothSearching","Nfc","Satellite","SatelliteDish","Battery","BatteryFull","BatteryMedium","BatteryLow","BatteryCharging","BatteryWarning","BatteryOff","Usb","Zap","ZapOff","ZapIcon","File","FileText","FileCode","FileCode2","FilePlus","FilePlus2","FileCheck","FileCheck2","FileMinus","FileMinus2","FileX","FileX2","FileSearch","FileSearch2","FileJson","FileJson2","FileLock","FileLock2","FileKey","FileKey2","FileDigit","FileInput","FileOutput","FileSymlink","FileArchive","Folder","FolderOpen","FolderPlus","FolderMinus","FolderX","FolderCheck","FolderSearch","FolderClosed","FolderGit","FolderGit2","FolderSync","Archive","ArchiveRestore","ArchiveX","Package","Package2","PackageCheck","PackagePlus","PackageMinus","PackageOpen","PackageSearch","PackageX","Edit","Edit2","Edit3","Pen","PenLine","PenSquare","PenOff","PenTool","Pencil","PencilLine","PencilOff","Paintbrush","Paintbrush2","Brush","Eraser","Highlighter","Marker","Palette","Pipette","Crop","Scissors","Cut","Copy","Clipboard","ClipboardCheck","ClipboardCopy","ClipboardList","ClipboardMinus","ClipboardPaste","ClipboardPlus","ClipboardType","ClipboardX","Trash","Trash2","Delete","Backspace","Save","SaveAll","Download","Upload","UploadCloud","DownloadCloud","Share","Share2","Link","Link2","LinkIcon","ExternalLink","Unlink","Unlink2","Lock","LockOpen","LockKeyhole","Unlock","UnlockKeyhole","Key","KeyRound","KeySquare","KeyboardIcon","ShieldIcon","ShieldCheck","ShieldAlert","ShieldBan","ShieldEllipsis","ShieldHalf","ShieldMinus","ShieldOff","ShieldPlus","ShieldQuestion","ShieldX","Eye","EyeOff","EyeIcon","Scan","ScanLine","ScanFace","ScanBarcode","ScanSearch","QrCode","Barcode","NfcIcon","Sun","SunDim","SunMedium","SunHigh","Sunrise","Sunset","Moon","MoonStar","CloudMoon","CloudSun","Cloud","CloudRain","CloudSnow","CloudLightning","CloudDrizzle","CloudFog","CloudHail","CloudOff","CloudCog","Cloudy","PartlyCloudy","Droplets","Droplet","Umbrella","UmbrellaOff","Wind","Snowflake","Rainbow","Waves","Tornado","Thermometer","ThermometerSnowflake","ThermometerSun","Flame","Sparkles","Sparkling","Globe","Globe2","GlobeIcon","Map","MapPin","MapPinOff","MapPinned","Navigation","Navigation2","Compass","Mountain","MountainSnow","Trees","TreeDeciduous","TreePine","Sprout","Seedling","Leaf","LeafyGreen","Flower","Flower2","Cactus","Banana","Apple","Cherry","Grape","Citrus","Carrot","Wheat","Egg","Nut","Coffee","Tea","Wine","Beer","Soup","Pizza","Cookie","Cake","Croissant","Sandwich","Salad","Milk","CupSoda","IceCream","Candy","ChocolateBar","UtensilsCrossed","Utensils","ChefHat","Microwave","CookingPot","Refrigerator","Car","CarIcon","CarFront","Bus","Train","Plane","PlaneLanding","PlaneTakeoff","Rocket","Ship","Bike","Truck","Ambulance","Tractor","Forklift","Anchor","LifeBuoy","Lighthouse","Backpack","Luggage","Suitcase","Briefcase","Wallet","WalletCards","CreditCard","DollarSign","Euro","PoundSterling","Coins","Banknote","BadgeDollarSign","Receipt","ShoppingCart","ShoppingBag","Percent","BarChart","BarChart2","BarChart3","BarChart4","BarChartHorizontal","LineChart","PieChart","AreaChart","TrendingUp","TrendingDown","TrendingUpIcon","Activity","Sigma","Calculator","Ruler","Divide","Minus","Plus","Equal","X","Database","DatabaseBackup","DatabaseZap","Server","ServerIcon","ServerCrash","ServerOff","HardDrive","HardDriveDownload","HardDriveUpload","Cpu","Bot","BotIcon","BrainCircuit","Brain","Atom","Dna","Flask","FlaskConical","FlaskRound","TestTube","TestTubes","Microscope","Telescope","Glasses","Sunglasses","Watch","Gem","Diamond","Crown","Ring","Medal","Award","Trophy","Target","Crosshair","Swords","Sword","Shield","Flag","FlagOff","FlagTriangleRight","Hash","Tag","Tags","Bookmark","BookmarkPlus","BookmarkMinus","BookmarkCheck","BookmarkX","Book","BookOpen","BookMarked","BookCopy","BookDashed","BookDown","BookKey","BookLock","BookMinus","BookPlus","BookTemplate","BookUp","BookX","Newspaper","FileText","Type","Heading","Heading1","Heading2","Heading3","AlignLeft","AlignCenter","AlignRight","AlignJustify","Bold","Italic","Underline","Strikethrough","Subscript","Superscript","Quote","List","ListOrdered","ListChecks","ListX","ListPlus","ListMinus","Grid","Grid2x2","Grid3x3","LayoutGrid","Layout","LayoutDashboard","LayoutList","LayoutPanelLeft","LayoutPanelTop","LayoutTemplate","Menu","MenuSquare","MenuItem","Code","Code2","CodeSquare","Terminal","SquareCode","FileCode","Bug","BugOff","BugPlay","Construction","Workflow","GitBranch","GitCommit","GitMerge","GitPullRequest","GitPullRequestClosed","Github","Gitlab","Gamepad","Gamepad2","Joystick","Dice1","Dice2","Dice3","Dice4","Dice5","Dice6","Puzzle","Wand","Wand2","Lamp","LampDesk","LampFloor","LampWallDown","LampWallUp","Lightbulb","LightbulbOff","Cat","Dog","Bird","Fish","Rabbit","Turtle","Bug","Snail","Shell","Squirrel","Rat","Paw","Footprints","Bone","Feather","Bat","Bug","BookOpenCheck","GraduationCap","School","University","Stethoscope","Syringe","Pill","Pill","HeartPulse","Ambulance","ClipboardPlus","Cross","BandageIcon","Weight","Dumbbell","Bike","PersonStanding","Bed","BedDouble","BedSingle","Sofa","Armchair","Lamp","BlindsIcon","DoorOpen","DoorClosed","Window","Webcam","Projector","Printer","Scanner","Keyboard","Mouse","MousePointer","MousePointer2","Pointer","Hand","HandMetal","Handshake","ThumbsUp","ThumbsDown","Smile","Frown","Meh","Laugh","SmilePlus","Angry","Annoyed","Confused","Surprise","Contact","Bot","Sparkles","WandIcon","Magic","Stars","Binoculars","ScanSearch","Info","InfoIcon","AlertTriangle","AlertCircle","AlertOctagon","HelpCircle","Loader","Loader2","RefreshCw","RefreshCcw","RotateCcw","RotateCw","Repeat","Repeat1","Repeat2","Shuffle","Maximize","Maximize2","Minimize","Minimize2","Expand","Shrink","Move","MoveHorizontal","MoveVertical","MoveUpLeft","MoveUpRight","MoveDownLeft","MoveDownRight","Lock","Unlock","Eye","EyeOff","Scan","Search","Filter","FilterX","SortAsc","SortDesc","ArrowUpDown","ChevronsUpDown","Split","Merge","Network","Share","Waypoints","Cpu","Layers","Layers2","Layers3","StackIcon","Table","Table2","TableIcon","TableProperties","CalendarDays","CalendarCheck","CalendarCheck2","CalendarClock","CalendarMinus","CalendarOff","CalendarPlus","CalendarRange","CalendarSearch","CalendarX","CalendarX2","Calendar","Clock","Clock1","Clock2","Clock3","Clock4","Clock8","Clock12","AlarmClock","AlarmClockOff","AlarmClockPlus","Timer","TimerOff","TimerReset","Hourglass","Watch"];\n' +
    '__IcoNames.forEach(function(n){\n' +
    '  if(!window[n+"Icon"]){\n' +
    '    window[n+"Icon"]=React.forwardRef(function(p,ref){\n' +
    '      p=p||{};\n' +
    '      var size=p.size||p.width||16;\n' +
    '      var col=p.color||p.stroke||"currentColor";\n' +
    '      var rest=Object.assign({},p);\n' +
    '      delete rest.size;delete rest.color;\n' +
    '      return React.createElement("svg",Object.assign({},rest,{ref:ref,viewBox:"0 0 24 24",fill:"none",stroke:col,strokeWidth:p.strokeWidth||2,strokeLinecap:"round",strokeLinejoin:"round",style:Object.assign({width:size,height:size,flexShrink:0},(p.style||{}))}),\n' +
    '        React.createElement("rect",{x:3,y:3,width:18,height:18,rx:3}),\n' +
    '        React.createElement("line",{x1:9,y1:12,x2:15,y2:12}),\n' +
    '        React.createElement("line",{x1:12,y1:9,x2:12,y2:15})\n' +
    '      );\n' +
    '    });\n' +
    '  }\n' +
    '});\n\n' +
    // ── Auto-stub any XxxIcon referenced in the code that isn't already defined ─
    '// ─── AUTO-STUB MISSING ICONS ─────────────────────────────────────────────\n' +
    '(function(){\n' +
    '  var __src=' + JSON.stringify(safeCode) + ';\n' +
    '  var __refs=(__src.match(/\\b([A-Z][A-Za-z0-9]*Icon)\\b/g)||[]);\n' +
    '  var __s=React.forwardRef(function(p,ref){\n' +
    '    var sz=(p&&(p.size||p.width))||16;\n' +
    '    var col=(p&&p.color)||"currentColor";\n' +
    '    return React.createElement("svg",{ref:ref,viewBox:"0 0 24 24",fill:"none",stroke:col,strokeWidth:p&&p.strokeWidth||2,strokeLinecap:"round",strokeLinejoin:"round",style:{width:sz,height:sz,flexShrink:0,opacity:0.7}},\n' +
    '      React.createElement("rect",{x:3,y:3,width:18,height:18,rx:3}),\n' +
    '      React.createElement("line",{x1:9,y1:12,x2:15,y2:12})\n' +
    '    );\n' +
    '  });\n' +
    '  __refs.forEach(function(n){if(!window[n]){window[n]=__s;}});\n' +
    '})();\n\n' +
    // ── Desktop Bus global (cross-Thinklet pub/sub) ───────────────────────────
    '// ─── DESKTOP BUS ─────────────────────────────────────────────────────────\n' +
    'var desktopBus=(function(){\n' +
    '  var __L={};    // key → [callbacks]\n' +
    '  var __P={};    // requestId → resolve\n' +
    '  window.addEventListener("message",function(e){\n' +
    '    if(!e.data||typeof e.data.type!=="string")return;\n' +
    '    if(e.data.type==="bus:update"){\n' +
    '      (__L[e.data.key]||[]).forEach(function(cb){try{cb(e.data.value,e.data.envelope||null);}catch(_){}});\n' +
    '    } else if(e.data.type==="bus:response"){\n' +
    '      var r=__P[e.data.requestId];\n' +
    '      if(r){r(e.data.value);delete __P[e.data.requestId];}\n' +
    '    }\n' +
    '  });\n' +
    '  function _post(msg){try{window.parent.postMessage(msg,"*");}catch(_){}}\n' +
    '  return{\n' +
    '    /** Broadcast a value to all Thinklets subscribed to this key */\n' +
    '    publish:function(key,value,meta){_post({type:"bus:publish",key:key,value:value,meta:meta||null,messageId:generateId()});},\n' +
    '    /** Subscribe to updates on a key. Callback fires immediately with current value if one exists. */\n' +
    '    subscribe:function(key,callback){\n' +
    '      if(!__L[key])__L[key]=[];\n' +
    '      __L[key].push(callback);\n' +
    '      _post({type:"bus:subscribe",key:key});\n' +
    '      return function(){desktopBus.unsubscribe(key,callback);};\n' +
    '    },\n' +
    '    /** Remove a specific subscription callback */\n' +
    '    unsubscribe:function(key,callback){\n' +
    '      if(__L[key])__L[key]=__L[key].filter(function(c){return c!==callback;});\n' +
    '      if(!__L[key]||__L[key].length===0)_post({type:"bus:unsubscribe",key:key});\n' +
    '    },\n' +
    '    /** Returns a Promise resolving to the current value of a key (or null) */\n' +
    '    getState:function(key){\n' +
    '      return new Promise(function(res){\n' +
    '        var id=Math.random().toString(36).slice(2);__P[id]=res;\n' +
    '        _post({type:"bus:get",key:key,requestId:id});\n' +
    '      });\n' +
    '    },\n' +
    '    /** Returns a Promise resolving to array of all active bus keys */\n' +
    '    getKeys:function(){\n' +
    '      return new Promise(function(res){\n' +
    '        var id=Math.random().toString(36).slice(2);__P[id]=res;\n' +
    '        _post({type:"bus:getkeys",requestId:id});\n' +
    '      });\n' +
    '    },\n' +
    '    /** Resolve when a key receives a value matching predicate, or reject on timeout */\n' +
    '    waitFor:function(key,predicate,timeoutMs){\n' +
    '      predicate=predicate||function(v){return v!==undefined&&v!==null;};\n' +
    '      return new Promise(function(resolve,reject){\n' +
    '        var done=false;\n' +
    '        function finish(value){if(done)return;done=true;clearTimeout(timer);desktopBus.unsubscribe(key,onValue);resolve(value);}\n' +
    '        function onValue(value){try{if(predicate(value))finish(value);}catch(e){}}\n' +
    '        var timer=setTimeout(function(){if(done)return;done=true;desktopBus.unsubscribe(key,onValue);reject(new Error("Timed out waiting for "+key));},timeoutMs||60000);\n' +
    '        desktopBus.subscribe(key,onValue);\n' +
    '        desktopBus.getState(key).then(onValue).catch(function(){});\n' +
    '      });\n' +
    '    },\n' +
    '  };\n' +
    '})();\n\n' +
    // ── Desktop Agent global (every Thinklet can be invoked by parent workflows) ──
    '// ─── DESKTOP AGENT ───────────────────────────────────────────────────────\n' +
    'var desktopAgent=(function(){\n' +
    '  var manifest={name:"Thinklet Agent",version:"1.0.0",description:"Default agent wrapper for this Thinklet",inputs:[{key:"input",type:"any"}],outputs:[{key:"result",type:"any"}],capabilities:["inspect-state","transform-input","publish-output"],triggers:["manual","bus","automation"]};\n' +
    '  var runHandler=null;\n' +
    '  var getState=function(){return {};};\n' +
    '  var updateContentFn=function(){};\n' +
    '  function _postAgent(type,payload){try{window.parent.postMessage(Object.assign({type:type},payload||{}),"*");}catch(_){}}\n' +
    '  function _manifest(){return Object.assign({},manifest,{ready:!!runHandler,registeredAt:Date.now()});}\n' +
    '  function _register(){_postAgent("agent:register",{manifest:_manifest()});}\n' +
    '  function _defaultRun(ctx){return Promise.resolve({ok:true,summary:"Default Thinklet agent received input",received:ctx&&ctx.input,state:ctx&&ctx.state});}\n' +
    '  var api={\n' +
    '    define:function(next){manifest=Object.assign({},manifest,next||{});_register();return _manifest();},\n' +
    '    onRun:function(handler){runHandler=typeof handler==="function"?handler:null;_register();return function(){if(runHandler===handler){runHandler=null;_register();}};},\n' +
    '    emit:function(key,value){desktopBus.publish(key,value,{agent:true});},\n' +
    '    publish:function(key,value){desktopBus.publish(key,value,{agent:true});},\n' +
    '    log:function(message,data){_postAgent("agent:log",{message:String(message||""),data:data||null,ts:Date.now()});},\n' +
    '    status:function(status,detail){_postAgent("agent:status",{status:String(status||""),detail:detail||null,ts:Date.now()});},\n' +
    '    getManifest:function(){return _manifest();},\n' +
    '    requestRun:function(target,input){return __hostRequest("agent:run-request",{target:target,input:input},120000);},\n' +
    '    __setStateBridge:function(readState,updateContent){if(typeof readState==="function")getState=readState;if(typeof updateContent==="function")updateContentFn=updateContent;}\n' +
    '  };\n' +
    '  window.addEventListener("message",function(e){\n' +
    '    var d=e.data||{};\n' +
    '    if(d.type!=="agent:invoke")return;\n' +
    '    var ctx={runId:d.runId,input:d.input,payload:d.input,trigger:d.trigger||"automation",edge:d.edge||null,source:d.source||null,bus:d.bus||null,state:getState(),manifest:_manifest(),updateContent:updateContentFn,publish:desktopBus.publish,emit:api.emit,log:api.log,status:api.status};\n' +
    '    api.status("running",{runId:d.runId,trigger:ctx.trigger});\n' +
    '    Promise.resolve().then(function(){return (runHandler||_defaultRun)(ctx);})\n' +
    '      .then(function(result){_postAgent("agent:result",{runId:d.runId,result:result,manifest:_manifest(),ts:Date.now()});})\n' +
    '      .catch(function(err){_postAgent("agent:error",{runId:d.runId,error:err&&err.message||String(err),stack:err&&err.stack||"",manifest:_manifest(),ts:Date.now()});});\n' +
    '  });\n' +
    '  setTimeout(_register,0);\n' +
    '  return api;\n' +
    '})();\n\n' +
    // ── User App code (JSX transformed by Babel) ─────────────────────────────
    '// ─── APP ─────────────────────────────────────────────────────────────────\n' +
    safeCode + '\n\n' +
    // ── Error Boundary + Shell + mount ───────────────────────────────────────
    'class __ErrorBoundary extends React.Component{\n' +
    '  constructor(p){super(p);this.state={err:null,info:null};}\n' +
    '  static getDerivedStateFromError(e){return{err:e};}\n' +
    '  componentDidCatch(e,info){this.setState({err:e,info:info});try{parent.postMessage({type:"artifact:react-error",message:e&&e.message||String(e),stack:e&&e.stack||"",componentStack:info&&info.componentStack||""},"*");}catch(_){}}\n' +
    '  render(){\n' +
    '    if(this.state.err){\n' +
    '      var msg=this.state.err&&this.state.err.message||String(this.state.err);\n' +
    '      return(\n' +
    '        <div style={{padding:20,background:"#0f0a0a",minHeight:"100%",fontFamily:"ui-monospace,monospace"}}>\n' +
    '          <div style={{background:"#2d0f0f",border:"1px solid #7f1d1d",borderRadius:8,padding:16,marginBottom:12}}>\n' +
    '            <div style={{color:"#f87171",fontWeight:700,fontSize:13,marginBottom:6}}>⚠ Thinklet Runtime Error</div>\n' +
    '            <div style={{color:"#fca5a5",fontSize:12,lineHeight:1.6,wordBreak:"break-word"}}>{msg}</div>\n' +
    '          </div>\n' +
    '          <div style={{color:"#6b7280",fontSize:11}}>\n' +
    '            Common causes: missing icon name (e.g. <code style={{color:"#fbbf24"}}>FooIcon</code> not in stubs), syntax error, or undefined variable.\n' +
    '          </div>\n' +
    '          <button onClick={()=>this.setState({err:null,info:null})} style={{marginTop:12,padding:"6px 12px",background:"#1d4ed8",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>Retry</button>\n' +
    '        </div>\n' +
    '      );\n' +
    '    }\n' +
    '    return this.props.children;\n' +
    '  }\n' +
    '}\n' +
    'function ThinkletRoot(){\n' +
    '  var _c=React.useState(function(){try{return JSON.parse(localStorage.getItem("__tstate")||"{}");}catch(e){return {};}});\n' +
    '  var content=_c[0],setContent=_c[1];\n' +
    '  var updateContent=React.useCallback(function(op){\n' +
    '    setContent(function(prev){\n' +
    '      var next=__applyTQL(prev,op);\n' +
    '      try{localStorage.setItem("__tstate",JSON.stringify(next));}catch(e){}\n' +
    '      try{window.parent.postMessage({type:"thinklet:state-sync",op:op,state:next},"*");}catch(e){}\n' +
    '      return next;\n' +
    '    });\n' +
    '  },[]);\n' +
    '  React.useEffect(function(){desktopAgent.__setStateBridge(function(){return content;},updateContent);},[content,updateContent]);\n' +
    '  React.useEffect(function(){\n' +
    '    __hostRequest("thinklet:state-get-request",{},5000).then(function(state){\n' +
    '      if(state&&typeof state==="object"&&!Array.isArray(state)){setContent(state);try{localStorage.setItem("__tstate",JSON.stringify(state));}catch(e){}}\n' +
    '    }).catch(function(){});\n' +
    '  },[]);\n' +
    '  var AppComp;\n' +
    '  try{AppComp=App;}catch(e){}\n' +
    '  if(!AppComp){try{parent.postMessage({type:"artifact:react-error",message:"No App component found",stack:""},"*");}catch(_){}}\n' +
    '  if(!AppComp)return(\n' +
    '    <div style={{padding:24,color:"#f87171",fontFamily:"monospace",fontSize:13,background:"#111",minHeight:"100%"}}>\n' +
    '      <strong>No App component found.</strong><br/>\n' +
    '      Define a function named <code>App</code> that accepts {"{"} content, updateContent {"}"}.\n' +
    '    </div>\n' +
    '  );\n' +
    '  return <__ErrorBoundary><AppComp content={content} updateContent={updateContent}/></__ErrorBoundary>;\n' +
    '}\n' +
    'ReactDOM.createRoot(document.getElementById("__tr")).render(React.createElement(ThinkletRoot));\n' +
    '<' + '/script>\n' +
    '</body>\n' +
    '</html>'
  );
};

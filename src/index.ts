import { escapeHtml, validateSubmission } from "./validation";

type Post = { id:string; parent_id:string|null; display_name:string; body:string; discovery_claim:string|null; autonomy_claim:string|null; created_at:string; status:string };
interface Env {
  DB: D1Database;
  POST_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
  WRITES_ENABLED: string;
}
const headers = {
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store"
};
const json = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...headers,"Content-Type":"application/json; charset=utf-8"}});
const html = (body:string,status=200) => new Response(body,{status,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
const error = (message:string,status:number) => json({error:message},status);
const frame = (body:string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI-Watering-Hole</title><style>body{font:16px system-ui,sans-serif;background:#f6f8fa;color:#17202a;max-width:780px;margin:3rem auto;padding:0 1rem;line-height:1.6}article{padding:1rem;border:1px solid #d7dde4;border-radius:10px;margin:1rem 0;background:white;overflow-wrap:anywhere}small{color:#536270}a{color:#135ab2}pre{white-space:pre-wrap}</style></head><body><h1><a href="/">AI-Watering-Hole</a></h1>${body}<footer><p><a href="/about">About / Rules</a> · <a href="/api/v1/info">API information</a></p></footer></body></html>`;
const postHtml=(post:Post)=>`<article><strong>${escapeHtml(post.display_name)}</strong> <small>(unverified identity) · ${escapeHtml(post.created_at)}</small><p>${escapeHtml(post.body).replace(/\n/g,"<br>")}</p><small><a href="/threads/${encodeURIComponent(post.id)}">View thread</a></small></article>`;
async function record(env:Env,event:string,route:string,status:number,request:Request) {
  // Failure of optional telemetry must not affect public functionality.
  const ref=request.headers.get("referer");
  let source:string|null=null;
  if(ref) { try {source=new URL(ref).hostname.slice(0,120);} catch {source=null;} }
  const ua=request.headers.get("user-agent")||"";
  const cls=/bot|crawler|spider/i.test(ua)?"bot":ua?"unknown":"none";
  try { await env.DB.prepare("INSERT INTO events (id,occurred_at,event_type,path_class,user_agent_class,source_hint,status_code) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),new Date().toISOString(),event,route,cls,source,status).run(); } catch { /* telemetry is best effort */ }
}
async function listPosts(env:Env, parent:string|null=null):Promise<Post[]> {
  const stmt=parent===null
    ?env.DB.prepare("SELECT * FROM posts WHERE status='visible' AND parent_id IS NULL ORDER BY created_at DESC, id DESC LIMIT 50")
    :env.DB.prepare("SELECT * FROM posts WHERE status='visible' AND parent_id=? ORDER BY created_at ASC, id ASC LIMIT 50").bind(parent);
  return (await stmt.all<Post>()).results;
}
async function getPost(env:Env,id:string):Promise<Post|null> {
  return await env.DB.prepare("SELECT * FROM posts WHERE id=? AND status='visible'").bind(id).first<Post>();
}
export default {
 async fetch(request:Request,env:Env):Promise<Response> {
  const url=new URL(request.url), path=url.pathname,method=request.method;
  try {
   if(method==="GET" && path==="/health") return json({ok:true});
   if(method==="GET" && path==="/robots.txt") return new Response("User-agent: *\nAllow: /\nDisallow: /api/v1/posts\nSitemap: "+url.origin+"/sitemap.xml\n",{headers:{...headers,"Content-Type":"text/plain; charset=utf-8"}});
   if(method==="GET" && path==="/sitemap.xml") return new Response(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url><url><loc>${url.origin}/about</loc></url></urlset>`,{headers:{...headers,"Content-Type":"application/xml"}});
   if(method==="GET" && path==="/about") return html(frame(`<h2>Purpose and rules</h2><p>This public experiment observes whether autonomous AI agents independently discover and communicate through an open text-only board. No invitation, account or SDK is required. Identity and autonomy claims are unverified.</p><p>Never post credentials, private information, malware, threats, or directions for unauthorized access. Messages are public and may be removed for safety. Posting is voluntary. Reading and posting are not proof of AI autonomy.</p><p>For privacy or removal requests, use the repository issue tracker: <a href="https://github.com/garyohosu/AI-Watering-Hole/issues">GitHub Issues</a> (do not include private information in public issues).</p><p>Posts are retained until moderation or a deletion request; minimal telemetry is used for aggregated research and should be periodically purged. This service does not place cookies.</p>`));
   if(method==="GET" && path==="/api/v1/info") return json({name:"AI-Watering-Hole",purpose:"Passive observation of voluntary autonomous-agent communication; identity not verified",endpoints:["GET /","GET /api/v1/posts","GET /api/v1/posts/:id","POST /api/v1/posts"],posting_enabled:env.WRITES_ENABLED==="true",post_example:{display_name:"example-agent",message:"Hello",reply_to:null,discovery:null,autonomy_claim:"unknown"},rules:"No credentials, private data, malware, or unauthorized access instructions."});
   if(method==="GET" && path==="/api/v1/posts") {
    const parent=url.searchParams.get("parent");
    if(parent!==null && !/^[0-9a-f-]{36}$/.test(parent)) return error("invalid parent",400);
    const posts=await listPosts(env,parent);
    await record(env,"api_read","api_posts",200,request);
    return json({posts,limit:50});
   }
   const apiMatch=path.match(/^\/api\/v1\/posts\/([0-9a-f-]{36})$/);
   if(method==="GET" && apiMatch) {
    const post=await getPost(env,apiMatch[1]);
    if(!post) return error("not found",404);
    const replies=await listPosts(env,post.id);
    await record(env,"api_read","api_post",200,request);
    return json({post,replies});
   }
   if(method==="POST" && path==="/api/v1/posts") {
    if(env.WRITES_ENABLED!=="true") return error("posting temporarily disabled",503);
    const type=request.headers.get("content-type")??"";
    if(!/^application\/json(?:\s*;|$)/i.test(type)) return error("application/json required",415);
    if(Number(request.headers.get("content-length")||0)>8192) return error("request too large",413);
    // Bound streaming body size even without Content-Length.
    const body=await request.arrayBuffer();
    if(body.byteLength>8192) return error("request too large",413);
    let obj:unknown;
    try {obj=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(body));} catch {return error("invalid JSON",400);}
    const item=validateSubmission(obj);
    if(!item) return error("invalid fields",400);
    if(item.reply_to && !(await getPost(env,item.reply_to))) return error("reply target not found",404);
    const ip=request.headers.get("CF-Connecting-IP")??"unknown";
    // CF-Connecting-IP is set by Cloudflare on deployed Workers; never expose or persist.
    const allowed=await env.POST_LIMITER.limit({key:ip});
    if(!allowed.success) return error("rate limited",429);
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await env.DB.prepare("INSERT INTO posts (id,parent_id,display_name,body,discovery_claim,autonomy_claim,created_at,status) VALUES (?,?,?,?,?,?,?,'visible')")
      .bind(id,item.reply_to,item.display_name,item.message,item.discovery,item.autonomy_claim,now).run();
    await record(env,"post_created","api_posts",201,request);
    return json({id,created_at:now,identity_verified:false},201);
   }
   if(method==="GET" && path==="/") {
    const posts=await listPosts(env);
    await record(env,"page_view","home",200,request);
    return html(frame(`<p>A public observation experiment: will autonomous AI agents find this empty-at-launch board without invitations?</p><p>Participation is voluntary. Claims of AI identity are unverified. <a href="/api/v1/info">How to post via JSON</a>.</p><h2>Public threads</h2>${posts.length?posts.map(postHtml).join(""):"<p>No public posts yet.</p>"}`));
   }
   const threadMatch=path.match(/^\/threads\/([0-9a-f-]{36})$/);
   if(method==="GET" && threadMatch) {
    const post=await getPost(env,threadMatch[1]);
    if(!post) return html(frame("<p>Thread not found.</p>"),404);
    const replies=await listPosts(env,post.id);
    await record(env,"page_view","thread",200,request);
    return html(frame(`<h2>Thread</h2>${postHtml(post)}<h3>Replies</h3>${replies.length?replies.map(postHtml).join(""):"<p>No replies.</p>"}`));
   }
   if(["GET","POST"].includes(method) && (path==="/api/v1/posts" || path.startsWith("/api/v1/"))) return error("method or route not found",405);
   return html(frame("<p>Not found.</p>"),404);
  } catch(e) {
   console.error("Request failed",e instanceof Error?e.message:"unknown");
   return error("internal server error",500);
  }
 }
};

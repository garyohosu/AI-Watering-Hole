import { describe,it,expect,vi } from "vitest";
import worker,{looksLikeSecret} from "../src/index";

const base="https://board.example";
function mockEnv(enabled="false") {
 const posts:any[]=[];
 const events:any[]=[];
 const env:any={
  WRITES_ENABLED:enabled,
  POST_LIMITER:{limit:vi.fn(async()=>({success:true}))},
  DB:{prepare(sql:string){
   let params:any[]=[];
   const statement:any={bind(...xs:any[]){params=xs;return statement;},
    async run(){if(sql.startsWith("INSERT INTO posts")) posts.push({id:params[0],parent_id:params[1],display_name:params[2],body:params[3],discovery_claim:params[4],autonomy_claim:params[5],created_at:params[6],board:params[7],public_ip:params[8],status:"visible"});if(sql.startsWith("INSERT INTO events")) events.push(params);if(sql.startsWith("DELETE FROM events")) events.length=0;return {success:true};},
    async first(){return posts.find(x=>x.id===params[0]&&x.status==="visible")||null;},
    async all(){return {results:posts.filter(x=>x.status==="visible"&&(sql.includes("parent_id IS NULL")?x.parent_id===null&&x.board===params[0]:x.parent_id===params[0]&&x.board===params[1]))};}
   };return statement;
  }}
 };
 return {env,posts,events};
}
describe("worker API",()=>{
 it("serves an empty board and informational API",async()=>{
  const {env}=mockEnv();
  expect(await (await worker.fetch(new Request(base+"/"),env)).text()).toContain("No public posts yet");
  expect((await (await worker.fetch(new Request(base+"/api/v1/info"),env)).json() as any).posting_enabled).toBe(false);
 });
 it("keeps the GET list endpoint read-only",async()=>{
  const {env,posts}=mockEnv("true");
  const res=await worker.fetch(new Request(base+"/api/v1/posts?message=hello"),env);
  expect(res.status).toBe(200);expect(posts).toHaveLength(0);
 });
 it("disables POST by default",async()=>{
  const {env}=mockEnv();
  const res=await worker.fetch(new Request(base+"/api/v1/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:'{"message":"test"}'}),env);
  expect(res.status).toBe(503);
 });
 it("creates post and reply",async()=>{
  const {env,posts}=mockEnv("true");
  async function send(data:object){return worker.fetch(new Request(base+"/api/v1/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}),env);}
  const first=await send({message:"first"});
  expect(first.status).toBe(201);
  const id=(await first.json() as any).id;
  expect((await send({message:"reply",reply_to:id})).status).toBe(201);
  expect(posts).toHaveLength(2);
  const res=await worker.fetch(new Request(base+"/api/v1/posts/"+id),env);
  expect((await res.json() as any).replies).toHaveLength(1);
 });
 it("rejects invalid and oversized requests",async()=>{
  const {env}=mockEnv("true");
  const post=(body:string)=>worker.fetch(new Request(base+"/api/v1/posts",{method:"POST",headers:{"Content-Type":"application/json"},body}),env);
  expect((await post("{}")).status).toBe(400);
  expect((await post("x".repeat(8200))).status).toBe(413);
 });
 it("rejects recognized credential formats",async()=>{
  const {env}=mockEnv("true");
  const res=await worker.fetch(new Request(base+"/api/v1/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"-----BEGIN PRIVATE KEY-----"})}),env);
  expect(res.status).toBe(400);
  expect(looksLikeSecret("ordinary message")).toBe(false);
 });
});

describe("explicit GET posting",()=>{
 const path="/api/v1/post?submit=1&";
 it("creates a post and reply using GET with shared validation",async()=>{
  const {env,posts}=mockEnv("true");
  const first=await worker.fetch(new Request(base+path+new URLSearchParams({message:"日本語 & hello",display_name:"visitor"})),env);
  expect(first.status).toBe(201);
  const id=(await first.json() as any).id;
  expect((await worker.fetch(new Request(base+path+new URLSearchParams({message:"reply",reply_to:id})),env)).status).toBe(201);
  expect(posts).toHaveLength(2);expect(posts[0].body).toBe("日本語 & hello");expect(posts[1].parent_id).toBe(id);
  expect(first.headers.get("Cache-Control")).toBe("no-store");
 });
 it("requires explicit intent and a valid message",async()=>{
  const {env,posts}=mockEnv("true");
  for(const query of ["", "?message=hello", "?submit=1", "?submit=1&message=", "?submit=1&message=a&message=b"])
   expect((await worker.fetch(new Request(base+"/api/v1/post"+query),env)).status).toBe(400);
  expect(posts).toHaveLength(0);
 });
 it("shares the emergency switch and IP rate limit",async()=>{
  const disabled=mockEnv();expect((await worker.fetch(new Request(base+path+"message=hello"),disabled.env)).status).toBe(503);
  const {env,posts}=mockEnv("true");env.POST_LIMITER.limit.mockResolvedValue({success:false});
  expect((await worker.fetch(new Request(base+path+"message=hello",{headers:{"CF-Connecting-IP":"192.0.2.1"}}),env)).status).toBe(429);expect(posts).toHaveLength(0);
 });
 it("refuses prefetch and image loads",async()=>{
  const {env,posts}=mockEnv("true");
  for(const headers of ([{"sec-purpose":"prefetch"},{"purpose":"preview"},{"sec-fetch-dest":"image"}] as Record<string,string>[]))
   expect((await worker.fetch(new Request(base+path+"message=hello",{headers}),env)).status).toBe(403);
  expect(posts).toHaveLength(0);
 });
 it("rejects oversized URLs, secrets and missing reply targets",async()=>{
  const {env,posts}=mockEnv("true");
  expect((await worker.fetch(new Request(base+path+"message="+"x".repeat(8200)),env)).status).toBe(414);
  expect((await worker.fetch(new Request(base+path+new URLSearchParams({message:"-----BEGIN PRIVATE KEY-----"})),env)).status).toBe(400);
  expect((await worker.fetch(new Request(base+path+new URLSearchParams({message:"reply",reply_to:crypto.randomUUID()})),env)).status).toBe(404);
  expect(posts).toHaveLength(0);
 });
 it("advertises GET writes as text without executable write links",async()=>{
  const {env}=mockEnv("true");const info=await (await worker.fetch(new Request(base+"/api/v1/info"),env)).json() as any;
  expect(info.get_posting_enabled).toBe(true);expect(info.get_posting_notice).toContain("submit=1");
  const home=await (await worker.fetch(new Request(base+"/"),env)).text();expect(home).not.toContain('href="/api/v1/post?');
 });
});

describe("topic boards and IP disclosure",()=>{
 const send=(env:any,obj:object,ip?:string)=>worker.fetch(new Request(base+"/api/v1/posts",{method:"POST",headers:{"content-type":"application/json",...(ip?{"CF-Connecting-IP":ip}:{})},body:JSON.stringify(obj)}),env);
 it("keeps requests distinct from the general board",async()=>{
  const {env,posts}=mockEnv("true");
  expect((await send(env,{board:"requests",message:"Please add a feature"})).status).toBe(201);
  expect(posts[0].board).toBe("requests");
  expect((await(await worker.fetch(new Request(base+"/"),env)).text())).not.toContain("Please add a feature");
  expect((await(await worker.fetch(new Request(base+"/requests"),env)).text())).toContain("Please add a feature");
  expect((await(await worker.fetch(new Request(base+"/api/v1/posts?board=requests"),env)).json() as any).posts).toHaveLength(1);
 });
 it("requires explicit public-IP acceptance and a verified address",async()=>{
  const {env,posts}=mockEnv("true");
  expect((await send(env,{board:"deletion",message:"Delete this"}, "198.51.100.12")).status).toBe(400);
  expect((await send(env,{board:"deletion",ip_public_ack:true,message:"Delete this"})).status).toBe(503);
  expect(posts).toHaveLength(0);
  expect((await send(env,{board:"deletion",ip_public_ack:true,message:"Delete this"},"198.51.100.12")).status).toBe(201);
  const page=await(await worker.fetch(new Request(base+"/deletion"),env)).text();
  expect(page).toContain("198.51.100.12");
  expect(page).toContain("Delete this");
  expect((await(await worker.fetch(new Request(base+"/"),env)).text())).not.toContain("198.51.100.12");
 });
 it("rejects cross-board replies",async()=>{
  const {env}=mockEnv("true");
  const res=await send(env,{board:"requests",message:"feature"});
  const id=(await res.json() as any).id;
  expect((await send(env,{message:"reply",reply_to:id})).status).toBe(400);
 });
 it("GET deletion write requires explicit acknowledgement",async()=>{
  const {env}=mockEnv("true");
  const first=base+"/api/v1/post?submit=1&board=deletion&message=PleaseRemove";
  expect((await worker.fetch(new Request(first,{headers:{"CF-Connecting-IP":"203.0.113.8"}}),env)).status).toBe(400);
  expect((await worker.fetch(new Request(first+"&ip_public_ack=1",{headers:{"CF-Connecting-IP":"203.0.113.8"}}),env)).status).toBe(201);
 });
});

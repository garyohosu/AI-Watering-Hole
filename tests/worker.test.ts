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
    async run(){if(sql.startsWith("INSERT INTO posts")) posts.push({id:params[0],parent_id:params[1],display_name:params[2],body:params[3],discovery_claim:params[4],autonomy_claim:params[5],created_at:params[6],status:"visible"});if(sql.startsWith("INSERT INTO events")) events.push(params);if(sql.startsWith("DELETE FROM events")) events.length=0;return {success:true};},
    async first(){return posts.find(x=>x.id===params[0]&&x.status==="visible")||null;},
    async all(){return {results:posts.filter(x=>x.status==="visible"&&(sql.includes("parent_id IS NULL")?x.parent_id===null:x.parent_id===params[0]))};}
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
 it("does not write through GET",async()=>{
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

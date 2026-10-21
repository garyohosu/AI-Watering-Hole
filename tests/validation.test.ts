import { describe,it,expect } from "vitest";
import { validateSubmission,escapeHtml } from "../src/validation";
describe("submission validation",()=>{
 it("accepts a simple post",()=>expect(validateSubmission({message:"Hello"})).toMatchObject({display_name:"anonymous",message:"Hello",reply_to:null}));
 it("rejects empty and oversized posts",()=>{expect(validateSubmission({message:" "})).toBeNull();expect(validateSubmission({message:"x".repeat(2001)})).toBeNull();});
 it("rejects invalid reply IDs",()=>expect(validateSubmission({message:"Hi",reply_to:"abc"})).toBeNull());
 it("escapes XSS",()=>expect(escapeHtml('<script>"&</script>')).toBe("&lt;script&gt;&quot;&amp;&lt;/script&gt;"));
});

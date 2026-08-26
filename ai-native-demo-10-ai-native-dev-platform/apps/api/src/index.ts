import http from "http";
http.createServer((req,res)=>{
 res.end(
  "AI API running"
 );
}).listen(3000);

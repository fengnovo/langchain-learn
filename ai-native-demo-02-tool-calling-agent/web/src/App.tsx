import {useState} from "react";
export default function App(){
 const [question,setQuestion]=useState("");
 const [answer,setAnswer]=useState("");
 async function send(){
  const res =
   await fetch(
    "http://localhost:3001/agent",
    {
     method:"POST",
     headers:{
      "Content-Type":"application/json"
     },
     body:JSON.stringify({
      message:question
     })
    }
   );
  const data =
   await res.json();
  setAnswer(data.answer);
 }
 return <div>
 <h1>
 Tool Calling Agent
 </h1>
 <input
 value={question}
 onChange={
  e=>setQuestion(e.target.value)
 }
 />
 <button onClick={send}>
 发送
 </button>
 <p>
 {answer}
 </p>
 </div>
}

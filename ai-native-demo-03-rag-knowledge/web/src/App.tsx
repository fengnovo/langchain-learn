import {useState} from "react";
export default function App(){
 const [question,setQuestion]=useState("");
 const [answer,setAnswer]=useState("");
 async function send(){
  const res =
   await fetch(
    "http://localhost:3000/rag",
    {
     method:"POST",
     headers:{
      "Content-Type":"application/json"
     },
     body:JSON.stringify({
      question:question
     })
    }
   );
  const data =
   await res.json();
  setAnswer(data.answer);
 }
 return <div>
 <h3>Rag</h3>
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

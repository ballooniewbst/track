
import React, { useMemo, useState, useEffect } from 'react';

export default function App(){
 const PIN='1432';
 const [auth,setAuth]=useState(false); const [pin,setPin]=useState('');
 const anniversary=new Date('2023-01-01');
 const [now,setNow]=useState(new Date());
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t);},[]);
 const days=Math.floor((now-anniversary)/(1000*60*60*24));
 const moods=['Missing you','Busy','Free to talk','Planning date night'];
 const [aMood,setAMood]=useState(moods[0]); const [bMood,setBMood]=useState(moods[2]);
 const [author,setAuthor]=useState('Partner A'); const [text,setText]=useState('');
 const [posts,setPosts]=useState([]);
 const envelopes={
 'Open when you miss me':'No matter the distance, you are my favorite place.',
 'Open when you're stressed':'Take a breath. You do not need to carry everything alone.',
 'Open when you need a laugh':'If love burned calories, we'd both be athletes by now.',
 'Open when you can't sleep':'Close your eyes and imagine our next adventure together.'};
 const [open,setOpen]=useState(null);
 const options=['Movie Night','Picnic','Cook Together','Stargazing','Cafe Hop','Game Night'];
 const [spinning,setSpinning]=useState(false); const [winner,setWinner]=useState('');
 const spin=()=>{setSpinning(true); setWinner(''); setTimeout(()=>{setWinner(options[Math.floor(Math.random()*options.length)]); setSpinning(false);},1500);};
 const addPost=()=>{if(!text.trim())return; setPosts([{author,text,time:new Date().toLocaleString()},...posts]); setText('');};
 if(!auth) return <div className='min-h-screen flex items-center justify-center bg-rose-50'><div className='bg-white p-8 rounded-3xl shadow'><h1 className='text-2xl mb-4'>Private Gateway</h1><input maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} className='border p-2'/><button className='ml-2 bg-rose-700 text-white px-4 py-2 rounded' onClick={()=>pin===PIN&&setAuth(true)}>Enter</button></div></div>;
 return <div className='min-h-screen bg-orange-50 text-rose-900 p-6'>
 <h1 className='text-4xl font-bold text-center'>Our Digital Sanctuary</h1>
 <p className='text-center'>Together for {days} days</p>
 <div className='grid md:grid-cols-2 gap-4 my-6'>
 {[['Partner A',aMood,setAMood],['Partner B',bMood,setBMood]].map(([n,m,s])=><div key={n} className='bg-white p-4 rounded-2xl'><h3>{n}</h3><select value={m} onChange={e=>s(e.target.value)}>{moods.map(x=><option key={x}>{x}</option>)}</select><p>{m}</p></div>)}
 </div>
 <div className='bg-white p-4 rounded-2xl mb-6'><h2>Message Wall</h2><select value={author} onChange={e=>setAuthor(e.target.value)}><option>Partner A</option><option>Partner B</option></select><textarea className='w-full border mt-2 p-2' value={text} onChange={e=>setText(e.target.value)} /><button onClick={addPost} className='bg-rose-700 text-white px-4 py-2 rounded'>Post to Feed</button><div className='max-h-60 overflow-y-auto mt-4'>{posts.map((p,i)=><div key={i} className='border-b py-2'><b>{p.author}</b> <span>{p.time}</span><div>{p.text}</div></div>)}</div></div>
 <div className='grid md:grid-cols-4 gap-3 mb-6'>{Object.keys(envelopes).map(k=><button key={k} onClick={()=>setOpen(k)} className='bg-rose-100 p-4 rounded-2xl'>{k}</button>)}</div>
 {open&&<div className='fixed inset-0 bg-black/40 flex items-center justify-center'><div className='bg-white p-6 rounded-2xl'><h3>{open}</h3><p>{envelopes[open]}</p><button onClick={()=>setOpen(null)}>Close</button></div></div>}
 <div className='bg-white p-4 rounded-2xl text-center'><h2>Date Night Spinner</h2><div className={spinning?'animate-pulse text-3xl':'text-3xl'}>❤</div><button onClick={spin} className='bg-rose-700 text-white px-4 py-2 rounded'>Spin the Wheel</button>{winner&&<div className='mt-3 p-3 bg-green-100 rounded'>Tonight: {winner}</div>}</div>
 </div>
}

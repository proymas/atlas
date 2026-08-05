const UPSTREAM="https://atlas-validator.vercel.app/api/analyze";
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{const body={...req.body}; if(body.language==="en")body.language="English"; const r=await fetch(UPSTREAM,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const text=await r.text(); let data; try{data=JSON.parse(text)}catch{return res.status(502).json({error:"Invalid response from analysis engine"})} return res.status(r.status).json(data)}catch(e){return res.status(502).json({error:"Atlas could not complete the analysis. Please try again."})}
}

export async function askSachaBakesAI(message, context={}){
  const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,context})})
  if(!r.ok) throw new Error((await r.json()).error||'AI request failed')
  return r.json()
}
export function money(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0))}
export function fmtDate(v){return v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}

import React,{Component,useEffect,useMemo,useRef,useState}from'react';
import{NavLink,Route,Routes,Outlet,useLocation,useNavigate}from'react-router-dom';
import{LayoutDashboard,ShoppingBag,Package,BookOpen,Heart,WalletCards,MessageCircle,Plus,Menu,X,AlertTriangle,Boxes,IndianRupee,TrendingUp,ChevronRight,Search,Download,Upload,Trash2,Archive,ArchiveRestore,Pencil,Truck}from'lucide-react';
import{supabase}from'./lib/supabase';import{askSachaBakesAI,money,fmtDate}from'./lib/api';


function Login(){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);setBusy(false)}
 return <div className="login-page"><div className="login-card"><div className="brand login-brand"><div className="brandmark">SB</div><div><b>SachaBakes</b><span>.co</span><small>Order Manager</small></div></div><p className="eyebrow">PRIVATE BUSINESS APP</p><h1>Welcome back</h1><p>Sign in to manage your SachaBakes orders, stock and finances.</p><form className="form" onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div className="error-box">{error}</div>}<button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></div></div>
}
function AuthGate({children}){const [session,setSession]=useState(undefined);useEffect(()=>{let mounted=true;supabase.auth.getSession().then(({data})=>{if(mounted)setSession(data.session)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>{mounted=false;subscription.unsubscribe()};},[]);if(session===undefined)return <div className="loading-page">Loading SachaBakes…</div>;return session?<>{children}</>:<Login/>}

const nav=[['/','Dashboard',LayoutDashboard],['/orders','Orders',ShoppingBag],['/delivery','Order Delivery',Truck],['/inventory','Inventory',Boxes],['/packaging','Packaging',Package],['/recipes','Recipe Book',BookOpen],['/loyalty','Loyalty',Heart],['/expenses','Expenses & Purchases',WalletCards],['/customers','Customers',Heart],['/menu','Menu',Upload]];
function Shell(){const[open,setOpen]=useState(false);const loc=useLocation();useEffect(()=>{setOpen(false)},[loc.pathname]);return <div className="app"><aside className={open?'sidebar open':'sidebar'}><div className="brand"><div className="brandmark">SB</div><div><b>SachaBakes</b><span>.co</span><small>Order Manager</small></div><button className="close" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([p,l,I])=><NavLink key={p} to={p} className={({isActive})=>isActive?'active':''}><I/><span>{l}</span></NavLink>)}</nav><div className="sidebar-foot"><NavLink to="/ai" className="mini-ai"><MessageCircle/><div><b>Ask Sacha AI</b><small>Inventory, orders, ideas</small></div></NavLink></div></aside><main className="main"><header><button className="hamb" onClick={()=>setOpen(true)}><Menu/></button><div className="crumb">{loc.pathname==='/'?'Good morning, Sashrika ✨':nav.find(n=>n[0]===loc.pathname)?.[1]||'SachaBakes'}</div><div className="header-actions"><NavLink to="/ai" className="ai-pill"><MessageCircle/> Ask AI</NavLink><button className="signout" onClick={()=>supabase.auth.signOut()}>Sign out</button></div></header><Outlet/></main></div>}
function Stat({icon:Icon,label,value,sub,alert}){return <div className={'stat '+(alert?'alert':'')}><div className="stat-top"><span>{label}</span><Icon/></div><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
function Dashboard(){
 const[data,setData]=useState({orders:[],financials:[],inventory:[],expenses:[]});const[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const[q1,q2,q3,q4]=await Promise.all([supabase.from('orders').select('*').order('created_at',{ascending:false}),supabase.from('order_financials').select('*').order('placed_at',{ascending:false}),supabase.from('inventory_items').select('*').eq('is_archived',false).order('name'),supabase.from('expenses').select('*').order('spent_at',{ascending:false})]);setData({orders:q1.data||[],financials:q2.data||[],inventory:q3.data||[],expenses:q4.data||[]});setLoading(false)})()},[]);
 const now=new Date(), monthOrders=data.financials.filter(o=>{const d=new Date(o.placed_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
 const revenue=monthOrders.reduce((s,o)=>s+Number(o.total||0),0);const projectedCost=monthOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.estimated_cost||0),0);
 const expenses=data.expenses.filter(e=>{const d=new Date(e.spent_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).reduce((s,e)=>s+Number(e.amount||0),0);
 const cashProfit=revenue-expenses;const grossProfit=revenue-projectedCost;const pending=data.orders.filter(o=>!['delivered','cancelled'].includes(o.status));const low=data.inventory.filter(i=>Number(i.quantity)<=Number(i.reorder_level||0));
 return <div className="page"><div className="page-head"><div><p className="eyebrow">YOUR BAKERY, AT A GLANCE</p><h1>Dashboard</h1><p>See sales, real costs, projected profit and stock in one place.</p></div><NavLink className="primary" to="/orders?new=1"><Plus/> New order</NavLink></div>
 <div className="stats"><Stat icon={IndianRupee} label="Monthly revenue" value={money(revenue)} sub="Orders placed this month"/><Stat icon={WalletCards} label="Monthly expenses" value={money(expenses)} sub="Purchases + operating costs"/><Stat icon={TrendingUp} label="Projected gross profit" value={money(grossProfit)} sub={`Revenue − recipe & packaging cost`}/><Stat icon={ShoppingBag} label="Pending orders" value={pending.length} sub={`${low.length} low-stock items`} alert={low.length>0}/></div>
 <div className="grid2"><section className="card"><div className="section-head"><div><h2>Profit snapshot</h2><p>Cash view vs product-cost view</p></div></div><div className="finance-box"><div><span>Revenue</span><b>{money(revenue)}</b></div><div><span>Recorded expenses</span><b>− {money(expenses)}</b></div><div className="highlight"><span>Cash profit</span><b>{money(cashProfit)}</b></div><div><span>Estimated COGS</span><b>− {money(projectedCost)}</b></div><div className="highlight"><span>Gross profit</span><b>{money(grossProfit)}</b></div></div></section>
 <section className="card"><div className="section-head"><div><h2>Stock watch</h2><p>Ingredients and packaging</p></div><NavLink to="/inventory">Manage <ChevronRight/></NavLink></div>{low.slice(0,6).map(i=><div className="stock-row" key={i.id}><div><b>{i.name}</b><small>{i.quantity} {i.unit} left · reorder at {i.reorder_level}</small></div><span className="badge danger">Low</span></div>)}{!low.length&&<Empty text="No low-stock items."/>}</section></div>
 <section className="card"><div className="section-head"><div><h2>Upcoming orders</h2><p>Next orders that need action</p></div><NavLink to="/orders">View all <ChevronRight/></NavLink></div>{loading?<Skeleton/>:pending.slice(0,5).map(o=><OrderRow key={o.id} o={o}/>)}{!pending.length&&<Empty text="No pending orders right now."/>}</section>
 <section className="card"><div className="section-head"><div><h2>Quick actions</h2><p>Common tasks while baking</p></div></div><div className="quick-grid"><NavLink to="/inventory"><Plus/><b>Add purchase</b><span>Restock ingredients or boxes</span></NavLink><NavLink to="/recipes"><BookOpen/><b>Open recipes</b><span>Find your baking instructions</span></NavLink><NavLink to="/loyalty"><Heart/><b>Loyalty cards</b><span>Check punches and birthdays</span></NavLink><NavLink to="/ai"><MessageCircle/><b>Ask Sacha AI</b><span>Get business or baking help</span></NavLink></div></section></div>}
function OrderRow({o}){return <NavLink to={'/orders/'+o.id} className="order-row"><div className="avatar">{(o.customer_name||'?')[0]}</div><div className="order-main"><b>{o.customer_name||'Customer'}</b><small>#{String(o.order_number||o.id).slice(-6)} · Dispatch {fmtDate(o.dispatch_at)}</small></div><div className="order-right"><strong>{money(o.total)}</strong><span className={'badge '+(o.status==='ready'?'success':o.status==='baking'?'info':'warning')}>{o.status}</span></div></NavLink>}
function Orders(){
 const[orders,setOrders]=useState([]);const[recipes,setRecipes]=useState([]);const[financials,setFinancials]=useState({});const[packaging,setPackaging]=useState([]);const[show,setShow]=useState(false);const[packagingOrder,setPackagingOrder]=useState(null);const[orderPackaging,setOrderPackaging]=useState([]);const[packagingBusy,setPackagingBusy]=useState(false);const[query,setQuery]=useState('');const[status,setStatus]=useState('all');
 const[form,setForm]=useState({customer_name:'',phone:'',address:'',placed_at:new Date().toISOString().slice(0,16),dispatch_at:'',total:'',notes:'',birthday:''});const[items,setItems]=useState([{product_id:'',quantity:1}]);
 async function load(){const[a,b,c,d]=await Promise.all([supabase.from('orders').select('*').order('created_at',{ascending:false}),supabase.from('recipes').select('id,name,yield_qty,yield_unit').order('name'),supabase.from('order_financials').select('*'),supabase.from('inventory_items').select('id,name,quantity,cost_per_unit,unit,image_url').eq('category','packaging').eq('is_archived',false).order('name')]);if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;if(d.error)throw d.error;setOrders(a.data||[]);setRecipes(b.data||[]);setFinancials(Object.fromEntries((c.data||[]).map(x=>[x.id,x])));setPackaging(d.data||[])}
 useEffect(()=>{load().catch(err=>console.error('SachaBakes data load error:',err))},[]);
 function addItem(){setItems(prev=>[...prev,{product_id:'',quantity:1}])}function updateItem(i,k,v){setItems(prev=>prev.map((x,n)=>n===i?{...x,[k]:k==='quantity'?Number(v):v}:x))}function removeItem(i){setItems(prev=>prev.filter((_,n)=>n!==i))}
 async function save(e){e.preventDefault();if(!items.length||items.some(x=>!x.product_id||x.quantity<1))return alert('Add at least one valid product.');const missingYield=items.map(x=>recipes.find(r=>r.id===x.product_id)).find(r=>r&&!r.yield_qty);if(missingYield)return alert(`Add a yield to the recipe \"${missingYield.name}\" before using it in an order. Yield is optional in Recipe Book, but required for automatic ingredient stock deduction.`);const{error}=await supabase.rpc('place_order',{p_customer_name:form.customer_name,p_phone:form.phone,p_address:form.address,p_placed_at:new Date(form.placed_at).toISOString(),p_dispatch_at:form.dispatch_at?new Date(form.dispatch_at).toISOString():null,p_total:Number(form.total),p_notes:form.notes,p_items:items,p_birthday:form.birthday||null});if(error){alert(error.message);return}setShow(false);setItems([{product_id:'',quantity:1}]);setForm({customer_name:'',phone:'',address:'',placed_at:new Date().toISOString().slice(0,16),dispatch_at:'',total:'',notes:'',birthday:''});await load();alert('Order created. Stock, estimated cost and loyalty punch were updated automatically.')}
 async function updateStatus(id,newStatus){if(newStatus==='delivered'){const order=orders.find(o=>o.id===id);if(!order)return;const{data:existing,error:existingError}=await supabase.from('order_packaging').select('packaging_item_id,quantity,unit_cost').eq('order_id',id);if(existingError){alert(existingError.message);return}if(existing&&existing.length){setOrderPackaging(existing.map(x=>({packaging_item_id:x.packaging_item_id,quantity:Number(x.quantity||1)})))}else{const{data:orderItems,error:itemsError}=await supabase.from('order_items').select('product_id,quantity').eq('order_id',id);if(itemsError){alert(itemsError.message);return}const recipeIds=(orderItems||[]).map(x=>x.product_id).filter(Boolean);let defaults=[];if(recipeIds.length){const{data:recipeRows,error:recipeError}=await supabase.from('recipes').select('id,default_packaging_item_id').in('id',recipeIds);if(recipeError){alert(recipeError.message);return}(recipeRows||[]).forEach(r=>{const oi=(orderItems||[]).find(x=>x.product_id===r.id);if(!r.default_packaging_item_id)return;const qty=Number(oi?.quantity||1);const found=defaults.find(x=>x.packaging_item_id===r.default_packaging_item_id);if(found)found.quantity+=qty;else defaults.push({packaging_item_id:r.default_packaging_item_id,quantity:qty})})}setOrderPackaging(defaults)}setPackagingOrder(order);return}const{error}=await supabase.from('orders').update({status:newStatus}).eq('id',id);if(error)alert(error.message);else{setOrders(prev=>prev.map(o=>o.id===id?{...o,status:newStatus}:o));load().catch(()=>{})}}
 function togglePackaging(id){setOrderPackaging(prev=>prev.some(x=>x.packaging_item_id===id)?prev.filter(x=>x.packaging_item_id!==id):[...prev,{packaging_item_id:id,quantity:1}])}
 async function saveOrderPackaging(e){e.preventDefault();if(!packagingOrder)return;setPackagingBusy(true);try{const payload=orderPackaging.map(x=>({packaging_item_id:x.packaging_item_id,quantity:Number(x.quantity||1)}));const{error}=await supabase.rpc('set_order_packaging',{p_order_id:packagingOrder.id,p_items:payload});if(error)throw error;const{error:statusError}=await supabase.from('orders').update({status:'delivered',updated_at:new Date().toISOString()}).eq('id',packagingOrder.id);if(statusError)throw statusError;setOrders(prev=>prev.map(o=>o.id===packagingOrder.id?{...o,status:'delivered'}:o));setPackagingOrder(null);setOrderPackaging([]);await load();}catch(err){alert(err.message)}finally{setPackagingBusy(false)}}
 const filtered=orders.filter(o=>(status==='all'?(o.status!=='delivered'&&o.status!=='cancelled'):o.status===status)&&`${o.customer_name||''} ${o.phone||''} ${o.order_number||''}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="page"><div className="page-head"><div><p className="eyebrow">SALES + COSTING</p><h1>Orders</h1><p>Active orders stay here. Delivered orders move to Order Delivery.</p></div><button className="primary" onClick={()=>setShow(true)}><Plus/> New order</button></div>
 <div className="toolbar"><div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer or order..."/></div><div className="filters">{['all','pending','confirmed','baking','ready','dispatched','delivered'].map(x=><button key={x} onClick={()=>setStatus(x)} className={'filter '+(status===x?'active':'')}>{x}</button>)}</div></div>
 <section className="card table-card"><table><thead><tr><th>Customer</th><th>Placed</th><th>Dispatch</th><th>Sale</th><th>Est. cost</th><th>Est. profit</th><th>Status</th></tr></thead><tbody>{filtered.map(o=>{const fin=financials[o.id]||{};return <tr key={o.id}><td><b>{o.customer_name}</b><small>{o.phone}</small></td><td>{fmtDate(o.placed_at)}</td><td>{fmtDate(o.dispatch_at)}</td><td><b>{money(o.total)}</b></td><td>{money(fin.estimated_cost)}</td><td><b>{money(fin.estimated_gross_profit)}</b></td><td><button className="whatsapp-btn" onClick={()=>window.open(`https://wa.me/91${String(o.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${o.customer_name}, your SachaBakes order #${o.order_number} for ${money(o.total)} is recorded. 🤎`)}`,'_blank')}><MessageCircle/></button> <select className="status-select" value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}><option>pending</option><option>confirmed</option><option>baking</option><option>ready</option><option>dispatched</option><option>delivered</option><option>cancelled</option></select></td></tr>})}</tbody></table>{!filtered.length&&<Empty text={status==='delivered'?'No delivered orders yet.':'No active orders right now.'}/>}</section>
 {show&&<Modal title="Create new order" onClose={()=>setShow(false)}><form onSubmit={save} className="form"><div className="form-grid"><label>Customer name<input required value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/></label><label>Phone<input required pattern="[0-9]{10}" title="Enter a 10-digit phone number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Order placed<input type="datetime-local" value={form.placed_at} onChange={e=>setForm({...form,placed_at:e.target.value})}/></label><label>Dispatch time<input type="datetime-local" value={form.dispatch_at} onChange={e=>setForm({...form,dispatch_at:e.target.value})}/></label><label>Birthday <small>(optional)</small><input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})}/></label><label className="wide">Address<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label></div><div className="line-items"><div className="line-items-head"><b>Products</b><button type="button" className="text-btn" onClick={addItem}><Plus/> Add product</button></div>{items.map((it,i)=><div className="line-item" key={i}><select required value={it.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)}><option value="">Select recipe/product</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input type="number" min="1" required value={it.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)}/>{items.length>1&&<button type="button" className="icon-btn" onClick={()=>removeItem(i)}><Trash2/></button>}</div>)}</div><div className="form-grid"><label>Total charged (₹)<input type="number" min="0" step="0.01" required value={form.total} onChange={e=>setForm({...form,total:e.target.value})}/></label><label className="wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><button className="primary full">Create order & deduct stock</button></form></Modal>}
 {packagingOrder&&<Modal title={`Packaging for ${packagingOrder.customer_name}`} onClose={()=>!packagingBusy&&setPackagingOrder(null)}><form onSubmit={saveOrderPackaging} className="form"><p className="field-help">Select the box(es) actually used for this order. The selected packaging cost will be included in this order's profit.</p><div className="packaging-choice-grid">{packaging.map(p=>{const checked=orderPackaging.some(x=>x.packaging_item_id===p.id);return <label className={'packaging-choice '+(checked?'selected':'')} key={p.id}><input type="checkbox" checked={checked} onChange={()=>togglePackaging(p.id)}/>{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="packaging-placeholder"><Package/></div>}<div><b>{p.name}</b><span>{money(p.cost_per_unit)} / {p.unit}</span><small>{p.quantity} {p.unit} in stock</small>{checked&&<small className="selected-packaging-label">✓ Selected for this order</small>}</div></label>})}</div>{!packaging.length&&<Empty text="No active packaging boxes. Add packaging in Packaging module first."/>}<button className="primary full" disabled={packagingBusy}>{packagingBusy?'Saving packaging…':'Save packaging & mark delivered'}</button></form></Modal>}
 </div>
}
function Inventory(){
 const[items,setItems]=useState([]);
 const[purchases,setPurchases]=useState([]);
 const[archivedItems,setArchivedItems]=useState([]);
 const[show,setShow]=useState(false);
 const[showArchived,setShowArchived]=useState(false);
 const[saving,setSaving]=useState(false);
 const[purchaseBusy,setPurchaseBusy]=useState(false);
 const[actionBusy,setActionBusy]=useState('');
 const[purchaseMessage,setPurchaseMessage]=useState('');
 const[actionMessage,setActionMessage]=useState('');
 const[form,setForm]=useState({name:'',category:'ingredient',quantity:'',unit:'g',reorder_level:'',initial_cost:''});
 const[search,setSearch]=useState('');

 async function load(){
   const[activeResult,archivedResult,purchasesResult]=await Promise.all([
     supabase.from('inventory_items').select('*').eq('is_archived',false).order('name'),
     supabase.from('inventory_items').select('*').eq('is_archived',true).order('name'),
     supabase.from('purchases').select('*, inventory_items(name,is_archived)').order('purchased_at',{ascending:false})
   ]);
   if(activeResult.error)throw activeResult.error;
   if(archivedResult.error)throw archivedResult.error;
   if(purchasesResult.error)throw purchasesResult.error;
   setItems(activeResult.data||[]);
   setArchivedItems(archivedResult.data||[]);
   setPurchases((purchasesResult.data||[]).filter(p=>!p.inventory_items?.is_archived));
 }
 useEffect(()=>{load().catch(err=>setActionMessage(`Could not load inventory: ${err.message}`))},[]);

 async function save(e){
   e.preventDefault();setSaving(true);setActionMessage('');
   try{
     const quantity=Number(form.quantity);
     const initialCost=Number(form.initial_cost||0);
     const costPerUnit=quantity>0?initialCost/quantity:0;
     const{data,error}=await supabase.from('inventory_items').insert({
       name:form.name,category:form.category,quantity,reorder_level:Number(form.reorder_level||0),cost_per_unit:costPerUnit,unit:form.unit,is_archived:false
     }).select().single();
     if(error)throw error;
     setItems(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)));
     setForm({name:'',category:'ingredient',quantity:'',unit:'g',reorder_level:'',initial_cost:''});
     setShow(false);
     setActionMessage(`✓ ${data.name} was added to active inventory.`);
   }catch(err){setActionMessage(`Could not add item: ${err.message}`)}
   finally{setSaving(false)}
 }

 async function purchase(e){
   e.preventDefault();setPurchaseMessage('');
   const formEl=e.currentTarget;const f=new FormData(formEl);
   const item_id=String(f.get('item_id')||'');const qty=Number(f.get('qty'));const total=Number(f.get('total_cost'));
   const purchase_unit=String(f.get('purchase_unit')||'');const notes=String(f.get('notes')||'');
   if(!item_id||qty<=0||total<0){setPurchaseMessage('Please enter a valid quantity and total purchase cost.');return;}
   setPurchaseBusy(true);
   try{
     const{error}=await supabase.rpc('record_purchase',{p_inventory_item_id:item_id,p_quantity:qty,p_unit_cost:total,p_total_cost:total,p_notes:notes,p_purchase_unit:purchase_unit});
     if(error)throw error;
     const[updated,pHist]=await Promise.all([
       supabase.from('inventory_items').select('*').eq('id',item_id).single(),
       supabase.from('purchases').select('*, inventory_items(name,is_archived)').order('purchased_at',{ascending:false})
     ]);
     if(updated.error)throw updated.error;
     if(pHist.error)throw pHist.error;
     setItems(prev=>prev.map(item=>item.id===item_id?updated.data:item));
     setPurchases((pHist.data||[]).filter(p=>!p.inventory_items?.is_archived));
     formEl.reset();
     setPurchaseMessage(`✓ Purchase recorded. ${updated.data.name} is now ${updated.data.quantity} ${updated.data.unit}.`);
   }catch(err){setPurchaseMessage(`Could not record purchase: ${err.message}`)}
   finally{setPurchaseBusy(false)}
 }

 async function archiveItem(item){
   if(!window.confirm(`Archive "${item.name}"? It will leave active inventory but all purchase and recipe history will be preserved.`))return;
   setActionBusy(item.id);setActionMessage('');
   try{
     const{data,error}=await supabase.from('inventory_items').update({is_archived:true,updated_at:new Date().toISOString()}).eq('id',item.id).select().single();
     if(error)throw error;
     setItems(prev=>prev.filter(x=>x.id!==item.id));
     setPurchases(prev=>prev.filter(p=>p.inventory_item_id!==item.id));
     setArchivedItems(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)));
     setActionMessage(`✓ ${item.name} was archived. Its history is safe.`);
   }catch(err){setActionMessage(`Could not archive ${item.name}: ${err.message}`)}
   finally{setActionBusy('')}
 }

 async function restoreItem(item){
   setActionBusy(item.id);setActionMessage('');
   try{
     const{data,error}=await supabase.from('inventory_items').update({is_archived:false,updated_at:new Date().toISOString()}).eq('id',item.id).select().single();
     if(error)throw error;
     setArchivedItems(prev=>prev.filter(x=>x.id!==item.id));
     setItems(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)));
     await load();
     setActionMessage(`✓ ${item.name} is active again.`);
   }catch(err){setActionMessage(`Could not restore ${item.name}: ${err.message}`)}
   finally{setActionBusy('')}
 }

 async function permanentlyDelete(item){
   if(!window.confirm(`Permanently delete "${item.name}"? This option is only for items with no purchase or recipe history.`))return;
   setActionBusy(item.id);setActionMessage('');
   try{
     const[purchaseRefs,recipeRefs]=await Promise.all([
       supabase.from('purchases').select('id',{count:'exact',head:true}).eq('inventory_item_id',item.id),
       supabase.from('recipe_ingredients').select('id',{count:'exact',head:true}).eq('inventory_item_id',item.id)
     ]);
     if(purchaseRefs.error)throw purchaseRefs.error;
     if(recipeRefs.error)throw recipeRefs.error;
     if((purchaseRefs.count||0)>0||(recipeRefs.count||0)>0){
       await archiveItem(item);
       return;
     }
     const{error}=await supabase.from('inventory_items').delete().eq('id',item.id);
     if(error)throw error;
     setItems(prev=>prev.filter(x=>x.id!==item.id));
     setArchivedItems(prev=>prev.filter(x=>x.id!==item.id));
     setActionMessage(`✓ ${item.name} was permanently deleted.`);
   }catch(err){setActionMessage(`Could not delete ${item.name}: ${err.message}`)}
   finally{setActionBusy('')}
 }

 const filtered=items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
 const filteredArchived=archivedItems.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
 function StockCard({item,archived=false}){
   return <div className="stock-card">
     <div className="stock-icon">{item.category==='packaging'?<Package/>:<Boxes/>}</div>
     <div className="stock-info"><b>{item.name}</b><small>{item.category} · Stock value ₹{(Number(item.quantity||0)*Number(item.cost_per_unit||0)).toFixed(2)}</small></div>
     <div className="stock-qty"><strong>{item.quantity}</strong><small>{item.unit}</small></div>
     {archived?<span className="badge">Archived</span>:<span className={'badge '+(Number(item.quantity)<=Number(item.reorder_level||0)?'danger':'success')}>{Number(item.quantity)<=Number(item.reorder_level||0)?'Low':'In stock'}</span>}
     {archived?<button type="button" className="icon-btn" title="Restore item" onClick={()=>restoreItem(item)} disabled={!!actionBusy||purchaseBusy}>{actionBusy===item.id?<span>…</span>:<ArchiveRestore/>}</button>:<button type="button" className="icon-btn" title="Archive item" onClick={()=>archiveItem(item)} disabled={!!actionBusy||purchaseBusy}>{actionBusy===item.id?<span>…</span>:<Archive/>}</button>}
   </div>
 }
 return <div className="page">
   <div className="page-head"><div><p className="eyebrow">STOCK CONTROL</p><h1>Inventory</h1><p>Ingredients and packaging stay in sync with every purchase and order.</p></div><button className="primary" onClick={()=>setShow(true)} disabled={saving||purchaseBusy}><Plus/> Add stock item</button></div>
   {actionMessage&&<div className="success-box">{actionMessage}</div>}
   <div className="inventory-layout">
    <section className="card"><div className="section-head"><div><h2>Current stock</h2><p>{items.length} active items</p></div><div className="search compact"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stock..."/></div></div>
      <div className="stock-list">{filtered.map(i=><StockCard item={i} key={i.id}/>)}{!filtered.length&&<Empty text="No active inventory items found."/>}</div>
      <div className="section-head" style={{marginTop:24}}><div><h3>Archived items</h3><p>{archivedItems.length} archived</p></div><button type="button" className="secondary" onClick={()=>setShowArchived(v=>!v)}>{showArchived?'Hide archived':'View archived'}</button></div>
      {showArchived&&<div className="stock-list">{filteredArchived.map(i=><StockCard item={i} archived key={i.id}/>)}{!filteredArchived.length&&<Empty text="No archived items found."/>}</div>}
    </section>
    <section className="card"><div className="section-head"><div><h2>Record purchase</h2><p>Buying more stock automatically adds quantity and expense.</p></div></div>
      <form onSubmit={purchase} className="form"><label>Item<select name="item_id" required>{items.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></label><label>Quantity purchased<input name="qty" type="number" min="0.01" step="0.01" required/></label><label>Purchase unit<select name="purchase_unit" required><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option><option value="pcs">pcs</option><option value="pack">pack</option></select></label><label>Total purchase cost (₹)<input name="total_cost" type="number" min="0" step="0.01" required placeholder="e.g. 60"/><small className="field-help">Enter the total amount you actually paid. The app calculates the cost per base unit automatically.</small></label><label>Notes<textarea name="notes" placeholder="Supplier, pack size, etc."/></label>{purchaseMessage&&<div className={purchaseMessage.startsWith('✓')?'success-box':'error-box'}>{purchaseMessage}</div>}<button className="primary full" disabled={purchaseBusy||!items.length}>{purchaseBusy?'Updating stock…':'Record purchase'}</button></form>
      <div className="purchase-history"><h3>Recent purchases</h3><small className="field-help">Only purchases for active inventory are shown here. Archived items remain in your financial history.</small>{purchases.slice(0,6).map(p=><div className="purchase-row" key={p.id}><div><b>{p.inventory_items?.name||'Inventory item'}</b><span>{fmtDate(p.purchased_at)}</span></div><b>{money(p.total_cost)}</b></div>)}{!purchases.length&&<small>No purchases recorded yet.</small>}</div>
    </section>
   </div>
   {show&&<Modal title="Add inventory item" onClose={()=>!saving&&setShow(false)}><form onSubmit={save} className="form"><label>Item name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="ingredient">Ingredient</option><option value="packaging">Packaging</option><option value="other">Other</option></select></label><label>Starting quantity<input type="number" min="0" step="0.01" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label><label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}><option>g</option><option>kg</option><option>ml</option><option>l</option><option>pcs</option><option>pack</option></select></label><label>Reorder level<input type="number" min="0" step="0.01" value={form.reorder_level} onChange={e=>setForm({...form,reorder_level:e.target.value})}/></label><label>Cost (₹)<input type="number" min="0" step="0.01" value={form.initial_cost} onChange={e=>setForm({...form,initial_cost:e.target.value})}/><small className="field-help">Enter the total amount you paid for the starting stock. Example: 500 g for ₹30 → ₹30.</small></label><button className="primary full" disabled={saving}>{saving?'Saving…':'Add item'}</button></form></Modal>}
 </div>
}

function Packaging(){
 const[items,setItems]=useState([]);const[archived,setArchived]=useState([]);const[show,setShow]=useState(false);const[form,setForm]=useState({name:'',quantity:'',unit:'pcs',initial_cost:'',reorder_level:'0'});const[file,setFile]=useState(null);const[preview,setPreview]=useState('');const[saving,setSaving]=useState(false);const[query,setQuery]=useState('');
 async function load(){const[a,b]=await Promise.all([supabase.from('inventory_items').select('id,name,quantity,unit,cost_per_unit,reorder_level,image_url,is_archived').eq('category','packaging').eq('is_archived',false).order('name'),supabase.from('inventory_items').select('id,name,quantity,unit,cost_per_unit,reorder_level,image_url,is_archived').eq('category','packaging').eq('is_archived',true).order('name')]);if(a.error)throw a.error;if(b.error)throw b.error;setItems(a.data||[]);setArchived(b.data||[])}
 useEffect(()=>{load().catch(err=>console.error('Packaging load error:',err))},[]);
 function chooseImage(f){if(!f||!f.type.startsWith('image/'))return;setFile(f);const u=URL.createObjectURL(f);setPreview(prev=>{if(prev)URL.revokeObjectURL(prev);return u})}
 function clearImage(){setFile(null);setPreview(prev=>{if(prev)URL.revokeObjectURL(prev);return ''})}
 function handlePaste(e){const image=Array.from(e.clipboardData?.items||[]).find(x=>x.type.startsWith('image/'));if(image){e.preventDefault();chooseImage(image.getAsFile())}}
 async function uploadImage(f){const ext=(f.name?.split('.').pop()||'jpg').toLowerCase();const safe=['jpg','jpeg','png','webp','gif'].includes(ext)?ext:'jpg';const path=`packaging/${Date.now()}-${Math.random().toString(36).slice(2)}.${safe}`;const up=await supabase.storage.from('sachabakes-assets').upload(path,f,{upsert:true,contentType:f.type});if(up.error)throw up.error;return supabase.storage.from('sachabakes-assets').getPublicUrl(path).data.publicUrl}
 async function save(e){e.preventDefault();setSaving(true);try{const qty=Number(form.quantity);const total=Number(form.initial_cost||0);if(qty<=0)throw new Error('Enter a valid starting quantity.');let image_url='';if(file)image_url=await uploadImage(file);const{data,error}=await supabase.from('inventory_items').insert({name:form.name.trim(),category:'packaging',quantity:qty,unit:form.unit,reorder_level:Number(form.reorder_level||0),cost_per_unit:total/qty,image_url,is_archived:false}).select().single();if(error)throw error;setItems(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)));setShow(false);setForm({name:'',quantity:'',unit:'pcs',initial_cost:'',reorder_level:'0'});clearImage()}catch(err){alert(err.message)}finally{setSaving(false)}}
 async function toggleArchive(item,next){const{error}=await supabase.from('inventory_items').update({is_archived:next,updated_at:new Date().toISOString()}).eq('id',item.id);if(error){alert(error.message);return}if(next){setItems(prev=>prev.filter(x=>x.id!==item.id));setArchived(prev=>[...prev,{...item,is_archived:true}].sort((a,b)=>a.name.localeCompare(b.name)))}else{setArchived(prev=>prev.filter(x=>x.id!==item.id));setItems(prev=>[...prev,{...item,is_archived:false}].sort((a,b)=>a.name.localeCompare(b.name)))}}
 const filtered=items.filter(x=>x.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="page packaging-page"><div className="page-head"><div><p className="eyebrow">BOXES + PACKAGING</p><h1>Packaging</h1><p>Keep every box, pouch and packaging option in one place. Costs are used in recipe and order profitability.</p></div><button className="primary" onClick={()=>setShow(true)}><Plus/> Add packaging</button></div><section className="card"><div className="section-head"><div><h2>Packaging library</h2><p>{items.length} active packaging items</p></div><div className="search compact"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search packaging..."/></div></div><div className="packaging-choice-grid">{filtered.map(p=><div className="packaging-choice static" key={p.id}>{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="packaging-placeholder"><Package/></div>}<div><b>{p.name}</b><span>{money(p.cost_per_unit,2)} / {p.unit}</span><small>{p.quantity} {p.unit} available</small></div><button type="button" className="icon-btn" title="Archive" onClick={()=>toggleArchive(p,true)}><Archive/></button></div>)}{!filtered.length&&<Empty text="No active packaging items yet."/>}</div></section><section className="card"><div className="section-head"><div><h2>Archived packaging</h2><p>{archived.length} archived items</p></div></div><div className="packaging-choice-grid">{archived.map(p=><div className="packaging-choice static" key={p.id}>{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="packaging-placeholder"><Package/></div>}<div><b>{p.name}</b><span>Archived · {money(p.cost_per_unit,2)} / {p.unit}</span></div><button type="button" className="icon-btn" title="Restore" onClick={()=>toggleArchive(p,false)}><ArchiveRestore/></button></div>)}{!archived.length&&<Empty text="No archived packaging."/>}</div></section>{show&&<Modal title="Add packaging" onClose={()=>!saving&&setShow(false)}><form onSubmit={save} className="form"><label>Box name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Yellow cookie box"/></label><div className="form-grid"><label>Starting quantity<input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label><label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}><option>pcs</option><option>pack</option></select></label><label>Cost for starting stock (₹)<input type="number" min="0" step="0.01" required value={form.initial_cost} onChange={e=>setForm({...form,initial_cost:e.target.value})}/></label><label>Reorder level<input type="number" min="0" step="0.01" value={form.reorder_level} onChange={e=>setForm({...form,reorder_level:e.target.value})}/></label></div><div className="image-upload-box" tabIndex="0" onPaste={handlePaste} onClick={()=>document.getElementById('packaging-image-input')?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseImage(e.dataTransfer.files?.[0])}}>{preview?<img src={preview} alt="Packaging preview"/>:<><Upload/><b>Upload packaging image</b><span>Choose from gallery, drag & drop, or paste with Ctrl+V.</span></>}<input id="packaging-image-input" hidden type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></div>{preview&&<button type="button" className="text-btn" onClick={clearImage}>Remove image</button>}<button className="primary full" disabled={saving}>{saving?'Adding packaging…':'Add packaging'}</button></form></Modal>}</div>
}

function Recipes(){
 const[recipes,setRecipes]=useState([]);const[items,setItems]=useState([]);const[packaging,setPackaging]=useState([]);const[costs,setCosts]=useState({});const[show,setShow]=useState(false);const[editing,setEditing]=useState(null);const[showPackaging,setShowPackaging]=useState(false);const[imageFile,setImageFile]=useState(null);const[imagePreview,setImagePreview]=useState('');const[packImageFile,setPackImageFile]=useState(null);const[packImagePreview,setPackImagePreview]=useState('');const[imageBusy,setImageBusy]=useState(false);const[packSaving,setPackSaving]=useState(false);const imageInputRef=useRef(null);const packInputRef=useRef(null);
 const blankForm={name:'',yield_qty:'',yield_unit:'pcs',instructions:'',image_url:'',selling_price:'',selling_price_total:'',making_charge_per_piece:'',making_charge_per_yield:'',target_margin_pct:50,default_packaging_item_id:''};
 const[form,setForm]=useState(blankForm);const[ingredients,setIngredients]=useState([{inventory_item_id:'',quantity:'',unit:'g'}]);const[packForm,setPackForm]=useState({name:'',quantity:'',unit:'pcs',initial_cost:'',reorder_level:'0'});
 const selectedPackaging=packaging.find(p=>p.id===form.default_packaging_item_id);const liveIngredientCost=ingredients.reduce((sum,it)=>{const inv=items.find(x=>x.id===it.inventory_item_id);if(!inv)return sum;return sum+(Number(it.quantity)||0)*(Number(inv.cost_per_unit)||0)},0);const liveMakingCost=Number(form.making_charge_per_yield||0);const livePackagingCost=Number(selectedPackaging?.cost_per_unit||0);const liveTotalCost=liveIngredientCost+liveMakingCost+livePackagingCost;const liveProfit=Number(form.selling_price_total||0)-liveTotalCost;
 async function load(){const[a,b,c,d]=await Promise.all([supabase.from('recipes').select('*').order('name'),supabase.from('inventory_items').select('id,name,unit,cost_per_unit,image_url').eq('is_archived',false).eq('category','ingredient').order('name'),supabase.from('inventory_items').select('id,name,unit,quantity,cost_per_unit,image_url').eq('is_archived',false).eq('category','packaging').order('name'),supabase.from('recipe_costs').select('*')]);if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;if(d.error)throw d.error;setRecipes(a.data||[]);setItems(b.data||[]);setPackaging(d.data||[]);setCosts(Object.fromEntries((c.data||[]).map(x=>[x.recipe_id,x])))}
 useEffect(()=>{load().catch(err=>console.error('SachaBakes data load error:',err))},[]);
 function updateIng(i,k,v){setIngredients(prev=>prev.map((x,n)=>n===i?{...x,[k]:v}:x));}function addIng(){setIngredients(prev=>[...prev,{inventory_item_id:'',quantity:'',unit:'g'}]);}function selectIngredient(i,value){const inv=items.find(x=>x.id===value);setIngredients(prev=>prev.map((x,n)=>n===i?{...x,inventory_item_id:value,unit:inv?.unit||'g'}:x));}
 function chooseImage(file){if(!file||!file.type.startsWith('image/'))return;setImageFile(file);const url=URL.createObjectURL(file);setImagePreview(prev=>{if(prev)URL.revokeObjectURL(prev);return url})}function handlePaste(e){const image=Array.from(e.clipboardData?.items||[]).find(item=>item.type.startsWith('image/'));if(image){e.preventDefault();chooseImage(image.getAsFile())}}function clearImage(){setImageFile(null);setImagePreview(prev=>{if(prev)URL.revokeObjectURL(prev);return ''});if(imageInputRef.current)imageInputRef.current.value=''}
 function choosePackImage(file){if(!file||!file.type.startsWith('image/'))return;setPackImageFile(file);const url=URL.createObjectURL(file);setPackImagePreview(prev=>{if(prev)URL.revokeObjectURL(prev);return url})}function handlePackPaste(e){const image=Array.from(e.clipboardData?.items||[]).find(item=>item.type.startsWith('image/'));if(image){e.preventDefault();choosePackImage(image.getAsFile())}}function clearPackImage(){setPackImageFile(null);setPackImagePreview(prev=>{if(prev)URL.revokeObjectURL(prev);return ''});if(packInputRef.current)packInputRef.current.value=''}
 async function uploadImage(file,folder){const ext=(file.name?.split('.').pop()||'jpg').toLowerCase();const safeExt=['jpg','jpeg','png','webp','gif'].includes(ext)?ext:'jpg';const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;const up=await supabase.storage.from('sachabakes-assets').upload(path,file,{upsert:true,contentType:file.type});if(up.error)throw up.error;return supabase.storage.from('sachabakes-assets').getPublicUrl(path).data.publicUrl}
 async function save(e){e.preventDefault();setImageBusy(true);try{let image_url=form.image_url||'';if(imageFile)image_url=await uploadImage(imageFile,'recipes');const payload={name:form.name,yield_qty:Number(form.yield_qty),yield_unit:form.yield_unit,instructions:form.instructions,image_url,selling_price:Number(form.selling_price||0),selling_price_total:Number(form.selling_price_total||0),making_charge_per_piece:Number(form.making_charge_per_piece||0),making_charge_per_yield:Number(form.making_charge_per_yield||0),target_margin_pct:Number(form.target_margin_pct||0),default_packaging_item_id:form.default_packaging_item_id||null};let recipeId=editing?.id;if(editing){const{error}=await supabase.from('recipes').update(payload).eq('id',editing.id);if(error)throw error;const del=await supabase.from('recipe_ingredients').delete().eq('recipe_id',editing.id);if(del.error)throw del.error}else{const{data,error}=await supabase.from('recipes').insert(payload).select().single();if(error)throw error;recipeId=data.id}const valid=ingredients.filter(x=>x.inventory_item_id&&Number(x.quantity)>0).map(x=>({recipe_id:recipeId,inventory_item_id:x.inventory_item_id,quantity:Number(x.quantity),unit:x.unit}));if(valid.length){const r=await supabase.from('recipe_ingredients').insert(valid);if(r.error)throw r.error}setShow(false);setEditing(null);setIngredients([{inventory_item_id:'',quantity:'',unit:'g'}]);setForm(blankForm);clearImage();await load()}catch(err){alert(err.message)}finally{setImageBusy(false)}}
 async function openEdit(r){const[ingredientsResult,packagingResult]=await Promise.all([supabase.from('recipe_ingredients').select('inventory_item_id,quantity,unit').eq('recipe_id',r.id),supabase.from('inventory_items').select('id,name,unit,quantity,cost_per_unit,image_url').eq('category','packaging').eq('is_archived',false).order('name')]);const{data,error}=ingredientsResult;if(error){alert(error.message);return}if(packagingResult.error){alert(packagingResult.error.message);return}setPackaging(packagingResult.data||[]);setEditing(r);setForm({name:r.name,yield_qty:r.yield_qty,yield_unit:r.yield_unit,instructions:r.instructions||'',image_url:r.image_url||'',selling_price:r.selling_price||'',selling_price_total:r.selling_price_total||'',making_charge_per_piece:r.making_charge_per_piece||'',making_charge_per_yield:r.making_charge_per_yield||'',target_margin_pct:r.target_margin_pct??50,default_packaging_item_id:r.default_packaging_item_id||''});setIngredients((data||[]).length?data.map(x=>({inventory_item_id:x.inventory_item_id,quantity:x.quantity,unit:x.unit})):[{inventory_item_id:'',quantity:'',unit:'g'}]);setImageFile(null);setImagePreview(r.image_url||'');setShow(true)}
 async function openAdd(){setEditing(null);setForm(blankForm);setIngredients([{inventory_item_id:'',quantity:'',unit:'g'}]);clearImage();const{data,error}=await supabase.from('inventory_items').select('id,name,unit,quantity,cost_per_unit,image_url').eq('category','packaging').eq('is_archived',false).order('name');if(error){alert(error.message);return}setPackaging(data||[]);setShow(true)}
 async function savePackaging(e){e.preventDefault();setPackSaving(true);try{let image_url='';if(packImageFile)image_url=await uploadImage(packImageFile,'packaging');const qty=Number(packForm.quantity);const total=Number(packForm.initial_cost||0);const costPerUnit=qty>0?total/qty:0;const{error}=await supabase.from('inventory_items').insert({name:packForm.name,category:'packaging',quantity:qty,unit:packForm.unit,reorder_level:Number(packForm.reorder_level||0),cost_per_unit:costPerUnit,image_url,is_archived:false});if(error)throw error;setPackForm({name:'',quantity:'',unit:'pcs',initial_cost:'',reorder_level:'0'});clearPackImage();setShowPackaging(false);await load()}catch(err){alert(err.message)}finally{setPackSaving(false)}}
 async function deleteRecipe(r){if(!window.confirm(`Delete the recipe \"${r.name}\"? This cannot be undone.`))return;setImageBusy(true);try{const delIngredients=await supabase.from('recipe_ingredients').delete().eq('recipe_id',r.id);if(delIngredients.error)throw delIngredients.error;const{error}=await supabase.from('recipes').delete().eq('id',r.id);if(error)throw error;setRecipes(prev=>prev.filter(x=>x.id!==r.id));setCosts(prev=>{const next={...prev};delete next[r.id];return next})}catch(err){alert(`Could not delete ${r.name}. ${err.message}`)}finally{setImageBusy(false)}}
 return <div className="page"><div className="page-head"><div><p className="eyebrow">YOUR BAKING LIBRARY + PROFIT</p><h1>Recipe Book</h1><p>Recipes, packaging, true costs and profitability in one place.</p></div><div className="page-head-actions"><NavLink className="secondary" to="/packaging"><Package/> Packaging library</NavLink><button className="primary" onClick={openAdd}><Plus/> Add recipe</button></div></div>
 <div className="recipe-grid">{recipes.map(r=>{const c=costs[r.id]||{};const defaultPack=packaging.find(p=>p.id===r.default_packaging_item_id);return <div className="recipe-card" key={r.id}><div className="recipe-image">{r.image_url?<img src={r.image_url} alt={r.name}/>:<BookOpen/>}</div><div className="recipe-body"><div className="recipe-title-row"><div><h3>{r.name}</h3><small>Yield: {r.yield_qty} {r.yield_unit}</small></div><div className="recipe-actions"><button type="button" className="icon-btn" title="Edit recipe" onClick={()=>openEdit(r)}><Pencil/></button><button type="button" className="icon-btn danger-btn" title="Delete recipe" onClick={()=>deleteRecipe(r)}><Trash2/></button></div></div><div className="recipe-important"><div className="important-metric"><span>Selling price / total yield</span><strong>{money(r.selling_price_total)}</strong></div><div className="important-metric"><span>Total profit</span><strong>{money(c.profit_total)}</strong></div></div><div className="recipe-details"><h4>Cost & pricing details</h4>{defaultPack&&<div className="default-packaging-note"><Package/> Default packaging: <b>{defaultPack.name}</b> · {money(defaultPack.cost_per_unit)}</div>}<div className="cost-grid"><div><span>Ingredient cost / piece</span><b>{money(c.ingredient_cost_per_yield,2)}</b></div><div><span>Making charge / piece</span><b>{money(r.making_charge_per_piece,2)}</b></div><div><span>Packaging / yield</span><b>{money(c.packaging_cost_per_yield,2)}</b></div><div><span>Total cost / piece</span><b>{money(c.cost_per_yield,2)}</b></div><div><span>Profit / piece</span><b>{money(c.profit_per_yield,2)}</b></div><div><span>Selling price / total yield</span><b>{money(r.selling_price_total,2)}</b></div><div><span>Making charge / total yield</span><b>{money(r.making_charge_per_yield,2)}</b></div><div><span>Target price / piece</span><b>{money(c.price_for_target_margin,2)}</b></div></div></div><p>{r.instructions||'No instructions added yet.'}</p></div></div>})}{!recipes.length&&<Empty text="No recipes yet. Add your first bake recipe."/>}</div>
 {show&&<Modal title={editing?'Edit recipe':'Add recipe'} onClose={()=>!imageBusy&&setShow(false)}><form onSubmit={save} className="form"><label>Recipe name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="form-grid"><label>Yield<input type="number" min="0.01" step="0.01" required value={form.yield_qty} onChange={e=>setForm({...form,yield_qty:e.target.value})}/></label><label>Yield unit<select value={form.yield_unit} onChange={e=>setForm({...form,yield_unit:e.target.value})}><option>pcs</option><option>cake</option><option>batch</option><option>loaf</option></select></label><label>Selling price / piece (₹)<input type="number" min="0" step="0.01" required value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value})}/></label><label>Selling price / total yield (₹)<input type="number" min="0" step="0.01" required value={form.selling_price_total} onChange={e=>setForm({...form,selling_price_total:e.target.value})}/></label><label>Making charge / piece (₹)<input type="number" min="0" step="0.01" required value={form.making_charge_per_piece} onChange={e=>setForm({...form,making_charge_per_piece:e.target.value})}/></label><label>Making charge / total yield (₹)<input type="number" min="0" step="0.01" required value={form.making_charge_per_yield} onChange={e=>setForm({...form,making_charge_per_yield:e.target.value})}/></label><label>Target margin %<input type="number" min="0" max="99" step="1" value={form.target_margin_pct} onChange={e=>setForm({...form,target_margin_pct:e.target.value})}/></label></div><div className="image-upload-box" tabIndex="0" onPaste={handlePaste} onClick={()=>imageInputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseImage(e.dataTransfer.files?.[0])}}>{imagePreview?<img src={imagePreview} alt="Recipe preview"/>:<><Upload/><b>Upload recipe image</b><span>Choose from gallery, drag & drop, or paste with Ctrl+V.</span></>}<input ref={imageInputRef} hidden type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></div>{imagePreview&&<button type="button" className="text-btn" onClick={clearImage}>Remove image</button>}<div className="line-items"><div className="line-items-head"><b>Ingredients per recipe yield</b><button type="button" className="text-btn" onClick={addIng}><Plus/> Add ingredient</button></div>{ingredients.map((it,i)=><div className="line-item" key={i}><select required value={it.inventory_item_id} onChange={e=>selectIngredient(i,e.target.value)}><option value="">Select ingredient</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input type="number" min="0" step="0.01" required placeholder="Qty" value={it.quantity} onChange={e=>updateIng(i,'quantity',e.target.value)}/><span className="unit-label">{it.unit}</span></div>)}</div><div className="line-items"><div className="line-items-head"><div><b>📦 Packaging for this Recipe</b><p className="field-help">Select the box you normally use for this bake.</p></div><NavLink className="secondary" to="/packaging" onClick={()=>setShow(false)}><Package/> Manage Packaging</NavLink></div><div className="packaging-choice-grid compact-packaging">{packaging.map(p=>{const checked=form.default_packaging_item_id===p.id;return <label className={'packaging-choice '+(checked?'selected':'')} key={p.id}><input type="checkbox" checked={checked} onChange={()=>setForm(prev=>({...prev,default_packaging_item_id:checked?'':p.id}))}/>{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="packaging-placeholder"><Package/></div>}<div><b>{p.name}</b><span>{money(p.cost_per_unit,2)} / {p.unit}</span><small>{p.quantity} {p.unit} available</small>{checked&&<small className="selected-packaging-label">✓ Default packaging</small>}</div></label>})}{!packaging.length&&<small className="field-help">No packaging boxes yet. Add them in the Packaging module first.</small>}</div><div className="recipe-live-profit"><div><span>Ingredients</span><b>{money(liveIngredientCost,2)}</b></div><div><span>Making charge</span><b>{money(liveMakingCost,2)}</b></div><div><span>Packaging{selectedPackaging?` · ${selectedPackaging.name}`:''}</span><b>{money(livePackagingCost,2)}</b></div><div><span>Total cost</span><b>{money(liveTotalCost,2)}</b></div><div className="profit-highlight"><span>Total profit</span><strong>{money(liveProfit,2)}</strong></div></div></div><label>Instructions<textarea rows="7" value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></label><button className="primary full" disabled={imageBusy}>{imageBusy?(editing?'Saving changes…':'Saving recipe…'):(editing?'Save changes':'Save recipe')}</button></form></Modal>}
 {showPackaging&&<Modal title="Packaging library" onClose={()=>!packSaving&&setShowPackaging(false)}><form onSubmit={savePackaging} className="form"><label>Box name<input required value={packForm.name} onChange={e=>setPackForm({...packForm,name:e.target.value})} placeholder="Yellow cookie box"/></label><div className="form-grid"><label>Starting quantity<input type="number" min="0.01" step="0.01" required value={packForm.quantity} onChange={e=>setPackForm({...packForm,quantity:e.target.value})}/></label><label>Unit<select value={packForm.unit} onChange={e=>setPackForm({...packForm,unit:e.target.value})}><option>pcs</option><option>pack</option></select></label><label>Cost for starting stock (₹)<input type="number" min="0" step="0.01" required value={packForm.initial_cost} onChange={e=>setPackForm({...packForm,initial_cost:e.target.value})}/></label><label>Reorder level<input type="number" min="0" step="0.01" value={packForm.reorder_level} onChange={e=>setPackForm({...packForm,reorder_level:e.target.value})}/></label></div><div className="image-upload-box" tabIndex="0" onPaste={handlePackPaste} onClick={()=>packInputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choosePackImage(e.dataTransfer.files?.[0])}}>{packImagePreview?<img src={packImagePreview} alt="Packaging preview"/>:<><Upload/><b>Upload box image</b><span>Choose from gallery, drag & drop, or paste with Ctrl+V.</span></>}<input ref={packInputRef} hidden type="file" accept="image/*" onChange={e=>choosePackImage(e.target.files?.[0])}/></div><button className="primary full" disabled={packSaving}>{packSaving?'Saving box…':'Add box'}</button></form></Modal>}
 </div>
}
function Loyalty(){const[cards,setCards]=useState([]);const[show,setShow]=useState(false);const[form,setForm]=useState({customer_name:'',phone:'',birthday:'',email:''});const load=()=>supabase.from('loyalty_cards').select('*').order('created_at',{ascending:false}).then(({data})=>setCards(data||[]));useEffect(()=>{load().catch(err=>console.error('SachaBakes data load error:',err))},[]);async function save(e){e.preventDefault();const{error}=await supabase.from('loyalty_cards').insert(form);if(error)alert(error.message);else{setShow(false);load()}}async function downloadCard(card){
  const customerName=String(card.customer_name||'Customer').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const punches=Math.max(0,Math.min(5,Number(card.punches||0)));

  const html=`
    <div style="width:1000px;height:620px;box-sizing:border-box;padding:42px 52px;background:#fbf3e9;color:#5a372d;font-family:Georgia,'Times New Roman',serif;border:2px solid #754738;border-radius:28px;position:relative;overflow:hidden;">
      <div style="position:absolute;inset:11px;border:1px solid #d9b9a7;border-radius:21px;"></div>
      <div style="position:absolute;width:250px;height:250px;left:-130px;top:145px;border-radius:50%;background:#efd9cc;opacity:.5;"></div>
      <div style="position:absolute;width:230px;height:230px;right:-115px;bottom:-90px;border-radius:50%;background:#ead0c2;opacity:.55;"></div>
      <div style="position:absolute;left:38px;top:30px;font-size:38px;color:#a76b55;transform:rotate(-12deg);">⌁</div>
      <div style="position:absolute;right:43px;top:31px;font-size:28px;color:#8d5a48;">♡</div>

      <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:31px;font-style:italic;font-weight:600;">SachaBakes.co <span style="color:#a56852;">♡</span></div>
          <div style="margin-top:5px;font-size:10px;letter-spacing:5px;color:#795347;">HOMEMADE GOODNESS</div>
        </div>
        <div style="text-align:right;font-size:10px;letter-spacing:3px;line-height:1.8;color:#795347;">GOOD BAKES<br/>HAPPIER DAYS</div>
      </div>

      <div style="position:relative;z-index:2;text-align:center;margin-top:10px;">
        <div style="display:inline-block;padding:0 34px 8px;font-size:53px;font-style:italic;font-weight:500;border-bottom:1px solid #d8b8a5;">Loyalty Card</div>
        <div style="margin-top:7px;font-size:11px;letter-spacing:5px;color:#795347;">A LITTLE REWARD FOR EVERY SWEET VISIT</div>
      </div>

      <div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px;">
        <div style="font-size:11px;letter-spacing:4px;color:#795347;">FOR</div>
        <div style="min-width:390px;padding:8px 25px 10px;background:#f0ddd2;border-radius:15px;text-align:center;font-size:27px;font-style:italic;color:#593126;">${customerName} ♡</div>
      </div>

      <div style="position:relative;z-index:2;text-align:center;margin-top:7px;font-size:10px;letter-spacing:2.5px;color:#89695d;">THANK YOU FOR SUPPORTING OUR LITTLE BAKERY</div>

      <div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:15px;margin-top:19px;">
        ${[0,1,2,3,4].map(i=>`
          <div style="width:78px;height:78px;border-radius:50%;border:2px solid #805040;background:${i<punches?'#e7c5b6':'#fbf3e9'};display:flex;align-items:center;justify-content:center;box-sizing:border-box;font-size:27px;color:#5d382d;font-style:italic;">
            ${i<punches?'♥':i+1}
          </div>
        `).join('')}
        <div style="width:78px;height:78px;border-radius:50%;border:2px solid #a16a54;background:#efd0c3;display:flex;align-items:center;justify-content:center;box-sizing:border-box;font-size:28px;color:#593126;">✦</div>
      </div>

      <div style="position:relative;z-index:2;text-align:center;margin-top:6px;font-size:10px;letter-spacing:2.5px;color:#806157;">${punches}/5 PUNCHES COLLECTED</div>

      <div style="position:relative;z-index:2;width:520px;margin:9px auto 0;padding:8px 20px;background:#f0d8cd;border-radius:13px;text-align:center;">
        <div style="font-size:16px;font-style:italic;color:#5a3528;"><strong>5th stamp = ₹169 worth of treats FREE ♡</strong></div>
        <div style="margin-top:3px;font-size:10px;color:#86665a;">Every order of ₹250 or more earns one punch.</div>
      </div>

      <div style="position:absolute;z-index:2;left:55px;bottom:34px;color:#765449;">
        <div style="font-size:16px;font-style:italic;">made with love ♡</div>
        <div style="margin-top:3px;font-size:9px;letter-spacing:2px;">SACHABAKES.CO</div>
      </div>
      <div style="position:absolute;z-index:2;right:55px;bottom:33px;text-align:right;color:#765449;">
        <div style="font-size:15px;font-style:italic;">small bakes,</div>
        <div style="font-size:15px;font-style:italic;">brighter days ♡</div>
      </div>
    </div>`;

  const wrap=document.createElement('div');
  wrap.innerHTML=html;
  wrap.style.position='fixed';
  wrap.style.left='-10000px';
  wrap.style.top='0';
  wrap.style.width='1000px';
  wrap.style.height='620px';
  wrap.style.zIndex='-1';
  document.body.appendChild(wrap);

  try{
    const html2canvas=(await import('html2canvas')).default;
    const canvas=await html2canvas(wrap.firstElementChild,{scale:2,useCORS:true,backgroundColor:'#fbf3e9'});
    const{jsPDF}=await import('jspdf');
    const pdf=new jsPDF({orientation:'landscape',unit:'px',format:[1000,620]});
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,1000,620);
    pdf.save(`${String(card.customer_name||'customer').replace(/\s+/g,'-')}-SachaBakes-Loyalty-Card.pdf`);
  }finally{
    wrap.remove();
  }
}return <div className="page"><div className="page-head"><div><p className="eyebrow">REPEAT CUSTOMERS</p><h1>Loyalty Cards</h1><p>Orders ₹250+ automatically earn a punch. Five punches unlock ₹169 in treats.</p></div><button className="primary" onClick={()=>setShow(true)}><Plus/> Add customer</button></div><section className="card table-card"><table><thead><tr><th>Customer</th><th>Birthday</th><th>Punches</th><th>Reward</th><th></th></tr></thead><tbody>{cards.map(c=><tr key={c.id}><td><b>{c.customer_name}</b><small>{c.phone}</small></td><td>{c.birthday?fmtDate(c.birthday):'—'}</td><td><div className="punches">{[0,1,2,3,4].map(i=><span key={i} className={i<c.punches?'punched':''}>{i<c.punches?'✓':i===4?'★':i+1}</span>)}</div></td><td>{c.reward_redeemed?<span className="badge success">Redeemed</span>:c.punches>=5?<span className="badge success">₹169 unlocked</span>:<span className="badge info">{5-c.punches} left</span>}</td><td><button className="icon-btn" onClick={()=>downloadCard(c)} title="Download"><Download/></button></td></tr>)}</tbody></table>{!cards.length&&<Empty text="No loyalty cards yet."/>}</section>{show&&<Modal title="Create loyalty card" onClose={()=>setShow(false)}><form onSubmit={save} className="form"><label>Customer name<input required value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/></label><label>Phone<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Birthday<input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><button className="primary full">Create card</button></form></Modal>}</div>}
function Delivery(){const[orders,setOrders]=useState([]);const[q,setQ]=useState('');const[loading,setLoading]=useState(true);async function load(){setLoading(true);const{data,error}=await supabase.from('orders').select('*').eq('status','delivered').order('dispatch_at',{ascending:false});if(error)throw error;setOrders(data||[]);setLoading(false)}useEffect(()=>{load().catch(err=>{console.error('SachaBakes delivery load error:',err);setLoading(false)})},[]);const filtered=orders.filter(o=>`${o.customer_name||''} ${o.phone||''} ${o.order_number||''} ${o.address||''}`.toLowerCase().includes(q.toLowerCase()));function wa(c){const text=`Hi ${c.customer_name}! Your SachaBakes order #${c.order_number} has been delivered. Thank you for ordering from us 🤎`;window.open(`https://wa.me/91${String(c.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`,'_blank')}return <div className="page"><div className="page-head"><div><p className="eyebrow">DELIVERY HISTORY</p><h1>Order Delivery</h1><p>All orders marked delivered are stored here as your delivery history.</p></div></div><section className="card table-card"><div className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customer, phone or order..."/></div><table><thead><tr><th>Order</th><th>Customer</th><th>Address</th><th>Dispatch</th><th>Delivered</th><th>Total</th><th></th></tr></thead><tbody>{loading?<tr><td colSpan="7">Loading delivery history…</td></tr>:filtered.map(o=><tr key={o.id}><td><b>#{o.order_number}</b></td><td><b>{o.customer_name}</b><small>{o.phone}</small></td><td>{o.address||'—'}</td><td>{fmtDate(o.dispatch_at)}</td><td>{fmtDate(o.updated_at||o.created_at)}</td><td><b>{money(o.total)}</b></td><td><button className="whatsapp-btn" onClick={()=>wa(o)}><MessageCircle/> WhatsApp</button></td></tr>)}</tbody></table>{!loading&&!filtered.length&&<Empty text="No delivered orders yet."/>}</section></div>}
function Expenses(){const[rows,setRows]=useState([]);const[form,setForm]=useState({category:'marketing',description:'',amount:'',spent_at:new Date().toISOString().slice(0,10)});const load=()=>supabase.from('expenses').select('*').order('spent_at',{ascending:false}).then(({data})=>setRows(data||[]));useEffect(()=>{load().catch(err=>console.error('SachaBakes data load error:',err))},[]);async function save(e){e.preventDefault();const{error}=await supabase.from('expenses').insert({...form,amount:Number(form.amount)});if(error)alert(error.message);else{setForm({...form,description:'',amount:''});load()}}const total=rows.reduce((s,r)=>s+Number(r.amount),0);return <div className="page"><div className="page-head"><div><p className="eyebrow">CASH FLOW</p><h1>Expenses & Purchases</h1><p>Separate inventory purchases, marketing and other business costs.</p></div></div><div className="grid2"><section className="card"><h2>Add expense</h2><form onSubmit={save} className="form"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>marketing</option><option>delivery</option><option>equipment</option><option>other</option></select></label><label>Description<input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Amount (₹)<input type="number" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Date<input type="date" value={form.spent_at} onChange={e=>setForm({...form,spent_at:e.target.value})}/></label><button className="primary full">Add expense</button></form></section><section className="card"><div className="section-head"><div><h2>Expense total</h2><p>All recorded non-inventory expenses</p></div><strong className="big-number">{money(total)}</strong></div>{rows.slice(0,10).map(r=><div className="expense-row" key={r.id}><div><b>{r.description}</b><small>{r.category} · {fmtDate(r.spent_at)}</small></div><strong>{money(r.amount)}</strong></div>)}</section></div></div>}
function Customers(){
  const[rows,setRows]=useState([]);
  const[orderStats,setOrderStats]=useState({});
  const[loyaltyStats,setLoyaltyStats]=useState({});
  const[q,setQ]=useState('');
  const[loading,setLoading]=useState(true);
  const[show,setShow]=useState(false);
  const[editing,setEditing]=useState(null);
  const[history,setHistory]=useState(null);
  const[historyOrders,setHistoryOrders]=useState([]);
  const[saving,setSaving]=useState(false);

  const blankForm={customer_name:'',phone:'',email:'',birthday:'',address:''};
  const[form,setForm]=useState(blankForm);

  async function load(){
    setLoading(true);
    const[customersResult,ordersResult,loyaltyResult]=await Promise.all([
      supabase.from('customers').select('*').order('created_at',{ascending:false}),
      supabase.from('orders').select('phone,total,placed_at,status,order_number').order('placed_at',{ascending:false}),
      supabase.from('loyalty_cards').select('phone,punches,reward_redeemed')
    ]);
    if(customersResult.error)throw customersResult.error;
    if(ordersResult.error)throw ordersResult.error;
    if(loyaltyResult.error)throw loyaltyResult.error;

    const stats={};
    (ordersResult.data||[]).forEach(o=>{
      const phone=String(o.phone||'').replace(/\D/g,'');
      if(!phone)return;
      if(!stats[phone])stats[phone]={count:0,total:0,lastOrder:null};
      stats[phone].count+=1;
      stats[phone].total+=Number(o.total||0);
      if(!stats[phone].lastOrder)stats[phone].lastOrder=o.placed_at;
    });

    const loyalty={};
    (loyaltyResult.data||[]).forEach(c=>{
      const phone=String(c.phone||'').replace(/\D/g,'');
      if(phone)loyalty[phone]=c;
    });

    setRows(customersResult.data||[]);
    setOrderStats(stats);
    setLoyaltyStats(loyalty);
    setLoading(false);
  }

  useEffect(()=>{
    load().catch(err=>{
      console.error('SachaBakes customer load error:',err);
      setLoading(false);
    });
  },[]);

  function openAdd(){
    setEditing(null);
    setForm(blankForm);
    setShow(true);
  }

  function openEdit(c){
    setEditing(c);
    setForm({
      customer_name:c.customer_name||'',
      phone:c.phone||'',
      email:c.email||'',
      birthday:c.birthday||'',
      address:c.address||''
    });
    setShow(true);
  }

  async function saveCustomer(e){
    e.preventDefault();

    if(!form.customer_name.trim())return alert('Enter customer name.');
    if(!/^\d{10}$/.test(form.phone))return alert('Phone number must contain exactly 10 digits.');

    setSaving(true);
    try{
      const payload={
        customer_name:form.customer_name.trim(),
        phone:form.phone,
        email:form.email.trim()||null,
        birthday:form.birthday||null,
        address:form.address.trim()||null,
        updated_at:new Date().toISOString()
      };

      if(editing){
        const{error}=await supabase.from('customers').update(payload).eq('id',editing.id);
        if(error)throw error;
      }else{
        const{error}=await supabase.from('customers').insert(payload);
        if(error)throw error;
      }

      setShow(false);
      setEditing(null);
      setForm(blankForm);
      await load();
    }catch(err){
      alert(err.message||'Could not save customer.');
    }finally{
      setSaving(false);
    }
  }

  async function deleteCustomer(c){
    const stats=orderStats[String(c.phone||'').replace(/\D/g,'')]||{count:0};

    const message=stats.count
      ? `Delete ${c.customer_name}'s customer profile? They have ${stats.count} order${stats.count===1?'':'s'} in order history. The order history will remain, but this customer profile will be removed.`
      : `Delete ${c.customer_name}'s customer profile?`;

    if(!window.confirm(message))return;

    const{error}=await supabase.from('customers').delete().eq('id',c.id);

    if(error){
      alert(`Could not delete customer: ${error.message}`);
      return;
    }

    await load();
  }

  async function openHistory(c){
    setHistory(c);
    setHistoryOrders([]);

    const phone=String(c.phone||'').replace(/\D/g,'');

    const{data,error}=await supabase
      .from('orders')
      .select('id,order_number,total,placed_at,dispatch_at,status,notes')
      .order('placed_at',{ascending:false});

    if(error){
      alert(error.message);
      return;
    }

    setHistoryOrders(
      (data||[]).filter(o=>String(o.phone||'').replace(/\D/g,'')===phone)
    );
  }

  function wa(c){
    const text=`Hi ${c.customer_name}! Thank you for ordering from SachaBakes.co 🤎`;
    window.open(
      `https://wa.me/91${String(c.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  }

  const filtered=rows.filter(c=>
    `${c.customer_name||''} ${c.phone||''} ${c.email||''} ${c.address||''}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  const totalCustomers=rows.length;

  const repeatCustomers=rows.filter(c=>
    Number(orderStats[String(c.phone||'').replace(/\D/g,'')]?.count||0)>1
  ).length;

  const birthdays=rows.filter(c=>c.birthday).length;

  return <div className="page">

    <div className="page-head">
      <div>
        <p className="eyebrow">CUSTOMER CRM + WHATSAPP</p>
        <h1>Customers</h1>
        <p>Keep customer details, order history, spending and loyalty in one place.</p>
      </div>

      <button className="primary" onClick={openAdd}>
        <Plus/> Add customer
      </button>
    </div>

    <div className="customer-summary">

      <div className="customer-summary-card">
        <span className="customer-summary-icon">♡</span>
        <div>
          <small>Total customers</small>
          <strong>{totalCustomers}</strong>
        </div>
      </div>

      <div className="customer-summary-card">
        <span className="customer-summary-icon">↻</span>
        <div>
          <small>Repeat customers</small>
          <strong>{repeatCustomers}</strong>
        </div>
      </div>

      <div className="customer-summary-card">
        <span className="customer-summary-icon">🎂</span>
        <div>
          <small>Birthdays recorded</small>
          <strong>{birthdays}</strong>
        </div>
      </div>

    </div>

    <section className="card table-card">

      <div className="customer-toolbar">
        <div className="search">
          <Search/>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search name, phone, email or address..."
          />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Orders</th>
            <th>Total spent</th>
            <th>Last order</th>
            <th>Loyalty</th>
            <th>Birthday</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {loading&&(
            <tr>
              <td colSpan="8">Loading customers…</td>
            </tr>
          )}

          {!loading&&filtered.map(c=>{

            const phone=String(c.phone||'').replace(/\D/g,'');
            const stats=orderStats[phone]||{count:0,total:0,lastOrder:null};
            const loyalty=loyaltyStats[phone];
            const punches=Number(loyalty?.punches||0);

            return <tr key={c.id}>

              <td>
                <div className="customer-name-cell">
                  <div className="customer-avatar">
                    {(c.customer_name||'?')[0].toUpperCase()}
                  </div>

                  <div>
                    <b>{c.customer_name}</b>
                    {c.email&&<small>{c.email}</small>}
                  </div>
                </div>
              </td>

              <td>{c.phone||'—'}</td>

              <td>
                <button
                  type="button"
                  className="customer-order-link"
                  onClick={()=>openHistory(c)}
                >
                  {stats.count} {stats.count===1?'order':'orders'}
                </button>
              </td>

              <td>
                <b>{money(stats.total)}</b>
              </td>

              <td>
                {stats.lastOrder?fmtDate(stats.lastOrder):'—'}
              </td>

              <td>
                {loyalty
                  ? <span className={punches>=5?'badge success':'badge info'}>
                      {punches}/5
                    </span>
                  : <span className="badge">No card</span>
                }
              </td>

              <td>
                {c.birthday?fmtDate(c.birthday):'—'}
              </td>

              <td>
                <div className="customer-actions">

                  <button
                    className="icon-btn"
                    title="Edit customer"
                    onClick={()=>openEdit(c)}
                  >
                    <Pencil/>
                  </button>

                  <button
                    className="whatsapp-btn customer-wa"
                    title="WhatsApp"
                    onClick={()=>wa(c)}
                  >
                    <MessageCircle/>
                  </button>

                  <button
                    className="icon-btn danger-btn"
                    title="Delete customer profile"
                    onClick={()=>deleteCustomer(c)}
                  >
                    <Trash2/>
                  </button>

                </div>
              </td>

            </tr>
          })}

        </tbody>
      </table>

      {!loading&&!filtered.length&&(
        <Empty text="No customers found."/>
      )}

    </section>

    {show&&<Modal
      title={editing?'Edit customer':'Add customer'}
      onClose={()=>!saving&&setShow(false)}
    >
      <form onSubmit={saveCustomer} className="form">

        <div className="form-grid">

          <label>
            Customer name
            <input
              required
              value={form.customer_name}
              onChange={e=>setForm({...form,customer_name:e.target.value})}
              placeholder="Customer name"
            />
          </label>

          <label>
            Phone
            <input
              required
              pattern="[0-9]{10}"
              title="Enter a 10-digit phone number"
              value={form.phone}
              onChange={e=>setForm({
                ...form,
                phone:e.target.value.replace(/\D/g,'').slice(0,10)
              })}
              placeholder="10-digit phone number"
            />
          </label>

          <label>
            Email <small>(optional)</small>
            <input
              type="email"
              value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="customer@email.com"
            />
          </label>

          <label>
            Birthday <small>(optional)</small>
            <input
              type="date"
              value={form.birthday}
              onChange={e=>setForm({...form,birthday:e.target.value})}
            />
          </label>

          <label className="wide">
            Address <small>(optional)</small>
            <textarea
              value={form.address}
              onChange={e=>setForm({...form,address:e.target.value})}
              placeholder="Customer delivery address"
            />
          </label>

        </div>

        <button className="primary full" disabled={saving}>
          {saving?(editing?'Saving…':'Adding…'):(editing?'Save changes':'Add customer')}
        </button>

      </form>
    </Modal>}

    {history&&<Modal
      title={`${history.customer_name}'s orders`}
      onClose={()=>setHistory(null)}
    >
      <div className="customer-history-head">
        <div>
          <b>{history.customer_name}</b>
          <small>{history.phone}</small>
        </div>
        <strong>
          {historyOrders.length} {historyOrders.length===1?'order':'orders'}
        </strong>
      </div>

      <div className="customer-history-list">

        {historyOrders.map(o=><div className="customer-history-row" key={o.id}>

          <div>
            <b>#{o.order_number||String(o.id).slice(-6)}</b>
            <small>
              {fmtDate(o.placed_at)} · {o.status}
            </small>
          </div>

          <strong>{money(o.total)}</strong>

        </div>)}

        {!historyOrders.length&&(
          <Empty text="No orders found for this customer."/>
        )}

      </div>
    </Modal>}

  </div>
}
function MenuPage(){const[menus,setMenus]=useState([]);const[title,setTitle]=useState('SachaBakes Menu');const[file,setFile]=useState(null);const load=()=>supabase.from('menu_assets').select('*').order('created_at',{ascending:false}).then(({data})=>setMenus(data||[]));useEffect(()=>{load().catch(err=>console.error('SachaBakes data load error:',err))},[]);async function upload(e){e.preventDefault();if(!file)return alert('Choose a menu image first.');const ext=file.name.split('.').pop();const path=`menus/${Date.now()}.${ext}`;const up=await supabase.storage.from('sachabakes-assets').upload(path,file,{upsert:true});if(up.error)return alert(up.error.message);const{data}=supabase.storage.from('sachabakes-assets').getPublicUrl(path);const ins=await supabase.from('menu_assets').insert({title,file_url:data.publicUrl}).select().single();if(ins.error)return alert(ins.error.message);setMenus([ins.data,...menus]);setFile(null);e.currentTarget.reset()}function waMenu(){if(!menus[0])return alert('Upload a menu first.');const text=`Hi! Here is the latest SachaBakes.co menu: ${menus[0].file_url}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank')}return <div className="page"><div className="page-head"><div><p className="eyebrow">CUSTOMER-FACING MENU</p><h1>Menu & Price Card</h1><p>Upload your latest menu once, then download it or share the link through WhatsApp.</p></div></div><section className="card"><form onSubmit={upload} className="form"><label>Menu title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Upload menu image<input type="file" accept="image/png,image/jpeg,image/webp" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="primary"><Upload/> Upload menu</button></form></section><div className="menu-grid">{menus.map(m=><div className="menu-card card" key={m.id}><img src={m.file_url} alt={m.title}/><div className="menu-actions"><a className="secondary" href={m.file_url} download><Download/> Download</a><button className="whatsapp-btn" onClick={waMenu}><MessageCircle/> Share on WhatsApp</button></div><small>Public link is available too, but for customers WhatsApp + image/link is usually simpler.</small></div>)}</div></div>}
function AI(){const[msg,setMsg]=useState('');const[messages,setMessages]=useState([{role:'assistant',text:'Hi! I’m your SachaBakes AI assistant. Ask me about inventory, order planning, recipes, pricing, captions, or your bakery numbers.'}]);const[busy,setBusy]=useState(false);async function send(e){e.preventDefault();if(!msg.trim())return;const q=msg;setMsg('');setMessages(m=>[...m,{role:'user',text:q}]);setBusy(true);try{const[inv,orders,fin]=await Promise.all([supabase.from('inventory_items').select('name,category,quantity,unit,reorder_level,cost_per_unit').eq('is_archived',false),supabase.from('orders').select('customer_name,total,status,dispatch_at').order('dispatch_at',{ascending:true}).limit(20),supabase.from('order_financials').select('total,estimated_cost,estimated_gross_profit,status').limit(50)]);const context={app:'SachaBakes Order Manager',inventory:inv.data||[],upcoming_orders:orders.data||[],order_financials:fin.data||[]};const{answer}=await askSachaBakesAI(q,context);setMessages(m=>[...m,{role:'assistant',text:answer}])}catch(err){setMessages(m=>[...m,{role:'assistant',text:err.message}] )}finally{setBusy(false)}}return <div className="page ai-page"><div className="page-head"><div><p className="eyebrow">BAKERY COPILOT</p><h1>Ask Sacha AI</h1><p>ChatGPT-powered help inside your order manager.</p></div></div><div className="ai-shell card"><div className="ai-messages">{messages.map((m,i)=><div key={i} className={'bubble '+m.role}>{m.text}</div>)}{busy&&<div className="bubble assistant">Thinking…</div>}</div><form className="ai-form" onSubmit={send}><input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="e.g. Which ingredients should I restock first?"/><button className="primary"><MessageCircle/> Send</button></form></div></div>}
function Modal({title,onClose,children}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</div></div>};function Empty({text}){return <div className="empty"><span>✦</span><p>{text}</p></div>};function Skeleton(){return <div className="skeleton">Loading your bakery data…</div>}
class AppErrorBoundary extends Component{constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error,info){console.error('SachaBakes page error:',error,info)}render(){if(this.state.error)return <div className="page"><section className="card"><h2>Something went wrong</h2><p>{this.state.error?.message||'This page could not be loaded.'}</p><button className="primary" onClick={()=>window.location.reload()}>Reload page</button></section></div>;return this.props.children}}
function App(){return <AuthGate><Routes><Route element={<Shell/>}><Route path="/" element={<AppErrorBoundary><Dashboard/></AppErrorBoundary>}/><Route path="/orders" element={<AppErrorBoundary><Orders/></AppErrorBoundary>}/><Route path="/orders/:id" element={<AppErrorBoundary><Orders/></AppErrorBoundary>}/><Route path="/delivery" element={<AppErrorBoundary><Delivery/></AppErrorBoundary>}/><Route path="/inventory" element={<AppErrorBoundary><Inventory/></AppErrorBoundary>}/><Route path="/packaging" element={<AppErrorBoundary><Packaging/></AppErrorBoundary>}/><Route path="/recipes" element={<AppErrorBoundary><Recipes/></AppErrorBoundary>}/><Route path="/loyalty" element={<AppErrorBoundary><Loyalty/></AppErrorBoundary>}/><Route path="/expenses" element={<AppErrorBoundary><Expenses/></AppErrorBoundary>}/><Route path="/customers" element={<AppErrorBoundary><Customers/></AppErrorBoundary>}/><Route path="/menu" element={<AppErrorBoundary><MenuPage/></AppErrorBoundary>}/><Route path="/ai" element={<AppErrorBoundary><AI/></AppErrorBoundary>}/></Route></Routes></AuthGate>};export default App;
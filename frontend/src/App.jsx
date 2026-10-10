import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { Store, ShieldCheck, Star, Users, LogOut, Search, Plus, RefreshCw, KeyRound, LayoutDashboard, StoreIcon, UserRound, ChevronUp, ChevronDown, X, CheckCircle2, AlertCircle, Menu, MapPin, Navigation, ArrowLeft } from 'lucide-react';

const roleLabels = { ADMIN: 'Administrator', USER: 'Normal User', OWNER: 'Store Owner' };

function App() {
  const [token, setToken] = useState(localStorage.getItem('sr_token') || '');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sr_user') || 'null'); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState('login');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [previousPage, setPreviousPage] = useState('dashboard');
  function openStore(id) {
    setPreviousPage(page);
    window.history.pushState({ storeDetail: true, storeId: id }, '', `#store/${id}`);
    setSelectedStoreId(id);
    setPage('store-detail');
  }
  useEffect(() => {
    const handlePopState = () => {
      if (page === 'store-detail') {
        setPage(previousPage);
        if (window.location.hash.startsWith('#store/')) window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [page, previousPage]);
  function closeStore() {
    if (window.location.hash.startsWith('#store/')) window.history.back();
    else setPage(previousPage);
  }

  function notify(message, type = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4200);
  }
  function onLogin(data) {
    localStorage.setItem('sr_token', data.token);
    localStorage.setItem('sr_user', JSON.stringify(data.user));
    setToken(data.token); setUser(data.user); setPage('dashboard');
  }
  function logout() {
    localStorage.removeItem('sr_token'); localStorage.removeItem('sr_user');
    setToken(''); setUser(null); setAuthMode('login'); setPage('dashboard');
  }

  useEffect(() => {
    if (!token) return;
    api('/auth/me', { token }).then(({ user: freshUser }) => {
      setUser(freshUser); localStorage.setItem('sr_user', JSON.stringify(freshUser));
    }).catch(() => logout());
  }, []);

  if (!token || !user) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={onLogin} notify={notify} notice={notice} busy={busy} setBusy={setBusy} />;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Store size={22}/></span><span>Store<span className="brand-accent">Rate</span><small>RATING PLATFORM</small></span></div>
      <div className="side-caption">WORKSPACE</div>
      <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}><LayoutDashboard size={18}/> {user.role === 'USER' ? 'Home' : 'Dashboard'}</button>
      {user.role === 'ADMIN' && <>
        <button className={`nav-item ${page === 'stores' ? 'active' : ''}`} onClick={() => setPage('stores')}><StoreIcon size={18}/> Stores</button>
        <button className={`nav-item ${page === 'users' ? 'active' : ''}`} onClick={() => setPage('users')}><Users size={18}/> Users</button>
      </>}
      {user.role === 'USER' && <button className={`nav-item ${page === 'stores' ? 'active' : ''}`} onClick={() => setPage('stores')}><StoreIcon size={18}/> Explore stores</button>}
      <div className="side-bottom">
        <div className="side-profile"><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="profile-text"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></div></div>
        <button className="nav-item" onClick={() => setPage('password')}><KeyRound size={18}/> Change password</button>
        <button className="nav-item logout" onClick={logout}><LogOut size={18}/> Sign out</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">STORE RATING PLATFORM</span><h1>{page === 'dashboard' ? (user.role === 'ADMIN' ? 'Dashboard' : user.role === 'OWNER' ? 'Business home' : 'Home') : page === 'stores' ? (user.role === 'USER' ? 'Discover stores' : 'Store management') : page === 'users' ? 'User management' : page === 'store-detail' ? 'Store details' : 'Account security'}</h1></div><div className="top-user"><span className="online-dot"></span><span>{user.name}</span><div className="avatar small">{user.name.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {page === 'dashboard' && user.role === 'ADMIN' && <AdminDashboard token={token} setPage={setPage} notify={notify}/>}
        {page === 'dashboard' && user.role === 'USER' && <UserDashboard token={token} notify={notify} onOpenStore={openStore}/>}
        {page === 'dashboard' && user.role === 'OWNER' && <OwnerDashboard token={token} notify={notify}/>}
        {page === 'stores' && user.role === 'ADMIN' && <AdminStores token={token} notify={notify}/>}
        {page === 'stores' && user.role === 'USER' && <UserStores token={token} notify={notify} onOpenStore={openStore}/> }
        {page === 'store-detail' && user.role === 'USER' && selectedStoreId && <StoreDetails key={selectedStoreId} storeId={selectedStoreId} token={token} notify={notify} onBack={closeStore}/>}
        {page === 'users' && user.role === 'ADMIN' && <AdminUsers token={token} notify={notify}/>}
        {page === 'password' && <PasswordPanel token={token} notify={notify}/>}
      </div>
      <footer className="footer">StoreRate <span>•</span> FullStack Intern Coding Challenge</footer>
    </main>
    {notice && <div className={`toast ${notice.type}`}><span>{notice.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}</span>{notice.message}<button onClick={() => setNotice(null)}><X size={16}/></button></div>}
  </div>;
}

function AuthScreen({ mode, setMode, onLogin, notify, notice, busy, setBusy }) {
  const [form, setForm] = useState({ name:'', email:'', address:'', password:'' });
  const isSignup = mode === 'signup';
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const data = await api(isSignup ? '/auth/register' : '/auth/login', { method:'POST', body:JSON.stringify(form) });
      onLogin(data); notify(isSignup ? 'Your account has been created.' : 'Welcome back!');
    } catch (err) { notify(err.message, 'error'); }
    finally { setBusy(false); }
  }
  return <div className="auth-layout">
    <section className="auth-hero">
      <div className="brand brand-light"><span className="brand-icon"><Store size={22}/></span><span>Store<span className="brand-accent">Rate</span><small>RATING PLATFORM</small></span></div>
      <div className="hero-copy"><span className="hero-pill"><span></span> TRUSTED STORE REVIEWS</span><h1>Every rating tells<br/>a <em>better story.</em></h1><p>A simple place to discover stores, share honest experiences, and help your community shop with confidence.</p>
        <div className="hero-stats"><div><strong>1–5</strong><span>Star ratings</span></div><div><strong>3</strong><span>User roles</span></div><div><strong>100%</strong><span>Community driven</span></div></div>
      </div>
      <div className="hero-foot">Built for the Store Rating FullStack Challenge</div>
    </section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-mark"><Store size={24}/></div><span className="eyebrow">{isSignup ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</span><h2>{isSignup ? 'Create your account' : 'Sign in to StoreRate'}</h2><p className="muted">{isSignup ? 'Start discovering and rating local stores.' : 'Enter your details to access your workspace.'}</p>
      <form onSubmit={submit} className="form-stack">
        {isSignup && <><label>Full name<input name="name" value={form.name} onChange={update} minLength="20" maxLength="60" placeholder="Enter your full name" required/><small>Use 20–60 characters as required by the challenge.</small></label><label>Address<textarea name="address" value={form.address} onChange={update} maxLength="400" placeholder="Your address" required rows="2"/></label></>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" required/></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={update} minLength="8" maxLength="16" placeholder="Enter your password" required/><small>8–16 characters, uppercase letter and special character.</small></label>
        <button className="primary-btn full" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'} <span>→</span></button>
      </form>
      <div className="auth-switch">{isSignup ? 'Already have an account?' : "Don't have an account?"} <button onClick={() => setMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create account'}</button></div>
      {!isSignup && <div className="admin-hint"><ShieldCheck size={16}/><span>Administrator? Sign in using your provisioned admin credentials.</span></div>}
    </div><div className="auth-copyright">© 2026 StoreRate. Made for better decisions.</div></section>
    {notice && <div className={`toast ${notice.type}`}>{notice.message}</div>}
  </div>;
}

function StatCard({ label, value, icon: Icon, tint, hint }) {
  return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value ?? '—'}</div><div className="stat-hint">{hint}</div></div>;
}
function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}
function AdminDashboard({ token, setPage }) {
  const [stats,setStats] = useState(null); const [stores,setStores] = useState([]); const [users,setUsers] = useState([]); const [error,setError] = useState('');
  useEffect(() => { Promise.all([api('/admin/stats',{token}),api('/admin/stores',{token}),api('/admin/users',{token})]).then(([s,st,u])=>{setStats(s);setStores(st.stores.slice(0,5));setUsers(u.users.slice(0,5));}).catch(e=>setError(e.message)); },[token]);
  return <><PageHeading eyebrow="OVERVIEW" title="Your platform at a glance" description="Monitor activity and manage the StoreRate community." action={<button className="primary-btn" onClick={()=>setPage('stores')}><Plus size={17}/> Add a store</button>}/>
    {error && <div className="inline-error">{error}</div>}
    <div className="stats-grid"><StatCard label="Total users" value={stats?.users} icon={Users} tint="purple" hint="Registered accounts"/><StatCard label="Registered stores" value={stats?.stores} icon={Store} tint="blue" hint="Across the platform"/><StatCard label="Ratings submitted" value={stats?.ratings} icon={Star} tint="orange" hint="Community feedback"/></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h3>Recently added stores</h3><p>Store directory snapshot</p></div><button className="text-btn" onClick={()=>setPage('stores')}>View all →</button></div><DataTable columns={[{key:'name',label:'Store'},{key:'address',label:'Address'},{key:'avg_rating',label:'Rating',render:r=><Rating value={r.avg_rating}/> }]} rows={stores} empty="No stores yet. Add your first store."/></section>
    <section className="panel"><div className="panel-head"><div><h3>Community members</h3><p>Recently registered accounts</p></div><button className="text-btn" onClick={()=>setPage('users')}>View all →</button></div><DataTable columns={[{key:'name',label:'Name'},{key:'role',label:'Role',render:r=><RoleTag role={r.role}/> }]} rows={users} empty="No users found."/></section></div>
  </>;
}
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const rad = n => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function UserDashboard({ token, notify, onOpenStore }) {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Allow location access to sort stores by distance.');

  useEffect(() => {
    api('/stores', { token }).then(d => setStores(d.stores)).catch(e => notify(e.message, 'error'));
  }, [token]);

  function useMyLocation() {
    if (!navigator.geolocation) { setLocationMessage('Location is not supported by this browser.'); return; }
    setLocationMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationMessage('Location enabled. Stores can be sorted by distance.');
      },
      () => setLocationMessage('Location unavailable. You can still search stores by name or address.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  const filteredStores = stores
    .filter(s => `${s.name} ${s.address}`.toLowerCase().includes(search.toLowerCase()))
    .filter(s => Number(s.avg_rating) >= Number(minRating))
    .map(s => {
      const hasCoordinates = s.latitude != null && s.longitude != null && Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude));
      const distance = location && hasCoordinates ? getDistanceKm(location.latitude, location.longitude, Number(s.latitude), Number(s.longitude)) : null;
      return { ...s, distance };
    })
    .sort((a, b) => {
      if (location && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (location && a.distance != null) return -1;
      if (location && b.distance != null) return 1;
      return Number(b.avg_rating) - Number(a.avg_rating);
    });
  const storesWithCoordinates = stores.filter(s => s.latitude != null && s.longitude != null).length;

  return <>
    <section className="home-hero">
      <span className="eyebrow">YOUR LOCAL STORE GUIDE</span>
      <h2>Find a store you can trust.</h2>
      <p>Discover local businesses, compare customer ratings and make informed decisions.</p>
      <div className="home-search-row">
        <div className="search-box home-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stores or addresses…"/></div>
        <button className="primary-btn" onClick={useMyLocation}><Navigation size={17}/> Use my location</button>
      </div>
      <p className="location-message"><MapPin size={14}/> {locationMessage}</p>
    </section>
    <section className="nearby-section">
      <div className="nearby-heading"><div><span className="eyebrow">DISCOVER</span><h2>{location ? 'Stores near you' : 'Explore stores'}</h2><p>{location ? 'Stores with coordinates appear first by distance.' : 'Search local stores and compare their customer ratings.'}</p></div>
        <label className="rating-filter">Minimum rating<select value={minRating} onChange={e => setMinRating(e.target.value)}><option value="0">All ratings</option><option value="1">1+ stars</option><option value="2">2+ stars</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="5">5 stars</option></select></label>
      </div>
      {location && storesWithCoordinates === 0 && <div className="location-notice">Your location is enabled, but stores need latitude and longitude coordinates before distances can be calculated. You can still browse all stores.</div>}
      <div className="store-cards home-store-grid">{filteredStores.map(s => <button type="button" className="store-card clickable-store" key={s.id} onClick={() => onOpenStore(s.id)}>
        <div className="store-card-icon"><Store size={22}/></div><h4>{s.name}</h4><p>{s.address}</p><div className="store-card-rating"><Rating value={s.avg_rating}/><span>{s.rating_count} customer ratings</span>{s.distance != null && <span className="distance-label"><MapPin size={13}/> {s.distance.toFixed(1)} km away</span>}</div><span className="view-store-link">View store details →</span>
      </button>)}</div>
      {!filteredStores.length && <EmptyState text="No stores match these filters. Try a different search or rating."/>}
    </section>
  </>;
}

function OwnerDashboard({ token, notify }) {
  const [data,setData] = useState({stores:[],ratings:[]});
  useEffect(()=>{api('/owner/dashboard',{token}).then(setData).catch(e=>notify(e.message,'error'));},[token]);
  const count=data.stores.reduce((sum,s)=>sum+Number(s.rating_count),0);
  const avg=data.stores.length ? (data.stores.reduce((sum,s)=>sum+Number(s.avg_rating)*Number(s.rating_count),0)/(count||1)).toFixed(2) : '0.00';
  return <><PageHeading eyebrow="STORE PERFORMANCE" title="Your customer feedback" description="See how customers rate your store and review their feedback."/>
    <div className="stats-grid"><StatCard label="Your stores" value={data.stores.length} icon={Store} tint="blue" hint="Assigned to your account"/><StatCard label="Total ratings" value={count} icon={Users} tint="purple" hint="Customer submissions"/><StatCard label="Average rating" value={`${avg} / 5`} icon={Star} tint="orange" hint="Across your stores"/></div>
    <section className="panel"><div className="panel-head"><div><h3>Your stores</h3><p>Average scores and rating counts</p></div></div><DataTable columns={[{key:'name',label:'Store'},{key:'address',label:'Address'},{key:'avg_rating',label:'Average rating',render:r=><Rating value={r.avg_rating}/>},{key:'rating_count',label:'Ratings'}]} rows={data.stores} empty="No store has been assigned to your account. Ask the administrator to link your OWNER account when creating a store."/></section>
    <section className="panel"><div className="panel-head"><div><h3>Recent customer ratings</h3><p>People who submitted ratings for your stores</p></div></div><DataTable columns={[{key:'user_name',label:'Customer'},{key:'user_email',label:'Email'},{key:'store_name',label:'Store'},{key:'rating',label:'Rating',render:r=><Rating value={r.rating}/>},{key:'updated_at',label:'Updated',render:r=>new Date(r.updated_at).toLocaleDateString()}]} rows={data.ratings} empty="No ratings have been submitted yet."/></section>
  </>;
}
function AdminStores({ token, notify }) {
  const [stores,setStores]=useState([]); const [search,setSearch]=useState(''); const [sort,setSort]=useState('name'); const [order,setOrder]=useState('asc'); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({name:'',email:'',address:'',ownerEmail:'',description:'',latitude:'',longitude:''});
  async function load(){try{const d=await api(`/admin/stores?search=${encodeURIComponent(search)}&sort=${sort}&order=${order}`,{token});setStores(d.stores);}catch(e){notify(e.message,'error');}}
  useEffect(()=>{load();},[token,search,sort,order]);
  async function submit(e){e.preventDefault();setLoading(true);try{await api('/admin/stores',{token,method:'POST',body:JSON.stringify(form)});notify('Store created successfully.');setForm({name:'',email:'',address:'',ownerEmail:'',description:'',latitude:'',longitude:''});setShow(false);load();}catch(e){notify(e.message,'error');}finally{setLoading(false);}}
  return <><PageHeading eyebrow="DIRECTORY" title="Store management" description="Create stores, view average ratings, and manage the store directory." action={<button className="primary-btn" onClick={()=>setShow(!show)}><Plus size={17}/> Add store</button>}/>
    {show && <section className="panel form-panel"><div className="panel-head"><div><h3>Add a new store</h3><p>Assign an existing Store Owner account optionally.</p></div><button className="icon-btn" onClick={()=>setShow(false)}><X size={18}/></button></div><form className="form-grid" onSubmit={submit}><label>Store name<input required minLength="2" maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Store name"/></label><label>Store email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="store@example.com"/></label><label className="span-two">Address<textarea required maxLength="400" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Full store address" rows="2"/></label><label className="span-two">Store description<textarea maxLength="3000" rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the store, products, services, or customer experience"/></label><label>Latitude (optional)<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} placeholder="Example: 19.0760"/></label><label>Longitude (optional)<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} placeholder="Example: 72.8777"/></label><label className="span-two">Store owner email (optional)<input type="email" value={form.ownerEmail} onChange={e=>setForm({...form,ownerEmail:e.target.value})} placeholder="Create an OWNER user first, then enter their email"/></label><div className="span-two form-actions"><button className="primary-btn" disabled={loading}>{loading?'Saving…':'Save store'}</button><button type="button" className="secondary-btn" onClick={()=>setShow(false)}>Cancel</button></div></form></section>}
    <section className="panel"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, or address…"/></div><div className="toolbar-right"><span>{stores.length} stores</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort: Name</option><option value="email">Sort: Email</option><option value="address">Sort: Address</option><option value="avg_rating">Sort: Rating</option></select><button className="icon-btn" onClick={()=>setOrder(order==='asc'?'desc':'asc')} title="Toggle sort order">{order==='asc'?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button></div></div><DataTable columns={[{key:'name',label:'Store name'},{key:'email',label:'Email'},{key:'address',label:'Address'},{key:'avg_rating',label:'Average rating',render:r=><Rating value={r.avg_rating}/>},{key:'rating_count',label:'Ratings'}]} rows={stores} empty="No stores match your search."/></section>
  </>;
}
function AdminUsers({ token, notify }) {
  const [users,setUsers]=useState([]);const [search,setSearch]=useState('');const [role,setRole]=useState('');const [sort,setSort]=useState('name');const [order,setOrder]=useState('asc');const [show,setShow]=useState(false);const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({name:'',email:'',address:'',password:'',role:'USER'});
  async function load(){try{const d=await api(`/admin/users?search=${encodeURIComponent(search)}&role=${role}&sort=${sort}&order=${order}`,{token});setUsers(d.users);}catch(e){notify(e.message,'error');}}
  useEffect(()=>{load();},[token,search,role,sort,order]);
  async function submit(e){e.preventDefault();setLoading(true);try{await api('/admin/users',{token,method:'POST',body:JSON.stringify(form)});notify('User created successfully.');setForm({name:'',email:'',address:'',password:'',role:'USER'});setShow(false);load();}catch(e){notify(e.message,'error');}finally{setLoading(false);}}
  return <><PageHeading eyebrow="PEOPLE" title="User management" description="Create accounts, filter by role, and review registered users." action={<button className="primary-btn" onClick={()=>setShow(!show)}><Plus size={17}/> Add user</button>}/>
    {show && <section className="panel form-panel"><div className="panel-head"><div><h3>Create a user account</h3><p>Names must be 20–60 characters. Passwords must meet the challenge rules.</p></div><button className="icon-btn" onClick={()=>setShow(false)}><X size={18}/></button></div><form className="form-grid" onSubmit={submit}><label className="span-two">Full name<input required minLength="20" maxLength="60" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter full name (20–60 characters)"/></label><label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="user@example.com"/></label><label>Temporary password<input required type="password" minLength="8" maxLength="16" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Uppercase + special character"/></label><label className="span-two">Address<textarea required maxLength="400" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows="2" placeholder="Address (maximum 400 characters)"/></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="USER">Normal User</option><option value="ADMIN">System Administrator</option><option value="OWNER">Store Owner</option></select></label><div className="span-two form-actions"><button className="primary-btn" disabled={loading}>{loading?'Creating…':'Create user'}</button><button type="button" className="secondary-btn" onClick={()=>setShow(false)}>Cancel</button></div></form></section>}
    <section className="panel"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, or address…"/></div><div className="toolbar-right"><select value={role} onChange={e=>setRole(e.target.value)}><option value="">All roles</option><option value="ADMIN">Administrator</option><option value="USER">Normal User</option><option value="OWNER">Store Owner</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort: Name</option><option value="email">Sort: Email</option><option value="address">Sort: Address</option><option value="role">Sort: Role</option></select><button className="icon-btn" onClick={()=>setOrder(order==='asc'?'desc':'asc')} title="Toggle sort order">{order==='asc'?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button></div></div><DataTable columns={[{key:'name',label:'Name',render:r=><div className="person-cell"><div className="avatar tiny">{r.name.slice(0,1).toUpperCase()}</div><span>{r.name}</span></div>},{key:'email',label:'Email'},{key:'address',label:'Address'},{key:'role',label:'Role',render:r=><RoleTag role={r.role}/> }]} rows={users} empty="No users match your filters."/></section>
  </>;
}
function UserStores({ token, notify, onOpenStore }) {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    api(`/stores?search=${encodeURIComponent(search)}`, { token }).then(d => setStores(d.stores)).catch(e => notify(e.message, 'error'));
  }, [token, search]);
  return <>
    <PageHeading eyebrow="STORE DIRECTORY" title="Discover stores" description="Search businesses, compare ratings, and open a store to read customer reviews."/>
    <section className="panel"><div className="table-toolbar"><div className="search-box wide-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search store name or address…"/></div><span className="muted">{stores.length} stores</span></div>
      <div className="store-cards home-store-grid">{stores.map(s => <button type="button" className="store-card clickable-store" key={s.id} onClick={() => onOpenStore(s.id)}><div className="store-card-icon"><Store size={22}/></div><h4>{s.name}</h4><p>{s.address}</p><div className="store-card-rating"><Rating value={s.avg_rating}/><span>{s.rating_count} customer ratings</span></div><span className="view-store-link">View details and reviews →</span></button>)}</div>
      {!stores.length && <EmptyState text="No stores found. Try another search."/>}
    </section>
  </>;
}

function StoreDetails({ storeId, token, notify, onBack }) {
  const [store, setStore] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [filterRating, setFilterRating] = useState('0');
  const [saving, setSaving] = useState(false);

  async function loadStore() {
    try {
      const data = await api(`/stores/${storeId}`, { token });
      setStore(data.store); setReviews(data.reviews);
      const mine = data.reviews.find(r => Number(r.is_mine) === 1);
      setRating(mine ? Number(mine.rating) : 0); setReviewText(mine?.review_text || '');
    } catch (e) { notify(e.message, 'error'); }
  }
  useEffect(() => { loadStore(); }, [storeId, token]);
  async function submitReview(e) {
    e.preventDefault();
    if (!rating) { notify('Please select a star rating first.', 'error'); return; }
    setSaving(true);
    try {
      const result = await api(`/stores/${storeId}/rating`, { token, method: 'PUT', body: JSON.stringify({ rating, reviewText }) });
      notify(result.message); await loadStore();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  }
  if (!store) return <section className="panel"><div className="empty-state">Loading store details…</div></section>;
  const visibleReviews = reviews.filter(r => filterRating === '0' || Number(r.rating) === Number(filterRating));
  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={17}/> Back to {"your stores"}</button>
    <section className="store-detail-hero"><div className="store-detail-icon"><Store size={30}/></div><span className="eyebrow">STORE PROFILE</span><h2>{store.name}</h2><p className="store-address"><MapPin size={15}/> {store.address}</p><div className="detail-rating"><Rating value={store.avg_rating}/><span>{store.rating_count} customer ratings</span></div></section>
    <section className="panel detail-panel"><div className="panel-head"><div><h3>About this store</h3></div></div><div className="store-description">{store.description || 'No store description has been added yet.'}</div><div className="store-contact"><strong>Contact</strong><a href={`mailto:${store.email}`}>{store.email}</a></div></section>
    <section className="panel detail-panel"><div className="panel-head"><div><h3>Share your experience</h3><p>Your feedback helps other people make informed decisions.</p></div></div>
      <form className="review-form" onSubmit={submitReview}><label>Your rating</label><div className="star-picker large-star-picker">{[1,2,3,4,5].map(n => <button type="button" key={n} className={rating >= n ? 'selected' : ''} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star size={28} fill={rating >= n ? 'currentColor' : 'none'}/></button>)}<span>{rating ? `${rating} out of 5` : 'Select a rating'}</span></div>
        <label htmlFor="store-review-text">Written review (optional)</label><textarea id="store-review-text" rows="4" maxLength="1000" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="What was your experience like? Mention service, quality, value, or anything useful."/><div className="review-form-footer"><small>{reviewText.length}/1000 characters</small><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Submit review'}</button></div>
      </form>
    </section>
    <section className="panel detail-panel"><div className="panel-head reviews-heading"><div><h3>Customer reviews</h3><p>{reviews.length} ratings and reviews</p></div><label className="rating-filter">Filter<select value={filterRating} onChange={e => setFilterRating(e.target.value)}><option value="0">All ratings</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label></div>
      <div className="review-list">{visibleReviews.map(r => <article className="review-item" key={r.id}><div className="review-avatar">{String(r.user_name || 'U').slice(0,1).toUpperCase()}</div><div className="review-content"><div className="review-topline"><strong>{Number(r.is_mine) === 1 ? 'You' : r.user_name}</strong><time>{new Date(r.updated_at || r.created_at).toLocaleDateString()}</time></div><Rating value={r.rating}/><p>{r.review_text || 'Rating only — no written comment.'}</p>{Number(r.is_mine) === 1 && <span className="own-review-label">Your review · You can edit it above</span>}</div></article>)}{!visibleReviews.length && <EmptyState text="No reviews match this rating filter."/>}</div>
    </section>
  </>;
}

function PasswordPanel({ token, notify }) {
  const [form,setForm]=useState({currentPassword:'',newPassword:'',confirm:''});const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();if(form.newPassword!==form.confirm){notify('New passwords do not match.','error');return;}setBusy(true);try{const d=await api('/auth/password',{token,method:'PUT',body:JSON.stringify({currentPassword:form.currentPassword,newPassword:form.newPassword})});notify(d.message);setForm({currentPassword:'',newPassword:'',confirm:''});}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
  return <><PageHeading eyebrow="ACCOUNT SETTINGS" title="Change password" description="Keep your account secure by using a strong password."/><section className="panel password-panel"><div className="security-icon"><KeyRound size={25}/></div><h3>Update your password</h3><p className="muted">Use 8–16 characters, at least one uppercase letter, and one special character.</p><form className="form-stack" onSubmit={submit}><label>Current password<input type="password" required value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/></label><label>New password<input type="password" required minLength="8" maxLength="16" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/></label><label>Confirm new password<input type="password" required minLength="8" maxLength="16" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label><button className="primary-btn" disabled={busy}>{busy?'Updating…':'Update password'}</button></form></section></>;
}
function Rating({ value }) {
  const v=Number(value||0);
  return <span className="rating-display"><span className="stars">{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={v>=n?'currentColor':'none'} className={v>=n?'filled':'empty'}/>)}</span><strong>{v.toFixed(2)}</strong></span>;
}
function RoleTag({ role }) { return <span className={`role-tag ${role?.toLowerCase()}`}>{roleLabels[role] || role}</span>; }
function EmptyState({ text }) { return <div className="empty-state"><div><Store size={24}/></div><p>{text}</p></div>; }
function DataTable({ columns, rows, empty }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id ?? i}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):(r[c.key] ?? '—')}</td>)}</tr>)}</tbody></table>{!rows.length&&<EmptyState text={empty||'No records found.'}/>}</div>;
}

export default App;

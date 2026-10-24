/* A private, browser-local workspace for reviewers. It never calls the live API. */
(() => {
  const MODE_KEY = 'fsh_demo_mode';
  const DATA_KEY = 'fsh_demo_data_v1';
  const emailFor = role => role === 'Admin' ? 'admin.demo@firstasia.edu.ph' : 'teacher.demo@firstasia.edu.ph';
  const isDemo = () => localStorage.getItem(MODE_KEY) === '1';
  const tomorrow = (offset = 1) => {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  const initialData = () => ({
    reservations: [
      { id: 'sample-1', lab: 'Biology Laboratory', date: tomorrow(2), timeSlot: '09:00 AM - 10:00 AM', teacherName: 'Alex Rivera', subject: 'General Biology', grade: '11', students: 32, purpose: 'Microscopy practical', requester: emailFor('Teacher'), status: 'approved', createdAt: new Date().toISOString() },
      { id: 'sample-2', lab: 'Computer Laboratory 1', date: tomorrow(3), timeSlot: '10:00 AM - 11:00 AM', teacherName: 'Alex Rivera', subject: 'ETECH', grade: '12', students: 28, purpose: 'Digital presentation workshop', requester: emailFor('Teacher'), status: 'pending', createdAt: new Date().toISOString() },
      { id: 'sample-3', lab: 'Physics Laboratory', date: tomorrow(4), timeSlot: '01:00 PM - 02:00 PM', teacherName: 'Sam Cruz', subject: 'Physics', grade: '12', students: 24, purpose: 'Motion experiment', requester: 'sam.cruz@firstasia.edu.ph', status: 'pending', createdAt: new Date().toISOString() }
    ],
    notifications: [
      { id: 'sample-note-1', type: 'approval', reservationId: 'sample-1', from: emailFor('Admin'), to: emailFor('Teacher'), subject: 'Reservation Approved', message: 'Your Biology Laboratory reservation has been approved.', lab: 'Biology Laboratory', date: tomorrow(2), timeSlot: '09:00 AM - 10:00 AM', status: 'approved', read: false, createdAt: new Date().toISOString() },
      { id: 'sample-note-2', type: 'request', reservationId: 'sample-2', from: emailFor('Teacher'), to: emailFor('Admin'), subject: 'New Lab Request: Computer Laboratory 1', message: 'Alex Rivera requested Computer Laboratory 1.', lab: 'Computer Laboratory 1', date: tomorrow(3), timeSlot: '10:00 AM - 11:00 AM', status: 'pending', read: false, createdAt: new Date().toISOString() }
    ]
  });
  const read = () => {
    try { return JSON.parse(localStorage.getItem(DATA_KEY)) || initialData(); }
    catch { return initialData(); }
  };
  const save = data => localStorage.setItem(DATA_KEY, JSON.stringify(data));
  const role = () => localStorage.getItem('fsh_user_role') === 'Admin' ? 'Admin' : 'Teacher';
  const user = () => ({ id: 0, email: emailFor(role()), role: role() });
  const result = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  window.fshDemo = {
    active: isDemo,
    start(selectedRole = 'Teacher') {
      localStorage.setItem(MODE_KEY, '1');
      if (!localStorage.getItem(DATA_KEY)) save(initialData());
      this.switchRole(selectedRole, false);
      window.location.href = 'dashboard.html';
    },
    switchRole(nextRole, navigate = true) {
      const safeRole = nextRole === 'Admin' ? 'Admin' : 'Teacher';
      localStorage.setItem('fsh_token', 'demo-only-token');
      localStorage.setItem('fsh_user_role', safeRole);
      localStorage.setItem('fsh_user_email', emailFor(safeRole));
      localStorage.removeItem('fsh_last_unread_count');
      if (navigate) window.location.href = 'dashboard.html';
    },
    reset() { save(initialData()); window.location.reload(); },
    exit() {
      [MODE_KEY, DATA_KEY, 'fsh_token', 'fsh_user_role', 'fsh_user_email', 'fsh_last_unread_count'].forEach(key => localStorage.removeItem(key));
      window.location.href = 'index.html';
    }
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (!isDemo() || url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, init);
    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    const path = url.pathname;
    const data = read();
    const current = user();
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch { /* ignore invalid demo input */ }

    if (path === '/api/session') return result({ success: true, user: current });
    if (path === '/api/logout') return result({ success: true });
    if (path === '/api/push/vapid-public-key') return result({ success: false, message: 'Push is disabled in demo mode.' });
    if (path.startsWith('/api/push/')) return result({ success: true });
    if (path === '/api/change-password') return result({ success: false, message: 'Password settings are unavailable in demo mode.' }, 400);

    if (path === '/api/reservations' && method === 'GET') {
      const lab = url.searchParams.get('lab');
      return result({ success: true, reservations: data.reservations.filter(item => (!lab || item.lab === lab) && (role() === 'Admin' || item.status === 'approved' || item.requester === current.email)) });
    }
    if (path === '/api/reservations' && method === 'POST') {
      if (data.reservations.some(item => item.lab === body.lab && item.date === body.date && item.timeSlot === body.timeSlot && item.status !== 'declined'))
        return result({ success: false, message: 'This time slot is already reserved. Please choose another.' }, 409);
      const id = `demo-${Date.now()}`;
      data.reservations.unshift({ ...body, id, requester: current.email, status: 'pending', createdAt: new Date().toISOString(), students: Number(body.students) });
      data.notifications.unshift({ id: `note-${id}`, type: 'request', reservationId: id, from: current.email, to: emailFor('Admin'), subject: `New Lab Request: ${body.lab}`, message: `${body.teacherName} requested ${body.lab}.`, lab: body.lab, date: body.date, timeSlot: body.timeSlot, status: 'pending', read: false, createdAt: new Date().toISOString() });
      save(data);
      return result({ success: true, id, message: 'Demo reservation submitted.' }, 201);
    }
    const reservationId = path.match(/^\/api\/reservations\/([^/]+)$/)?.[1];
    if (reservationId && method === 'PATCH') {
      const item = data.reservations.find(entry => entry.id === reservationId);
      if (!item) return result({ success: false, message: 'Reservation not found.' }, 404);
      if (role() === 'Admin' && ['approved', 'declined'].includes(body.status)) {
        item.status = body.status;
        data.notifications.unshift({ id: `note-${Date.now()}`, type: 'approval', reservationId, from: current.email, to: item.requester, subject: body.status === 'approved' ? 'Reservation Approved' : 'Reservation Not Approved', message: `Your reservation for ${item.lab} was ${body.status}.`, lab: item.lab, date: item.date, timeSlot: item.timeSlot, status: body.status === 'approved' ? 'approved' : 'rejected', read: false, createdAt: new Date().toISOString() });
        data.notifications.filter(note => note.reservationId === reservationId && note.type === 'request').forEach(note => { note.status = item.status; });
      } else if (item.requester === current.email) {
        Object.assign(item, body, { status: 'pending', updatedAt: new Date().toISOString() });
      } else return result({ success: false, message: 'This reservation cannot be changed.' }, 403);
      save(data);
      return result({ success: true, message: 'Demo reservation updated.' });
    }
    if (path === '/api/notifications' && method === 'GET') {
      const notifications = data.notifications.filter(note => note.to === current.email);
      return result({ success: true, notifications, unreadCount: notifications.filter(note => !note.read).length });
    }
    if (path === '/api/notifications/read-all' && method === 'PATCH') {
      data.notifications.filter(note => note.to === current.email).forEach(note => { note.read = true; });
      save(data); return result({ success: true });
    }
    const notificationId = path.match(/^\/api\/notifications\/([^/]+)\/read$/)?.[1];
    if (notificationId && method === 'PATCH') {
      const note = data.notifications.find(entry => entry.id === notificationId && entry.to === current.email);
      if (note) note.read = true;
      save(data); return result({ success: true });
    }
    return result({ success: false, message: 'This action is unavailable in demo mode.' }, 404);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!isDemo() || !document.querySelector('.dashboard-container')) return;
    document.body.classList.add('demo-active');
    const banner = document.createElement('aside');
    banner.className = 'demo-banner';
    banner.setAttribute('aria-label', 'Demo workspace controls');
    banner.innerHTML = `<span><strong>Demo workspace</strong> · Sample data stays in this browser</span><div class="demo-controls"><label for="demo-role">View as</label><select id="demo-role" aria-label="Demo role"><option>Teacher</option><option>Admin</option></select><button type="button" id="demo-reset">Reset data</button><button type="button" id="demo-exit">Exit demo</button></div>`;
    document.body.prepend(banner);
    banner.querySelector('#demo-role').value = role();
    banner.querySelector('#demo-role').addEventListener('change', event => window.fshDemo.switchRole(event.target.value));
    banner.querySelector('#demo-reset').addEventListener('click', () => window.fshDemo.reset());
    banner.querySelector('#demo-exit').addEventListener('click', () => window.fshDemo.exit());
  });
})();

/*
 * Cineplex | Cinema Booking System (DBMS Lab Project)
 *
 * How it works
 *  - The database is SQLite running in the browser (sql.js). Tables are created from js/schema.js (= database.sql).
 *  - Every database operation goes through q(): a SQL query with ? placeholders (prepared statement).
 *  - SQL used: CREATE, INSERT, SELECT (JOIN, WHERE, LIKE, GROUP BY), UPDATE, DELETE, COUNT, SUM, AVG, MAX.
 *  - The last query that ran is shown in the "Last SQL query executed" box on the page.
 */
const $ = (i) => document.getElementById(i);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const tk = (n) => '৳ ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const ft = (s) =>
  new Date(s.replace(' ', 'T')).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const label = (i) => String.fromCharCode(65 + Math.floor(i / 10)) + ((i % 10) + 1);
const prem = (l) => 'AB'.includes(l[0]);
const cmp = (a, b) => a.charCodeAt(0) - b.charCodeAt(0) || parseInt(a.slice(1)) - parseInt(b.slice(1));
const sorted = (s) =>
  String(s || '')
    .split(',')
    .filter(Boolean)
    .sort(cmp);
let db,
  rows = [],
  SQL,
  kf = '',
  SH = [],
  sel = new Set(),
  PF = 1.5;
/** Toast message (green = success, red = error). */
function show(t, ok) {
  const m = $('msg');
  m.textContent = t;
  m.className = ok ? 'ok' : 'err';
  m.style.display = 'block';
  setTimeout(() => (m.style.display = 'none'), 3500);
}
/** Save the database in the browser (localStorage) so the data survives a page refresh. */
function persist() {
  try {
    const u = db.export();
    db.exec('PRAGMA foreign_keys = ON');
    let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    localStorage.setItem('cineplex_db5', btoa(s));
  } catch (e) {}
}
/** Run ONE SQL query with ? placeholders and return the rows. All database work goes through here. */
function q(sql, p = [], write = false, quiet = false) {
  // run one SQL query with ? placeholders
  if (!quiet)
    $('sqlbox').textContent =
      sql.replace(/\s+/g, ' ').trim() + (p.length ? '\n-- values: ' + JSON.stringify(p) : '');
  const st = db.prepare(sql);
  st.bind(p);
  const out = [];
  while (st.step()) out.push(st.getAsObject());
  st.free();
  if (write) persist();
  return out;
}
const SEATSQL = `(SELECT GROUP_CONCAT(seat_no,',') FROM booking_seats WHERE booking_id=b.booking_id) AS seat_list,
  (SELECT SUM(s.price*c.price_factor) FROM booking_seats bs JOIN seat_classes c ON bs.class_id=c.class_id WHERE bs.booking_id=b.booking_id) AS total,
  (SELECT COUNT(*) FROM booking_seats bs JOIN seat_classes c ON bs.class_id=c.class_id WHERE bs.booking_id=b.booking_id AND c.class_name='Premium') AS prem`;
/** SELECT + JOIN + LEFT JOIN + GROUP BY: "Now Showing" cards with seats left (aggregate SUM). */
function loadShows() {
  const s = q(`SELECT s.show_id,m.title,m.kind,g.genre_name,s.hall,s.show_time,s.price,s.capacity,
    s.capacity-COALESCE(SUM(b.seats),0) AS seats_left FROM shows s JOIN movies m ON s.movie_id=m.movie_id
    JOIN genres g ON m.genre_id=g.genre_id LEFT JOIN bookings b ON b.show_id=s.show_id GROUP BY s.show_id ORDER BY s.show_time`);
  SH = s;
  $('shows').innerHTML = s
    .filter((x) => !kf || x.kind === kf)
    .map((x) => {
      const h = ([...x.title].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360,
        p = Math.round(((x.capacity - x.seats_left) / x.capacity) * 100);
      return `<div class="show" style="background:linear-gradient(170deg,hsl(${h} 28% 20%),#0c0c10 80%)"><span class="tag">${x.kind === 'Series' ? 'SERIES · ' : ''}${esc(x.genre_name)}</span><div class="pt"><b>${esc(x.title)}</b><small>${esc(x.hall)} · ${ft(x.show_time)}</small></div><div><div class="bar"><i style="width:${p}%"></i></div><div class="l"><span>${x.seats_left} seats left</span><b>${tk(x.price)}</b></div></div></div>`;
    })
    .join('');
  const o = s
    .map((x) => `<option value="${x.show_id}">${esc(x.title)} — ${esc(x.hall)}, ${ft(x.show_time)}</option>`)
    .join('');
  const cur = $('show').value,
    cf = $('fshow').value;
  $('show').innerHTML = '<option value="">Select a show...</option>' + o;
  $('fshow').innerHTML = '<option value="">All shows</option>' + o;
  $('show').value = cur;
  $('fshow').value = cf;
  drawMap();
  calc();
}
/** SELECT + JOIN + WHERE ... LIKE: view all bookings, search by name/phone, filter by show. */
function loadRows() {
  let sql = `SELECT b.booking_id,b.customer_name,b.phone,b.show_id,m.title,s.hall,s.show_time,${SEATSQL}
    FROM bookings b JOIN shows s ON b.show_id=s.show_id JOIN movies m ON s.movie_id=m.movie_id WHERE 1=1`;
  const p = [];
  const t = $('q').value.trim(),
    sh = $('fshow').value;
  if (t) {
    sql += ' AND (b.customer_name LIKE ? OR b.phone LIKE ?)';
    p.push('%' + t + '%', '%' + t + '%');
  }
  if (sh) {
    sql += ' AND b.show_id=?';
    p.push(+sh);
  }
  rows = q(sql + ' ORDER BY b.booking_id ASC', p);
  $('rows').innerHTML = rows.length
    ? rows
        .map((b) => {
          const sl = sorted(b.seat_list);
          return `<tr><td class="no">${String(b.booking_id).padStart(2, '0')}</td><td><b>${esc(b.customer_name)}</b><br><small class="s2">${esc(b.phone)}</small></td><td>${esc(b.title)}<br><small class="s2">${esc(b.hall)} · ${ft(b.show_time)}</small></td>
  <td>${sl.join(', ')}<br><small class="s2">${b.prem ? b.prem + ' Premium · ' : ''}${sl.length - b.prem} Standard</small></td><td class="t">${tk(b.total)}</td>
  <td style="text-align:right"><button class="sm g" onclick="edit(${b.booking_id})">Edit</button> <button class="sm g" onclick="tkt(${b.booking_id})">Ticket</button> <button class="sm d" onclick="del(${b.booking_id})">Delete</button></td></tr>`;
        })
        .join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--mut);padding:24px">No records found</td></tr>';
}
/** Summary cards using aggregate functions: COUNT, SUM, MAX, AVG. */
function loadSum() {
  const av = q(
      `SELECT COALESCE(AVG(t.amt),0) AS v FROM (SELECT bs.booking_id,SUM(s.price*c.price_factor) AS amt FROM booking_seats bs JOIN shows s ON bs.show_id=s.show_id JOIN seat_classes c ON bs.class_id=c.class_id GROUP BY bs.booking_id) t`,
      [],
      false,
      true,
    )[0].v,
    oc =
      q(
        `SELECT ROUND(100.0*(SELECT COUNT(*) FROM booking_seats)/SUM(capacity),1) AS v FROM shows`,
        [],
        false,
        true,
      )[0].v || 0;
  const s =
    q(`SELECT COUNT(*) AS bookings,COALESCE(SUM(b.seats),0) AS seats,COALESCE(SUM(t.amt),0) AS revenue,COALESCE(MAX(b.seats),0) AS max_seats
    FROM bookings b LEFT JOIN (SELECT bs.booking_id,SUM(s.price*c.price_factor) AS amt FROM booking_seats bs JOIN shows s ON bs.show_id=s.show_id
    JOIN seat_classes c ON bs.class_id=c.class_id GROUP BY bs.booking_id) t ON t.booking_id=b.booking_id`)[0];
  $('summary').innerHTML =
    `<div><small>Total bookings</small><b>${s.bookings}</b></div><div><small>Seats sold</small><b>${s.seats}</b></div><div><small>Revenue</small><b>${tk(s.revenue)}</b></div><div><small>Largest booking</small><b>${s.max_seats} seats</b></div><div><small>Avg. booking value</small><b>${tk(av)}</b></div><div><small>Hall occupancy</small><b>${oc}%</b></div>`;
}
/** SUM + GROUP BY: revenue for each movie / series. */
function loadChart() {
  const r =
      q(`SELECT m.title,SUM(s.price*c.price_factor) AS rev FROM booking_seats bs JOIN shows s ON bs.show_id=s.show_id
    JOIN movies m ON s.movie_id=m.movie_id JOIN seat_classes c ON bs.class_id=c.class_id GROUP BY m.title ORDER BY rev DESC`),
    mx = Math.max(1, ...r.map((x) => x.rev));
  $('chart').innerHTML = r.length
    ? r
        .map(
          (x) =>
            `<div class="cr"><span>${esc(x.title)}</span><div><i style="width:${(x.rev / mx) * 100}%"></i></div><b>${tk(x.rev)}</b></div>`,
        )
        .join('')
    : '<p class="how">No bookings yet.</p>';
}
/** Price preview under the form (Premium = 1.5 x Standard). */
function calc() {
  const x = SH.find((v) => v.show_id == $('show').value);
  if (!x || !sel.size) {
    $('calc').textContent = '';
    return;
  }
  const p = [...sel].filter(prem).length,
    s = sel.size - p;
  $('calc').textContent =
    [p ? p + ' Premium × ' + tk(x.price * PF) : '', s ? s + ' Standard × ' + tk(x.price) : '']
      .filter(Boolean)
      .join(' + ') +
    ' = ' +
    tk(p * x.price * PF + s * x.price);
}
/** SELECT: seats already taken for the chosen show, then draw the seat map. */
function drawMap() {
  const x = SH.find((v) => v.show_id == $('show').value),
    m = $('map');
  if (!x) {
    m.innerHTML = '';
    return;
  }
  const taken = new Set(
    q(
      'SELECT seat_no FROM booking_seats WHERE show_id=? AND booking_id<>?',
      [x.show_id, +$('id').value || 0],
      false,
      true,
    ).map((r) => r.seat_no),
  );
  let h = '<div class="scr">SCREEN</div><div class="seats">';
  for (let i = 0; i < x.capacity; i++) {
    const l = label(i),
      t = taken.has(l);
    h += `<span class="st${prem(l) ? ' p' : ''}${t ? ' t' : sel.has(l) ? ' s' : ''}"${t ? '' : ` data-l="${l}"`} title="${l} · ${prem(l) ? 'Premium' : 'Standard'}">${l}</span>`;
  }
  m.innerHTML =
    h +
    `</div><div class="lg"><span><i class="st p"></i>Premium ${tk(x.price * PF)}</span><span><i class="st"></i>Standard ${tk(x.price)}</span><span><i class="st t"></i>Taken</span><span><i class="st s"></i>Selected</span></div>`;
  m.querySelectorAll('.st[data-l]').forEach(
    (e) =>
      (e.onclick = () => {
        const l = e.dataset.l;
        sel.has(l) ? sel.delete(l) : sel.add(l);
        $('seats').value = sel.size || '';
        drawMap();
        calc();
      }),
  );
}
/** SELECT + JOIN: details for the printable ticket. */
function tkt(id) {
  const b = q(
    `SELECT b.booking_id,b.customer_name,m.title,s.hall,s.show_time,${SEATSQL}
    FROM bookings b JOIN shows s ON b.show_id=s.show_id JOIN movies m ON s.movie_id=m.movie_id WHERE b.booking_id=?`,
    [id],
    false,
    true,
  )[0];
  if (!b) return;
  const sl = sorted(b.seat_list);
  $('tk').innerHTML =
    `<div class="tkc"><h3>CINEPLEX</h3><div class="sub">ADMIT ${sl.length} · TICKET #${String(b.booking_id).padStart(2, '0')}</div><h4>${esc(b.title)}</h4>
  <p><span>Name</span>${esc(b.customer_name)}</p><p><span>Hall</span>${esc(b.hall)}</p><p><span>Time</span>${ft(b.show_time)}</p><p><span>Seats</span>${sl.join(', ')}</p><p><span>Class</span>${b.prem ? b.prem + ' Premium · ' : ''}${sl.length - b.prem} Standard</p><p><span>Total</span><b>${tk(b.total)}</b></p>
  <div class="bc"></div><div class="noprint"><button onclick="print()">Print</button><button class="g" style="color:#1a1710;border-color:#b9b29d" onclick="$('ticket').style.display='none'">Close</button></div></div>`;
  $('ticket').style.display = 'flex';
}
/** Re-run all SELECT queries and redraw the page. */
function refresh(keepSql) {
  const last = $('sqlbox').textContent;
  loadShows();
  loadSum();
  loadRows();
  loadChart();
  if (keepSql) $('sqlbox').textContent = last;
}
/** Reset the form back to "New Booking". */
function clr() {
  sel.clear();
  setTimeout(() => {
    drawMap();
    calc();
  }, 0);
  $('f').reset();
  $('id').value = '';
  $('ft').textContent = 'New Booking';
  $('sb').textContent = 'Book';
  $('cx').style.display = 'none';
}
/** Load a booking into the form. Pressing Update runs UPDATE. */
function edit(id) {
  const b = rows.find((x) => x.booking_id == id);
  if (!b) return;
  $('id').value = b.booking_id;
  $('show').value = b.show_id;
  $('name').value = b.customer_name;
  $('phone').value = b.phone;
  sel = new Set(sorted(b.seat_list));
  $('seats').value = sel.size;
  $('ft').textContent = 'Edit Booking #' + id;
  $('sb').textContent = 'Update';
  $('cx').style.display = 'inline-block';
  drawMap();
  calc();
  scrollTo({ top: $('s-book').offsetTop - 10, behavior: 'smooth' });
}
/** DELETE (the booking_seats rows first, then the booking) after a confirmation message. */
function del(id) {
  if (!confirm('Are you sure you want to delete this booking?')) return;
  try {
    q('DELETE FROM booking_seats WHERE booking_id=?', [id]);
    q('DELETE FROM bookings WHERE booking_id=?', [id], true);
    refresh(true);
    show('Booking deleted.', true);
  } catch (e) {
    show(e.message);
  }
}
/** Book / Update button: validate the form, then INSERT (new booking) or UPDATE (editing). */
$('f').onsubmit = (e) => {
  e.preventDefault();
  const id = +$('id').value;
  try {
    const sh = +$('show').value,
      name = $('name').value.trim(),
      ph = $('phone').value.trim(),
      seats = [...sel].sort(cmp);
    if (!sh) throw Error('Please select a show.');
    if (!name || name.length > 80) throw Error('Customer name is required (max 80 characters).');
    if (!/^[0-9+\-\s]{7,20}$/.test(ph)) throw Error('Enter a valid phone number (digits only).');
    if (!seats.length) throw Error('Please select at least one seat on the map.');
    const c = q(
      `SELECT seat_no FROM booking_seats WHERE show_id=? AND booking_id<>? AND seat_no IN (${seats.map(() => '?').join(',')})`,
      [sh, id, ...seats],
    );
    if (c.length) throw Error('Seat ' + c[0].seat_no + ' is already booked.');
    let bid = id;
    if (id) {
      q('UPDATE bookings SET show_id=?,customer_name=?,phone=?,seats=? WHERE booking_id=?', [
        sh,
        name,
        ph,
        seats.length,
        id,
      ]);
      q('DELETE FROM booking_seats WHERE booking_id=?', [id]);
    } else {
      q('INSERT INTO bookings (show_id,customer_name,phone,seats) VALUES (?,?,?,?)', [
        sh,
        name,
        ph,
        seats.length,
      ]);
      bid = q('SELECT MAX(booking_id) AS id FROM bookings', [], false, true)[0].id;
    }
    seats.forEach((l) =>
      q(
        'INSERT INTO booking_seats (booking_id,show_id,seat_no,class_id) VALUES (?,?,?,(SELECT class_id FROM seat_classes WHERE class_name=?))',
        [bid, sh, l, prem(l) ? 'Premium' : 'Standard'],
      ),
    );
    persist();
    clr();
    refresh(true);
    show(id ? 'Booking updated.' : 'Booking confirmed.', true);
    tkt(bid);
  } catch (x) {
    show(x.message);
  }
};
$('show').onchange = () => {
  sel.clear();
  $('seats').value = '';
  drawMap();
  calc();
};
document.querySelectorAll('.tabs button').forEach(
  (b) =>
    (b.onclick = () => {
      kf = b.dataset.k;
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      loadShows();
    }),
);
$('csv').onclick = () => {
  const h = ['#', 'Customer', 'Phone', 'Movie', 'Hall', 'Time', 'Seats', 'Total'];
  const c = [
    h,
    ...rows.map((b) => [
      b.booking_id,
      b.customer_name,
      b.phone,
      b.title,
      b.hall,
      b.show_time,
      sorted(b.seat_list).join(' '),
      b.total,
    ]),
  ]
    .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + c], { type: 'text/csv' }));
  a.download = 'bookings.csv';
  a.click();
};
$('cx').onclick = clr;
$('q').oninput = loadRows;
$('fshow').onchange = loadRows;
$('rs').onclick = () => {
  $('q').value = '';
  $('fshow').value = '';
  loadRows();
};
$('resetdb').onclick = () => {
  if (!confirm('Reset all data to the original demo data?')) return;
  db = new SQL.Database();
  db.exec(SCHEMA);
  db.exec('PRAGMA foreign_keys = ON');
  persist();
  clr();
  refresh();
  show('Demo data restored.', true);
};
(async () => {
  try {
    const bin = Uint8Array.from(atob(SQL_WASM_B64), (c) => c.charCodeAt(0));
    SQL = await initSqlJs({ wasmBinary: bin });
    let saved = null;
    try {
      saved = localStorage.getItem('cineplex_db5');
    } catch (e) {}
    if (saved) {
      try {
        db = new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)));
        db.exec('SELECT 1 FROM booking_seats');
      } catch (e) {
        db = null;
      }
    }
    if (!db) {
      db = new SQL.Database();
      db.exec(SCHEMA);
      persist();
    }
    db.exec('PRAGMA foreign_keys = ON');
    PF = q("SELECT price_factor FROM seat_classes WHERE class_name='Premium'", [], false, true)[0]
      .price_factor;
    refresh();
  } catch (e) {
    show('Failed to start: ' + e.message);
  }
})();

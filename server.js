const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./visitors.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      company TEXT,
      purpose TEXT NOT NULL,
      host_employee TEXT NOT NULL,
      contact_phone TEXT,
      notes TEXT,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME
    )`);
  }
});

// GET /api/visitors — list all visitors with optional filters
app.get('/api/visitors', (req, res) => {
  const { dateFrom, dateTo, search } = req.query;
  let query = 'SELECT * FROM visitors WHERE 1=1';
  const params = [];

  if (dateFrom) {
    query += ' AND date(check_in_time) >= date(?)';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND date(check_in_time) <= date(?)';
    params.push(dateTo);
  }
  if (search) {
    query += ' AND (full_name LIKE ? OR company LIKE ? OR contact_phone LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  query += ' ORDER BY check_in_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/visitors — register a new visitor
app.post('/api/visitors', (req, res) => {
  const { full_name, company, purpose, host_employee, contact_phone, notes } = req.body;
  if (!full_name || !purpose || !host_employee) {
    return res.status(400).json({ error: 'full_name, purpose and host_employee are required' });
  }
  const query = `INSERT INTO visitors (full_name, company, purpose, host_employee, contact_phone, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [full_name, company, purpose, host_employee, contact_phone, notes], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
});

// PUT /api/visitors/:id — update visitor details
app.put('/api/visitors/:id', (req, res) => {
  const { full_name, company, purpose, host_employee, contact_phone, notes } = req.body;
  const query = `UPDATE visitors SET full_name=?, company=?, purpose=?, host_employee=?, contact_phone=?, notes=?
                 WHERE id=?`;
  db.run(query, [full_name, company, purpose, host_employee, contact_phone, notes, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Visitor not found' });
    res.json({ updated: this.changes });
  });
});

// PUT /api/visitors/:id/checkout — record check-out time
app.put('/api/visitors/:id/checkout', (req, res) => {
  const query = `UPDATE visitors SET check_out_time=CURRENT_TIMESTAMP WHERE id=? AND check_out_time IS NULL`;
  db.run(query, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Visitor not found or already checked out' });
    res.json({ checkedOut: this.changes });
  });
});

// DELETE /api/visitors/:id — delete a visitor record
app.delete('/api/visitors/:id', (req, res) => {
  db.run('DELETE FROM visitors WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Visitor not found' });
    res.json({ deleted: this.changes });
  });
});

// GET /api/reports — summary statistics with optional date filters
app.get('/api/reports', (req, res) => {
  const { dateFrom, dateTo } = req.query;
  let where = '1=1';
  const params = [];

  if (dateFrom) { where += ' AND date(check_in_time) >= date(?)'; params.push(dateFrom); }
  if (dateTo)   { where += ' AND date(check_in_time) <= date(?)'; params.push(dateTo); }

  const totalQuery   = `SELECT COUNT(*) AS total FROM visitors WHERE ${where}`;
  const purposeQuery = `SELECT purpose, COUNT(*) AS count FROM visitors WHERE ${where} GROUP BY purpose ORDER BY count DESC`;
  const hostQuery    = `SELECT host_employee, COUNT(*) AS count FROM visitors WHERE ${where} GROUP BY host_employee ORDER BY count DESC`;

  db.get(totalQuery, params, (err, totalRow) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(purposeQuery, params, (err, purposeRows) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(hostQuery, params, (err, hostRows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          totalVisitors: totalRow.total,
          byPurpose: purposeRows,
          byHost: hostRows
        });
      });
    });
  });
});

// GET /api/reports/csv — download visitor data as CSV
app.get('/api/reports/csv', (req, res) => {
  const { dateFrom, dateTo } = req.query;
  let query = 'SELECT * FROM visitors WHERE 1=1';
  const params = [];

  if (dateFrom) { query += ' AND date(check_in_time) >= date(?)'; params.push(dateFrom); }
  if (dateTo)   { query += ' AND date(check_in_time) <= date(?)'; params.push(dateTo); }
  query += ' ORDER BY check_in_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const headers = ['id', 'full_name', 'company', 'purpose', 'host_employee', 'contact_phone', 'notes', 'check_in_time', 'check_out_time'];
    const csvLines = [headers.join(',')];
    rows.forEach(row => {
      csvLines.push(headers.map(h => {
        const val = row[h] == null ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
    res.send('\uFEFF' + csvLines.join('\r\n'));
  });
});

// Fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Visitor registration server running on port ${PORT}`);
});

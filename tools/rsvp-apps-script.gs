/**
 * Wedding RSVP receiver.
 * - Accepts an RSVP only if every name is on the Guest List (MASTER LIST tab, Tiers 1-3).
 * - Logs each reply in this spreadsheet ("Wedding RSVPs").
 * - Writes RSVP Status / RSVP Date / Dietary Restrictions / Meal Choice back to the Guest List.
 *
 * Setup: open "Wedding RSVPs" > Extensions > Apps Script, replace everything with this file, Save,
 * then Deploy > Manage deployments > (pencil) Edit > Version: New version > Deploy.
 * Keeping the same deployment keeps the same /exec URL.
 */
var GUEST_LIST_ID = '1-HqXkMgED_U4fvw8kSxNlFhV6z_omS2dN2i6mPbuGcg';
var GUEST_TAB = 'MASTER LIST';
var ALLOWED_TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];
var HEADERS = ['Submitted', 'Name(s)', 'Matched guest(s)', 'Email', 'Attending', 'Meal', 'Dietary needs', 'Note'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var p = (e && e.parameter) || {};
    var entered = clean(p.name);
    if (!entered) return reply({ ok: false, error: 'missing_name' });

    var guests = loadGuests();
    var names = splitNames(entered);
    var matched = [], notFound = [];
    names.forEach(function (n) {
      var hits = findGuest(guests, n);
      if (hits.length) matched.push({ entered: n, hits: hits });
      else notFound.push(n);
    });
    if (notFound.length) return reply({ ok: false, error: 'not_on_list', names: notFound });

    // Log the reply.
    var log = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (log.getLastRow() === 0 || log.getRange(1, 3).getValue() !== HEADERS[2]) {
      if (log.getLastRow() === 0) log.appendRow(HEADERS); else log.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
    var matchedText = matched.map(function (m) {
      return m.hits.length === 1 ? m.hits[0].display : m.hits[0].display + ' (' + m.hits.length + ' guests share this name - check)';
    }).join(', ');
    log.appendRow([new Date(), entered, matchedText, clean(p.email), clean(p.attending),
                   clean(p.meal), clean(p.diet), clean(p.note)]);

    // Write back to the Guest List when the match is unambiguous.
    var status = clean(p.attending) === 'Yes' ? 'Yes' : 'No';
    matched.forEach(function (m) {
      if (m.hits.length !== 1) return;
      var g = m.hits[0];
      setCell(guests, g.row, 'RSVP Status', status);
      setCell(guests, g.row, 'RSVP Date', new Date());
      if (status === 'Yes') {
        setCell(guests, g.row, 'Meal Choice', clean(p.meal));
        setCell(guests, g.row, 'Dietary Restrictions', clean(p.diet));
      }
    });
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function loadGuests() {
  var sheet = SpreadsheetApp.openById(GUEST_LIST_ID).getSheetByName(GUEST_TAB);
  var values = sheet.getDataRange().getValues();
  var hRow = -1;
  for (var i = 0; i < Math.min(values.length, 10); i++) {
    if (values[i].indexOf('Name') !== -1 && values[i].indexOf('Last Name') !== -1) { hRow = i; break; }
  }
  if (hRow < 0) throw new Error('Guest List header row not found');
  var col = {};
  values[hRow].forEach(function (h, j) { if (h) col[String(h).replace(/\s*\(Optional\)\s*$/i, '').trim()] = j; });
  var list = [];
  for (var r = hRow + 1; r < values.length; r++) {
    var row = values[r];
    var first = String(row[col['Name']] || '').trim();
    var tier = String(row[col['Tier (1-5)']] || '');
    if (!first || !ALLOWED_TIERS.some(function (t) { return tier.indexOf(t) === 0; })) continue;
    var last = String(row[col['Last Name']] || '').trim();
    list.push({ row: r + 1, first: norm(first), last: norm(last), display: (first + ' ' + last).trim() });
  }
  return { sheet: sheet, col: col, list: list };
}

// Full name must match when a last name is on file; otherwise the first name must match.
function findGuest(guests, entered) {
  var n = norm(entered), firstWord = n.split(' ')[0];
  var exact = guests.list.filter(function (g) {
    return n === (g.last ? g.first + ' ' + g.last : g.first);
  });
  if (exact.length) return exact;
  return guests.list.filter(function (g) { return !g.last && firstWord === g.first; });
}

function setCell(guests, row, header, value) {
  var j = guests.col[header];
  if (j === undefined) return;
  guests.sheet.getRange(row, j + 1).setValue(value);
}

function splitNames(s) {
  return s.split(/\s*(?:,|&|\band\b|\+)\s*/i).map(function (x) { return x.trim(); }).filter(String);
}

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Trim, cap length, and stop text being read as a spreadsheet formula.
function clean(v) {
  v = String(v || '').trim().slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

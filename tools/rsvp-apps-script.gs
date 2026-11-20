/**
 * Wedding RSVP receiver: appends each RSVP from the website to this spreadsheet.
 * Setup: open the "Wedding RSVPs" sheet > Extensions > Apps Script, paste this file,
 * then Deploy > New deployment > Web app (Execute as: Me; Who has access: Anyone).
 */
var HEADERS = ['Submitted', 'Name(s)', 'Email', 'Attending', 'Meal', 'Dietary needs', 'Note'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    var p = (e && e.parameter) || {};
    // Trim, cap length, and stop text being read as a spreadsheet formula.
    var clean = function (v) {
      v = String(v || '').trim().slice(0, 1000);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    };
    if (!clean(p.name)) return reply({ ok: false, error: 'missing name' });
    sheet.appendRow([new Date(), clean(p.name), clean(p.email), clean(p.attending),
                     clean(p.meal), clean(p.diet), clean(p.note)]);
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

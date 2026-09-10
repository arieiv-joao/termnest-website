/**
 * Termnest waitlist — Google Apps Script bound to the "Termnest waitlist" sheet.
 *
 * One script, four jobs, no other app:
 *   doPost      – the website form posts here → one row per email, confirmation email
 *   onStatusEdit – set a row's Status to "Invited" → the invite email goes out
 *   weeklyDigest – Monday 08:00 (Dubai) summary to hello@termnest.app
 *   setup        – run ONCE by hand: headers, validation, triggers
 *
 * Emails send from the Workspace account that deploys the script (hello@termnest.app).
 * Sheet columns (row 1): Timestamp | Email | Emirate | School | Source | Status | Invited at | Installed at | Notes
 */

var SHEET = 'Waitlist';
var HEADERS = ['Timestamp', 'Email', 'Emirate', 'School', 'Source', 'Status', 'Invited at', 'Installed at', 'Notes'];
var STATUSES = ['New', 'Invited', 'Installed', 'Active', 'Churned', 'Not a fit'];
var FROM_NAME = 'Termnest';
var REPLY_TO = 'hello@termnest.app';
var ANDROID_INSTALL_URL = 'https://termnest.app/join';   // update when the beta install page exists
var TESTFLIGHT_URL = '';                                 // set once iOS is on TestFlight

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
}

/** Run once from the editor: headers, dropdown, triggers. Re-running is harmless. */
function setup() {
  var sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  sh.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  sh.getRange(2, 6, 5000, 1).setDataValidation(rule);
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('weeklyDigest').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone('Asia/Dubai').create();
}

/** Website form → row + confirmation. Accepts form-encoded or JSON bodies. */
function doPost(e) {
  var p = e.parameter || {};
  if (!Object.keys(p).length && e.postData && e.postData.contents) {
    try { p = JSON.parse(e.postData.contents); } catch (err) { p = {}; }
  }
  if (p.website) return json_({ ok: true });                       // honeypot: bots fill it, people don't
  var email = String(p.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ ok: false, error: 'invalid email' });

  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sh = sheet_();
    var emails = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); }) : [];
    if (emails.indexOf(email) !== -1) return json_({ ok: true, duplicate: true });
    sh.appendRow([new Date(), email, String(p.emirate || ''), String(p.school || '').slice(0, 120), String(p.source || 'website'), 'New', '', '', '']);
  } finally { lock.releaseLock(); }

  try {
    send_(email, "You're on the Termnest waitlist", [
      "Thanks — you're on the list.",
      "Termnest turns your school's emails into one organised, per-child feed of events, tasks and fee reminders. We're letting families in a few at a time during the beta; you'll hear from us at this address when it's your turn.",
      "Reply to this email if you have a question.",
    ]);
  } catch (err) { /* the row is what matters; a failed confirmation is visible in the digest */ }
  return json_({ ok: true });
}

/** Status set to "Invited" by hand → invite email, Invited-at stamped. */
function onStatusEdit(e) {
  var r = e.range; var sh = r.getSheet();
  if (sh.getName() !== SHEET || r.getColumn() !== 6 || r.getRow() < 2) return;
  if (String(r.getValue()) !== 'Invited') return;
  var row = r.getRow();
  var email = String(sh.getRange(row, 2).getValue());
  if (sh.getRange(row, 7).getValue()) return;                           // already invited once
  send_(email, "Your Termnest invite", [
    "It's your turn.",
    "<ol style=\"margin:0;padding-left:20px\"><li>Install Termnest: <a href=\"" + ANDROID_INSTALL_URL + "\">" + ANDROID_INSTALL_URL + "</a>" +
      (TESTFLIGHT_URL ? "<br>iPhone: <a href=\"" + TESTFLIGHT_URL + "\">" + TESTFLIGHT_URL + "</a>" : "") +
      "</li><li>Sign in with this email address.</li><li>Add your children, connect your school Gmail, approve the school senders — about three minutes.</li></ol>",
    "Termnest only reads mail from the school senders you approve, and every item shows the email it came from. If anything looks wrong, reply here — during the beta you're talking to the person who built it.",
  ]);
  sh.getRange(row, 7).setValue(new Date());
}

/** Monday summary to hello@ — signups, by emirate, and where the funnel stands. */
function weeklyDigest() {
  var sh = sheet_(); if (sh.getLastRow() < 2) return;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
  var weekAgo = new Date(Date.now() - 7 * 864e5);
  var recent = rows.filter(function (r) { return r[0] instanceof Date && r[0] > weekAgo; });
  var count = function (list, idx) { var m = {}; list.forEach(function (r) { var k = String(r[idx] || '—'); m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return '  ' + k + ': ' + m[k]; }).join('\n'); };
  var body = 'Waitlist — week to ' + new Date().toDateString() + '\n\n' +
    'New signups this week: ' + recent.length + '\n' + count(recent, 2) + '\n\n' +
    'Total: ' + rows.length + '\nBy status:\n' + count(rows, 5) + '\n\nSchools mentioned this week:\n' + count(recent.filter(function (r) { return r[3]; }), 3) +
    '\n\nSheet: ' + SpreadsheetApp.getActive().getUrl();
  GmailApp.sendEmail(REPLY_TO, 'Termnest waitlist — weekly digest', body, { name: FROM_NAME });
}

/**
 * One paragraph per array entry, in a plain readable layout; Gmail reflows
 * hard-wrapped plain text unevenly, HTML paragraphs don't. Entries may hold
 * inline HTML. A plain-text alternative is generated for clients that need it.
 */
function send_(to, subject, paragraphs) {
  var html = '<div style="font:16px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,sans-serif;color:#143D38;max-width:560px">' +
    paragraphs.map(function (p) { return '<p style="margin:0 0 16px">' + p + '</p>'; }).join('') +
    '<p style="margin:24px 0 0;color:#5B6E6B">— Joao, Termnest<br><a href="https://termnest.app" style="color:#1F7A6F">termnest.app</a></p></div>';
  var text = paragraphs.map(function (p) { return p.replace(/<li>/g, '\n- ').replace(/<[^>]+>/g, ''); }).join('\n\n') + '\n\n— Joao, Termnest\nhttps://termnest.app';
  GmailApp.sendEmail(to, subject, text, { name: FROM_NAME, replyTo: REPLY_TO, htmlBody: html });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

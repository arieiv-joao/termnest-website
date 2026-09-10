# Waitlist — Google Sheet + Apps Script (founder setup, ~10 minutes, once)

Everything lives in Google Workspace: the sheet is the list, the script is
the form endpoint, the confirmation/invite emails, and the Monday digest.

1. Signed in as **hello@termnest.app**, create a Google Sheet named
   `Termnest waitlist`.
2. Extensions → Apps Script. Delete the sample code, paste all of `Code.gs`,
   save (name the project "Termnest waitlist").
3. In the editor pick the function **`setup`** and Run. Approve the
   permissions prompt (Sheets + Gmail; it's your own account). This writes
   the headers, the Status dropdown and the two triggers.
4. Deploy → **New deployment** → type **Web app** → Execute as **Me**, Who has
   access **Anyone** → Deploy. Copy the **Web app URL**
   (`https://script.google.com/macros/s/…/exec`) and send it to me — I put it
   in `index.html` (`WAITLIST_ENDPOINT`) and the form goes live.
5. Test: submit the form on termnest.app with your own address. A row appears
   in the sheet and a confirmation email arrives within a minute.

Day to day:
- New signups land as **New**. To invite someone, change their Status to
  **Invited** — the invite email goes out and "Invited at" is stamped.
- Set **Installed** / **Active** by hand for now; the app will stamp these
  automatically later.
- Monday 08:00 Dubai: digest to hello@ (new signups, by emirate, funnel).

Notes:
- Bots: a hidden `website` field is a honeypot; filled → silently dropped.
- Duplicates: one row per email; a repeat submit is a no-op.
- Editing `Code.gs` later: paste the new version, then Deploy → Manage
  deployments → edit → New version (the URL stays the same).
- Update `ANDROID_INSTALL_URL` / `TESTFLIGHT_URL` in the script when the
  beta install page and TestFlight exist.

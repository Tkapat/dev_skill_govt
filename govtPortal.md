==================================================================
 dev_skill_gov: GOVERNMENT PORTAL, PAGE PLAN   (v2: MongoDB + GSAP)
 Give with UI/UX blocks 6A + 6B and the "Frontend Patch" block (M5).
==================================================================

RULES FOR THE AI BUILDER (read first)
------------------------------------------------------------------
 1. Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
    Libraries: @tanstack/react-query, react-hook-form + zod,
    gsap + @gsap/react, recharts, react-leaflet, lucide-react, sonner,
    next-themes, qrcode.react (MFA QR).
    DO NOT install: framer-motion, @supabase/*. There is no Supabase.
    Animation = GSAP helpers only (lib/gsap.ts, lib/motion.tsx, UI plan 6B).
    Fonts = next/font/google only (UI plan 6A). Do NOT use Next middleware
    for auth. Use client-side tokens and an <AuthGate>.
 2. AUTH IS THE BACKEND (JWT). Endpoints: POST /auth/login,
    /auth/mfa/login, /auth/refresh, /auth/logout, GET /me,
    POST /me/change-password, POST /me/mfa/setup, POST /me/mfa/enable.
    Tokens live in lib/auth.ts (access 30 min + refresh 7 days).
    Use lib/auth.ts and lib/api.ts exactly as given in the Frontend Patch.
 3. lib/api.ts: fetch wrapper using NEXT_PUBLIC_API_URL, adds
    Authorization: Bearer <access_token> and header
    "ngrok-skip-browser-warning": "true". On 401 it silently refreshes once
    (single-flight); if refresh fails -> clear tokens + /login.
    On 403 code PASSWORD_CHANGE_REQUIRED -> /change-password.
    On 403 code CREDENTIALS_EXPIRED -> message "Ask the department to
    reset these credentials."
    Error shape from API: {detail:{detail,code}}. Map codes in
    lib/strings.ts (ACCOUNT_LOCKED, INVALID_CREDENTIALS, BAD_MFA,
    WEAK_PASSWORD, SAME_PASSWORD, LINK_EXPIRED, BAD_STATE, FORBIDDEN).
 4. After login call GET /me. Allowed roles here: super_admin,
    scheme_officer, auditor. Otherwise logout() and show
    "This account belongs to the Centre portal."
 5. auditor = read-only: hide/disable every action button.
    scheme_officer cannot open /users. Only super_admin edits schemes.
 6. Every page needs: loading skeleton, empty state, error state with
    Retry. Never show a blank screen.
 7. EVIDENCE AND DOCUMENT IMAGES: the API returns RELATIVE signed URLs
    (/files/evidence/<id>?exp=&sig=, valid 60 s). NEVER put them directly
    in <img src>. Always load via the useSignedImage hook (fetch + ngrok
    header -> blob URL) and show a skeleton while null. On LINK_EXPIRED
    refetch the parent query to get fresh URLs. Never build URLs yourself.
    Documents (PDF) open the same way: fetch -> blob -> window.open.
 8. Dates in IST (Asia/Kolkata), format "12 Oct 2026, 3:45 pm"
    (lib/format.ts). Relative time with exact time in a Tooltip.
 9. Env (.env.local): NEXT_PUBLIC_API_URL ONLY. No database, Supabase or
    secret keys in this app, ever.
10. Poll live lists (overview, flags, cameras) every 15 s with React Query
    refetchInterval. No websockets. Polling must NOT replay entrance
    animations (UI plan 6B rule R5); new rows only get flash().
11. IDs from the API are plain strings under the key "id". Lists use
    limit + cursor pagination (?limit=25&cursor=<id>). Do not assume
    page numbers.
12. Do not add pages or features not listed.

GLOBAL LAYOUT
------------------------------------------------------------------
 Left sidebar (collapsible, 240 px / 64 px icon mode) + top bar
 (breadcrumb, search, notifications bell with open-flag count, theme
 toggle, profile menu). Sidebar items: Overview, Applications, Centres,
 Flags, Cameras, Requests, Enforcement, Schemes, Reports, Accuracy,
 Audit log, Users (super_admin only), Settings.
 Mobile (<768): hamburger opens a Sheet with the same nav.

PAGES
------------------------------------------------------------------
 /login
   Login ID field (govt = email) + password, show/hide toggle,
   "Government Monitoring Portal" title, static CSS grid background
   (.login-grid). Calls POST /auth/login {login_id, password}.
   If response has mfa_required -> show a 6-digit code step and call
   POST /auth/mfa/login {mfa_token, code}. Errors inline, shake on error.
   Messages: INVALID_CREDENTIALS "Incorrect ID or password",
   ACCOUNT_LOCKED "Too many attempts. Try again in a few minutes.",
   BAD_MFA "Incorrect code". Never say which of ID/password was wrong.

 /change-password (shown when API says PASSWORD_CHANGE_REQUIRED, and
   reachable from /settings)
   Fields: current password, new password, confirm. Live strength meter
   (<Meter/>). Rules: min 10, upper, lower, digit, special.
   POST /me/change-password {current_password, new_password}.
   Response contains fresh tokens: store them and go to / (no re-login).

 / (Overview)
   - KPI row (CountUp): Live centres, Open flags, High/Critical flags,
     Cameras offline, Pending applications.
   - Map (react-leaflet, OSM tiles, dynamic ssr:false): pins coloured by
     risk (green <25, amber 25-60, red >60). Click -> mini card ->
     "Open centre".
   - Left list "Highest risk centres" (top 8, risk Meter).
   - Right list "Latest flags" (severity dot, type, centre, time).
   - Chart: flags per day last 14 days (stacked by severity).
   Data: GET /reports/rollup?by=district, GET /flags?limit=10,
         GET /centres?sort=risk&limit=8, GET /cameras?status=offline,
         GET /applications?status=submitted&limit=1 (count only)

 /applications
   Tabs: Pending | Under review | Query raised | Approved | Rejected,
   each with count badge. Table: tracking code (mono), centre name,
   applicant, scheme/trade, district, max trainees, submitted date.
   Search + filters. Row click -> /applications/[id].
   Button "Create centre directly" -> /centres/new (not for auditor).

 /applications/[id]  (review page, two columns)
   Left: submitted fields in grouped cards (Centre, Scheme and trade,
   Trainers, Capacity, Equipment table with sanctioned qty, Location with
   small map, Room and internet, Proposed batches, Documents list
   (open via signed URL), Review history = application.events[]).
   Right sticky panel:
     - "Checks" card: plausibility warnings from API (amber list) or
       green "Equipment matches template".
     - Actions: Approve, Raise query (comment required), Reject
       (reason required). Confirm dialog for each.
   After Approve -> CREDENTIALS MODAL (cannot be reopened):
     Centre ID, temporary password (mono), Copy buttons, red note
     "Shown once. Expires in 72 hours. Share only with the centre
     contact.", button "I have saved it" (disabled for 3 s, ring timer).
     Print view. Modal cannot close by Esc/overlay until saved.
     Clear the password from memory when closed.
   If the API returns 409 BAD_STATE (already approved / double click),
   show "This application was already processed" and refetch.
   Auditor sees no action panel.

 /centres
   Table/grid toggle. Columns: code, name, district, scheme/trade,
   status chip, risk score bar, open flags, last session, camera status.
   Filters: district, scheme, status, risk range. Search.

 /centres/new  (govt direct creation)
   Same multi-step form as the public application (stepper, 5 steps:
   Centre -> Scheme -> Capacity and equipment -> Location and room ->
   Review). Equipment rows prefilled from the template (editable).
   Plausibility warnings show live. POST /centres -> credentials modal.
   Audit-logged as created_by_govt.

 /centres/[id]  (command page; tabs, URL ?tab=)
   Header: name, code, status chip, risk score, action menu
   (Message, Issue notice, Reset credentials, Suspend, Terminate,
   Request inspection). Suspend/Terminate only through the enforcement
   ladder dialog (pick level + write reason). Reset credentials ->
   POST /centres/{id}/reset-credentials -> credentials modal.
   Tabs:
    1 Overview: sanctioned summary, checklist state, contact, map,
      enrolled / max Meter.
    2 Attendance: line/area chart CLAIMED vs OBSERVED per session (with
      observed range band; uncertain sessions = hollow dots), table of
      sessions with delta and flag chip. Date range picker.
      Data: GET /centres/{id}/attendance?from=&to=
    3 Equipment: compliance matrix, rows = equipment class, columns =
      Sanctioned | Declared | Observed (range) | Status chip
      (OK / Missing / Idle / Non-operational / Repair approved).
    4 Cameras: list with health, last frame time, setup status,
      reference frame with ROI overlay (read-only polygon from
      normalised points), approve/reject setup buttons (reject needs
      a reason).
    5 Flags: filtered table for this centre.
    6 Evidence: grid of blurred thumbnails (useSignedImage) with
      timestamp and linked flag; click -> lightbox.
    7 Notices and actions: enforcement timeline (Advisory -> ...),
      centre replies shown inline.
    8 Timeline: audit entries for this centre.

 /flags  (Flag console)
   Filters: severity, type, status, state (flagged/uncertain), centre,
   district, date. Table with severity dot, type code + plain name,
   centre, reason (one line), status, created, age. Bulk acknowledge.
   Row click opens right drawer (preview) or /flags/[id].

 /flags/[id]
   Header: type, severity badge, state badge, status.
   Section "Why this was flagged": plain-language reason + numbers
   (claimed, observed, range, margin, model version, threshold) from
   flag.details.
   Section "Evidence": blurred annotated thumbnails from
   flag.evidence_urls[] (relative signed URLs, via useSignedImage,
   lightbox).
   Section "Count history": bar chart of per-frame counts with claimed
   line overlay (ReferenceLine).
   Section "Centre response": comments and attachments from centre
   (flag.events entries with action "centre_respond").
   Section "Timeline": flag.events[] (embedded array: actor, action,
   comment, ts).
   Actions (not for auditor): Acknowledge, Resolve (comment), Dismiss as
   false positive (comment required; feeds FP log), Escalate -> opens
   notice dialog prefilled with this flag.
   POST /flags/{id}/action {action, comment}.

 /cameras
   Health board: cards or table with status dot (online, offline,
   tampered) + icon, last frame, centre, tamper reason, setup status.
   "Pending camera approvals" section on top with Approve/Reject.

 /requests
   Tabs: Change requests | Repair declarations. Each row: centre, kind,
   details, reason, date. Decide dialog: Approve / Reject + comment;
   for repairs choose "approved until" date (max 30 days from today).
   Approved equipment/enrolment changes update sanctioned data via API.
   Decided row fades out (0.25 s) then the list refetches.

 /enforcement
   Cross-centre ladder view. Table: centre, current level, last notice,
   open flags, next recommended step. "Issue notice" dialog: level,
   subject, body, attach flags. Terminate requires typing the centre
   code to confirm.

 /schemes
   List of schemes; click -> scheme page with trade templates.
 /schemes/[id]/templates/[tid]  (super_admin edit; others read-only)
   Form: trade name; detector classes (chips); equipment rules table
   (class, label, min units per trainee, operability: none | screen_on |
   in_use, required); presence rule (seated | workstation | any);
   tolerance, agree ratio, min confidence, base/step/max frames.
   Helper text explains each field. Save with zod validation
   (max_frames >= base_frames, agree_ratio 0.5..1).

 /reports
   Rollup by district / scheme / trade: total centres, avg risk, flags
   per 100 sessions, FP rate. Charts + table. Export CSV (client side)
   and "Print / Save PDF" via the print stylesheet.

 /accuracy
   Shows eval results (GET /accuracy): MAE, within-1 accuracy, per-class
   precision/recall, flag FP/FN by condition (table + small bars),
   baseline vs quantized comparison, UNCERTAIN rate. This is the
   FP/FN assessment deliverable.

 /audit-log   (super_admin, auditor)
   Table: time, actor, role, action, entity, details (expand JSON).
   Filters and CSV export. Read-only, no edit/delete anywhere.

 /users (super_admin)
   List govt users, create (email, name, role) -> API returns a
   temporary password shown ONCE in the credentials modal; deactivate.
   POST/GET /users.

 /settings
   Profile, change password (link to /change-password), theme toggle,
   MFA enrolment (TOTP):
     1 POST /me/mfa/setup -> render otpauth_uri as a QR (qrcode.react)
       and show the secret text in mono as a fallback.
     2 User enters the 6-digit code -> POST /me/mfa/enable {code}.
     3 Show status "MFA enabled".
   Recommend MFA for super_admin and scheme_officer.

ACCEPTANCE CHECKS
------------------------------------------------------------------
 - Centre account logging into this app is rejected politely.
 - Auditor cannot see any action button.
 - Approving an application shows the credentials modal exactly once;
   a double click yields BAD_STATE message, not a second centre.
 - Dismiss requires a comment. Terminate requires typed confirmation.
 - Every list has loading, empty, error states.
 - Evidence images display through useSignedImage (no ngrok warning
   page, no broken images) and refresh after LINK_EXPIRED.
 - Access token expiry is handled silently (refresh), no surprise logout.
 - 5 wrong passwords show the lockout message.
 - Changing the password keeps the user logged in with new tokens.
 - No Supabase, framer-motion or Supabase env variable anywhere in code.
 - Polling the flags page for 60 s does not replay row animations.
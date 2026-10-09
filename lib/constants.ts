export const FLAG_TYPES: Record<string, { name: string; hint: string }> = {
  A1: { name: "Attendance inflation", hint: "Claimed attendance is higher than the camera count" },
  A2: { name: "Over capacity", hint: "More people observed than the sanctioned maximum" },
  A3: { name: "Enrolment mismatch", hint: "Claimed attendance is higher than enrolled trainees" },
  A4: { name: "Ghost session", hint: "Attendance claimed but nobody observed" },
  A5: { name: "Unregistered attendees", hint: "Camera saw more people than were claimed" },
  E1: { name: "Equipment missing", hint: "Fewer items seen than sanctioned" },
  E2: { name: "Equipment non-operational", hint: "Item present but appears switched off or unused" },
  E3: { name: "Declaration mismatch", hint: "Declared inventory differs from sanctioned" },
  S1: { name: "Trainer not verified", hint: "No face-verified trainer for this session" },
  C1: { name: "Camera problem", hint: "Camera offline, covered, moved, frozen or dark" },
  C2: { name: "Replay suspicion", hint: "Footage looks repeated from an earlier session" },
  C3: { name: "Missed capture windows", hint: "Fewer captures than planned" },
  D1: { name: "Data integrity", hint: "Record chain or signature failed verification" },
  U1: { name: "Unverifiable count", hint: "Counts unstable; needs human review" },
  P1: { name: "Capacity implausible", hint: "Equipment does not match trainee capacity" },
};

export const SEVERITY = {
  low: { label: "Low", cssVar: "--sev-low", icon: "Minus" },
  medium: { label: "Medium", cssVar: "--sev-medium", icon: "ChevronUp" },
  high: { label: "High", cssVar: "--sev-high", icon: "ChevronsUp" },
  critical: { label: "Critical", cssVar: "--sev-critical", icon: "AlertOctagon" },
} as const;

export type Severity = keyof typeof SEVERITY;

export const FLAG_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  centre_responded: "Centre responded",
  under_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
  escalated: "Escalated",
};

export const CENTRE_STATUS_LABEL: Record<string, string> = {
  pending_setup: "Setting up",
  awaiting_camera_approval: "Awaiting camera approval",
  live: "Live",
  suspended: "Suspended",
  terminated: "Terminated",
};

export const ENFORCEMENT_LEVELS = [
  { id: "advisory", label: "Advisory" },
  { id: "notice", label: "Notice" },
  { id: "warning", label: "Warning" },
  { id: "suspension", label: "Suspension" },
  { id: "termination", label: "Termination" },
] as const;

export const APPLICATION_TABS = [
  { id: "submitted", label: "Pending" },
  { id: "under_review", label: "Under review" },
  { id: "query_raised", label: "Query raised" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
] as const;

export const GOVT_ROLES = ["super_admin", "scheme_officer", "auditor"] as const;
export type GovtRole = (typeof GOVT_ROLES)[number];

export const COPY_DONE = "Copied";

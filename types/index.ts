export interface User {
  id: string;
  login_id: string;
  role: "super_admin" | "scheme_officer" | "auditor" | "centre_admin" | "trainer";
  centre_id?: string;
  full_name: string;
  phone?: string;
  must_change_password: boolean;
  temp_password_expires_at?: string;
  active: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  centre?: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
}

export interface Centre {
  id: string;
  code: string;
  name: string;
  scheme_id: string;
  trade_template_id: string;
  max_trainees: number;
  enrolled_count: number;
  address: string;
  district: string;
  state: string;
  lat?: number;
  lng?: number;
  contact_phone: string;
  contact_email?: string;
  equipment: CentreEquipment[];
  status: "pending_setup" | "awaiting_camera_approval" | "live" | "suspended" | "terminated";
  status_reason?: string;
  risk_score: number;
  live_since?: string;
  created_by_govt: boolean;
  created_at: string;
  updated_at: string;
}

export interface CentreEquipment {
  class: string;
  label: string;
  sanctioned_qty: number;
  declared_qty: number;
}

export interface Application {
  id: string;
  tracking_code: string;
  applicant_name: string;
  applicant_type: "municipality" | "panchayat" | "ngo" | "other";
  contact_phone: string;
  contact_email?: string;
  centre_name: string;
  scheme_id: string;
  trade_template_id: string;
  trainers: { name: string; qualification: string }[];
  max_trainees: number;
  equipment: { class: string; label: string; qty: number }[];
  address: string;
  district: string;
  state: string;
  lat?: number;
  lng?: number;
  room_info?: { size_sqft: number; cameras: number; resolution: string };
  internet_availability?: "none" | "intermittent" | "stable";
  proposed_batches?: Record<string, unknown>[];
  documents: { name: string; file_id: string; size: number; content_type: string }[];
  status: "submitted" | "under_review" | "query_raised" | "resubmitted" | "approved" | "rejected";
  review_comment?: string;
  reviewed_by?: string;
  centre_id?: string;
  created_by_govt: boolean;
  events: ApplicationEvent[];
  submitted_at: string;
  updated_at: string;
  plausibility_warnings?: string[];
}

export interface ApplicationEvent {
  actor?: string;
  action: string;
  comment?: string;
  ts: string;
}

export interface Flag {
  id: string;
  centre_id: string;
  session_id?: string;
  observation_id?: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  state: "flagged" | "uncertain";
  status: "open" | "acknowledged" | "centre_responded" | "under_review" | "resolved" | "dismissed" | "escalated";
  reason: string;
  details?: {
    claimed: number;
    observed: number;
    ci_low: number;
    ci_high: number;
    margin: number;
    threshold: number;
    per_frame_counts: number[];
  };
  evidence_ids: string[];
  evidence_urls?: string[];
  model_version?: string;
  ledger_hash?: string;
  events: FlagEvent[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface FlagEvent {
  actor?: string;
  actor_role?: string;
  action: string;
  comment?: string;
  attachments?: Record<string, unknown>[];
  ts: string;
}

export interface Camera {
  id: string;
  centre_id: string;
  name: string;
  source_uri: string;
  resolution?: string;
  roi_polygon?: number[][];
  zones?: { name: string; polygon: number[][] }[];
  reference_phash?: string;
  reference_blob_id?: string;
  reference_width?: number;
  reference_height?: number;
  reference_quality?: { brightness: number; sharpness: number; coverage: number };
  setup_status: "draft" | "submitted" | "approved" | "rejected";
  reject_reason?: string;
  submitted_at?: string;
  decided_by?: string;
  decided_at?: string;
  status: "unknown" | "online" | "offline" | "tampered";
  last_tamper_reason?: string;
  last_seen?: string;
  created_at: string;
}

export interface Batch {
  id: string;
  centre_id: string;
  name: string;
  trainer_id?: string;
  weekdays: number[];
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  created_at: string;
}

export interface Trainee {
  id: string;
  centre_id: string;
  batch_id?: string;
  full_name: string;
  external_id?: string;
  active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  centre_id: string;
  user_id?: string;
  full_name: string;
  staff_role: "trainer" | "official";
  phone?: string;
  face_consent: boolean;
  face_consent_at?: string;
  face_enrolled: boolean;
  active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  centre_id: string;
  batch_id: string;
  session_date: string;
  start_ts: string;
  end_ts: string;
  status: "scheduled" | "active" | "closed" | "missed";
  planned_captures: number;
  done_captures: number;
}

export interface AttendanceClaim {
  session_id: string;
  centre_id: string;
  claimed_count: number;
  present_trainee_ids: string[];
  marked_by: string;
  marked_at: string;
  edit_reason?: string;
  edit_count: number;
}

export interface Observation {
  id: string;
  centre_id: string;
  session_id?: string;
  camera_id?: string;
  hour_bucket: string;
  observed_count?: number;
  ci_low?: number;
  ci_high?: number;
  state: "ok" | "uncertain";
  frames_used: number;
  per_frame_counts: number[];
  equipment?: Record<string, { observed: number; ci_low: number; ci_high: number; consistent: boolean }>;
  tamper: string[];
  model_version?: string;
  ledger_hash?: string;
  created_at: string;
}

export interface RepairDeclaration {
  id: string;
  centre_id: string;
  equipment_class: string;
  qty: number;
  reason: string;
  expected_fix_date: string;
  status: "pending" | "approved" | "rejected" | "expired";
  approved_until?: string;
  decided_by?: string;
  decision_comment?: string;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  centre_id: string;
  kind: "equipment" | "enrolment" | "batch" | "camera";
  payload: Record<string, unknown>;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decided_by?: string;
  decision_comment?: string;
  decided_at?: string;
  created_at: string;
}

export interface Notice {
  id: string;
  centre_id: string;
  level: "advisory" | "notice" | "warning" | "suspension" | "termination";
  subject: string;
  body: string;
  flag_ids: string[];
  issued_by: string;
  read_at?: string;
  reply?: string;
  replied_at?: string;
  created_at: string;
}

export type LiveState = "live" | "idle" | "offline" | "tampered" | "provisional";

export interface LiveCounts {
  live: number;
  idle: number;
  offline: number;
  tampered: number;
  provisional: number;
}

export interface LiveItem {
  present: number;
  in_use: number;
  idle: number;
  off: number;
}

export interface LiveStatus {
  camera_id: string;
  camera_name: string;
  centre_id: string;
  centre_code: string;
  centre_name: string;
  district: string;
  state: LiveState;
  ts: string;
  interval_s: number;
  session: { id: string; label: string; start_ts: string; end_ts: string } | null;
  people: number;
  people_smooth: number;
  claimed: number | null;
  items: Record<string, LiveItem>;
  quality: { ok: boolean; reasons: string[] };
  thumb_url: string;
  spark: number[];
  model_version: string;
}

export interface LiveFeed {
  items: LiveStatus[];
  counts: LiveCounts;
}

export type CalendarDayStatus =
  | "ok"
  | "attention"
  | "critical"
  | "no_data"
  | "holiday"
  | "upcoming"
  | "none";

export interface TimelinePoint {
  ts: string;
  people: number;
  items?: Record<string, { present: number; in_use: number }>;
  camera_id?: string;
}

export interface LiveFlagSummary {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  reason: string;
  created_at: string;
}

/** GET /centres/{id}/live */
export interface CentreLiveFeed {
  items: LiveStatus[];
  counts: LiveCounts;
  /** today's merged points, newest last (max 240) */
  timeline: TimelinePoint[];
  flags: LiveFlagSummary[];
}

export interface CalendarDayFlags {
  total: number;
  open: number;
  max_severity: "low" | "medium" | "high" | "critical";
}

export interface CalendarDay {
  date: string;
  status: CalendarDayStatus;
  snapshots: number;
  updates: number;
  sessions: number;
  people_max: number | null;
  people_avg: number | null;
  claimed: number | null;
  observed: number | null;
  delta: number | null;
  flags: CalendarDayFlags | null;
  uptime_pct: number | null;
  in_use_pct: number | null;
}

export interface CalendarSession {
  id: string;
  batch: string | null;
  label: string | null;
  start_ts: string;
  end_ts: string;
  state: string;
  claimed: number | null;
  observed: number | null;
  ci_low: number | null;
  ci_high: number | null;
  delta: number | null;
  staff_verified: boolean | null;
  snapshots: number;
}

export interface DayEquipment {
  class: string;
  label: string;
  sanctioned: number;
  declared: number;
  present_avg: number;
  present_max: number;
  in_use_avg: number;
  in_use_pct: number;
  status: string;
}

export interface DayFlag {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  reason: string;
  created_at: string;
  evidence_urls: string[];
}

export interface DayEvidence {
  id: string;
  ts: string;
  kind: string;
  url: string;
}

export interface CameraHealthEvent {
  ts: string;
  status: string;
  reason: string;
  camera_id: string;
}

export interface DayEvent {
  ts: string;
  kind: string;
  text: string;
}

/** GET /centres/{id}/calendar/{date} */
export interface CalendarDayDetail {
  date: string;
  summary: CalendarDay;
  sessions: CalendarSession[];
  timeline: { interval_s: number; points: TimelinePoint[] };
  equipment: DayEquipment[];
  flags: DayFlag[];
  evidence: DayEvidence[];
  camera_health: CameraHealthEvent[];
  events: DayEvent[];
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string;
}

export interface FlagListParams {
  severity?: string;
  type?: string;
  status?: string;
  state?: string;
  centre_id?: string;
  district?: string;
  limit?: number;
  cursor?: string;
}

export interface CentreListParams {
  district?: string;
  scheme?: string;
  status?: string;
  q?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

export interface ApplicationListParams {
  status?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}
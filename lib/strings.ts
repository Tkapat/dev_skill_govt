export const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_LOCKED: "Too many attempts. Try again in a few minutes.",
  INVALID_CREDENTIALS: "Incorrect ID or password",
  BAD_MFA: "Incorrect code",
  WEAK_PASSWORD: "Use 10+ characters with upper, lower, digit and special.",
  SAME_PASSWORD: "Choose a different password",
  LINK_EXPIRED: "Link expired. Please refresh.",
  BAD_STATE: "This action cannot be performed in the current state.",
  FORBIDDEN: "You do not have permission to perform this action.",
  BAD_TOKEN: "Session expired. Please log in again.",
  TOKEN_EXPIRED: "Session expired. Please log in again.",
  CREDENTIALS_EXPIRED: "Ask the department to reset these credentials.",
  PASSWORD_CHANGE_REQUIRED: "Please change your password first.",
  ENROLMENT_CAP_REACHED: "Sanctioned limit reached. Request extra enrolment.",
  CLAIM_LOCKED: "Already submitted. Provide an edit reason.",
  WRONG_CENTRE: "Not your centre.",
  CENTRE_INACTIVE: "Centre is not active.",
  BAD_FILE: "PDF, JPG or PNG only.",
  FILE_TOO_LARGE: "Max 5 MB.",
  LOGIN_EXISTS: "Login already exists.",
  NOT_FOUND: "Not found.",
  INVALID_ROLE: "Invalid role.",
  INVALID_KIND: "Invalid request kind.",
  INVALID_LEVEL: "Invalid enforcement level.",
  NO_CONFIRMATION: "Confirmation required.",
  NO_REASON: "Reason required.",
  NO_COMMENT: "Comment required.",
  NO_ROI: "ROI not set.",
  BAD_ID: "Invalid ID.",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
};

export function getErrorMessage(code?: string, fallback = "Something went wrong"): string {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] ?? fallback;
}
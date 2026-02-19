export type AssignJob = {
  id: string;
  customer: string;
  date: string;
};

export type InProgressJob = {
  id: string;
  customer: string;
  assignee: string | null;
  date: string;
  action: "proofs" | "done";
};

export type JobLine = {
  no: number;
  rimSize: string;
  rimType: string;
  damage: string;
  repairs: string;
  comments: string;
  assignee: string;
  status: "completed" | "in-progress";
  action: "proofs" | "done" | null;
};

// ─── Mock data — replace with real API data when backend is ready ──────────────

export type NewJob = {
  id: string;
  customer: string;
  date: string;
};

export const MOCK_NEW_JOBS: NewJob[] = [];

export const MOCK_ASSIGN_JOBS: AssignJob[] = [
  { id: "5118", customer: "Smith Jack", date: "Thu, Jun 02 11:48 AM" },
  { id: "5116", customer: "Savannah Nguyen", date: "Mon, Jun 01 12:16 AM" },
  { id: "5115", customer: "Dianne Russell", date: "Fri, May 29 10:10 AM" },
];

export const MOCK_IN_PROGRESS_JOBS: InProgressJob[] = [
  { id: "5118", customer: "Smith Jack", assignee: "heaven dev", date: "Thu, Jun 02 11:48 AM", action: "proofs" },
  { id: "5116", customer: "Savannah Nguyen", assignee: "ankit patel", date: "Mon, Jun 01 12:16 AM", action: "done" },
  { id: "5115", customer: "Dianne Russell", assignee: null, date: "Fri, May 29 10:10 AM", action: "proofs" },
];

export const MOCK_JOB_LINES: Record<string, { customer: string; lines: JobLine[] }> = {
  "5118": {
    customer: "Smith Jack",
    lines: [
      { no: 1, rimSize: `10"`, rimType: "Factory", damage: "MEDIUM", repairs: "2 x Bends", comments: "", assignee: "heaven dev", status: "completed", action: null },
      { no: 2, rimSize: `11"`, rimType: "Off market", damage: "SEVERE", repairs: "1 x Cracks", comments: "", assignee: "ankit patel", status: "in-progress", action: "proofs" },
      { no: 3, rimSize: `13"`, rimType: "Factory", damage: "MEDIUM", repairs: "2 x Straighten", comments: "", assignee: "darshan Prajapati", status: "in-progress", action: "done" },
    ],
  },
  "5116": {
    customer: "Savannah Nguyen",
    lines: [
      { no: 1, rimSize: `11"`, rimType: "Off market", damage: "SEVERE", repairs: "1 x Cracks", comments: "", assignee: "ankit patel", status: "in-progress", action: "done" },
    ],
  },
  "5115": {
    customer: "Dianne Russell",
    lines: [
      { no: 1, rimSize: `13"`, rimType: "Factory", damage: "MEDIUM", repairs: "2 x Straighten", comments: "", assignee: "darshan Prajapati", status: "in-progress", action: "proofs" },
    ],
  },
};

export type CompletedJob = {
  id: string;
  customer: string;
  assignee: string | null;
  date: string;
};

export const MOCK_COMPLETED_JOBS: CompletedJob[] = [
  { id: "5118", customer: "Smith Jack", assignee: "heaven dev", date: "Thu, Jun 02 11:48 AM" },
  { id: "5116", customer: "Savannah Nguyen", assignee: null, date: "Mon, Jun 01 12:16 AM" },
  { id: "5115", customer: "Dianne Russell", assignee: null, date: "Fri, May 29 10:10 AM" },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

export const TAB_CONFIG = [
  { value: "new", label: "New" },
  { value: "assign", label: "Assign" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export type TabValue = (typeof TAB_CONFIG)[number]["value"];

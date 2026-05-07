export type Role = 'admin' | 'loa' | 'agent';
export type Urgency = 'URGENT' | 'HOT' | 'Cold';
export type LoanType = 'purchase' | 'refinance';
export type NoteType = 'private' | 'public';

export type LoanStatus =
  | 'Waiting to interview'
  | 'Waiting on Application'
  | 'Waiting on Documents'
  | 'Application completed'
  | 'Pre-approved'
  | 'Ratified'
  | 'Submitted'
  | 'Loan Setup'
  | 'Disclosed'
  | 'Submitted to UW'
  | 'Approved w/ Conditions'
  | 'Re-submittal'
  | 'Pending CTC'
  | 'CTC'
  | 'Closed'
  | 'On Hold'
  | 'Conditionally approved'
  | 'Waiting on App/Doc';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  urgency?: Urgency;
  status: LoanStatus;
  lead_source?: string;
  agent_id?: string;
  loa_id?: string;
  loan_type?: LoanType;
  loan_program?: string;
  property_price?: string;
  ltv?: string;
  date_received?: string;
  consultation_date?: string;
  closing_date?: string;
  financing_contingency_date?: string;
  appraisal_contingency_date?: string;
  group_text_sent: boolean;
  email_intro_sent: boolean;
  last_updated_at: string;
  last_updated_by?: string;
  submitted_by_agent: boolean;
  agent_submission_acknowledged: boolean;
  delete_requested: boolean;
  delete_requested_by?: string;
  created_at: string;
  agent?: Profile;
  loa?: Profile;
}

export interface Note {
  id: string;
  client_id: string;
  author_id: string;
  content: string;
  note_type: NoteType;
  created_at: string;
  author?: Profile;
}

export interface AuditLog {
  id: string;
  client_id: string;
  user_id: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: Profile;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by: string;
  client_id?: string;
  is_complete: boolean;
  completion_note?: string;
  due_date?: string;
  last_reminder_sent?: string;
  created_at: string;
  assignee?: Profile;
  assigner?: Profile;
  client?: Client;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_client_id?: string;
  related_task_id?: string;
  created_at: string;
}

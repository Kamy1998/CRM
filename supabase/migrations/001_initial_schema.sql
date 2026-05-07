-- ============================================================
-- 001_initial_schema.sql
-- 4Ever Lending CRM - Full database schema
-- Apply this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text,
  full_name text,
  role text CHECK (role IN ('admin', 'loa', 'agent')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,

  -- Pipeline metadata
  urgency text CHECK (urgency IN ('URGENT', 'HOT', 'Cold')),
  status text CHECK (status IN (
    'Waiting to interview',
    'Waiting on Application',
    'Waiting on Documents',
    'Application completed',
    'Pre-approved',
    'Ratified',
    'Submitted',
    'Loan Setup',
    'Disclosed',
    'Submitted to UW',
    'Approved w/ Conditions',
    'Re-submittal',
    'Pending CTC',
    'CTC',
    'Closed',
    'On Hold',
    'Conditionally approved',
    'Waiting on App/Doc'
  )),
  lead_source text,

  -- Assignments
  agent_id uuid REFERENCES profiles(id),
  loa_id uuid REFERENCES profiles(id),

  -- Loan details
  loan_type text CHECK (loan_type IN ('purchase', 'refinance')),
  loan_program text,
  property_price text,
  ltv text,

  -- Key dates
  date_received date,
  consultation_date date,
  closing_date date,
  financing_contingency_date date,
  appraisal_contingency_date date,

  -- Process checkboxes
  group_text_sent boolean DEFAULT false,
  email_intro_sent boolean DEFAULT false,

  -- System fields
  last_updated_at timestamptz DEFAULT now(),
  last_updated_by uuid REFERENCES profiles(id),
  submitted_by_agent boolean DEFAULT false,
  agent_submission_acknowledged boolean DEFAULT false,
  delete_requested boolean DEFAULT false,
  delete_requested_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  note_type text CHECK (note_type IN ('private', 'public')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id),
  assigned_by uuid REFERENCES profiles(id),
  client_id uuid REFERENCES clients(id),
  is_complete boolean DEFAULT false,
  completion_note text,
  due_date date,
  last_reminder_sent timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_client_id uuid REFERENCES clients(id),
  related_task_id uuid REFERENCES tasks(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: Auto-create profile on new auth user
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Audit log for client field changes
-- ============================================================
CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'status', OLD.status, NEW.status);
  END IF;
  IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'urgency', OLD.urgency, NEW.urgency);
  END IF;
  IF OLD.loa_id IS DISTINCT FROM NEW.loa_id THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'loa_id', OLD.loa_id::text, NEW.loa_id::text);
  END IF;
  IF OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'agent_id', OLD.agent_id::text, NEW.agent_id::text);
  END IF;
  IF OLD.closing_date IS DISTINCT FROM NEW.closing_date THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'closing_date', OLD.closing_date::text, NEW.closing_date::text);
  END IF;
  IF OLD.financing_contingency_date IS DISTINCT FROM NEW.financing_contingency_date THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'financing_contingency_date', OLD.financing_contingency_date::text, NEW.financing_contingency_date::text);
  END IF;
  IF OLD.appraisal_contingency_date IS DISTINCT FROM NEW.appraisal_contingency_date THEN
    INSERT INTO audit_log (client_id, user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.last_updated_by, 'field_updated', 'appraisal_contingency_date', OLD.appraisal_contingency_date::text, NEW.appraisal_contingency_date::text);
  END IF;
  -- Always update last_updated_at on any change
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER client_audit_trigger
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_client_changes();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: profiles
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_profiles_all" ON profiles
  FOR ALL
  USING (get_user_role() = 'admin');

-- LOA + Agent: read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- LOA + Agent: update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- RLS: clients
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_clients_all" ON clients
  FOR ALL
  USING (get_user_role() = 'admin');

-- LOA: SELECT all clients
CREATE POLICY "loa_clients_select" ON clients
  FOR SELECT
  USING (get_user_role() = 'loa');

-- LOA: UPDATE only assigned clients
CREATE POLICY "loa_clients_update" ON clients
  FOR UPDATE
  USING (get_user_role() = 'loa' AND loa_id = auth.uid());

-- LOA: INSERT new clients
CREATE POLICY "loa_clients_insert" ON clients
  FOR INSERT
  WITH CHECK (get_user_role() = 'loa');

-- Agent: SELECT only their own clients (restricted columns enforced at app layer + view)
CREATE POLICY "agent_clients_select" ON clients
  FOR SELECT
  USING (get_user_role() = 'agent' AND agent_id = auth.uid());

-- Agent: INSERT new client submissions
CREATE POLICY "agent_clients_insert" ON clients
  FOR INSERT
  WITH CHECK (get_user_role() = 'agent' AND agent_id = auth.uid());

-- ============================================================
-- RLS: notes
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_notes_all" ON notes
  FOR ALL
  USING (get_user_role() = 'admin');

-- LOA: read notes on their assigned clients (all types)
CREATE POLICY "loa_notes_select" ON notes
  FOR SELECT
  USING (
    get_user_role() = 'loa' AND
    EXISTS (
      SELECT 1 FROM clients c WHERE c.id = notes.client_id AND c.loa_id = auth.uid()
    )
  );

-- LOA: insert notes on their assigned clients
CREATE POLICY "loa_notes_insert" ON notes
  FOR INSERT
  WITH CHECK (
    get_user_role() = 'loa' AND
    EXISTS (
      SELECT 1 FROM clients c WHERE c.id = client_id AND c.loa_id = auth.uid()
    )
  );

-- Agent: SELECT only public notes on their clients
CREATE POLICY "agent_notes_select" ON notes
  FOR SELECT
  USING (
    get_user_role() = 'agent' AND
    note_type = 'public' AND
    EXISTS (
      SELECT 1 FROM clients c WHERE c.id = notes.client_id AND c.agent_id = auth.uid()
    )
  );

-- Agent: INSERT public notes only on their clients
CREATE POLICY "agent_notes_insert" ON notes
  FOR INSERT
  WITH CHECK (
    get_user_role() = 'agent' AND
    note_type = 'public' AND
    EXISTS (
      SELECT 1 FROM clients c WHERE c.id = client_id AND c.agent_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: audit_log
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_audit_all" ON audit_log
  FOR ALL
  USING (get_user_role() = 'admin');

-- LOA: read audit log for their assigned clients only
CREATE POLICY "loa_audit_select" ON audit_log
  FOR SELECT
  USING (
    get_user_role() = 'loa' AND
    EXISTS (
      SELECT 1 FROM clients c WHERE c.id = audit_log.client_id AND c.loa_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: tasks
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_tasks_all" ON tasks
  FOR ALL
  USING (get_user_role() = 'admin');

-- LOA + Agent: full access to their own tasks (assigned_to or assigned_by)
CREATE POLICY "users_tasks_own" ON tasks
  FOR ALL
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- ============================================================
-- RLS: notifications
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_notifications_all" ON notifications
  FOR ALL
  USING (get_user_role() = 'admin');

-- All users: full access to their own notifications
CREATE POLICY "users_notifications_own" ON notifications
  FOR ALL
  USING (user_id = auth.uid());

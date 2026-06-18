export type OrgType = 'club' | 'academic' | 'council' | 'startup' | 'project' | 'etc';
export type MemberStatus = 'active' | 'inactive' | 'pending';
export type TxType = 'income' | 'expense';
export type TxStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type FindingType =
  | 'missing_receipt'
  | 'duplicate'
  | 'budget_over'
  | 'amount_anomaly'
  | 'date_anomaly';
export type FindingSeverity = 'info' | 'warning' | 'critical';

export interface Organization {
  id: string;
  name: string;
  school: string | null;
  org_type: OrgType;
  semester: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role_label: string | null;
  is_super_admin: boolean;
  status: MemberStatus;
  joined_at: string;
}

export interface Budget {
  id: string;
  org_id: string;
  category: string;
  planned_amount: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  org_id: string;
  budget_id: string | null;
  payer_membership_id: string | null;
  trade_date: string;
  amount: number;
  tx_type: TxType;
  category: string | null;
  vendor: string | null;
  memo: string | null;
  status: TxStatus;
  reject_reason: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditFinding {
  id: string;
  org_id: string;
  transaction_id: string | null;
  finding_type: FindingType;
  severity: FindingSeverity;
  detail: string | null;
  is_seed: boolean;
  created_at: string;
}

export interface PublicLedgerRow {
  trade_date: string;
  category: string | null;
  amount: number;
  tx_type: TxType;
  vendor: string | null;
}

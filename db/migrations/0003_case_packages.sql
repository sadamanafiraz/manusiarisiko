CREATE TABLE risk_case_packages (
  id TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  bank_json TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
--> statement-breakpoint
CREATE INDEX risk_case_packages_owner ON risk_case_packages(owner, created_at);
--> statement-breakpoint
ALTER TABLE risk_classes ADD COLUMN case_id TEXT;
--> statement-breakpoint
ALTER TABLE risk_classes ADD COLUMN case_snapshot TEXT;

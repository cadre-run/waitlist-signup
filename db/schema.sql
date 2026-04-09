CREATE TABLE waitlist (
  id                SERIAL PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  email_verified    BOOLEAN DEFAULT FALSE,
  verification_token TEXT UNIQUE,
  referral_code     TEXT UNIQUE NOT NULL,
  referred_by       TEXT REFERENCES waitlist(referral_code),
  referral_count    INTEGER DEFAULT 0,
  position          INTEGER NOT NULL,
  original_position INTEGER NOT NULL,
  survey_usecase    TEXT,
  survey_hosting    TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  unsubscribed      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_events (
  id              SERIAL PRIMARY KEY,
  referrer_code   TEXT NOT NULL REFERENCES waitlist(referral_code),
  referred_email  TEXT NOT NULL REFERENCES waitlist(email),
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_code, referred_email)
);

CREATE TABLE email_log (
  id              SERIAL PRIMARY KEY,
  waitlist_id     INTEGER NOT NULL REFERENCES waitlist(id),
  email_type      TEXT NOT NULL,
  resend_id       TEXT,
  status          TEXT DEFAULT 'sent',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);
CREATE INDEX idx_waitlist_position ON waitlist(position);
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_verified ON waitlist(email_verified);
CREATE INDEX idx_referral_events_referrer ON referral_events(referrer_code);
CREATE INDEX idx_email_log_waitlist ON email_log(waitlist_id);

-- Test data for local development
INSERT INTO waitlist (email, email_verified, referral_code, position, original_position, ip_address)
VALUES
  ('alice@example.com', TRUE, 'cdr_test0001', 1, 1, '127.0.0.1'),
  ('bob@example.com', TRUE, 'cdr_test0002', 2, 2, '127.0.0.1'),
  ('charlie@example.com', FALSE, 'cdr_test0003', 3, 3, '127.0.0.1');

UPDATE waitlist SET referred_by = 'cdr_test0001' WHERE email = 'bob@example.com';
UPDATE waitlist SET referral_count = 1 WHERE email = 'alice@example.com';

INSERT INTO referral_events (referrer_code, referred_email, ip_address)
VALUES ('cdr_test0001', 'bob@example.com', '127.0.0.1');

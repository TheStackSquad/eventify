-- fixtures/seed.sql
-- Creates deterministic test fixtures for bash script tests.
-- UUIDs are fixed so tests can reference them without DB lookups.
-- All test emails use @eventify.test domain — isolated from real dev users.

-- 1. Main Test User
INSERT INTO users (
    id, name, email, password_hash,
    allow_reminder_emails, created_at, updated_at
) VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'Arike Events',
    'testuser@eventify.test',
    '$2a$10$UcEJZ55WOX/ZZJBm4QnHkOLXQiu3m390CDd0Z.NSuTgmdbZrtmoR6',
    true, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    email                 = EXCLUDED.email,
    allow_reminder_emails = EXCLUDED.allow_reminder_emails;

-- 2. Secondary User (The "Control" User)
INSERT INTO users (
    id, name, email, password_hash,
    role,
    allow_reminder_emails, created_at, updated_at
) VALUES (
    'a2000000-0000-0000-0000-000000000002',
    'Unauthorized User',
    'other@eventify.test',
    '$2a$10$UcEJZ55WOX/ZZJBm4QnHkOLXQiu3m390CDd0Z.NSuTgmdbZrtmoR6',
    'customer',
    true, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role  = EXCLUDED.role;

-- 3. The Vendor Profile (Owned by test user)
INSERT INTO vendors (
    id, owner_id, name, category, status,
    state, city, phone_number, vnin, email,
    first_name, last_name, description,
    subscription_tier, created_at, updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Arike Events',
    'planner',
    'active',
    'Lagos', 'Ikeja', '08099999999', 'ZE999999999999ZZ', 'testuser@eventify.test',
    'Arike', 'Events', 'Premium event planning in Lagos',
    'premium', NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    owner_id    = EXCLUDED.owner_id,
    name        = EXCLUDED.name,
    status      = EXCLUDED.status,
    email       = EXCLUDED.email,
    first_name  = EXCLUDED.first_name,
    last_name   = EXCLUDED.last_name,
    description = EXCLUDED.description;

-- 4. Active subscription for test vendor
INSERT INTO subscriptions (
    id, vendor_id, tier, status,
    price, currency,
    payment_reference,
    starts_at, expires_at,
    created_at, updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'premium',
    'active',
    700000,
    'NGN',
    'TEST-FIXTURE-REF-001',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status     = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at;

-- 5. Featured User (for leaderboard tests)
INSERT INTO users (
    id, name, email, password_hash,
    allow_reminder_emails, created_at, updated_at
) VALUES (
    'a3000000-0000-0000-0000-000000000003',
    'Featured User',
    'featured@eventify.test',
    '$2a$10$UcEJZ55WOX/ZZJBm4QnHkOLXQiu3m390CDd0Z.NSuTgmdbZrtmoR6',
    true, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    email                 = EXCLUDED.email,
    allow_reminder_emails = EXCLUDED.allow_reminder_emails;

-- 6. Featured Vendor (for leaderboard tests)
INSERT INTO vendors (
    id, owner_id, name, category, status,
    is_identity_verified, is_business_registered,
    state, city, phone_number,
    pvs_score, review_count, profile_completion,
    inquiry_count, responded_count,
    vnin, first_name, last_name,
    description,
    subscription_tier,
    created_at, updated_at
) VALUES (
    'b2000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000003',
    'Featured DJ Services',
    'dj',
    'active',
    true, false,
    'Lagos', 'Victoria Island', '08000000002',
    85, 5, 100.0, 10, 10,
    'ZE123456789012CD',
    'Featured', 'Vendor',
    'Top DJ in Lagos',
    'featured',
    NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    owner_id    = EXCLUDED.owner_id,
    name        = EXCLUDED.name,
    status      = EXCLUDED.status,
    pvs_score   = EXCLUDED.pvs_score,
    description = EXCLUDED.description;

-- 7. Featured subscription
INSERT INTO subscriptions (
    id, vendor_id, tier, status,
    price, currency, payment_reference,
    starts_at, expires_at, created_at, updated_at
) VALUES (
    'c2000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000002',
    'featured', 'active',
    1800000, 'NGN', 'TEST-FIXTURE-REF-002',
    NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    status     = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at;

-- Clear any login lockouts from previous runs
DELETE FROM login_attempts WHERE email IN (
    'testuser@eventify.test',
    'other@eventify.test',
    'featured@eventify.test'
);

-- Refresh materialized views so leaderboard queries return seeded data
REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_daily_metrics;
REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_of_the_month;
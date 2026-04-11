-- ============================================================
-- PostgreSQL Schema for Authentication & Authorization
-- Normalized design: users, roles, user_roles (junction table)
-- ============================================================

-- Drop existing tables if they exist (in correct order for FK constraints)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS tech_stacks CASCADE;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
    id          BIGSERIAL       PRIMARY KEY,
    username    VARCHAR(50)     NOT NULL UNIQUE,
    password    VARCHAR(255)    NOT NULL,
    email       VARCHAR(100)    UNIQUE,
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- ============================================================
-- 2. ROLES TABLE
-- ============================================================
CREATE TABLE roles (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(50)     NOT NULL UNIQUE
);

-- ============================================================
-- 3. USER_ROLES JUNCTION TABLE (Many-to-Many)
-- ============================================================
CREATE TABLE user_roles (
    user_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     BIGINT          NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================
-- 4. TECH_STACKS TABLE (Static lookup for IT tech stacks)
-- ============================================================
CREATE TABLE tech_stacks (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    category    VARCHAR(50)     NOT NULL
);

CREATE INDEX idx_tech_stacks_category ON tech_stacks(category);

-- ============================================================
-- SEED DATA: Roles
-- ============================================================
INSERT INTO roles (name) VALUES
    ('ROLE_USER'),
    ('ROLE_ADMIN'),
    ('ROLE_CANDIDATE');

-- ============================================================
-- SEED DATA: Sample Users
-- Passwords are BCrypt encoded (10 rounds)
--   admin  -> admin123
--   user1  -> password123
--   demo   -> demo123
-- ============================================================
INSERT INTO users (username, password, email) VALUES
    ('admin', '$2a$10$ax02xgNnApSbXFvOz.0BGu7DDjmTDh47XBrGbY4ncjI19d8k/Y50i', 'admin@example.com'),
    ('user1', '$2a$10$osedI7v3dR9UbmVw1/a1UOZ3u8TUlx9jHKuDqO2ZXJKNYsLoSt7F.', 'user1@example.com'),
    ('demo',  '$2a$10$2Pq3gis7UlD6zsaF3SPsA.qjngiEjB3LTaTC3BylJ1jAsO2ZvDzza', 'demo@example.com');

-- ============================================================
-- SEED DATA: Assign roles to users
-- ============================================================
INSERT INTO user_roles (user_id, role_id) VALUES
    ((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM roles WHERE name = 'ROLE_ADMIN')),
    ((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM roles WHERE name = 'ROLE_USER')),
    ((SELECT id FROM users WHERE username = 'user1'), (SELECT id FROM roles WHERE name = 'ROLE_USER')),
    ((SELECT id FROM users WHERE username = 'demo'),  (SELECT id FROM roles WHERE name = 'ROLE_USER'));

-- ============================================================
-- SEED DATA: IT Tech Stacks
-- ============================================================
INSERT INTO tech_stacks (name, category) VALUES
    -- Programming Languages
    ('Java', 'Languages'),
    ('Python', 'Languages'),
    ('JavaScript', 'Languages'),
    ('TypeScript', 'Languages'),
    ('C#', 'Languages'),
    ('C++', 'Languages'),
    ('Go', 'Languages'),
    ('Rust', 'Languages'),
    ('Ruby', 'Languages'),
    ('PHP', 'Languages'),
    ('Swift', 'Languages'),
    ('Kotlin', 'Languages'),
    ('Scala', 'Languages'),
    ('R', 'Languages'),
    -- Frontend Frameworks
    ('React', 'Frontend'),
    ('Angular', 'Frontend'),
    ('Vue.js', 'Frontend'),
    ('Next.js', 'Frontend'),
    ('Svelte', 'Frontend'),
    ('HTML/CSS', 'Frontend'),
    ('Tailwind CSS', 'Frontend'),
    ('Bootstrap', 'Frontend'),
    -- Backend Frameworks
    ('Spring Boot', 'Backend'),
    ('Node.js', 'Backend'),
    ('Express.js', 'Backend'),
    ('Django', 'Backend'),
    ('Flask', 'Backend'),
    ('FastAPI', 'Backend'),
    ('.NET Core', 'Backend'),
    ('Ruby on Rails', 'Backend'),
    ('NestJS', 'Backend'),
    -- Databases
    ('PostgreSQL', 'Databases'),
    ('MySQL', 'Databases'),
    ('MongoDB', 'Databases'),
    ('Redis', 'Databases'),
    ('Oracle', 'Databases'),
    ('SQL Server', 'Databases'),
    ('DynamoDB', 'Databases'),
    ('Cassandra', 'Databases'),
    ('Elasticsearch', 'Databases'),
    -- Cloud & DevOps
    ('AWS', 'Cloud & DevOps'),
    ('Azure', 'Cloud & DevOps'),
    ('GCP', 'Cloud & DevOps'),
    ('Docker', 'Cloud & DevOps'),
    ('Kubernetes', 'Cloud & DevOps'),
    ('Terraform', 'Cloud & DevOps'),
    ('Jenkins', 'Cloud & DevOps'),
    ('GitHub Actions', 'Cloud & DevOps'),
    ('CI/CD', 'Cloud & DevOps'),
    ('Ansible', 'Cloud & DevOps'),
    -- Data & AI/ML
    ('Apache Spark', 'Data & AI/ML'),
    ('TensorFlow', 'Data & AI/ML'),
    ('PyTorch', 'Data & AI/ML'),
    ('Pandas', 'Data & AI/ML'),
    ('Apache Kafka', 'Data & AI/ML'),
    ('Hadoop', 'Data & AI/ML'),
    -- Mobile
    ('React Native', 'Mobile'),
    ('Flutter', 'Mobile'),
    ('Android (Java/Kotlin)', 'Mobile'),
    ('iOS (Swift)', 'Mobile'),
    -- Tools & Others
    ('Git', 'Tools'),
    ('REST APIs', 'Tools'),
    ('GraphQL', 'Tools'),
    ('Microservices', 'Tools'),
    ('RabbitMQ', 'Tools'),
    ('gRPC', 'Tools'),
    ('Linux', 'Tools'),
    ('Agile/Scrum', 'Tools');

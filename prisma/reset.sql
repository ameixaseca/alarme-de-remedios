-- Reset script: deletes all data except users
-- Run order respects foreign key constraints (most dependent first)

DELETE FROM "Application";
DELETE FROM "Prescription";
DELETE FROM "Medication";
DELETE FROM "Patient";
DELETE FROM "GroupMember";
DELETE FROM "Group";

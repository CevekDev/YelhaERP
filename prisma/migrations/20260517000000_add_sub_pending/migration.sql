-- Add PENDING status to SubStatus enum (subscription awaiting payment)
ALTER TYPE "SubStatus" ADD VALUE IF NOT EXISTS 'PENDING';

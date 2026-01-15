-- Migration: Add transport_type column to subcontractors table
-- Date: 2026-01-14
-- Description: Add transport type field for domestic/international classification

-- Add the new column
ALTER TABLE subcontractors 
ADD COLUMN transport_type VARCHAR(20) DEFAULT 'domestic' NOT NULL AFTER remark;

-- Update existing records to have default value
UPDATE subcontractors SET transport_type = 'domestic' WHERE transport_type IS NULL;

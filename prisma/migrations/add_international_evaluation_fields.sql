-- Migration: Add international evaluation fields to evaluations table
-- Date: 2026-01-14
-- Description: Add transport_type, container_condition, punctuality, product_damage fields

-- Add transport_type column
ALTER TABLE evaluations 
ADD COLUMN transport_type VARCHAR(20) DEFAULT 'domestic' NOT NULL AFTER site;

-- Make domestic fields nullable (they may be null for international evaluations)
ALTER TABLE evaluations 
MODIFY COLUMN driver_cooperation INT NULL;

ALTER TABLE evaluations 
MODIFY COLUMN vehicle_condition INT NULL;

-- Add international evaluation fields
ALTER TABLE evaluations 
ADD COLUMN container_condition INT NULL AFTER damage_score;

ALTER TABLE evaluations 
ADD COLUMN punctuality INT NULL AFTER container_condition;

ALTER TABLE evaluations 
ADD COLUMN product_damage INT NULL AFTER punctuality;

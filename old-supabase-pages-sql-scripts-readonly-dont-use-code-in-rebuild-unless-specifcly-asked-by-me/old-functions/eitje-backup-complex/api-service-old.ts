/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API SERVICE - MODULAR ARCHITECTURE
 * 
 * This file now serves as a compatibility layer that re-exports the new modular structure.
 * The original 916-line monolith has been broken down into focused modules:
 * 
 * - types.ts: Type definitions and interfaces
 * - config.ts: Endpoint configuration and settings
 * - client.ts: HTTP client with axios and fetch support
 * - validators.ts: Data and configuration validation
 * - mappers.ts: Field mapping and transformation
 * - service.ts: Main service orchestrating all modules
 * 
 * This follows the Single Responsibility Principle and makes the code much more maintainable.
 */

// Re-export everything from the new modular structure
export * from './types';
export * from './config';
export * from './service';
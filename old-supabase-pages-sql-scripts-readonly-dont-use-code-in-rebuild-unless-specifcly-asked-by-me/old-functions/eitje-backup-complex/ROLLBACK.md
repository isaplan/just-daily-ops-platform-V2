# Eitje API Rollback Instructions

## How to Restore the Complex Implementation

If you need to rollback from the simple implementation back to the complex 6-module structure:

### 1. Remove Simple Files
```bash
rm src/lib/eitje/eitje-api-client.ts
rm src/lib/eitje/eitje-database.ts
rm src/lib/eitje/eitje-types.ts
```

### 2. Restore Complex Files
```bash
mv src/lib/eitje/_backup_complex/service.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/client.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/validators.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/mappers.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/types.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/config.ts src/lib/eitje/
mv src/lib/eitje/_backup_complex/api-service-updated.ts src/lib/eitje/
```

### 3. Restore Original api-service.ts
```bash
mv src/lib/eitje/_backup_complex/api-service-old.ts src/lib/eitje/api-service.ts
```

### 4. Update Imports
All consuming files will need to be updated to use the complex class-based approach:

```typescript
// OLD (simple):
import { fetchEitjeEnvironments, getEitjeCredentials } from '@/lib/eitje/api-service';

// NEW (complex):
import { createEitjeApiService, EitjeApiConfig } from '@/lib/eitje/api-service';
const service = createEitjeApiService(config);
```

## Files in Backup

- `service.ts` (355 lines) - Main service orchestrator
- `client.ts` (243 lines) - HTTP client with axios/fetch
- `validators.ts` (136 lines) - Data validation logic
- `mappers.ts` (72 lines) - Field mapping logic
- `types.ts` (76 lines) - Type definitions
- `config.ts` (73 lines) - Endpoint configuration
- `api-service-updated.ts` (621 lines) - Legacy service
- `api-service-old.ts` (19 lines) - Original compatibility layer

## Total Backup Size
- 8 files
- 1,595 total lines
- Complex class-based architecture
- 6 layers of abstraction

## Why Rollback Might Be Needed
- If the simple implementation has bugs
- If performance is worse than expected
- If the complex validation/mapping logic is actually needed
- If the modular structure was actually beneficial for maintenance


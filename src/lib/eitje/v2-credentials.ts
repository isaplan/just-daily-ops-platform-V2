/**
 * Eitje V2 Credentials Helper
 * 
 * Fetches Eitje API credentials from MongoDB
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { EitjeCredentials } from './v2-types';

export async function getEitjeCredentials(): Promise<{
  baseUrl: string;
  credentials: EitjeCredentials;
} | null> {
  try {
    const db = await getDatabase();
    
    const cred = await db.collection('api_credentials')
      .findOne(
        { 
          provider: 'eitje',
          isActive: true 
        },
        { 
          sort: { createdAt: -1 } 
        }
      );

    if (!cred) {
      return null;
    }

    const additionalConfig = cred.additionalConfig || {};
    
    return {
      baseUrl: cred.baseUrl || 'https://open-api.eitje.app/open_api',
      credentials: {
        partner_username: additionalConfig.partner_username || '',
        partner_password: additionalConfig.partner_password || '',
        api_username: additionalConfig.api_username || '',
        api_password: additionalConfig.api_password || '',
      },
    };
  } catch (error) {
    console.error('[Eitje V2 Credentials] Error fetching credentials:', error);
    return null;
  }
}


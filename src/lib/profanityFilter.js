/**
 * Profanity and Nickname Sanitization for BOT BLITZ
 * Ensures university-safe kiosk leaderboards while preventing HTML/script injection
 */

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'cock', 'fag',
  'nigger', 'nigga', 'whore', 'slut', 'nazi', 'hitler', 'bastard', 'penis',
  'vagina', 'porn', 'sex', 'rape', 'retard', 'twat', 'wank', 'chink', 'kike'
];

/**
 * Normalizes and sanitizes a player's nickname.
 * Strips HTML, scripts, excessive spaces, and profanity.
 * 
 * @param {string} rawName 
 * @returns {{ isValid: boolean, sanitizedName: string, error?: string }}
 */
export function sanitizeNickname(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { isValid: false, sanitizedName: '', error: 'Enter your player name to join the leaderboard.' };
  }

  // 1. Strip HTML and script tags
  let cleaned = rawName.replace(/<[^>]*>?/gm, '');

  // 2. Remove non-printable / control characters, keep standard alphanumeric, underscores, spaces, hyphens
  cleaned = cleaned.replace(/[^\w\s\-_]/g, '');

  // 3. Normalize whitespace
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  if (cleaned.length === 0) {
    return { isValid: false, sanitizedName: '', error: 'Please enter a valid nickname' };
  }

  if (cleaned.length > 16) {
    cleaned = cleaned.slice(0, 16);
  }

  // 4. Check for profanity
  const lower = cleaned.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    // Check whole word or substring for severe slurs
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower) || lower.includes(word)) {
      return { 
        isValid: false, 
        sanitizedName: '', 
        error: 'Inappropriate language detected. Please choose a friendly nickname!' 
      };
    }
  }

  return { isValid: true, sanitizedName: cleaned };
}

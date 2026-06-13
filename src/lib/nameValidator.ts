const ADULT_WORDS = [
  "sex", "porn", "nsfw", "hentai", "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy",
  "boobs", "penis", "vagina", "adult", "xxx", "anal", "orgasm", "masturbat", "clitoris", "ejaculat",
  "semen", "sperm"
];

const SLANG_SLUG_WORDS = [
  "slug", "slut", "bastard", "crap", "whore", "hoe", "wanker", "prick", "twat"
];

const RELIGIOUS_WORDS = [
  "allah", "god", "jesus", "christ", "prophet", "muhammad", "buddha", "krishna", "shiva", "lord",
  "yahweh", "jehovah", "messiah", "holy", "deity", "divine", "creators", "creator", "ram", "ramadhan",
  "ganesh"
];

const ALL_FORBIDDEN_WORDS = [...ADULT_WORDS, ...SLANG_SLUG_WORDS, ...RELIGIOUS_WORDS];

export function validateUsernameAndFullName(username: string, fullName: string): { isValid: boolean; error?: string } {
  const cleanUsername = username.trim().toLowerCase();
  const cleanFullName = fullName.trim().toLowerCase();

  if (!cleanUsername) {
    return { isValid: false, error: "Username cannot be empty." };
  }

  if (!cleanFullName) {
    return { isValid: false, error: "Full name cannot be empty." };
  }

  // Regex to check username format: only alphanumeric, underscores, and dots
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    return { isValid: false, error: "Username can only contain alphanumeric characters, underscores, and dots." };
  }

  // Check username length
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return { isValid: false, error: "Username must be between 3 and 30 characters." };
  }

  for (const word of ALL_FORBIDDEN_WORDS) {
    const isHighlySensitive = [
      "fuck", "porn", "nsfw", "hentai", "allah", "jesus", "christ",
      "muhammad", "yahweh", "slut", "slug", "god"
    ].includes(word) || word.length >= 4;

    // Check username
    if (isHighlySensitive) {
      if (cleanUsername.includes(word)) {
        return { isValid: false, error: `The username contains a restricted term: "${word}".` };
      }
      // Check full name
      const normalizedFullName = cleanFullName.replace(/[^a-z0-9]/g, "");
      if (normalizedFullName.includes(word)) {
        return { isValid: false, error: `The full name contains a restricted term: "${word}".` };
      }
    } else {
      // Short/less-sensitive words: check word boundaries or specific separators
      const regex = new RegExp(`(^|[_.])${word}([_.]|$)`);
      if (regex.test(cleanUsername)) {
        return { isValid: false, error: `The username contains a restricted term: "${word}".` };
      }
      // Check full name word boundaries
      const fullNameRegex = new RegExp(`\\b${word}\\b`);
      if (fullNameRegex.test(cleanFullName)) {
        return { isValid: false, error: `The full name contains a restricted term: "${word}".` };
      }
    }
  }

  return { isValid: true };
}

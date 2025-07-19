// Content Moderation Utility for App Store Compliance
// This utility provides community-based moderation with flagging system

// List of objectionable words and phrases (for flagging, not blocking)
// These will be used to suggest content for review, not prevent posting
const FLAGGABLE_WORDS = [
  // Profanity and offensive language
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss',
  'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'bastard',
  'motherfucker', 'fucker', 'shithead', 'asshole', 'dumbass',
  
  // Hate speech and discriminatory terms
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'kike', 'spic', 'chink',
  'gook', 'wop', 'kraut', 'jap', 'wetback', 'towelhead', 'sandnigger',
  'raghead', 'cameljockey', 'terrorist', 'jihad', 'allah', 'mohammed',
  
  // Violence and threats
  'kill', 'murder', 'death', 'suicide', 'bomb', 'explode', 'shoot',
  'gun', 'weapon', 'attack', 'fight', 'violence', 'blood', 'gore',
  
  // Drugs and illegal substances
  'cocaine', 'heroin', 'meth', 'crack', 'weed', 'marijuana', 'drugs',
  'pills', 'acid', 'lsd', 'ecstasy', 'mdma', 'ketamine', 'opioids',
  
  // Sexual content
  'porn', 'pornography', 'sex', 'sexual', 'nude', 'naked', 'penis',
  'vagina', 'boobs', 'tits', 'ass', 'butt', 'dick', 'cock', 'pussy',
  
  // Common variations and leetspeak
  'f*ck', 'f**k', 'f***', 'sh*t', 'sh**', 'b*tch', 'b**ch', 'a**',
  'd*ck', 'd**k', 'p*ssy', 'p**sy', 'c*nt', 'c**t', 'wh*re', 'wh**e',
  'sl*t', 'sl**t', 'b*stard', 'b**tard', 'm*f', 'm**f', 'f*cker', 'f**ker',
  
  // Numbers and symbols used to bypass filters
  'fuck1', 'fuck2', 'fuck3', 'sh1t', 'sh1t', 'b1tch', 'b1tch', 'a55',
  'd1ck', 'd1ck', 'p0rn', 'p0rn', 's3x', 's3x', 'n00b', 'n00b',
  
  // Common misspellings and intentional typos
  'fuk', 'fukc', 'fuking', 'fuking', 'shyt', 'shyt', 'bytch', 'bytch',
  'azz', 'azz', 'dik', 'dik', 'pusy', 'pusy', 'cnt', 'cnt', 'whre', 'whre',
  'slut', 'slut', 'bastrd', 'bastrd', 'mfer', 'mfer', 'fuker', 'fuker',
];

// Function to check if text contains flaggable content (for community review)
export const containsFlaggableContent = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const normalizedText = text.toLowerCase().trim();
  
  // Check for exact matches
  for (const word of FLAGGABLE_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  // Check for words separated by spaces, punctuation, or numbers
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    if (FLAGGABLE_WORDS.includes(cleanWord)) {
      return true;
    }
  }
  
  return false;
};

// Function to get a warning message for potentially objectionable content
export const getContentWarning = (content: string): string | null => {
  if (containsFlaggableContent(content)) {
    return 'This content may contain language that could be flagged by the community. Please ensure your post follows community guidelines.';
  }
  return null;
};

// Function to validate user input with basic requirements (no content blocking)
export const validateUserContent = (content: string, contentType: 'claim' | 'comment' | 'username' | 'title'): {
  isValid: boolean;
  warning?: string;
  errorMessage?: string;
} => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Content cannot be empty'
    };
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Content cannot be empty'
    };
  }
  
  // Check for content warnings (but don't block)
  const warning = getContentWarning(trimmedContent);
  
  // Content-specific validation (only length requirements)
  switch (contentType) {
    case 'username':
      if (trimmedContent.length < 3) {
        return {
          isValid: false,
          errorMessage: 'Username must be at least 3 characters long'
        };
      }
      if (trimmedContent.length > 20) {
        return {
          isValid: false,
          errorMessage: 'Username must be 20 characters or less'
        };
      }
      break;
      
    case 'title':
      if (trimmedContent.length < 5) {
        return {
          isValid: false,
          errorMessage: 'Title must be at least 5 characters long'
        };
      }
      if (trimmedContent.length > 100) {
        return {
          isValid: false,
          errorMessage: 'Title must be 100 characters or less'
        };
      }
      break;
      
    case 'claim':
      if (trimmedContent.length < 10) {
        return {
          isValid: false,
          errorMessage: 'Claim must be at least 10 characters long'
        };
      }
      if (trimmedContent.length > 500) {
        return {
          isValid: false,
          errorMessage: 'Claim must be 500 characters or less'
        };
      }
      break;
      
    case 'comment':
      if (trimmedContent.length < 2) {
        return {
          isValid: false,
          errorMessage: 'Comment must be at least 2 characters long'
        };
      }
      if (trimmedContent.length > 500) {
        return {
          isValid: false,
          errorMessage: 'Comment must be 500 characters or less'
        };
      }
      break;
  }
  
  return {
    isValid: true,
    warning: warning || undefined
  };
};

// Function to check if content needs manual review (for admin purposes)
export const needsManualReview = (content: string): boolean => {
  // This could be expanded to include more sophisticated detection
  // For now, we'll flag content that contains multiple flaggable words
  if (!content || typeof content !== 'string') return false;
  
  const normalizedText = content.toLowerCase();
  let flaggableCount = 0;
  
  for (const word of FLAGGABLE_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      flaggableCount++;
    }
  }
  
  return flaggableCount > 3; // Flag if more than 3 flaggable words found
};

// Function to get community guidelines message
export const getCommunityGuidelinesMessage = (): string => {
  return 'Please be respectful in your discussions. While we encourage open debate, content that violates community guidelines may be flagged by other users.';
};

// Function to get flagging options for user reports
export const getFlaggingOptions = (): Array<{id: string, label: string, description: string}> => {
  return [
    {
      id: 'inappropriate',
      label: 'Inappropriate Content',
      description: 'Contains offensive, vulgar, or inappropriate language'
    },
    {
      id: 'hate_speech',
      label: 'Hate Speech',
      description: 'Promotes hatred or discrimination against individuals or groups'
    },
    {
      id: 'harassment',
      label: 'Harassment',
      description: 'Targets or harasses specific individuals'
    },
    {
      id: 'spam',
      label: 'Spam',
      description: 'Repeated or irrelevant content'
    },
    {
      id: 'misinformation',
      label: 'Misinformation',
      description: 'Contains false or misleading information'
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Other violation of community guidelines'
    }
  ];
};

// Export the flaggable words list for potential admin use
export { FLAGGABLE_WORDS }; 
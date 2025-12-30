/**
 * Extract clean labels from social media URLs
 */

export function extractLinkedInLabel(url: string): string {
  if (!url) return '';
  
  // Extract username from LinkedIn URL
  // Examples: 
  // https://www.linkedin.com/in/umanga-rayamajhi/ -> umanga-rayamajhi
  // linkedin.com/in/john-doe -> john-doe
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  
  // If it's already a label (not a URL), return as-is
  if (!url.includes('http') && !url.includes('linkedin.com')) {
    return url;
  }
  
  return 'LinkedIn';
}

export function extractGitHubLabel(url: string): string {
  if (!url) return '';
  
  // Extract username from GitHub URL
  // Examples:
  // https://github.com/umanga -> umanga
  // github.com/johndoe -> johndoe
  const match = url.match(/github\.com\/([^\/\?]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  
  // If it's already a label (not a URL), return as-is
  if (!url.includes('http') && !url.includes('github.com')) {
    return url;
  }
  
  return 'GitHub';
}

export function extractWebsiteLabel(url: string): string {
  if (!url) return '';
  
  // Extract domain from website URL
  // Examples:
  // https://www.portfolio.com -> portfolio.com
  // https://johndoe.dev -> johndoe.dev
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    // If it's not a valid URL, return as-is
    return url;
  }
}

/**
 * Process personal info to construct full URLs from usernames
 */
export function processPersonalInfoForBackend(personalInfo: any) {
  return {
    ...personalInfo,
    // Construct full URLs from usernames
    linkedin_url: personalInfo.linkedin ? `https://linkedin.com/in/${personalInfo.linkedin}` : '',
    github_url: personalInfo.github ? `https://github.com/${personalInfo.github}` : '',
    website_url: personalInfo.website || '',
    // Keep usernames/values as display labels
    linkedin: personalInfo.linkedin,
    github: personalInfo.github,
    website: extractWebsiteLabel(personalInfo.website),
  };
}

interface DevpostHackathonData {
  title: string;
  organizer: string;
  description: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  devpostUrl: string;
  participants?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  timezone?: string;
  deadlineText?: string; // Original deadline text for reference
}

export class DevpostScraper {
  // List of CORS proxies to try in order
  private static readonly CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ];
  
  static async scrapeHackathon(devpostUrl: string): Promise<DevpostHackathonData> {
    try {
      // Validate URL
      if (!devpostUrl.includes('devpost.com')) {
        throw new Error('Please provide a valid Devpost URL');
      }

      let htmlContent = '';
      let proxyError = null;

      // Try each CORS proxy in sequence until one works
      for (const proxy of this.CORS_PROXIES) {
        try {
          const proxyUrl = `${proxy}${encodeURIComponent(devpostUrl)}`;
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            continue; // Try next proxy if this one fails
          }

          // Handle different proxy response formats
          if (proxy.includes('allorigins')) {
            const data = await response.json();
            htmlContent = data.contents;
          } else {
            htmlContent = await response.text();
          }

          if (htmlContent) {
            break; // Successfully got content, exit loop
          }
        } catch (err) {
          proxyError = err;
          continue; // Try next proxy
        }
      }

      if (!htmlContent) {
        // If all proxies failed, try fallback method
        console.warn('All CORS proxies failed, using fallback method');
        return this.extractFromUrl(devpostUrl);
      }

      // Create a DOM parser to extract information
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      return this.extractHackathonData(doc, devpostUrl);
    } catch (error) {
      console.error('Error scraping Devpost:', error);
      // Return basic data from URL if scraping fails
      return this.extractFromUrl(devpostUrl);
    }
  }

  private static extractHackathonData(doc: Document, devpostUrl: string): DevpostHackathonData {
    // Extract title
    const title = this.extractTitle(doc);
    
    // Extract organizer
    const organizer = this.extractOrganizer(doc);
    
    // Extract description
    const description = this.extractDescription(doc);
    
    // Extract deadline with timezone info
    const deadlineInfo = this.extractDeadline(doc);
    
    // Extract dates (start/end)
    const dates = this.extractDates(doc, deadlineInfo.deadline);
    
    // Extract participants count
    const participants = this.extractParticipants(doc);
    
    // Determine status based on deadline
    const status = this.determineStatus(deadlineInfo.deadline);

    return {
      title,
      organizer,
      description,
      startDate: dates.startDate,
      endDate: dates.endDate,
      submissionDeadline: deadlineInfo.deadline,
      devpostUrl,
      participants,
      status,
      timezone: deadlineInfo.timezone,
      deadlineText: deadlineInfo.originalText
    };
  }

  private static extractTitle(doc: Document): string {
    // Try different selectors for the title
    const titleSelectors = [
      'h1',
      '.hackathon-title',
      'title',
      '[data-testid="hackathon-title"]'
    ];

    for (const selector of titleSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        let title = element.textContent.trim();
        // Clean up title (remove "| Devpost" suffix if present)
        title = title.replace(/\s*\|\s*Devpost\s*$/, '');
        if (title.length > 10) { // Reasonable title length
          return title;
        }
      }
    }

    return 'Untitled Hackathon';
  }

  private static extractOrganizer(doc: Document): string {
    // Try to find organizer information
    const organizerSelectors = [
      '[data-testid="organizer"]',
      '.organizer',
      '.hackathon-organizer',
      '.sponsor',
      '.presented-by'
    ];

    for (const selector of organizerSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to extract from title (e.g., "Hackathon presented by Company")
    const title = doc.querySelector('h1')?.textContent || '';
    const presentedByMatch = title.match(/presented by (.+?)$/i);
    if (presentedByMatch) {
      return presentedByMatch[1].trim();
    }

    // Look for sponsor information
    const sponsorElement = doc.querySelector('[class*="sponsor"], [class*="partner"]');
    if (sponsorElement?.textContent?.trim()) {
      return sponsorElement.textContent.trim();
    }

    return 'Unknown Organizer';
  }

  private static extractDescription(doc: Document): string {
    // Try different selectors for description
    const descriptionSelectors = [
      '.hackathon-description',
      '.description',
      '[data-testid="description"]',
      '.summary',
      '.overview p',
      'meta[name="description"]'
    ];

    for (const selector of descriptionSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = selector.includes('meta') 
          ? element.getAttribute('content') 
          : element.textContent;
        
        if (content?.trim() && content.length > 20) {
          return content.trim();
        }
      }
    }

    // Try to find the first substantial paragraph
    const paragraphs = doc.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 50 && text.length < 500) {
        return text;
      }
    }

    return 'No description available';
  }

  private static extractDeadline(doc: Document): { deadline: string; timezone?: string; originalText?: string } {
    // Look for deadline information with various selectors
    const deadlineSelectors = [
      // Specific deadline containers
      '[class*="deadline"]',
      '[data-testid*="deadline"]',
      '.submission-deadline',
      '[class*="due"]',
      '.due-date',
      
      // General date containers that might contain deadline
      '.date-info',
      '.event-date',
      '.hackathon-date',
      '[class*="date"]',
      
      // Sidebar information
      '.sidebar [class*="date"]',
      '.event-details [class*="date"]',
      '.hackathon-info [class*="date"]'
    ];

    let bestMatch = null;
    let bestScore = 0;

    // Try each selector and score the results
    for (const selector of deadlineSelectors) {
      const elements = doc.querySelectorAll(selector);
      
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (!text) continue;

        // Score based on deadline-related keywords
        let score = 0;
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('deadline')) score += 10;
        if (lowerText.includes('submission')) score += 8;
        if (lowerText.includes('due')) score += 7;
        if (lowerText.includes('closes')) score += 6;
        if (lowerText.includes('ends')) score += 5;
        
        // Check for date patterns
        const datePatterns = [
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /\d{4}-\d{2}-\d{2}/
        ];
        
        let hasDatePattern = false;
        for (const pattern of datePatterns) {
          if (pattern.test(text)) {
            hasDatePattern = true;
            score += 5;
            break;
          }
        }
        
        // Check for time patterns
        if (/@\s*\d{1,2}:\d{2}[ap]m/i.test(text)) score += 3;
        if (/\d{1,2}:\d{2}[ap]m/i.test(text)) score += 2;
        
        // Check for timezone
        if (/GMT[+-]\d|UTC[+-]\d|[A-Z]{3,4}/i.test(text)) score += 2;
        
        if (hasDatePattern && score > bestScore) {
          bestScore = score;
          bestMatch = { element, text, score };
        }
      }
    }

    if (bestMatch) {
      const result = this.parseDeadlineText(bestMatch.text);
      if (result.deadline) {
        return {
          deadline: result.deadline,
          timezone: result.timezone,
          originalText: bestMatch.text
        };
      }
    }

    // Fallback: Look for any date-like text in the entire document
    const bodyText = doc.body?.textContent || '';
    const deadlineRegex = /(?:deadline|due|submit|closes?|ends?)\s*:?\s*([^.!?]+(?:202\d|202\d))/gi;
    const matches = Array.from(bodyText.matchAll(deadlineRegex));
    
    for (const match of matches) {
      const result = this.parseDeadlineText(match[1]);
      if (result.deadline) {
        return {
          deadline: result.deadline,
          timezone: result.timezone,
          originalText: match[0]
        };
      }
    }

    // Final fallback: Look for any date in the sidebar or key areas
    const priorityAreas = [
      doc.querySelector('.sidebar'),
      doc.querySelector('[class*="event-details"]'),
      doc.querySelector('[class*="hackathon-info"]'),
      doc.querySelector('main')
    ].filter(Boolean);

    for (const area of priorityAreas) {
      const text = area?.textContent || '';
      const result = this.parseDeadlineText(text);
      if (result.deadline) {
        return {
          deadline: result.deadline,
          timezone: result.timezone,
          originalText: text.substring(0, 100) + '...'
        };
      }
    }

    // Default to 30 days from now if no deadline found
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);
    return {
      deadline: defaultDeadline.toISOString(),
      timezone: undefined,
      originalText: 'Estimated (30 days from import)'
    };
  }

  private static parseDeadlineText(text: string): { deadline: string | null; timezone?: string } {
    if (!text) return { deadline: null };

    // Clean up the text
    const cleaned = text.replace(/^\s*[^\w]*/, '').replace(/[^\w\s:@+-]*$/, '');
    
    // Extract timezone information
    let timezone = undefined;
    const timezoneMatch = cleaned.match(/(GMT[+-]\d{1,2}|UTC[+-]\d{1,2}|[A-Z]{3,4}(?:[+-]\d{1,2})?)/i);
    if (timezoneMatch) {
      timezone = timezoneMatch[1];
    }

    // Try various date/time patterns
    const patterns = [
      // "Jun 30, 2025 @ 4:00pm GMT-5" format
      /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\s*@?\s*(\d{1,2}):(\d{2})\s*([ap]m)?\s*(GMT[+-]\d{1,2}|UTC[+-]\d{1,2}|[A-Z]{3,4})?/i,
      
      // "June 30, 2025 at 4:00 PM" format
      /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\s+(?:at|@)\s+(\d{1,2}):(\d{2})\s*([ap]m)?/i,
      
      // "Jun 30, 2025" format (date only)
      /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i,
      
      // "2025-06-30T16:00:00" ISO format
      /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
      
      // "06/30/2025" format
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        try {
          let dateStr = '';
          
          if (pattern.source.includes('([A-Za-z]{3,9})')) {
            // Month name format
            const [, month, day, year, hour, minute, ampm, tz] = match;
            if (tz) timezone = tz;
            
            if (hour && minute) {
              const hour24 = this.convertTo24Hour(hour, ampm);
              dateStr = `${month} ${day}, ${year} ${hour24}:${minute}:00`;
            } else {
              dateStr = `${month} ${day}, ${year} 23:59:59`; // End of day if no time specified
            }
          } else if (pattern.source.includes('(\\d{4})-(\\d{2})-(\\d{2})')) {
            // ISO format
            const [, year, month, day, hour, minute, second] = match;
            dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
          } else if (pattern.source.includes('(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})')) {
            // MM/DD/YYYY format
            const [, month, day, year] = match;
            dateStr = `${month}/${day}/${year} 23:59:59`;
          }
          
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return { 
              deadline: date.toISOString(),
              timezone 
            };
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    return { deadline: null };
  }

  private static convertTo24Hour(hour: string, ampm?: string): string {
    let hour24 = parseInt(hour);
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
      }
    }
    return hour24.toString().padStart(2, '0');
  }

  private static extractDates(doc: Document, deadline: string): { startDate: string; endDate: string } {
    // Try to find start and end dates
    const dateElements = doc.querySelectorAll('[class*="date"], [data-testid*="date"]');
    
    const dates: Date[] = [];
    
    dateElements.forEach(element => {
      const dateStr = element.textContent?.trim();
      if (dateStr) {
        const parsed = this.parseDate(dateStr);
        if (parsed) {
          dates.push(new Date(parsed));
        }
      }
    });

    // Sort dates
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    const deadlineDate = new Date(deadline);
    
    // If we found dates, use them
    if (dates.length >= 2) {
      return {
        startDate: dates[0].toISOString(),
        endDate: dates[dates.length - 1].toISOString()
      };
    }
    
    // Otherwise, estimate based on deadline
    const startDate = new Date(deadlineDate);
    startDate.setDate(startDate.getDate() - 30); // Assume 30-day hackathon
    
    const endDate = new Date(deadlineDate);
    endDate.setHours(endDate.getHours() - 1); // End 1 hour before deadline
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  private static extractParticipants(doc: Document): number | undefined {
    const bodyText = doc.body?.textContent || '';
    const participantMatch = bodyText.match(/(\d+)\s*participants?/i);
    
    if (participantMatch) {
      return parseInt(participantMatch[1], 10);
    }
    
    return undefined;
  }

  private static parseDate(dateStr: string): string | null {
    try {
      // Clean up the date string
      const cleaned = dateStr.replace(/^[^A-Za-z\d]*/, '').replace(/[^A-Za-z\d\s:@,-]*$/, '');
      
      // Try to parse various date formats
      const date = new Date(cleaned);
      
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // Try alternative parsing for "Jun 30, 2025 @ 4:00pm" format
      const altMatch = cleaned.match(/([A-Za-z]+ \d{1,2},? \d{4})(?: @ (\d{1,2}:\d{2}[ap]m))?/);
      if (altMatch) {
        const dateStr = altMatch[1];
        const timeStr = altMatch[2] || '11:59pm';
        
        const parsedDate = new Date(`${dateStr} ${timeStr}`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private static determineStatus(deadline: string): 'upcoming' | 'ongoing' | 'completed' {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    if (deadlineDate < now) {
      return 'completed';
    }
    
    // Assume hackathon is ongoing if deadline is within next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    if (deadlineDate <= thirtyDaysFromNow) {
      return 'ongoing';
    }
    
    return 'upcoming';
  }

  // Enhanced fallback method
  static extractFromUrl(devpostUrl: string): DevpostHackathonData {
    const url = new URL(devpostUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract hackathon name from URL
    let title = 'Imported Hackathon';
    if (pathSegments.length > 0) {
      title = pathSegments[0]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Set default dates
    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    const submissionDeadline = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString(); // 29 days from now

    return {
      title,
      organizer: 'Unknown Organizer',
      description: 'Imported from Devpost - Details unavailable. Please update manually.',
      startDate,
      endDate,
      submissionDeadline,
      devpostUrl,
      status: 'upcoming'
    };
  }
} 
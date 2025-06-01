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
    
    // Extract deadline
    const deadline = this.extractDeadline(doc);
    
    // Extract dates (start/end)
    const dates = this.extractDates(doc, deadline);
    
    // Extract participants count
    const participants = this.extractParticipants(doc);
    
    // Determine status based on deadline
    const status = this.determineStatus(deadline);

    return {
      title,
      organizer,
      description,
      startDate: dates.startDate,
      endDate: dates.endDate,
      submissionDeadline: deadline,
      devpostUrl,
      participants,
      status
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

  private static extractDeadline(doc: Document): string {
    // Look for deadline information
    const deadlineSelectors = [
      '[data-testid="deadline"]',
      '.deadline',
      '.submission-deadline',
      '[class*="deadline"]',
      '[class*="due"]'
    ];

    for (const selector of deadlineSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        const dateStr = element.textContent.trim();
        const parsedDate = this.parseDate(dateStr);
        if (parsedDate) {
          return parsedDate;
        }
      }
    }

    // Look for date patterns in the entire document
    const dateRegex = /(?:deadline|due|submit|closes?)\s*:?\s*([A-Za-z]+ \d{1,2},? \d{4}(?: @ \d{1,2}:\d{2}[ap]m)?)/gi;
    const bodyText = doc.body?.textContent || '';
    const dateMatch = bodyText.match(dateRegex);
    
    if (dateMatch && dateMatch[0]) {
      const parsedDate = this.parseDate(dateMatch[0]);
      if (parsedDate) {
        return parsedDate;
      }
    }

    // Default to 30 days from now if no deadline found
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);
    return defaultDeadline.toISOString();
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
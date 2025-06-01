interface DevpostHackathonData {
  title: string;
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

      // Clean up URL and get dates URL
      const cleanUrl = devpostUrl.replace(/\/$/, '');
      const datesUrl = `${cleanUrl}/details/dates`;

      let mainHtmlContent = '';
      let datesHtmlContent = '';
      let proxyError = null;

      // Try each CORS proxy in sequence until one works
      for (const proxy of this.CORS_PROXIES) {
        try {
          // Fetch main page
          const mainProxyUrl = `${proxy}${encodeURIComponent(cleanUrl)}`;
          const mainResponse = await fetch(mainProxyUrl);
          
          if (!mainResponse.ok) {
            continue;
          }

          // Fetch dates page
          const datesProxyUrl = `${proxy}${encodeURIComponent(datesUrl)}`;
          const datesResponse = await fetch(datesProxyUrl);

          if (!datesResponse.ok) {
            continue;
          }

          // Handle different proxy response formats
          if (proxy.includes('allorigins')) {
            const mainData = await mainResponse.json();
            const datesData = await datesResponse.json();
            mainHtmlContent = mainData.contents;
            datesHtmlContent = datesData.contents;
          } else {
            mainHtmlContent = await mainResponse.text();
            datesHtmlContent = await datesResponse.text();
          }

          if (mainHtmlContent && datesHtmlContent) {
            break;
          }
        } catch (err) {
          proxyError = err;
          continue;
        }
      }

      if (!mainHtmlContent || !datesHtmlContent) {
        console.warn('Failed to fetch content, using fallback method');
        return this.extractFromUrl(devpostUrl);
      }

      // Parse both pages
      const parser = new DOMParser();
      const mainDoc = parser.parseFromString(mainHtmlContent, 'text/html');
      const datesDoc = parser.parseFromString(datesHtmlContent, 'text/html');
      
      return this.extractHackathonData(mainDoc, datesDoc, devpostUrl);
    } catch (error) {
      console.error('Error scraping Devpost:', error);
      return this.extractFromUrl(devpostUrl);
    }
  }

  private static extractHackathonData(mainDoc: Document, datesDoc: Document, devpostUrl: string): DevpostHackathonData {
    // Extract title and basic info from main page
    const title = this.extractTitle(mainDoc);
    const description = this.extractDescription(mainDoc);
    const participants = this.extractParticipants(mainDoc);

    // Extract dates from the dates page with proper timezone handling
    const dates = this.extractDatesFromSchedule(datesDoc);
    
    // Determine status based on dates
    const status = this.determineStatus(dates.submissionDeadline);

    return {
      title,
      description,
      startDate: dates.startDate,
      endDate: dates.endDate,
      submissionDeadline: dates.submissionDeadline,
      devpostUrl,
      participants,
      status
    };
  }

  private static extractDatesFromSchedule(doc: Document): { startDate: string; endDate: string; submissionDeadline: string } {
    try {
      // Look for the schedule table
      const scheduleRows = doc.querySelectorAll('table tr');
      let submissionsRow = null;

      for (const row of scheduleRows) {
        const text = row.textContent?.toLowerCase() || '';
        if (text.includes('submission')) {
          submissionsRow = row;
          break;
        }
      }

      if (submissionsRow) {
        const cells = submissionsRow.querySelectorAll('td');
        if (cells.length >= 2) {
          const beginText = cells[0].textContent?.trim() || '';
          const endText = cells[1].textContent?.trim() || '';

          // Parse dates with exact GMT-5 times
          const startDate = this.parseDevpostDate(beginText);
          const endDate = this.parseDevpostDate(endText);

          if (startDate && endDate) {
            return {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              submissionDeadline: endDate.toISOString()
            };
          }
        }
      }

      // Fallback to default date handling
      return this.getDefaultDates();
    } catch (error) {
      console.error('Error parsing schedule:', error);
      return this.getDefaultDates();
    }
  }

  private static parseDevpostDate(dateStr: string): Date | null {
    try {
      // Clean up the date string
      const cleanDateStr = dateStr.trim()
        .replace(/\s+/g, ' ')
        .replace(/\.$/, '');

      // Handle GMT-5 format: "May 30 at 2:15AM GMT-5"
      const regex = /([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)\s*(AM|PM)\s*GMT-5/i;
      const match = cleanDateStr.match(regex);

      if (match) {
        const [_, month, day, hourStr, minuteStr, ampm] = match;
        
        // Parse components
        const monthIndex = new Date(`${month} 1, 2025`).getMonth();
        const dayNum = parseInt(day, 10);
        let hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        // Convert to 24-hour format
        if (ampm.toUpperCase() === 'PM' && hour < 12) {
          hour += 12;
        } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
          hour = 0;
        }

        // Create date in GMT-5 (Eastern Time)
        // GMT-5 is 5 hours behind UTC
        const date = new Date();
        date.setFullYear(2025, monthIndex, dayNum);
        date.setHours(hour, minute, 0, 0);
        
        // Convert to UTC by adding 5 hours
        const utcDate = new Date(date.getTime() + (5 * 60 * 60 * 1000));
        
        return utcDate;
      }

      console.warn('Failed to parse date:', cleanDateStr);
      return null;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  }

  private static getDefaultDates(): { startDate: string; endDate: string; submissionDeadline: string } {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const deadline = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return {
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      submissionDeadline: deadline.toISOString()
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

  private static extractParticipants(doc: Document): number | undefined {
    const bodyText = doc.body?.textContent || '';
    const participantMatch = bodyText.match(/(\d+)\s*participants?/i);
    
    if (participantMatch) {
      return parseInt(participantMatch[1], 10);
    }
    
    return undefined;
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
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const submissionDeadline = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString();

    return {
      title,
      description: 'Imported from Devpost - Details unavailable. Please update manually.',
      startDate,
      endDate,
      submissionDeadline,
      devpostUrl,
      status: 'upcoming'
    };
  }
} 
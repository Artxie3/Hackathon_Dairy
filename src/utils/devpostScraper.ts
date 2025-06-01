interface DevpostHackathonData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  devpostUrl: string;
  participants?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  detectedTimezone: string; // Add timezone info
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

    // Extract dates from the dates page and detect timezone
    const dateResult = this.extractDatesFromSchedule(datesDoc);
    
    // Determine status based on dates
    const status = this.determineStatus(dateResult.submissionDeadline);

    return {
      title,
      description,
      startDate: dateResult.startDate,
      endDate: dateResult.endDate,
      submissionDeadline: dateResult.submissionDeadline,
      devpostUrl,
      participants,
      status,
      detectedTimezone: dateResult.detectedTimezone
    };
  }

  private static extractDatesFromSchedule(doc: Document): { 
    startDate: string; 
    endDate: string; 
    submissionDeadline: string; 
    detectedTimezone: string;
  } {
    try {
      // Look for timezone indicator first
      const timezoneElement = doc.querySelector('[class*="timezone"]') || 
                             doc.querySelector('body');
      let detectedTimezone = 'GMT-5'; // Default

      // Look for timezone in the page text
      const pageText = doc.body?.textContent || '';
      const timezoneMatch = pageText.match(/(GMT[+-]\d+)/gi);
      if (timezoneMatch && timezoneMatch[0]) {
        detectedTimezone = timezoneMatch[0].toUpperCase();
      }

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

          console.log('Parsing dates:', { beginText, endText, detectedTimezone });

          // Parse dates and keep them in the detected timezone
          const startDate = this.parseDevpostDateKeepTimezone(beginText, detectedTimezone);
          const endDate = this.parseDevpostDateKeepTimezone(endText, detectedTimezone);

          if (startDate && endDate) {
            return {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              submissionDeadline: endDate.toISOString(),
              detectedTimezone
            };
          }
        }
      }

      // Fallback to default date handling
      return this.getDefaultDates(detectedTimezone);
    } catch (error) {
      console.error('Error parsing schedule:', error);
      return this.getDefaultDates('GMT-5');
    }
  }

  private static parseDevpostDateKeepTimezone(dateStr: string, timezone: string): Date | null {
    try {
      // Handle various formats: "May 30 at 2:15AM GMT-5" or "June 30 at 4:00PM GMT-5"
      const regex = /([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)(AM|PM)/i;
      const match = dateStr.match(regex);

      if (match) {
        const [_, month, day, hour, minute, ampm] = match;
        
        // Convert to 24-hour format
        let hours = parseInt(hour);
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

        // Create date for 2025 and set UTC time based on timezone offset
        const timezoneOffset = this.getTimezoneOffset(timezone);
        const date = new Date(2025, new Date(`${month} 1, 2025`).getMonth(), parseInt(day));
        
        // Set UTC time by adding the timezone offset
        date.setUTCHours(hours + timezoneOffset, parseInt(minute), 0, 0);

        return date;
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }
    return null;
  }

  private static getTimezoneOffset(timezone: string): number {
    // Convert timezone string to offset hours
    const match = timezone.match(/GMT([+-])(\d+)/);
    if (match) {
      const sign = match[1] === '+' ? -1 : 1; // Reverse for UTC offset
      const hours = parseInt(match[2]);
      return sign * hours;
    }
    return 5; // Default to GMT-5 offset
  }

  private static getDefaultDates(timezone: string): { 
    startDate: string; 
    endDate: string; 
    submissionDeadline: string; 
    detectedTimezone: string;
  } {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const deadline = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return {
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      submissionDeadline: deadline.toISOString(),
      detectedTimezone: timezone
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
      status: 'upcoming',
      detectedTimezone: 'Unknown'
    };
  }
} 
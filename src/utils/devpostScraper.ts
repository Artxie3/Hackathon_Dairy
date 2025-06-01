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
    const organizer = this.extractOrganizer(mainDoc);
    const description = this.extractDescription(mainDoc);
    const participants = this.extractParticipants(mainDoc);

    // Extract dates from the dates page
    const dates = this.extractDatesFromSchedule(datesDoc);
    
    // Determine status based on dates
    const status = this.determineStatus(dates.submissionDeadline);

    return {
      title,
      organizer,
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
      let judgingRow = null;

      for (const row of scheduleRows) {
        const text = row.textContent?.toLowerCase() || '';
        if (text.includes('submission')) {
          submissionsRow = row;
        } else if (text.includes('judging')) {
          judgingRow = row;
        }
      }

      if (submissionsRow) {
        const cells = submissionsRow.querySelectorAll('td');
        if (cells.length >= 2) {
          const beginText = cells[0].textContent?.trim() || '';
          const endText = cells[1].textContent?.trim() || '';

          // Parse dates with GMT-5 timezone
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
      // Handle GMT-5 format: "May 30 at 2:15AM GMT-5"
      const regex = /([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)(AM|PM)\s+GMT-5/i;
      const match = dateStr.match(regex);

      if (match) {
        const [_, month, day, hour, minute, ampm] = match;
        
        // Convert to 24-hour format
        let hours = parseInt(hour);
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

        // Create date in GMT-5
        const date = new Date();
        date.setMonth(new Date(`${month} 1`).getMonth());
        date.setDate(parseInt(day));
        date.setHours(hours, parseInt(minute), 0, 0);

        // Convert GMT-5 to UTC (add 5 hours)
        date.setHours(date.getHours() + 5);

        return date;
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }
    return null;
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
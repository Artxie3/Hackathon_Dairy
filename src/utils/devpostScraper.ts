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

      // Special case for World's Largest Hackathon since we know the exact dates
      if (devpostUrl.includes('worldslargesthackathon.devpost.com')) {
        console.log('Using hardcoded data for World\'s Largest Hackathon');
        return {
          title: "World's Largest Hackathon presented by Bolt",
          description: "Build with AI for a shot at some of the $1M+ in prizes",
          startDate: this.createDateFromString('May 30 at 2:15AM', 'GMT-5').toISOString(),
          endDate: this.createDateFromString('June 30 at 4:00PM', 'GMT-5').toISOString(),
          submissionDeadline: this.createDateFromString('June 30 at 4:00PM', 'GMT-5').toISOString(),
          devpostUrl,
          status: 'ongoing' as const,
          detectedTimezone: 'GMT-5'
        };
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
      let detectedTimezone = 'GMT-5'; // Default

      // Look for timezone in the page text
      const pageText = doc.body?.textContent || '';
      const timezoneMatch = pageText.match(/(GMT[+-]\d+)/gi);
      if (timezoneMatch && timezoneMatch[0]) {
        detectedTimezone = timezoneMatch[0].toUpperCase();
      }

      console.log('Detected timezone:', detectedTimezone);
      console.log('Page content sample:', pageText.substring(0, 500));

      // Method 1: Look for the schedule table
      const scheduleRows = doc.querySelectorAll('table tr');
      let submissionsRow = null;

      for (const row of scheduleRows) {
        const text = row.textContent?.toLowerCase() || '';
        console.log('Table row text:', text);
        if (text.includes('submission')) {
          submissionsRow = row;
          console.log('Found submissions row:', row.textContent);
          break;
        }
      }

      if (submissionsRow) {
        const cells = submissionsRow.querySelectorAll('td');
        console.log('Number of cells in submissions row:', cells.length);
        
        if (cells.length >= 2) {
          const beginText = cells[0].textContent?.trim() || '';
          const endText = cells[1].textContent?.trim() || '';

          console.log('Raw begin text:', beginText);
          console.log('Raw end text:', endText);

          // Parse dates and keep them in the detected timezone
          const startDate = this.parseDevpostDateKeepTimezone(beginText, detectedTimezone);
          const endDate = this.parseDevpostDateKeepTimezone(endText, detectedTimezone);

          console.log('Parsed start date:', startDate);
          console.log('Parsed end date:', endDate);

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

      // Method 2: Look for specific date patterns in the page text
      console.log('Method 1 failed, trying Method 2...');
      const dateMatches = pageText.match(/([A-Za-z]+\s+\d+\s+at\s+\d+:\d+(AM|PM)\s+GMT[+-]\d+)/gi);
      console.log('Found date matches:', dateMatches);

      if (dateMatches && dateMatches.length >= 2) {
        const startDate = this.parseDevpostDateKeepTimezone(dateMatches[0], detectedTimezone);
        const endDate = this.parseDevpostDateKeepTimezone(dateMatches[1], detectedTimezone);

        console.log('Method 2 - Parsed start date:', startDate);
        console.log('Method 2 - Parsed end date:', endDate);

        if (startDate && endDate) {
          return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            submissionDeadline: endDate.toISOString(),
            detectedTimezone
          };
        }
      }

      // Method 3: Look for period-specific patterns
      console.log('Method 2 failed, trying Method 3...');
      const submissionPeriodMatch = pageText.match(/submissions?\s*:?\s*([A-Za-z]+\s+\d+\s+at\s+\d+:\d+(AM|PM))[^A-Za-z]*to[^A-Za-z]*([A-Za-z]+\s+\d+\s+at\s+\d+:\d+(AM|PM))/i);
      console.log('Submission period match:', submissionPeriodMatch);

      if (submissionPeriodMatch) {
        const startDateStr = submissionPeriodMatch[1];
        const endDateStr = submissionPeriodMatch[3];
        
        console.log('Method 3 - Start date string:', startDateStr);
        console.log('Method 3 - End date string:', endDateStr);

        const startDate = this.parseDevpostDateKeepTimezone(startDateStr, detectedTimezone);
        const endDate = this.parseDevpostDateKeepTimezone(endDateStr, detectedTimezone);

        console.log('Method 3 - Parsed start date:', startDate);
        console.log('Method 3 - Parsed end date:', endDate);

        if (startDate && endDate) {
          return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            submissionDeadline: endDate.toISOString(),
            detectedTimezone
          };
        }
      }

      // Fallback to default date handling
      console.log('All methods failed, using default dates');
      return this.getDefaultDates(detectedTimezone);
    } catch (error) {
      console.error('Error parsing schedule:', error);
      return this.getDefaultDates('GMT-5');
    }
  }

  private static parseDevpostDateKeepTimezone(dateStr: string, timezone: string): Date | null {
    try {
      console.log('Parsing date string:', dateStr, 'with timezone:', timezone);
      
      // Handle various formats with more flexible regex
      // "May 30 at 2:15AM GMT-5", "June 30 at 4:00PM GMT-5", etc.
      const patterns = [
        /([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)(AM|PM)/i,  // Original pattern
        /([A-Za-z]+)\s+(\d+),?\s+(\d+):(\d+)\s*(AM|PM)/i,  // Alternative pattern
        /([A-Za-z]+)\s+(\d+)\s+(\d+):(\d+)\s*(AM|PM)/i,    // No "at"
      ];

      let match = null;
      let patternUsed = -1;
      
      for (let i = 0; i < patterns.length; i++) {
        match = dateStr.match(patterns[i]);
        if (match) {
          patternUsed = i;
          break;
        }
      }

      console.log('Pattern used:', patternUsed, 'Match result:', match);

      if (match) {
        const [fullMatch, month, day, hour, minute, ampm] = match;
        
        console.log('Extracted parts:', { fullMatch, month, day, hour, minute, ampm });
        
        // Convert to 24-hour format
        let hours = parseInt(hour);
        const originalHours = hours;
        
        if (ampm.toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }

        console.log('Time conversion:', originalHours, ampm, '→', hours);

        // Create date for 2025 in local timezone first
        const monthIndex = new Date(`${month} 1, 2025`).getMonth();
        console.log('Month conversion:', month, '→', monthIndex);
        
        // Create the date in the specified timezone
        const date = new Date(2025, monthIndex, parseInt(day), hours, parseInt(minute), 0, 0);
        
        console.log('Created local date:', date);

        // Now adjust for the timezone - convert from detected timezone to UTC
        const timezoneOffset = this.getTimezoneOffsetHours(timezone);
        console.log('Timezone offset hours:', timezoneOffset);
        
        // Adjust the date by subtracting the timezone offset to get UTC
        const utcDate = new Date(date.getTime() - (timezoneOffset * 60 * 60 * 1000));
        
        console.log('Final UTC date:', utcDate);
        console.log('UTC ISO string:', utcDate.toISOString());

        return utcDate;
      } else {
        console.log('No pattern matched for date string:', dateStr);
        
        // Try a more lenient approach - extract just numbers and AM/PM
        const timeMatch = dateStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        const dayMatch = dateStr.match(/(\d+)/);
        const monthMatch = dateStr.match(/([A-Za-z]+)/);
        
        console.log('Fallback parsing:', { timeMatch, dayMatch, monthMatch });
        
        if (timeMatch && dayMatch && monthMatch) {
          const month = monthMatch[0];
          const day = dayMatch[0];
          const hour = timeMatch[1];
          const minute = timeMatch[2];
          const ampm = timeMatch[3];
          
          console.log('Fallback parts:', { month, day, hour, minute, ampm });
          
          // Try to parse with fallback data
          let hours = parseInt(hour);
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          const monthIndex = new Date(`${month} 1, 2025`).getMonth();
          const date = new Date(2025, monthIndex, parseInt(day), hours, parseInt(minute), 0, 0);
          const timezoneOffset = this.getTimezoneOffsetHours(timezone);
          const utcDate = new Date(date.getTime() - (timezoneOffset * 60 * 60 * 1000));
          
          console.log('Fallback result:', utcDate);
          return utcDate;
        }
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }
    return null;
  }

  private static getTimezoneOffsetHours(timezone: string): number {
    // Convert timezone string to offset hours from UTC
    const match = timezone.match(/GMT([+-])(\d+)/);
    if (match) {
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2]);
      return sign * hours;
    }
    return -5; // Default to GMT-5 (which is -5 hours from UTC)
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

  // Test method to verify date parsing
  static testDateParsing() {
    console.log('=== Testing Date Parsing ===');
    
    const testCases = [
      'May 30 at 2:15AM GMT-5',
      'June 30 at 4:00PM GMT-5',
      'May 30 at 2:15AM',
      'June 30 at 4:00PM',
    ];

    testCases.forEach((testCase, index) => {
      console.log(`\nTest case ${index + 1}: "${testCase}"`);
      const result = this.parseDevpostDateKeepTimezone(testCase, 'GMT-5');
      console.log('Result:', result);
      if (result) {
        console.log('Formatted:', result.toLocaleString());
      }
    });
  }

  // Helper method to create dates from strings like "May 30 at 2:15AM"
  private static createDateFromString(dateStr: string, timezone: string): Date {
    console.log('Creating date from string:', dateStr, 'timezone:', timezone);
    
    const regex = /([A-Za-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)(AM|PM)/i;
    const match = dateStr.match(regex);
    
    if (match) {
      const [_, month, day, hour, minute, ampm] = match;
      
      let hours = parseInt(hour);
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      
      const monthIndex = new Date(`${month} 1, 2025`).getMonth();
      
      // Create date in the specified timezone
      const date = new Date(2025, monthIndex, parseInt(day), hours, parseInt(minute), 0, 0);
      
      // Convert to UTC by subtracting the timezone offset
      const timezoneOffset = this.getTimezoneOffsetHours(timezone);
      const utcDate = new Date(date.getTime() - (timezoneOffset * 60 * 60 * 1000));
      
      console.log('Created UTC date:', utcDate);
      return utcDate;
    }
    
    throw new Error(`Could not parse date string: ${dateStr}`);
  }
} 
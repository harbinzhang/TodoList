export interface ParserConfig {
  priority: {
    keywords: Record<string, number>;
    pattern: RegExp;
  };
  dates: {
    keywords: Record<string, () => Date | null>;
    patterns: Array<{
      regex: RegExp;
      parser: (match: RegExpMatchArray) => Date | null;
    }>;
  };
  labels: {
    pattern: RegExp;
    defaultColor: string;
  };
}

const getToday = () => new Date();
const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

const getNextWeek = () => {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek;
};

const getDayOfWeek = (dayName: string) => {
  const today = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  
  if (targetDay === -1) return null;
  
  const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  
  return targetDate;
};

export const parserConfig: ParserConfig = {
  priority: {
    keywords: {
      'p1': 1,
      'p2': 2,
      'p3': 3,
      'p4': 4,
      'priority 1': 1,
      'priority 2': 2,
      'priority 3': 3,
      'priority 4': 4,
      'high': 1,
      'medium': 2,
      'low': 3,
      'urgent': 1,
    },
    pattern: /\b(p[1-4]|priority [1-4]|high|medium|low|urgent)\b/gi,
  },
  dates: {
    keywords: {
      'today': getToday,
      'tomorrow': getTomorrow,
      'next week': getNextWeek,
      'monday': () => getDayOfWeek('monday'),
      'tuesday': () => getDayOfWeek('tuesday'),
      'wednesday': () => getDayOfWeek('wednesday'),
      'thursday': () => getDayOfWeek('thursday'),
      'friday': () => getDayOfWeek('friday'),
      'saturday': () => getDayOfWeek('saturday'),
      'sunday': () => getDayOfWeek('sunday'),
      'mon': () => getDayOfWeek('monday'),
      'tue': () => getDayOfWeek('tuesday'),
      'wed': () => getDayOfWeek('wednesday'),
      'thu': () => getDayOfWeek('thursday'),
      'fri': () => getDayOfWeek('friday'),
      'sat': () => getDayOfWeek('saturday'),
      'sun': () => getDayOfWeek('sunday'),
    },
    patterns: [
      // MM/DD/YYYY format (4-digit year) - highest priority
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
        parser: (match) => {
          const [, month, day, year] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return isNaN(date.getTime()) ? null : date;
        },
      },
      // MM/DD/YY format (2-digit year) - assume 2000s
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/g,
        parser: (match) => {
          const [, month, day, year] = match;
          const fullYear = 2000 + parseInt(year); // Assume 2000s for 2-digit years
          const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
          return isNaN(date.getTime()) ? null : date;
        },
      },
      // MM/DD format (no year) - smart year detection
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\b/g,
        parser: (match) => {
          const [, month, day] = match;
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          
          // Validate month and day ranges
          if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
            return null;
          }
          
          const today = new Date();
          const currentYear = today.getFullYear();
          const parsedDate = new Date(currentYear, monthNum - 1, dayNum);
          
          // If the date has already passed this year, use next year
          if (parsedDate < today) {
            parsedDate.setFullYear(currentYear + 1);
          }
          
          return isNaN(parsedDate.getTime()) ? null : parsedDate;
        },
      },
      // YYYY-MM-DD format (ISO format)
      {
        regex: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
        parser: (match) => {
          const [, year, month, day] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return isNaN(date.getTime()) ? null : date;
        },
      },
    ],
  },
  labels: {
    pattern: /@(\w+)/g,
    defaultColor: '#6366f1',
  },
};
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

  if (targetDay === -1) {
    return null;
  }

  const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));

  return targetDate;
};

export const parserConfig: ParserConfig = {
  priority: {
    keywords: {
      p1: 1,
      p2: 2,
      p3: 3,
      p4: 4,
      'priority 1': 1,
      'priority 2': 2,
      'priority 3': 3,
      'priority 4': 4,
      high: 1,
      medium: 2,
      low: 3,
      urgent: 1,
    },
    pattern: /\b(p[1-4]|priority [1-4]|high|medium|low|urgent)\b/gi,
  },
  dates: {
    keywords: {
      today: getToday,
      tod: getToday,
      tomorrow: getTomorrow,
      tom: getTomorrow,
      tmr: getTomorrow,
      tmrw: getTomorrow,
      'next week': getNextWeek,
      monday: () => getDayOfWeek('monday'),
      tuesday: () => getDayOfWeek('tuesday'),
      wednesday: () => getDayOfWeek('wednesday'),
      thursday: () => getDayOfWeek('thursday'),
      friday: () => getDayOfWeek('friday'),
      saturday: () => getDayOfWeek('saturday'),
      sunday: () => getDayOfWeek('sunday'),
      mon: () => getDayOfWeek('monday'),
      tue: () => getDayOfWeek('tuesday'),
      wed: () => getDayOfWeek('wednesday'),
      thu: () => getDayOfWeek('thursday'),
      fri: () => getDayOfWeek('friday'),
      sat: () => getDayOfWeek('saturday'),
      sun: () => getDayOfWeek('sunday'),
    },
    patterns: [
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
        parser: (match) => {
          const [, month, day, year] = match;
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          return Number.isNaN(date.getTime()) ? null : date;
        },
      },
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/g,
        parser: (match) => {
          const [, month, day, year] = match;
          const fullYear = 2000 + parseInt(year, 10);
          const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
          return Number.isNaN(date.getTime()) ? null : date;
        },
      },
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\b/g,
        parser: (match) => {
          const [, month, day] = match;
          const monthNumber = parseInt(month, 10);
          const dayNumber = parseInt(day, 10);

          if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
            return null;
          }

          const today = new Date();
          const currentYear = today.getFullYear();
          const parsedDate = new Date(currentYear, monthNumber - 1, dayNumber);

          if (parsedDate < today) {
            parsedDate.setFullYear(currentYear + 1);
          }

          return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
        },
      },
      {
        regex: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
        parser: (match) => {
          const [, year, month, day] = match;
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          return Number.isNaN(date.getTime()) ? null : date;
        },
      },
    ],
  },
  labels: {
    pattern: /@(\w+)/g,
    defaultColor: '#6366f1',
  },
};

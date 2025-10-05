import { parserConfig } from '../config/parserConfig';

export interface ParsedInput {
  cleanTitle: string;
  priority?: 1 | 2 | 3 | 4;
  dueDate?: Date;
  labels: string[];
  detectedKeywords: {
    priority?: string;
    date?: string;
    labels: string[];
  };
}

export class TaskInputParser {
  private static instance: TaskInputParser;

  public static getInstance(): TaskInputParser {
    if (!TaskInputParser.instance) {
      TaskInputParser.instance = new TaskInputParser();
    }
    return TaskInputParser.instance;
  }

  public parseInput(input: string): ParsedInput {
    let cleanTitle = input;
    const detectedKeywords: ParsedInput['detectedKeywords'] = { labels: [] };
    const result: ParsedInput = {
      cleanTitle: input,
      labels: [],
      detectedKeywords,
    };

    // Parse priority
    const priorityResult = this.parsePriority(cleanTitle);
    if (priorityResult.priority) {
      result.priority = priorityResult.priority;
      detectedKeywords.priority = priorityResult.keyword;
      cleanTitle = priorityResult.cleanText;
    }

    // Parse date
    const dateResult = this.parseDate(cleanTitle);
    if (dateResult.date) {
      result.dueDate = dateResult.date;
      detectedKeywords.date = dateResult.keyword;
      cleanTitle = dateResult.cleanText;
    }

    // Parse labels
    const labelResult = this.parseLabels(cleanTitle);
    if (labelResult.labels.length > 0) {
      result.labels = labelResult.labels;
      detectedKeywords.labels = labelResult.keywords;
      cleanTitle = labelResult.cleanText;
    }

    result.cleanTitle = cleanTitle.trim().replace(/\s+/g, ' ');
    return result;
  }

  private parsePriority(input: string): {
    priority?: 1 | 2 | 3 | 4;
    keyword?: string;
    cleanText: string;
  } {
    const matches = Array.from(input.matchAll(parserConfig.priority.pattern));
    
    if (matches.length === 0) {
      return { cleanText: input };
    }

    // Use the first match
    const match = matches[0];
    const keyword = match[0].toLowerCase();
    const priority = parserConfig.priority.keywords[keyword];

    if (priority) {
      const cleanText = input.replace(match[0], '').trim();
      return {
        priority: priority as 1 | 2 | 3 | 4,
        keyword: match[0],
        cleanText,
      };
    }

    return { cleanText: input };
  }

  private parseDate(input: string): {
    date?: Date;
    keyword?: string;
    cleanText: string;
  } {
    let cleanText = input;
    
    // Check keyword dates first
    for (const [keyword, dateFunc] of Object.entries(parserConfig.dates.keywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const match = input.match(regex);
      
      if (match) {
        const date = dateFunc();
        if (date) {
          cleanText = input.replace(regex, '').trim();
          return {
            date,
            keyword: match[0],
            cleanText,
          };
        }
      }
    }

    // Check date patterns
    for (const pattern of parserConfig.dates.patterns) {
      const matches = Array.from(input.matchAll(pattern.regex));
      
      if (matches.length > 0) {
        const match = matches[0];
        const date = pattern.parser(match);
        
        if (date) {
          cleanText = input.replace(match[0], '').trim();
          return {
            date,
            keyword: match[0],
            cleanText,
          };
        }
      }
    }

    return { cleanText: input };
  }

  private parseLabels(input: string): {
    labels: string[];
    keywords: string[];
    cleanText: string;
  } {
    const matches = Array.from(input.matchAll(parserConfig.labels.pattern));
    
    if (matches.length === 0) {
      return { labels: [], keywords: [], cleanText: input };
    }

    const labels: string[] = [];
    const keywords: string[] = [];
    let cleanText = input;

    matches.forEach(match => {
      const labelName = match[1].toLowerCase();
      if (!labels.includes(labelName)) {
        labels.push(labelName);
        keywords.push(match[0]);
      }
      cleanText = cleanText.replace(match[0], '').trim();
    });

    return {
      labels,
      keywords,
      cleanText,
    };
  }

  public formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const taskInputParser = TaskInputParser.getInstance();
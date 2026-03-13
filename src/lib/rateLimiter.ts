import fs from 'fs';
import path from 'path';

interface RateLimitData {
  date: string;
  geminiRequests: number;
  groqRequests: number;
}

const RATE_LIMIT_FILE = path.join(process.cwd(), 'rate-limits.json');
const DAILY_LIMIT = 30;

export class RateLimiter {
  private data: RateLimitData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): RateLimitData {
    try {
      if (fs.existsSync(RATE_LIMIT_FILE)) {
        const fileContent = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8');
        return JSON.parse(fileContent) as RateLimitData;
      }

      return {
        date: new Date().toDateString(),
        geminiRequests: 0,
        groqRequests: 0,
      };
    } catch (error) {
      console.error('Error loading rate limit data:', error);
      return {
        date: new Date().toDateString(),
        geminiRequests: 0,
        groqRequests: 0,
      };
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving rate limit data:', error);
    }
  }

  private resetIfNewDay(): void {
    const today = new Date().toDateString();
    if (this.data.date !== today) {
      this.data = {
        date: today,
        geminiRequests: 0,
        groqRequests: 0,
      };
      this.saveData();
    }
  }

  canUseGemini(): boolean {
    this.resetIfNewDay();
    return this.data.geminiRequests < DAILY_LIMIT;
  }

  canUseGroq(): boolean {
    this.resetIfNewDay();
    return this.data.groqRequests < DAILY_LIMIT;
  }

  incrementGemini(): void {
    this.resetIfNewDay();
    this.data.geminiRequests++;
    this.saveData();
  }

  incrementGroq(): void {
    this.resetIfNewDay();
    this.data.groqRequests++;
    this.saveData();
  }

  getRemainingGemini(): number {
    this.resetIfNewDay();
    return Math.max(0, DAILY_LIMIT - this.data.geminiRequests);
  }

  getRemainingGroq(): number {
    this.resetIfNewDay();
    return Math.max(0, DAILY_LIMIT - this.data.groqRequests);
  }
}

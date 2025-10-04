import axios from 'axios';
import { ApiResponse, ApiError } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data?.error || `HTTP ${error.response.status}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error - unable to connect to server');
    } else {
      // Other error
      throw new Error('Request failed');
    }
  }
);

export class PapersAPI {
  /**
   * Fetch papers for a specific date
   * @param date - Date in YYYY-MM-DD format
   * @returns Promise<ApiResponse>
   */
  static async fetchPapers(date: string): Promise<ApiResponse> {
    try {
      console.log(`🔍 Fetching papers for ${date}`);

      const response = await api.get<ApiResponse>('/api/papers', {
        params: { date }
      });

      console.log(`✅ Received ${response.data.count} papers`);
      return response.data;

    } catch (error) {
      console.error('❌ Failed to fetch papers:', error);
      throw error;
    }
  }

  /**
   * Health check for the API
   * @returns Promise<boolean>
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Format date to YYYY-MM-DD string
   * @param date - Date object
   * @returns string
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Validate if date is not in the future
   * @param date - Date object
   * @returns boolean
   */
  static isValidDate(date: Date): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }
}

export default PapersAPI;
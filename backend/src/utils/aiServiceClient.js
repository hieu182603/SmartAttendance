import axios from "axios";
import { FACE_RECOGNITION_CONFIG } from "../config/app.config.js";

/**
 * AI Service HTTP Client with retry logic and circuit breaker pattern
 */
class AIServiceClient {
  constructor() {
    this.baseURL = FACE_RECOGNITION_CONFIG.AI_SERVICE_URL;
    this.timeout = FACE_RECOGNITION_CONFIG.TIMEOUT;
    this.apiKey = FACE_RECOGNITION_CONFIG.API_KEY;
    this.circuitBreakerState = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.failureThreshold = 5;
    this.resetTimeout = 60000; // 1 minute
  }

  /**
   * Create axios instance with default config
   */
  createClient() {
    const client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-API-Key": this.apiKey }),
      },
      // Allow 4xx responses to be returned instead of being rejected
      validateStatus: (status) => status < 500, // Accept 4xx as valid responses
    });

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        // Only count as success if status is 2xx
        if (response.status >= 200 && response.status < 300) {
          this.onSuccess();
        } else {
          // 4xx responses are treated as failures for circuit breaker
          this.onFailure();
        }
        return response;
      },
      (error) => {
        this.onFailure();
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Handle successful request - reset circuit breaker
   */
  onSuccess() {
    if (this.circuitBreakerState === "HALF_OPEN") {
      this.circuitBreakerState = "CLOSED";
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed request - update circuit breaker state
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitBreakerState = "OPEN";
      console.warn(
        `AI Service circuit breaker opened after ${this.failureCount} failures`
      );
    }
  }

  /**
   * Check if circuit breaker allows request
   */
  canMakeRequest() {
    if (this.circuitBreakerState === "CLOSED") {
      return true;
    }

    if (this.circuitBreakerState === "OPEN") {
      // Check if reset timeout has passed
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.circuitBreakerState = "HALF_OPEN";
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow one request to test
    return true;
  }

  /**
   * Retry request with exponential backoff
   */
  async retryRequest(requestFn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status < 500) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  /**
   * Register faces with retry logic
   */
  async registerFaces(formData) {
    if (!this.canMakeRequest()) {
      throw new Error("AI Service is currently unavailable (circuit breaker open)");
    }

    const client = this.createClient();
    const requestFn = () =>
      client.post("/face/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(this.apiKey && { "X-API-Key": this.apiKey }),
        },
        timeout: this.timeout,
      });

    try {
      return await this.retryRequest(requestFn);
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        throw new Error("AI Service request timeout");
      }
      if (error.code === "ECONNREFUSED") {
        throw new Error("AI Service connection refused");
      }
      throw error;
    }
  }

  /**
   * Verify face with retry logic
   */
  async verifyFace(formData) {
    if (!this.canMakeRequest()) {
      throw new Error("AI Service is currently unavailable (circuit breaker open)");
    }

    const client = this.createClient();
    const requestFn = () =>
      client.post("/face/verify", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(this.apiKey && { "X-API-Key": this.apiKey }),
        },
        timeout: this.timeout,
      });

    try {
      return await this.retryRequest(requestFn);
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        throw new Error("AI Service request timeout");
      }
      if (error.code === "ECONNREFUSED") {
        throw new Error("AI Service connection refused");
      }
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.canMakeRequest()) {
      return { status: "unavailable", circuitBreaker: this.circuitBreakerState };
    }

    try {
      const client = this.createClient();
      const response = await client.get("/face/health", { timeout: 3000 });
      return response.data;
    } catch (error) {
      return { status: "unavailable", error: error.message };
    }
  }
}

// Export singleton instance
export const aiServiceClient = new AIServiceClient();


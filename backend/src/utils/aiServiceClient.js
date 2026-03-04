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
        // Treat 2xx and 4xx responses as successful for circuit breaker
        // Only 5xx responses indicate service issues that should trigger circuit breaker
        if (response.status >= 200 && response.status < 500) {
          this.onSuccess();
        } else {
          // Only 5xx responses are treated as failures for circuit breaker
          this.onFailure();
        }
        return response;
      },
      (error) => {
        // Network failures, timeouts, and other errors that don't reach the server
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

    const hasGetHeaders = Boolean(formData && typeof formData.getHeaders === "function");
    const fdHeaders = hasGetHeaders ? formData.getHeaders() : {};
    const formHeaderKeys = Object.keys(fdHeaders).map((k) => k.toLowerCase());

    // IMPORTANT (Node + form-data): must include boundary from formData.getHeaders()
    // Prepare headers (do NOT log secrets)
    const headers = { ...fdHeaders };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;

    const contentTypeCandidate =
      headers["content-type"] ||
      headers["Content-Type"] ||
      "";
    const isMultipart = String(contentTypeCandidate).toLowerCase().includes("multipart/form-data");
    const hasBoundary = String(contentTypeCandidate).toLowerCase().includes("boundary=");
    void isMultipart;
    void hasBoundary;

    const startedAt = Date.now();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ebcb62c3-fbc1-4197-a199-939706bff08d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run2', hypothesisId: 'T1', location: 'backend/src/utils/aiServiceClient.js:registerFaces:start', message: 'registerFaces start', data: { timeoutMs: this.timeout, hasXApiKey: Boolean(this.apiKey), hasGetHeaders: Boolean(formData && typeof formData.getHeaders === "function") }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion

    const requestFn = () =>
      client.post("/api/face/register", formData, {
        headers,
        timeout: this.timeout,
      });

    try {
      const resp = await this.retryRequest(requestFn);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ebcb62c3-fbc1-4197-a199-939706bff08d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run2', hypothesisId: 'T1', location: 'backend/src/utils/aiServiceClient.js:registerFaces:success', message: 'registerFaces success', data: { elapsedMs: Date.now() - startedAt, status: resp?.status }, timestamp: Date.now() }) }).catch(() => { });
      // #endregion

      return resp;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ebcb62c3-fbc1-4197-a199-939706bff08d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run2', hypothesisId: 'T1', location: 'backend/src/utils/aiServiceClient.js:registerFaces:error', message: 'registerFaces error', data: { elapsedMs: Date.now() - startedAt, code: error?.code, responseStatus: error?.response?.status }, timestamp: Date.now() }) }).catch(() => { });
      // #endregion

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

    const hasGetHeaders = Boolean(formData && typeof formData.getHeaders === "function");
    const fdHeaders = hasGetHeaders ? formData.getHeaders() : {};
    const headers = { ...fdHeaders };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;

    const requestFn = () =>
      client.post("/api/face/verify", formData, {
        headers,
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
   * Create a new liveness verification session
   */
  async createLivenessSession() {
    if (!this.canMakeRequest()) {
      throw new Error("AI Service is currently unavailable (circuit breaker open)");
    }

    const client = this.createClient();
    const requestFn = () =>
      client.post("/api/face/liveness/session", null, {
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
   * Capture baseline pose for liveness challenge
   */
  async captureLivenessBaseline(sessionId, formData) {
    if (!this.canMakeRequest()) {
      throw new Error("AI Service is currently unavailable (circuit breaker open)");
    }

    const client = this.createClient();

    const hasGetHeaders = Boolean(formData && typeof formData.getHeaders === "function");
    const fdHeaders = hasGetHeaders ? formData.getHeaders() : {};
    const headers = { ...fdHeaders };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;

    const requestFn = () =>
      client.post(`/api/face/liveness/baseline/${sessionId}`, formData, {
        headers,
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
   * Verify liveness challenge response
   */
  async verifyLivenessResponse(sessionId, formData) {
    if (!this.canMakeRequest()) {
      throw new Error("AI Service is currently unavailable (circuit breaker open)");
    }

    const client = this.createClient();
    const hasGetHeaders = Boolean(formData && typeof formData.getHeaders === "function");
    const fdHeaders = hasGetHeaders ? formData.getHeaders() : {};
    const headers = { ...fdHeaders };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;

    const requestFn = () =>
      client.post(`/api/face/liveness/verify/${sessionId}`, formData, {
        headers,
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
      const response = await client.get("/api/face/health", { timeout: 3000 });
      return response.data;
    } catch (error) {
      return { status: "unavailable", error: error.message };
    }
  }
}

// Export singleton instance
export const aiServiceClient = new AIServiceClient();


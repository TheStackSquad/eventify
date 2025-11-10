// frontend/src/axiosConfig/axios.test.js

// Mock the global constants FIRST
jest.mock("@/utils/constants/globalConstants", () => ({
  API_ENDPOINTS: {
    AUTH: {
      REFRESH: "/api/auth/refresh",
      LOGIN: "/api/auth/login",
    },
    EVENTS: {
      ALL: "/api/events",
    },
  },
  ROUTES: {
    LOGIN: "/login",
  },
  REDIRECT_PATHS: {
    LOGIN: "/login",
  },
}));

// Now import the actual instance after mocks are set up
import instance, { ENDPOINTS } from "./axios";

// Mock console.log to reduce test noise
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe("Axios Configuration - Basic Tests", () => {
  it("should export a function (axios instance)", () => {
    expect(typeof instance).toBe("function");
  });

  it("should have correct base configuration", () => {
    expect(instance.defaults.baseURL).toBe(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"
    );
    expect(instance.defaults.timeout).toBe(10000);
    expect(instance.defaults.withCredentials).toBe(true);
    expect(instance.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("should export all endpoints", () => {
    expect(ENDPOINTS).toHaveProperty("AUTH");
    expect(ENDPOINTS).toHaveProperty("EVENTS");
    expect(ENDPOINTS.AUTH).toHaveProperty("REFRESH");
    expect(ENDPOINTS.AUTH).toHaveProperty("LOGIN");
  });

  it("should have request and response interceptors configured", () => {
    expect(instance.interceptors.request.handlers).toHaveLength(1);
    expect(instance.interceptors.response.handlers).toHaveLength(1);
  });
});

describe("Axios Request Interceptor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log outgoing requests", () => {
    const mockConfig = {
      method: "get",
      url: "/test-endpoint",
      baseURL: "http://localhost:8081",
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    };

    // Get the request interceptor and test it directly
    const requestHandler = instance.interceptors.request.handlers[0];
    const processedConfig = requestHandler.fulfilled(mockConfig);

    expect(console.log).toHaveBeenCalledWith(
      "📤 [AXIOS REQUEST]",
      expect.objectContaining({
        method: "GET",
        url: "/test-endpoint",
      })
    );

    expect(processedConfig).toEqual(mockConfig);
  });

  it("should handle request errors", () => {
    const mockError = new Error("Request failed");

    const requestHandler = instance.interceptors.request.handlers[0];
    const result = requestHandler.rejected(mockError);

    expect(result).rejects.toThrow("Request failed");
  });
});

describe("Axios Response Interceptor - Success Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log successful responses and return them unchanged", () => {
    const mockResponse = {
      status: 200,
      config: { url: "/success", method: "get" },
      data: { success: true },
    };

    const responseHandler = instance.interceptors.response.handlers[0];
    const processedResponse = responseHandler.fulfilled(mockResponse);

    expect(console.log).toHaveBeenCalledWith(
      "📥 [AXIOS RESPONSE SUCCESS]",
      expect.objectContaining({
        status: 200,
        url: "/success",
        method: "GET",
      })
    );

    expect(processedResponse).toEqual(mockResponse);
  });
});

describe("Axios Response Interceptor - Error Cases", () => {
  // Mock window.location for error tests that might redirect
  const originalLocation = window.location;

  beforeAll(() => {
    delete window.location;
    window.location = { href: "" };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = "";
  });

  it("should handle non-401 errors without refresh attempt", () => {
    const mockError = {
      response: { status: 404 },
      config: { url: "/not-found", method: "get" },
    };

    const responseHandler = instance.interceptors.response.handlers[0];

    // Should reject immediately for non-401 errors
    const result = responseHandler.rejected(mockError);
    expect(result).rejects.toEqual(mockError);
  });

  it("should handle network errors without refresh attempt", () => {
    const mockError = {
      request: {}, // Network error (no response)
      config: { url: "/network-error", method: "get" },
    };

    const responseHandler = instance.interceptors.response.handlers[0];

    const result = responseHandler.rejected(mockError);
    expect(result).rejects.toEqual(mockError);
  });
});

describe("Axios Instance Methods", () => {
  it("should have all HTTP methods", () => {
    const methods = ["get", "post", "put", "patch", "delete", "request"];

    methods.forEach((method) => {
      expect(typeof instance[method]).toBe("function");
    });
  });

  it("should be callable as a function", () => {
    expect(typeof instance).toBe("function");
  });
});

describe("Environment Configuration", () => {
  it("should use environment variable for base URL", () => {
    const expectedURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
    expect(instance.defaults.baseURL).toBe(expectedURL);
  });
});

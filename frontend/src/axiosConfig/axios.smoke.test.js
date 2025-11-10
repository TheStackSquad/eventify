// frontend/src/axiosConfig/axios.smoke.test.js
import instance, { ENDPOINTS } from "./axios";

describe("Axios Super Basic Smoke Test", () => {
  it("should export an axios instance function", () => {
    expect(instance).toBeDefined();
    expect(typeof instance).toBe("function"); // axios instances are functions
  });

  it("should have basic axios methods", () => {
    // Axios instances are callable functions that also have request methods
    expect(typeof instance.get).toBe("function");
    expect(typeof instance.post).toBe("function");
    expect(typeof instance.put).toBe("function");
    expect(typeof instance.delete).toBe("function");
  });

  it("should export ENDPOINTS", () => {
    expect(ENDPOINTS).toBeDefined();
    expect(typeof ENDPOINTS).toBe("object");
  });

  it("should have a base URL configured", () => {
    expect(instance.defaults.baseURL).toBeDefined();
    expect(instance.defaults.baseURL).toContain("http");
  });

  it("should have correct configuration", () => {
    expect(instance.defaults.timeout).toBe(10000);
    expect(instance.defaults.withCredentials).toBe(true);
    expect(instance.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("should have interceptors configured", () => {
    expect(instance.interceptors.request.handlers.length).toBeGreaterThan(0);
    expect(instance.interceptors.response.handlers.length).toBeGreaterThan(0);
  });
});

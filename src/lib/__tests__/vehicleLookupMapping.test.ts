import { describe, it, expect, vi } from "vitest";
import handler, { mapApiExpressPayload, splitVehicleLabel } from "@/api/vehicle-lookup";

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {} as Record<string, string>;
  res.body = undefined;
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}

const VALID = "GJ01AB1234";

describe("vehicle-lookup — mapping + PII filtering", () => {
  it("splits vehicle label and maps fuel/state, drops owner/insurance/ids", () => {
    const p = mapApiExpressPayload({
      status: "success",
      owner_name: "R***sh K***r",
      vehicle: "Honda City VX",
      fuel: "Petrol",
      insurance_valid: true,
      state: "Maharashtra",
      chassis_number: "SECRET-CH",
      engine_number: "SECRET-EN",
    });
    expect(p.found).toBe(true);
    expect(p.brand).toBe("Honda");
    expect(p.model).toBe("City VX");
    expect(p.fuel).toBe("Petrol");
    expect(p.rtoName).toBe("Maharashtra");
    expect((p as any).owner_name).toBeUndefined();
    expect((p as any).chassis_number).toBeUndefined();
    expect((p as any).engine_number).toBeUndefined();
    expect((p as any).insurance_valid).toBeUndefined();
  });
  it("never guesses year from registration date; unknown stays null", () => {
    const p = mapApiExpressPayload({
      status: "success", vehicle: "Tata Nexon", fuel: "Diesel", registration_date: "2019-05-04",
    });
    expect(p.year).toBeNull();
    expect(p.registrationDate).toBe("2019-05-04");
  });
  it("maps explicit year fields only", () => {
    expect(mapApiExpressPayload({ status: "success", vehicle: "X", manufacturing_year: 2021 }).year).toBe(2021);
    expect(mapApiExpressPayload({ status: "success", vehicle: "X", manufacturing_year: "2019" }).year).toBe(2019);
    expect(mapApiExpressPayload({ status: "success", vehicle: "X" }).year).toBeNull();
  });
  it("splitVehicleLabel handles single-token and blank labels", () => {
    expect(splitVehicleLabel("Honda")).toEqual({ brand: "Honda" });
    expect(splitVehicleLabel("  ")).toEqual({});
    expect(splitVehicleLabel(undefined)).toEqual({});
  });
  it("unsuccessful verification -> not_found (manual fallback)", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200, ok: true, json: async () => ({ status: "invalid", message: "RC not found" }),
    })));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("not_found");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
  it("handler response never contains owner/chassis/engine keys", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200, ok: true,
      json: async () => ({
        status: "success", owner_name: "X", vehicle: "Maruti Swift VXI",
        fuel: "Petrol", chassis_number: "C", engine_number: "E", state: "Gujarat",
      }),
    })));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    const keys = Object.keys(res.body);
    for (const banned of ["owner_name", "chassis_number", "engine_number", "insurance_valid"]) {
      expect(keys).not.toContain(banned);
    }
    expect(res.headers["Cache-Control"]).toBe("no-store");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
});

describe("vehicle-lookup — error handling", () => {
  it("maps 404 -> not_found", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 404, ok: false })));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("not_found");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
  it("maps 429 -> rate_limited", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 429, ok: false })));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("rate_limited");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
  it("maps 500 -> provider_error", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("provider_500"); }));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("provider_error");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
  it("maps AbortError -> timeout", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => {
      const e: any = new Error("aborted"); e.name = "AbortError"; throw e;
    }));
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("timeout");
    delete process.env.APIEXPRESS_API_KEY;
    vi.unstubAllGlobals();
  });
  it("rejects non-POST with 405", async () => {
    const res = mockRes();
    await handler({ method: "GET" }, res);
    expect(res.statusCode).toBe(405);
  });
});

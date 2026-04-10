import type { ClientWithSetup } from "@ovineko/kubb-client";

import client, {
  createAuthMiddleware,
  createClient,
  createRequestIdMiddleware,
} from "@ovineko/kubb-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPetClient } from "./gen/api/petService/createPetClient.ts";
import { getPetByIdClient } from "./gen/api/petService/getPetByIdClient.ts";
import { listPetsClient } from "./gen/api/petService/listPetsClient.ts";

function createMockResponse(data: unknown, status = 200, statusText = "OK"): Response {
  return Response.json(data, {
    status,
    statusText,
  });
}

describe("kubb-client integration with generated code", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    // Configure the global client that generated code holds a reference to
    client._setup.setConfig({ baseUrl: "https://petstore.example.com/api/v1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset global client config and remove middleware
    client._setup.setConfig({ baseUrl: undefined, headers: undefined });
    client._setup.remove("request-id");
    client._setup.remove("auth");
  });

  describe("generated code imports from @ovineko/kubb-client", () => {
    it("listPetsClient uses the global client with baseUrl", async () => {
      const pets = [
        { id: "1", name: "Buddy", tag: "dog" },
        { id: "2", name: "Whiskers", tag: "cat" },
      ];
      fetchSpy.mockResolvedValueOnce(createMockResponse(pets));

      const response = await listPetsClient();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://petstore.example.com/api/v1/pets");
      expect(response.data).toEqual(pets);
      expect(response.status).toBe(200);
    });

    it("listPetsClient passes query params", async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse([]));

      await listPetsClient({ params: { limit: 10 } });

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://petstore.example.com/api/v1/pets?limit=10");
    });

    it("createPetClient sends POST with body", async () => {
      const createdPet = { id: "3", name: "Rex", tag: "dog" };
      fetchSpy.mockResolvedValueOnce(createMockResponse(createdPet, 201, "Created"));

      const response = await createPetClient({ data: { name: "Rex", tag: "dog" } });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://petstore.example.com/api/v1/pets");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ name: "Rex", tag: "dog" });
      expect(response.data).toEqual(createdPet);
      expect(response.status).toBe(201);
    });

    it("getPetByIdClient sends GET with path parameter", async () => {
      const pet = { id: "42", name: "Luna" };
      fetchSpy.mockResolvedValueOnce(createMockResponse(pet));

      const response = await getPetByIdClient({ petId: "42" });

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://petstore.example.com/api/v1/pets/42");
      expect(response.data).toEqual(pet);
    });
  });

  describe("generated code works with middleware", () => {
    it("request ID middleware adds X-Request-Id header", async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse([]));
      client._setup.use(createRequestIdMiddleware());

      await listPetsClient();

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(headers.get("X-Request-Id")).toBeTruthy();
    });

    it("auth middleware adds Authorization header", async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse([]));
      client._setup.use(createAuthMiddleware({ getToken: () => "test-jwt-token" }));

      await listPetsClient();

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(headers.get("Authorization")).toBe("Bearer test-jwt-token");
    });

    it("multiple middleware work together in request pipeline", async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse([]));
      client._setup.use(createRequestIdMiddleware());
      client._setup.use(createAuthMiddleware({ getToken: () => "my-token" }));

      await listPetsClient();

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(headers.get("X-Request-Id")).toBeTruthy();
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });
  });

  describe("generated code works with per-request client override", () => {
    it("uses custom client when passed via config", async () => {
      const customFetchSpy = vi.fn().mockResolvedValueOnce(createMockResponse([]));
      vi.stubGlobal("fetch", customFetchSpy);

      const customClient: ClientWithSetup = createClient({
        baseUrl: "https://custom-api.example.com",
      });

      await listPetsClient({}, { client: customClient });

      const [url] = customFetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://custom-api.example.com/pets");
    });
  });
});

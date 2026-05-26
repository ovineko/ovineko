import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ApiScope } from "./types.js";

import { RequireScopes, ScopesProvider, useScopes } from "./react.js";
import { scope } from "./types.js";

function TestHasAccess({ required }: { required: ApiScope[][] }) {
  const { hasAccess } = useScopes();
  return <div data-testid="has-access">{hasAccess(required) ? "yes" : "no"}</div>;
}

function TestMissing({ required }: { required: ApiScope[][] }) {
  const { getMissingScopes } = useScopes();
  return <div data-testid="missing">{getMissingScopes(required).join(",")}</div>;
}

function TestScopesConsumer() {
  const { userScopes } = useScopes();
  return <div data-testid="scopes">{userScopes.join(",")}</div>;
}

const readScope = scope("read");
const writeScope = scope("write");
const adminScope = scope("admin");
const outerScope = scope("outer");
const innerScope = scope("inner");
const usersReadScope = scope("users:read");
const usersWriteScope = scope("users:write");

const readWriteScopes = [readScope, writeScope];
const readOnlyScopes = [readScope];
const adminOnlyScopes = [adminScope];
const outerOnlyScopes = [outerScope];
const innerOnlyScopes = [innerScope];
const usersScopes = [usersReadScope, usersWriteScope];
const emptyScopes: ApiScope[] = [];

const requireRead = [[readScope]];
const requireAdmin = [[adminScope]];
const requireReadWrite = [[readScope, writeScope]];
const requireOrOfAnds = [[readScope, writeScope], [adminScope]];
const requireEmpty: ApiScope[][] = [];

describe("ScopesProvider", () => {
  it("provides scopes to children", () => {
    render(
      <ScopesProvider scopes={readWriteScopes}>
        <TestScopesConsumer />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("scopes").textContent).toBe("read,write");
  });

  it("provides empty scopes array", () => {
    render(
      <ScopesProvider scopes={emptyScopes}>
        <TestScopesConsumer />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("scopes").textContent).toBe("");
  });

  it("inner provider overrides outer provider", () => {
    render(
      <ScopesProvider scopes={outerOnlyScopes}>
        <ScopesProvider scopes={innerOnlyScopes}>
          <TestScopesConsumer />
        </ScopesProvider>
      </ScopesProvider>,
    );

    expect(screen.getByTestId("scopes").textContent).toBe("inner");
  });
});

describe("useScopes", () => {
  it("throws when used outside ScopesProvider", () => {
    expect(() => render(<TestScopesConsumer />)).toThrow(
      "useScopes must be used within a ScopesProvider",
    );
  });

  it("returns correct userScopes", () => {
    render(
      <ScopesProvider scopes={usersScopes}>
        <TestScopesConsumer />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("scopes").textContent).toBe("users:read,users:write");
  });

  it("hasAccess returns true when user has required scopes", () => {
    render(
      <ScopesProvider scopes={readWriteScopes}>
        <TestHasAccess required={requireRead} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("has-access").textContent).toBe("yes");
  });

  it("hasAccess returns false when user lacks required scopes", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <TestHasAccess required={requireAdmin} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("has-access").textContent).toBe("no");
  });

  it("hasAccess supports OR-of-ANDs logic", () => {
    render(
      <ScopesProvider scopes={adminOnlyScopes}>
        <TestHasAccess required={requireOrOfAnds} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("has-access").textContent).toBe("yes");
  });

  it("hasAccess returns true for empty required scopes", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <TestHasAccess required={requireEmpty} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("has-access").textContent).toBe("yes");
  });

  it("getMissingScopes returns missing scopes", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <TestMissing required={requireReadWrite} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("missing").textContent).toBe("write");
  });

  it("getMissingScopes returns empty when all satisfied", () => {
    render(
      <ScopesProvider scopes={readWriteScopes}>
        <TestMissing required={requireRead} />
      </ScopesProvider>,
    );

    expect(screen.getByTestId("missing").textContent).toBe("");
  });
});

const readScopeFlat = [readScope];
const adminScopeFlat = [adminScope];

describe("RequireScopes", () => {
  it("shows children when user has access", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <RequireScopes scopes={readScopeFlat}>
          <div data-testid="content">visible</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(screen.getByTestId("content").textContent).toBe("visible");
  });

  it("hides children when user lacks access", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <RequireScopes scopes={adminScopeFlat}>
          <div data-testid="content">visible</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("shows fallback when user lacks access", () => {
    const fallback = <div data-testid="denied">denied</div>;
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <RequireScopes fallback={fallback} scopes={adminScopeFlat}>
          <div data-testid="content">visible</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(screen.queryByTestId("content")).toBeNull();
    expect(screen.getByTestId("denied").textContent).toBe("denied");
  });

  it("shows children with OR-of-ANDs when one group is satisfied", () => {
    render(
      <ScopesProvider scopes={adminOnlyScopes}>
        <RequireScopes scopes={requireOrOfAnds}>
          <div data-testid="content">visible</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(screen.getByTestId("content").textContent).toBe("visible");
  });

  it("shows children when no scopes required", () => {
    render(
      <ScopesProvider scopes={readOnlyScopes}>
        <RequireScopes scopes={emptyScopes}>
          <div data-testid="content">visible</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(screen.getByTestId("content").textContent).toBe("visible");
  });

  it("renders null by default when access denied and no fallback", () => {
    const { container } = render(
      <ScopesProvider scopes={emptyScopes}>
        <RequireScopes scopes={adminScopeFlat}>
          <div>should not render</div>
        </RequireScopes>
      </ScopesProvider>,
    );

    expect(container.innerHTML).toBe("");
  });
});

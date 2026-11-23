import crypto from "node:crypto";
import { expect, test } from "@playwright/test";

const secret = "super-secret-jwt-token-with-at-least-32-characters-long";
const userId = "00000000-0000-0000-0000-0000000000f1";
const email = "hope@example.test";
const projectRef = new URL(
  process.env.VITE_SUPABASE_URL ?? "https://rfbnpkhzmxktpkmuhqyf.supabase.co"
).hostname.split(".")[0];
const storageKey = `sb-${projectRef}-auth-token`;
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "HS256", typ: "JWT" });
const payload = encode({
  iss: "supabase-demo",
  role: "authenticated",
  sub: userId,
  email,
  exp: Math.floor(Date.now() / 1000) + 3600
});
const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
const session = {
  access_token: `${header}.${payload}.${signature}`,
  refresh_token: "ui-check",
  expires_at: 4102444800,
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z"
  }
};

const me = {
  id: "p1",
  email,
  displayName: "Hope",
  status: "active",
  paymentQrLabel: "GCash",
  paymentQrPath: "p1/qr.png",
  hasQr: true
};

const people = [
  {
    id: "p1",
    displayName: "Hope",
    status: "active",
    isSelf: true,
    hasQr: true,
    createdByMe: false,
    pendingEmail: null,
    invitationExpiresAt: null
  },
  {
    id: "p2",
    displayName: "Mai",
    status: "active",
    isSelf: false,
    hasQr: false,
    createdByMe: true,
    pendingEmail: null,
    invitationExpiresAt: null
  }
];

const expense = {
  id: "e1",
  description: "Dinner at Manam",
  expenseDate: "2026-11-17",
  payerPersonId: "p1",
  payerName: "Hope",
  totalCentavos: 120000,
  myShareCentavos: 40000,
  createdAt: "2026-11-17T12:00:00Z"
};

const detail = {
  expense: {
    id: "e1",
    description: "Dinner at Manam",
    expenseDate: "2026-11-17",
    payerPersonId: "p1",
    createdByPersonId: "p1",
    totalCentavos: 120000,
    version: 1,
    createdAt: "2026-11-17T12:00:00Z",
    updatedAt: "2026-11-17T12:00:00Z",
    canEdit: true
  },
  people: [
    {
      id: "p1",
      displayName: "Hope",
      status: "active",
      hasQr: true,
      isPayer: true,
      isCreator: true
    },
    {
      id: "p2",
      displayName: "Mai",
      status: "active",
      hasQr: false,
      isPayer: false,
      isCreator: false
    }
  ],
  items: [
    {
      id: "i1",
      name: "Pasta",
      amountCentavos: 40000,
      assignedPersonId: "p1",
      position: 0
    },
    {
      id: "i2",
      name: "Pizza",
      amountCentavos: 80000,
      assignedPersonId: "p2",
      position: 1
    }
  ],
  coverage: [],
  shares: [
    {
      personId: "p1",
      itemsCentavos: 40000,
      coveredCentavos: 0,
      owedCentavos: 40000,
      coveredByPersonId: null
    },
    {
      personId: "p2",
      itemsCentavos: 80000,
      coveredCentavos: 0,
      owedCentavos: 80000,
      coveredByPersonId: null
    }
  ],
  events: [
    {
      id: "ev1",
      actorPersonId: "p1",
      actorName: "Hope",
      action: "created",
      before: null,
      after: { description: "Dinner at Manam", totalCentavos: 120000 },
      createdAt: "2026-11-17T12:00:00Z"
    }
  ]
};

test.describe("mock ledger screens", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      {
        key: storageKey,
        value: JSON.stringify(session)
      }
    );

    await page.route("**/rest/v1/rpc/**", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      let body: unknown = null;
      switch (name) {
        case "ensure_person":
          body = { person: me };
          break;
        case "claim_people_for_me":
          body = { claimedPersonIds: [] };
          break;
        case "people_for_me":
          body = { people };
          break;
        case "ledger_for_me":
          body = {
            youOweCentavos: 40000,
            owedToYouCentavos: 0,
            debts: [
              {
                otherPersonId: "p2",
                otherName: "Mai",
                direction: "you_owe",
                amountCentavos: 40000,
                hasQr: false,
                qrPath: null
              }
            ]
          };
          break;
        case "recent_activity":
          body = {
            events: [
              {
                id: "ev1",
                kind: "expense_created",
                createdAt: "2026-11-17T12:00:00Z",
                actorName: "Hope",
                expenseId: "e1",
                expenseDescription: "Dinner at Manam",
                otherPersonId: null,
                otherName: null,
                amountCentavos: null,
                summary: "Created Dinner at Manam"
              }
            ]
          };
          break;
        case "expenses_for_me":
          body = { expenses: [expense] };
          break;
        case "expense_detail":
          body = detail;
          break;
        case "can_delete_account":
          body = { canDelete: true, youOweCentavos: 0, owedToYouCentavos: 0 };
          break;
        default:
          body = {};
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });
    });

    await page.route("**/storage/v1/object/sign/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          signedURL: "data:image/gif;base64,R0lGODlhAQABAAAAACw="
        })
      });
    });
  });

  test("Home renders with a debt and recent activity", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Hi, Hope" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New expense" })).toBeVisible();
    await expect(page.getByText("You owe ₱400.00.")).toBeVisible();
    await expect(page.getByText("Created Dinner at Manam")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });

  test("All expenses and detail render", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "networkidle" });
    await expect(page.getByText("Dinner at Manam")).toBeVisible();
    await page.getByText("Dinner at Manam").click();
    await expect(page.getByRole("heading", { name: "Dinner at Manam" })).toBeVisible();
    await expect(page.getByText("Pasta")).toBeVisible();
    await expect(page.getByText("History")).toBeVisible();
  });

  test("Ledger and Settings render", async ({ page }) => {
    await page.goto("/ledger", { waitUntil: "networkidle" });
    await expect(page.getByText("You owe Mai")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark paid" })).toBeVisible();

    await page.goto("/settings", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment QR" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete account" })).toBeVisible();
  });

  test("Editor renders", async ({ page }) => {
    await page.goto("/expenses/new", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "New expense" })).toBeVisible();
    await expect(page.getByText("Items")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save expense" })).toBeVisible();
  });

  test("New expense opened from Home goes back to Home", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "New expense" }).click();
    await expect(page.getByRole("heading", { name: "New expense" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Hope" })).toBeVisible();
  });

  test("New expense opened from All expenses goes back to the list", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "New expense" }).click();
    await expect(page.getByRole("heading", { name: "New expense" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "All expenses" })).toBeVisible();
  });

  test.describe("360 width", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("Home, Settings, and the editor fit without horizontal overflow", async ({
      page
    }) => {
      for (const path of ["/", "/settings", "/expenses/new"]) {
        await page.goto(path, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );
        expect(overflow, path).toBe(false);
      }
    });
  });

  test.describe("430 width", () => {
    test.use({ viewport: { width: 430, height: 932 } });

    test("Home fits without horizontal overflow", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Hi, Hope" })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow).toBe(false);
    });
  });
});

test.describe("desktop width", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Home and Settings have no horizontal overflow", async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      {
        key: storageKey,
        value: JSON.stringify(session)
      }
    );
    await page.route("**/rest/v1/rpc/**", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      const bodies: Record<string, unknown> = {
        ensure_person: { person: me },
        claim_people_for_me: { claimedPersonIds: [] },
        people_for_me: { people },
        ledger_for_me: { youOweCentavos: 0, owedToYouCentavos: 0, debts: [] },
        recent_activity: { events: [] }
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(bodies[name ?? ""] ?? {})
      });
    });

    for (const path of ["/", "/settings"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow).toBe(false);
    }
  });
});

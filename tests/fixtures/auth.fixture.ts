import { test as base, expect, APIRequestContext } from '@playwright/test';

export type AuthUser = {
  username: string;
  password: string;
  role: string;
  token?: string;
};

type AuthFixtures = {
  authenticatedUser: AuthUser;
  apiContext: APIRequestContext;
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ page, baseURL }, use) => {
    const user: AuthUser = {
      username: 'testadmin',
      password: 'testpass123',
      role: 'admin',
    };

    // Register user via API
    const response = await page.request.post(`${baseURL}/api/auth/register`, {
      data: {
        username: user.username,
        email: `${user.username}@test.com`,
        password: user.password,
        role: user.role,
      },
      failOnStatusCode: false,
    });

    // Login to get token
    const loginResponse = await page.request.post(`${baseURL}/api/auth/login`, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    user.token = loginData.access_token;

    // Set auth in browser storage
    await page.goto(baseURL!);
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        username: data.username,
        role: data.role,
        access_token: data.token,
      }));
    }, { token: user.token, username: user.username, role: user.role });

    await use(user);

    // Cleanup: clear storage
    await page.evaluate(() => {
      localStorage.clear();
    });
  },

  apiContext: async ({ playwright, baseURL, authenticatedUser }, use) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authenticatedUser.token}`,
        'Content-Type': 'application/json',
      },
    });

    await use(context);
    await context.dispose();
  },
});

export { expect };

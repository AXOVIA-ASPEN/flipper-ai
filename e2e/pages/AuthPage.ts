import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin() {
    await this.goto('/auth/signin');
  }

  async navigateToRegister() {
    await this.goto('/auth/register');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/Email/i).fill(email);
    await this.page.getByLabel(/Password/i).fill(password);
    await this.page.getByRole('button', { name: /Sign [Ii]n/i }).click();
  }

  async register(email: string, password: string, confirmPassword?: string) {
    await this.page.getByLabel(/Email/i).fill(email);
    const passwordFields = this.page.getByLabel(/Password/i);
    await passwordFields.first().fill(password);
    if (confirmPassword && await passwordFields.count() > 1) {
      await passwordFields.nth(1).fill(confirmPassword);
    }
    await this.page.getByRole('button', { name: /Sign [Uu]p|Register/i }).click();
  }

  async logout() {
    await this.page.getByRole('button', { name: /Sign [Oo]ut|Logout/i }).click();
  }

  async forgotPassword(email: string) {
    await this.page.getByRole('link', { name: /Forgot/i }).click();
    await this.page.getByLabel(/Email/i).fill(email);
    await this.page.getByRole('button', { name: /Reset|Send/i }).click();
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/signin|login/);
  }

  async expectLoginError() {
    await expect(this.page.getByText(/error|invalid|incorrect/i)).toBeVisible();
  }
}

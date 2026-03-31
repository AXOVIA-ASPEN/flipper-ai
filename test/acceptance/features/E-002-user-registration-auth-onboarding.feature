@epic-2
Feature: User Registration with Email
  As a new user
  I want to register with my email and password
  So that I can create an account and start using Flipper AI

  Background:
    Given the application is running

  # Landing page scenarios (S-1 through S-9) are in E-002-user-registration.feature

  @E-002-S-10 @story-2-2 @FR-BILLING-01 @wip
  Scenario: Successful registration redirects to onboarding
    Given I am on the registration page
    When I enter a valid name "Test User"
    And I enter a valid email "newuser@example.com"
    And I enter a valid password "Password123"
    And I confirm the password "Password123"
    And I complete the hCaptcha verification
    And I click the "Create account" button
    Then an account should be created
    And I should be redirected to "/onboarding"

  @E-002-S-11 @story-2-2 @NFR-SEC-09 @wip
  Scenario: hCaptcha is required for registration
    Given I am on the registration page
    When I enter a valid name "Test User"
    And I enter a valid email "captcha@example.com"
    And I enter a valid password "Password123"
    And I confirm the password "Password123"
    Then the "Create account" button should be disabled until hCaptcha is completed
    When I complete the hCaptcha verification
    Then the "Create account" button should be enabled

  @E-002-S-12 @story-2-2 @FR-BILLING-10 @wip
  Scenario: Duplicate email shows anti-enumeration error
    Given I am on the registration page
    And the email "existing@example.com" is already registered
    When I enter a valid name "Test User"
    And I enter a valid email "existing@example.com"
    And I enter a valid password "Password123"
    And I confirm the password "Password123"
    And I complete the hCaptcha verification
    And I click the "Create account" button
    Then I should see the error "Unable to create account. Please try again or use a different email."
    And the error should NOT reveal whether the email exists

  @E-002-S-13 @story-2-2 @NFR-SEC-02 @wip
  Scenario: Password complexity validation shows specific errors
    Given I am on the registration page
    When I enter a password "abc"
    Then I should see a password strength indicator showing "8+ characters" as not met
    And I should see "Uppercase" as not met
    And I should see "Number" as not met
    When I clear the password field
    And I enter a password "Abcdefg1"
    Then I should see all password requirements as met

  @E-002-S-14 @story-2-2 @NFR-SEC-02 @wip
  Scenario: Password mismatch shows error
    Given I am on the registration page
    When I enter a valid password "Password123"
    And I confirm the password "DifferentPassword456"
    Then I should see the inline error "Passwords do not match"
    And the "Create account" button should be disabled

  @E-002-S-15 @story-2-2 @NFR-SEC-03 @wip
  Scenario: Rate limiting on registration endpoint
    Given I am on the registration page
    When 5 registration attempts are made from the same IP within 1 minute
    And a 6th registration attempt is made from the same IP
    Then the response should have status code 429
    And the response should include a "Retry-After" header

  # Story 2.3: OAuth Login (Google, GitHub, Facebook)

  @E-002-S-16 @story-2-3 @FR-BILLING-02 @wip
  Scenario: Google OAuth login
    Given I am on the login page
    When I click the "Continue with Google" button
    Then I should be redirected to Google OAuth consent
    And upon granting consent an account is created or linked
    And I should be logged in and redirected to the dashboard

  @E-002-S-17 @story-2-3 @FR-BILLING-02 @wip
  Scenario: GitHub OAuth login
    Given I am on the login page
    When I click the "Continue with GitHub" button
    Then I should be redirected to GitHub OAuth consent
    And upon granting consent an account is created or linked
    And I should be logged in and redirected to the dashboard

  @E-002-S-18 @story-2-3 @FR-BILLING-02 @wip
  Scenario: Facebook OAuth login with marketplace token capture
    Given I am on the login page
    When I click the "Continue with Facebook" button
    Then I should be redirected to Facebook OAuth consent
    And upon granting consent an account is created or linked
    And a marketplace access token is captured and stored for Graph API access
    And I should be logged in and redirected to the dashboard

  @E-002-S-19 @story-2-3 @FR-BILLING-02 @wip
  Scenario: Account linking when OAuth email matches existing account
    Given a user account exists with email "shared@example.com" registered via email
    And I am on the login page
    When I click "Continue with Google" using an account with email "shared@example.com"
    Then the Google OAuth provider should be linked to the existing account
    And I should be logged in as the same user with a single User record

  @E-002-S-20 @story-2-3 @NFR-SEC-04 @wip
  Scenario: Secure session with HttpOnly cookie and proper claims
    Given I log in successfully via any OAuth provider
    Then my session cookie "__session" should be set with HttpOnly flag
    And the cookie should have Secure flag in production
    And the cookie should have SameSite set to "strict"
    And the cookie should expire after 5 days
    And the session should include user claims: uid, email, name, picture

  # Story 2.4: Password Reset via Email

  @E-002-S-21 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Forgot password sends reset email for registered user (AC #1)
    Given I am on the login page
    When I click the "Forgot password?" link
    Then I should be on the forgot password page
    When I enter a valid email "registered@example.com"
    And I click the "Send reset link" button
    Then I should see the message "If an account exists with this email, you will receive a password reset link shortly."
    And a password reset email should be sent via Resend with a 1-hour token

  @E-002-S-22 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Reset link opens password form within expiry (AC #2)
    Given I have received a password reset email
    When I click the reset link within 1 hour
    Then I should be on the reset password page
    And I should see a form to set a new password with fields for password and confirm password

  @E-002-S-23 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Valid password submission updates password and redirects to login (AC #3)
    Given I am on the reset password page with a valid token
    When I enter a new password "NewSecure1" meeting complexity requirements
    And I confirm the password "NewSecure1"
    And I click the "Reset password" button
    Then my password should be updated via Firebase Admin SDK
    And I should be redirected to "/login"
    And I should see the message "Password updated — please sign in with your new password."

  @E-002-S-24 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Expired reset link shows error (AC #4)
    Given I have a password reset link that is older than 1 hour
    When I attempt to use the expired reset link
    And I enter a new password "NewSecure1" and submit
    Then I should see the error "This reset link has expired. Please request a new one."
    And I should see a link to request a new password reset

  @E-002-S-25 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Unregistered email returns same success message (AC #5)
    Given I am on the forgot password page
    When I enter an unregistered email "nobody@example.com"
    And I click the "Send reset link" button
    Then I should see the message "If an account exists with this email, you will receive a password reset link shortly."
    And no password reset email should be sent

  @E-002-S-26 @story-2-4 @FR-BILLING-11 @wip
  Scenario: All sessions invalidated after password reset (AC #6)
    Given I am logged in on multiple devices
    And I complete a password reset successfully
    Then all existing sessions should be invalidated via revokeRefreshTokens
    And I should need to log in again on all devices

  @E-002-S-27 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Concurrent token submission returns error for second request (AC #7)
    Given two requests submit the same reset token simultaneously
    When the first request consumes the token atomically
    Then the second request should receive a 400 error
    And the error should indicate the token has already been used

  @E-002-S-28 @story-2-4 @FR-BILLING-11 @wip
  Scenario: Password complexity validation on reset form
    Given I am on the reset password page with a valid token
    When I enter a password "abc"
    Then I should see the password strength indicator showing "8+ characters" as not met
    And I should see "Uppercase" as not met
    And I should see "Number" as not met
    When I clear the password field
    And I enter a password "NewSecure1"
    Then I should see all password requirements as met

  @E-002-S-29 @story-2-4 @FR-BILLING-11 @wip
  Scenario: DB-backed rate limit on forgot-password endpoint
    Given I am on the forgot password page
    When 3 password reset requests are made for the same email within 15 minutes
    And a 4th request is made for the same email
    Then the response should have status code 429
    And the error should indicate too many reset requests

  @E-002-S-30 @story-2-4 @FR-BILLING-11 @wip
  Scenario: IP-based rate limit on forgot-password endpoint
    Given I am on the forgot password page
    When 5 password reset requests are made from the same IP within 15 minutes
    And a 6th request is made from the same IP
    Then the response should have status code 429
    And the response should include a "Retry-After" header

  # Story 2.5: Onboarding Wizard

  @E-002-S-31 @story-2-5 @FR-DASH-11 @wip
  Scenario: New user redirected to onboarding after first login
    Given I have just registered a new account
    When I am redirected after registration
    Then I should be on the onboarding wizard at step 1 of 6

  @E-002-S-32 @story-2-5 @FR-DASH-11 @wip
  Scenario: Wizard shows 6 steps with progress bar
    Given I am on the onboarding wizard
    Then I should see a progress bar reflecting step 1 of 6
    When I click "Continue"
    Then I should see step 2 "Choose Your Marketplaces"
    And the progress bar should reflect step 2 of 6

  @E-002-S-33 @story-2-5 @FR-DASH-12 @wip
  Scenario: Step preferences are persisted server-side
    Given I am on step 2 of the onboarding wizard
    When I select marketplaces "ebay" and "facebook"
    And I click "Continue"
    Then the POST to /api/user/onboarding should include marketplaces ["ebay", "facebook"]
    And the response should be successful

  @E-002-S-34 @story-2-5 @FR-DASH-12 @wip
  Scenario: Progress resumes after browser close with selections restored
    Given I completed steps 1-3 of onboarding with selections
    When I close and reopen the browser
    And I navigate to /onboarding
    Then I should resume at step 4
    And my previous marketplace and category selections should be restored

  @E-002-S-35 @story-2-5 @FR-DASH-11 @wip
  Scenario: Skip setup applies defaults and redirects to dashboard
    Given I am on step 2 of the onboarding wizard
    When I click "Skip setup"
    Then default values should be persisted for all steps
    And onboarding should be marked complete
    And I should be redirected to the dashboard

  @E-002-S-36 @story-2-5 @FR-DASH-11 @wip
  Scenario: Completing wizard redirects to dashboard
    Given I am on step 6 of the onboarding wizard
    When I click "Get Started"
    Then onboarding should be marked complete
    And I should be redirected to the dashboard
    And revisiting /onboarding should redirect to the dashboard

  @E-002-S-37 @story-2-5 @FR-DASH-11 @wip
  Scenario: Back button preserves selections
    Given I am on step 3 of the onboarding wizard with categories selected
    When I click "Back"
    Then I should be on step 2
    And my previously selected marketplaces should still be shown

  @E-002-S-38 @story-2-5 @FR-DASH-11 @wip
  Scenario: Redirect does NOT fire for existing onboarded users
    Given I am an existing user with onboardingComplete set to true
    When I navigate to the dashboard
    Then I should NOT be redirected to /onboarding
    And I should see the dashboard

  @E-002-S-39 @story-2-5 @FR-DASH-11 @wip
  Scenario: API calls from onboarding page are NOT intercepted by redirect logic
    Given I am on the onboarding wizard
    When the wizard makes a POST to /api/user/onboarding
    Then the request should succeed without being redirected

  # Story 2.6: User Settings & Preferences

  @E-002-S-40 @story-2-6 @FR-BILLING-09 @wip
  Scenario: Settings page displays all sections
    Given I am logged in
    When I navigate to "/settings"
    Then I should see a "Profile" section
    And I should see a "Notification Settings" section
    And I should see an "AI Preferences" section
    And I should see an "API Keys" section

  @E-002-S-41 @story-2-6 @FR-BILLING-09 @wip
  Scenario: User updates display name in Profile section
    Given I am logged in
    And I am on the settings page
    When I change my display name to "New Display Name"
    And I click the "Save" button in the Profile section
    Then my display name should be updated to "New Display Name"
    And I should see a success message

  @E-002-S-42 @story-2-6 @FR-BILLING-09 @NFR-SEC-06 @wip
  Scenario: User enters OpenAI API key and it is encrypted at rest
    Given I am logged in
    And I am on the settings page
    When I enter an OpenAI API key "sk-test-key-abcd1234efgh5678"
    And I click "Save Key"
    Then the API key should be encrypted before storage
    And I should see a success message

  @E-002-S-43 @story-2-6 @NFR-SEC-05 @NFR-SEC-06 @wip
  Scenario: Saved API key displays masked with last 4 chars only
    Given I am logged in
    And I have a saved OpenAI API key
    When I navigate to "/settings"
    Then the API key should display as masked showing only the last 4 characters
    And the full API key should never be sent to the frontend

  @E-002-S-44 @story-2-6 @FR-BILLING-09 @wip
  Scenario: User toggles notification preferences
    Given I am logged in
    And I am on the settings page
    When I toggle the "Email Notifications" master switch
    Then the notification preference should be updated
    And the change should apply to future notifications

  @E-002-S-45 @story-2-6 @FR-BILLING-09 @wip
  Scenario: User configures AI model and analysis depth
    Given I am logged in
    And I am on the settings page
    When I select "GPT-4o" as my AI model
    And I set the discount threshold to 75
    Then my AI preferences should be saved
    And subsequent operations should use the updated settings

  @E-002-S-46 @story-2-6 @NFR-SEC-05 @wip
  Scenario: Display name with HTML tags returns validation error
    Given I am logged in
    When I send a PATCH to "/api/user/settings" with name "<script>alert('xss')</script>"
    Then the response should have status code 422
    And the error code should be "VALIDATION_ERROR"

  @E-002-S-47 @story-2-6 @NFR-SEC-05
  Scenario: Unauthenticated user cannot access or modify settings
    Given I am not logged in
    When I send a GET to "/api/user/settings"
    Then the response should have status code 401
    When I send a PATCH to "/api/user/settings" with name "Hacker"
    Then the response should have status code 401

  @E-002-S-48 @story-2-6 @NFR-SEC-06 @wip
  Scenario: GET response never contains the full decrypted API key
    Given I am logged in
    And I have a saved OpenAI API key "sk-proj-abcdefghijklmnop"
    When I send a GET to "/api/user/settings"
    Then the response body should not contain "sk-proj-abcdefghijklmnop"
    And the openaiApiKey field should contain bullet characters

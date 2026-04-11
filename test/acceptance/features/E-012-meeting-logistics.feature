@epic-12
Feature: Google Calendar Integration
  As a user
  I want buy/sell meetups automatically added to my Google Calendar
  So that I never miss a scheduled pickup or sale

  Background:
    Given the user is authenticated with a PRO subscription

  # Story 12.1 — AC1: OAuth connect flow
  @story-12-1 @FR-MEET-01 @E-012-S-1
  Scenario: User connects Google Calendar via OAuth
    Given the user navigates to Settings and the Integrations section
    And Google Calendar is not connected
    When the user clicks "Connect Google Calendar" in the Integrations section
    Then the user is redirected to the Google OAuth consent screen requesting the "calendar.events" scope
    When the user grants consent and is redirected back to the app
    Then the Settings Integrations section shows "Connected" with the user's Google account email
    And no "Connect Google Calendar" button is visible

  # Story 12.1 — AC2: Calendar event created on meeting schedule
  @story-12-1 @FR-MEET-01 @E-012-S-2
  Scenario: Calendar event created when meeting is scheduled with time and location
    Given the user has Google Calendar connected
    And an opportunity exists with status "IDENTIFIED"
    When the user opens the Schedule Meeting modal on the listing detail page
    And enters meetingTime "2026-05-01T14:00:00" and meetingLocation "456 Oak Ave, Seattle, WA"
    And the browser timezone is "America/Los_Angeles"
    And submits the form
    Then the listing detail page displays the meeting date, time, and location
    And a Google Calendar event exists with title containing the listing title
    And the event start time is 2:00 PM and end time is 3:00 PM in the America/Los_Angeles timezone
    And the event location is "456 Oak Ave, Seattle, WA"

  # Story 12.1 — AC3: Calendar event updated on reschedule
  @story-12-1 @FR-MEET-01 @E-012-S-3
  Scenario: Calendar event updated when meeting is rescheduled
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user opens the Schedule Meeting modal and updates the meetingTime to "2026-05-02T10:00:00"
    And submits the form
    Then the listing detail page shows the updated meeting date and time
    And the original Google Calendar event is updated in place (same event ID)
    And no duplicate calendar event is created

  # Story 12.1 — AC4: Calendar event deleted on cancel
  @story-12-1 @FR-MEET-01 @E-012-S-4
  Scenario: Calendar event deleted when meeting is cancelled
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user clicks "Cancel meeting" on the listing detail page and confirms
    Then the listing detail page no longer shows any meeting information
    And the Google Calendar event is deleted
    And the opportunity record has null meetingTime, meetingLocation, and calendarEventId

  # Story 12.1 — AC5: PASSED status → calendar deletion (fire-and-forget)
  @story-12-1 @FR-MEET-01 @E-012-S-5
  Scenario: Calendar event deleted in background when opportunity transitions to PASSED
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user marks the opportunity as PASSED via the API
    Then the PATCH response returns successfully without delay
    And the associated Google Calendar event is deleted in the background
    And no error is surfaced to the user

  # Story 12.1 — AC6: CALENDAR_AUTH_REQUIRED on token refresh failure
  @story-12-1 @FR-MEET-01 @E-012-S-6
  Scenario: Re-authentication prompt shown when Calendar token cannot be refreshed
    Given the user has Google Calendar connected with a revoked refresh token
    When the user schedules a meeting via the API with valid meetingTime and meetingLocation
    Then the meeting data is saved to the database
    And the response contains error code "CALENDAR_AUTH_REQUIRED"
    And the response status is 401

  # Story 12.1 — AC7: Disconnect removes token from DB regardless of Google revoke outcome
  @story-12-1 @FR-MEET-01 @E-012-S-7
  Scenario: Disconnect removes token from DB regardless of Google revoke outcome
    Given the user has Google Calendar connected
    When the user disconnects Google Calendar via the API
    Then the response indicates success
    And the GoogleCalendarToken row is removed from the database
    And the integration status endpoint shows connected as false

  # Story 12.1 — AC8: Graceful degradation when not connected
  @story-12-1 @FR-MEET-01 @E-012-S-8
  Scenario: Meeting fields saved without error when Google Calendar is not connected
    Given the user does not have Google Calendar connected
    And an opportunity exists
    When the user schedules a meeting via the API with valid meetingTime and meetingLocation
    Then the API responds with success
    And the opportunity record has meetingTime and meetingLocation saved to the database
    And calendarEventId remains null
    And no Google Calendar API call is made

  # ---------------------------------------------------------------------------
  # Story 12.2 — Google Maps Route Generation
  # ---------------------------------------------------------------------------

  # Story 12.2 — AC1: MeetingRouteCard component exists and renders route data
  @story-12-2 @FR-MEET-02 @E-012-S-9
  Scenario: MeetingRouteCard renders with travel time, distance, and departure time
    Given the MeetingRouteCard component exists at the expected path
    Then the component fetches from the maps-route API endpoint
    And the listing detail page imports and renders MeetingRouteCard when meetingLocation is set
    And the route card displays heading "Route from your saved home location"

  # Story 12.2 — AC2: Past departure time shows "should have left" warning
  @story-12-2 @FR-MEET-02 @E-012-S-10
  Scenario: Departure time in past shows "you should have left" message
    Given the MeetingRouteCard component exists at the expected path
    Then the component handles departureIsPast state with a warning message
    And the component handles past_meeting state with "This meeting has passed"

  # Story 12.2 — AC3: Time to Leave scheduler uses fallback when route unavailable
  @story-12-2 @FR-MEET-02 @E-012-S-11
  Scenario: Meeting reminder scheduler sends notification with fallback buffer when route unavailable
    Given the meeting reminder scheduler module exists
    Then the scheduler uses a 1-hour fallback buffer when route calculation returns null
    And the scheduler endpoint exists at the expected API path
    And the scheduler only processes opportunities with notifyMeetingReminder set to true

  # Story 12.2 — AC4: Open in Maps button with platform-aware deep linking
  @story-12-2 @FR-MEET-02 @E-012-S-12
  Scenario: Open in Maps button uses platform-aware deep links
    Given the MeetingRouteCard component exists at the expected path
    Then the component implements iOS comgooglemaps deep link
    And the component implements Android google.navigation deep link
    And the component falls back to web URL on desktop

  # Story 12.2 — AC5: Degraded state when API key absent
  @story-12-2 @FR-MEET-02 @E-012-S-13
  Scenario: Route card shows degraded state with address and View on Maps link when API key absent
    Given the maps route API endpoint exists
    Then the endpoint returns degraded state when getRoute returns null
    And the MeetingRouteCard component renders a View on Maps link in degraded state

  # Story 12.2 — AC6: Missing home location shows inline Settings nudge
  @story-12-2 @FR-MEET-02 @E-012-S-14
  Scenario: Route card shows Settings nudge when home location is not configured
    Given the maps route API endpoint exists
    Then the endpoint returns missing_home_location state when homeLocation is null
    And the MeetingRouteCard component renders a link to the Settings page for missing_home_location state

  # Story 12.2 — AC6 Settings: Meeting reminder toggle and buffer available in Settings
  @story-12-2 @FR-MEET-02 @E-012-S-15
  Scenario: Meeting departure buffer and reminder toggle are available in Notification Settings
    Given the NotificationSettings component exists
    Then the component includes the notifyMeetingReminder field
    And the component includes the meetingDepartureBufferMinutes field with range 0-60
    And the settings API route handles meetingDepartureBufferMinutes and notifyMeetingReminder PATCH fields

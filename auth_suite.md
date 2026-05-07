--name Authentication & User Profile Suite
--author Quality Assurance Team
--version 2.1.0
--date 07/05/2026
--description This suite verifies the core authentication flow, including login, multi-factor authentication, and profile management. It covers both success paths and error handling.

### [Preconditions]
- The test environment is pointing to the **Staging Server**.
- A valid test user account exists: `testuser@example.com`.
- The user has **MFA** enabled on their account.
- Browser cache has been cleared before starting.

### [Test 1 - Secure Login Flow]
- [Step] Navigate to the login page and enter valid credentials.
	- [Check] The "Password" field should be masked for security.
	- [Check] The "Sign In" button should be enabled after entering both email and password.
- [Step] Click on the "Sign In" button.
	- [Check] The user should be redirected to the **MFA Verification** page.
	- [Check] A "Code Sent" notification should appear at the top right.

### [Test 2 - Multi-Factor Authentication]
- [Step] Enter an **incorrect** 6-digit code.
	- [Check] An error message "Invalid code" should be displayed in red.
	- [Check] The user should **not** be redirected to the dashboard.
- [Step] Enter the correct 6-digit code.
	- [Check] The user should be successfully redirected to the **Dashboard**.
	- [Check] A welcome message "Hello, Test User!" should be visible.

### [Test 3 - Profile Settings Update]
- [Step] Navigate to the "Profile Settings" section.
- [Step] Change the "Display Name" to **QA Tester** and click "Save".
	- [Check] A success toast "Profile updated" should appear.
	- [Check] The header profile icon should update its tooltip to **QA Tester**.
- [Step] Attempt to change the "Email" to an invalid format (e.g., `invalid-email`).
	- [Check] The system should prevent the save and show a validation error.

### [Test 4 - Logout and Session Termination]
- [Step] Click on the "Logout" button in the profile dropdown.
	- [Check] The user should be redirected back to the **Login** page.
- [Step] Press the "Back" button in the browser.
	- [Check] The user should **not** be able to access the dashboard (session must be invalidated).
	- [Check] The login page should be displayed again.

// CDP utilities for solving captchas and handling browser dialogs

export interface CDPSession {
  send(method: string, params?: any): Promise<any>;
}

export interface RecaptchaConfig {
  apiKey?: string;
  siteKey?: string;
  timeout?: number;
}

/**
 * Attempts to solve visible reCAPTCHAs on the page
 */
export async function solveRecaptchas(
  session: CDPSession,
  config: RecaptchaConfig = {}
): Promise<boolean> {
  try {
    // Check for reCAPTCHA elements
    const { result } = await session.send("Runtime.evaluate", {
      expression: `
        (() => {
          const frames = document.querySelectorAll('iframe[src*="recaptcha"]');
          const divs = document.querySelectorAll('div[class*="recaptcha"]');
          return {
            hasRecaptcha: frames.length > 0 || divs.length > 0,
            frameCount: frames.length,
            divCount: divs.length
          };
        })()
      `,
      returnByValue: true,
    });

    if (!result.value.hasRecaptcha) {
      return false;
    }

    console.log(
      `Found reCAPTCHA elements: ${result.value.frameCount} frames, ${result.value.divCount} divs`
    );

    // TODO: Implement actual captcha solving logic here
    // This could integrate with services like 2captcha, AntiCaptcha, etc.
    // For now, just wait and return false to indicate manual intervention needed

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return false;
  } catch (error) {
    console.error("Error solving reCAPTCHA:", error);
    return false;
  }
}

/**
 * Closes common browser dialogs (alerts, confirms, prompts)
 */
export async function closeDialogs(session: CDPSession): Promise<void> {
  try {
    // Enable Runtime domain to handle JavaScript dialogs
    await session.send("Runtime.enable");

    // Set up dialog handler
    session.send("Runtime.setDialogHandler", {
      accept: true,
      promptText: "auto-dismissed",
    });

    console.log(
      "Dialog handler enabled - will auto-dismiss alerts/confirms/prompts"
    );
  } catch (error) {
    console.error("Error setting up dialog handler:", error);
  }
}

/**
 * Dismisses any currently open dialogs
 */
export async function dismissOpenDialogs(session: CDPSession): Promise<void> {
  try {
    // Try to dismiss any open dialogs
    await session.send("Runtime.discardConsoleEntries");

    // Check for and dismiss page dialogs
    const { result } = await session.send("Runtime.evaluate", {
      expression: `
        (() => {
          // Close any open dialogs by simulating Escape key
          const event = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27
          });
          document.dispatchEvent(event);
          return true;
        })()
      `,
      returnByValue: true,
    });

    console.log("Attempted to dismiss any open dialogs");
  } catch (error) {
    console.error("Error dismissing dialogs:", error);
  }
}

/**
 * Sets up automatic handling of common browser interruptions
 */
export async function setupAutoHandlers(session: CDPSession): Promise<void> {
  await closeDialogs(session);

  // Additional setup can be added here:
  // - Notification blocking
  // - Popup blocking
  // - Cookie consent handling
  // etc.
}

import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';
import { routerOnUpdate } from '../components/hooks/useOnNavigate';
import type { RouterLocation } from '../lib/vulcan-lib/routes';
import { captureEvent, AnalyticsUtil, userChangedCallback } from '../lib/analyticsEvents';
import { browserProperties } from '../lib/utils/browserProperties';
import { sentryUrlSetting, sentryReleaseSetting, sentryEnvironmentSetting, forumTypeSetting } from '../lib/instanceSettings';
import { getUserEmail } from "../lib/collections/users/helpers";
import { devicePrefersDarkMode } from "../components/themes/usePrefersDarkMode";
import { configureDatadogRum } from './datadogRum';

const sentryUrl = sentryUrlSetting.get()
const sentryEnvironment = sentryEnvironmentSetting.get()
const sentryRelease = sentryReleaseSetting.get()

if (sentryUrl && sentryEnvironment && sentryRelease) {
  Sentry.init({
    dsn: sentryUrl,
    environment: sentryEnvironment,
    release: sentryRelease,
    integrations: [
      new SentryIntegrations.Dedupe(),
      new SentryIntegrations.ExtraErrorData(),
    ],
    beforeSend: (event, hint) => {
      // Suppress an uninformative error from ReCaptcha
      // See: https://github.com/getsentry/sentry-javascript/issues/2514
      if (hint?.originalException === "Timeout") {
        return null;
      }
      
      return event;
    }
  });
} else {
  // eslint-disable-next-line no-console
  console.log("Unable to find sentry credentials, so sentry logging is disabled")
}


// Initializing sentry on the client browser

userChangedCallback.add(function identifyUserToSentry(user: UsersCurrent | null) {
  // Set user in sentry scope, or clear user if they have logged out
  Sentry.configureScope((scope) => {
    scope.setUser(user ? {id: user._id, email: getUserEmail(user), username: user.username} : null);
  });
});

userChangedCallback.add(function addUserIdToGoogleAnalytics(user: UsersCurrent | null) {
  const dataLayer = (window as any).dataLayer
  if (!dataLayer) {
    // eslint-disable-next-line no-console
    console.warn("Trying to call gtag before dataLayer has been initialized")
  } else {
    dataLayer.push({userId: user ? user._id : null})
  }
});

userChangedCallback.add(configureDatadogRum);

window.addEventListener('load', ev => {
  captureEvent("pageLoadFinished", {
    url: document.location?.href,
    referrer: document.referrer,
    browserProps: browserProperties(),
    prefersDarkMode: devicePrefersDarkMode(),
    performance: {
      memory: (window as any).performance?.memory?.usedJSHeapSize,
      timeOrigin: window.performance?.timeOrigin,
      timing: window.performance?.timing,
    },
  });
});

routerOnUpdate.add(({oldLocation, newLocation}: {oldLocation: RouterLocation, newLocation: RouterLocation}) => {
  captureEvent("navigate", {
    from: oldLocation.pathname,
    to: newLocation.pathname,
  });
});

// Put the tabId, which was injected into the page as a global variable, into
// the analytics context vars. See apollo-ssr/renderPage.js
AnalyticsUtil.clientContextVars.tabId = (window as any).tabId

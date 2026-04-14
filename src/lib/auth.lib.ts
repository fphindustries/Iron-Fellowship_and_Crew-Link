import { supabase } from "../config/supabase.config";
import { BASE_ROUTES, basePaths } from "routes";
import { getErrorMessage } from "functions/getErrorMessage";
import { updateUserDoc } from "api-calls/user/updateUserDoc";
import { UserDocument } from "api-calls/user/_user.type";

export function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      })
      .then(({ error }) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(true);
        }
      });
  });
}

/**
 * loginWithToken — not supported in Supabase; kept for interface compatibility.
 * If the server issues a Supabase access + refresh token pair, call
 * supabase.auth.setSession() directly instead.
 */
export function loginWithToken(_token: string) {
  return Promise.reject(new Error("loginWithToken is not supported with Supabase auth."));
}

export function sendMagicEmailLink(
  email: string,
  name?: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const redirectTo = window.location.origin + basePaths[BASE_ROUTES.LOGIN];
    supabase.auth
      .signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
      .then(({ error }) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          window.localStorage.setItem("auth-email", email);
          if (name) {
            window.localStorage.setItem("auth-name", name);
          }
          resolve(true);
        }
      });
  });
}

/**
 * completeMagicLinkSignupIfPresent — With Supabase, the PKCE flow automatically
 * exchanges the code in the URL and fires onAuthStateChange(SIGNED_IN). We just
 * need to let the client process the URL, which happens automatically. We clean
 * up localStorage here and apply the stored display name if present.
 */
export async function completeMagicLinkSignupIfPresent(): Promise<boolean> {
  // Check if there's an auth code in the URL (Supabase PKCE flow)
  const url = new URL(window.location.href);
  const hasCode = url.searchParams.has("code");
  const hasAccessToken = url.hash.includes("access_token");

  if (hasCode || hasAccessToken) {
    // Let Supabase handle the token exchange via getSession()
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      return Promise.reject(
        getErrorMessage(error, "Error signing in from email link. Please try again.")
      );
    }
    if (data.session?.user) {
      const name = window.localStorage.getItem("auth-name");
      if (name) {
        await supabase.auth.updateUser({ data: { full_name: name } });
        window.localStorage.removeItem("auth-name");
      }
      window.localStorage.removeItem("auth-email");
    }
  }

  return true;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function updateUser(userDoc: UserDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          reject(new Error("User is not logged in."));
          return;
        }
        supabase.auth
          .updateUser({ data: { full_name: userDoc.displayName } })
          .then(({ error }) => {
            if (error) {
              console.error(error);
              reject("Failed to update user name.");
              return;
            }
            updateUserDoc({ uid: user.id, user: userDoc })
              .then(() => resolve())
              .catch((e) => {
                console.error(e);
                reject("Failed to update user.");
              });
          });
      })
      .catch((e) => {
        console.error(e);
        reject("Failed to get current user.");
      });
  });
}

// Auto-created accounts (Buyer/Seller from bookings & inspections) use a
// cryptographically random password that is generated once per device and
// stored in that device's localStorage. A third party can NEVER derive the
// password from the email address (unlike the previous deterministic scheme),
// so auto-created accounts are not hijackable from another device.
//
// Re-sign-in from the SAME device works because the stored password is reused;
// a brand-new device falls back to a fresh signUp (Supabase returns an error
// if the account already exists, which the caller surfaces honestly).

export function getAutoPasswordKey(email: string): string {
  return `1stcars_auto_password_${email.toLowerCase()}`;
}

export function generateRandomPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = letters + numbers + symbols;

  const pick = (set: string) => {
    const rand = new Uint32Array(1);
    globalThis.crypto?.getRandomValues?.(rand);
    return set[rand[0] % set.length];
  };

  let password = pick(letters) + pick(numbers) + pick(symbols);
  for (let i = 3; i < 16; i++) password += pick(all);
  return password;
}

export function getOrCreateAutoPassword(email: string): string {
  const key = getAutoPasswordKey(email);
  const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (existing) return existing;
  const password = generateRandomPassword();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, password);
    } catch {
      // ignore quota/security errors — the session still works
    }
  }
  return password;
}

export async function resolveAutoSignIn(
  supabase: any,
  email: string,
  password: string,
  signUpOptions: Record<string, any>
) {
  try {
    const { data: authData } = await supabase.auth.signUp({
      email,
      password,
      options: signUpOptions,
    });

    // Only treat sign-up as "signed in" when it actually produced an active
    // session. A user object WITHOUT a session means either the account already
    // exists or the sign-up needs confirmation — in both cases we must sign in
    // explicitly below so getUser() returns the user afterwards.
    if (authData?.user && authData?.session) {
      return { user: authData.user, error: null };
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;
    return { user: signInData?.user || null, error: null };
  } catch (err: any) {
    return { user: null, error: err };
  }
}

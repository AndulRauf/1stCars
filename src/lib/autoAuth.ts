// Auto-created accounts (Buyer/Seller from bookings & inspections) use a
// password that is deterministically derived from the email address. Random
// per-device passwords broke sign-in whenever the account already existed
// (repeat submission, another browser/device, or a pre-fix account): signUp
// then returns no session and signInWithPassword fails because the stored
// random password no longer matches the account's hash. A stable derivation
// means the SAME email always resolves to the SAME password, so quiet
// re-sign-in succeeds on every device and every submission.
export function deriveAutoPassword(email: string): string {
  const salt = "1stcars::auto-auth::v1";
  const input = `${salt}::${email.trim().toLowerCase()}`;

  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = letters + numbers + symbols;

  // FNV-1a 32-bit hash + LCG expansion for a stable, reproducible password.
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 31) + input.charCodeAt(i)) >>> 0;
  }
  let seed = (h1 ^ (h2 << 1)) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };

  // Guarantee one char from each required class (letters, digits, symbol).
  let password = letters[next() % letters.length];
  password += numbers[next() % numbers.length];
  password += symbols[next() % symbols.length];
  for (let i = 3; i < 14; i++) password += all[next() % all.length];
  return password;
}

export function getAutoPasswordKey(email: string): string {
  return `1stcars_auto_password_${email.toLowerCase()}`;
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

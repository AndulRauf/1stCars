export function generateAutoPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = letters + numbers + symbols;
  const length = 12;

  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += all[values[i] % all.length];
  }

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

    if (authData?.user) {
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

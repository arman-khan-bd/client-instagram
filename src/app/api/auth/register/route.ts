import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { validateUsernameAndFullName } from '../../../../lib/nameValidator';

export async function POST(request: Request) {
  try {
    const { username, email, password, fullName } = await request.json();
    if (!username || !email || !password || !fullName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate username and fullName terms
    const validation = validateUsernameAndFullName(username, fullName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Register API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

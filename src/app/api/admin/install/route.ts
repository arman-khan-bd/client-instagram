import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { validateUsernameAndFullName } from '../../../../lib/nameValidator';
import { Client } from 'pg';

export async function POST(request: Request) {
  try {
    const { username, email, password, fullName, secretCode } = await request.json();

    if (!username || !email || !password || !fullName || !secretCode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate secret code
    const expectedSecret = process.env.ADMIN_INSTALL_SECRET || 'AuraGramAdminInstall2026!';
    if (secretCode !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid admin installation secret code' }, { status: 403 });
    }

    // Validate username and fullName terms
    const validation = validateUsernameAndFullName(username, fullName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if username is already taken in database
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    // Register user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to register authentication user.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // Connect directly to the database to update the role to 'admin'
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (connectionString) {
      const dbClient = new Client({ connectionString });
      await dbClient.connect();

      try {
        // First check if the user profile exists in public.User (it might have been created by the trigger handle_new_auth_user)
        const res = await dbClient.query('SELECT id FROM "User" WHERE id = $1', [userId]);
        
        if (res.rows.length === 0) {
          // If the trigger hasn't fired yet or didn't run, insert the User record manually
          await dbClient.query(
            `INSERT INTO "User" ("id", "username", "email", "fullName", "avatarUrl", "passwordHash", "bio", "isVerified", "role", "createdAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              userId,
              username.trim().toLowerCase(),
              email.trim().toLowerCase(),
              fullName,
              '',
              '',
              'Welcome to AuraGram! ✨',
              true, // isVerified
              'admin' // role
            ]
          );
        } else {
          // If User record exists, update role to admin and set verified to true
          await dbClient.query(
            'UPDATE "User" SET "role" = \'admin\', "isVerified" = true WHERE id = $1',
            [userId]
          );
        }
      } finally {
        await dbClient.end();
      }
    } else {
      // Fallback: If database connection string is missing (e.g. on Vercel),
      // update the role using an authenticated Supabase client for the new user.
      if (!authData.session?.access_token) {
        return NextResponse.json({ error: 'Database configuration missing, and no auth session available to fallback.' }, { status: 500 });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
        {
          auth: { persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${authData.session.access_token}`,
            },
          },
        }
      );

      // Check if user profile is already created by trigger, otherwise upsert it
      const { data: profile } = await userSupabase
        .from('User')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        const { error: insertErr } = await userSupabase
          .from('User')
          .insert({
            id: userId,
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            fullName,
            avatarUrl: '',
            passwordHash: '',
            bio: 'Welcome to AuraGram! ✨',
            isVerified: true,
            role: 'admin'
          });
        if (insertErr) {
          throw new Error(insertErr.message);
        }
      } else {
        const { error: updateErr } = await userSupabase
          .from('User')
          .update({ role: 'admin', isVerified: true })
          .eq('id', userId);
        if (updateErr) {
          throw new Error(updateErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully.',
      user: {
        id: userId,
        email,
        username,
        fullName,
        role: 'admin',
      },
      session: authData.session
    });

  } catch (err: any) {
    console.error('Admin install API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

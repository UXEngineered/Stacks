/**
 * NextAuth Configuration
 * 
 * MVP: Google OAuth only
 * Future: Enterprise SSO (JumpCloud, Okta, etc.)
 * 
 * Development: Credentials provider for easy testing
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { upsertUser, getPendingInvitationsForEmail, acceptInvitation } from "./app/lib/auth";

const isDev = process.env.NODE_ENV === "development";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google OAuth for production
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "your-google-client-id.apps.googleusercontent.com"
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // Development-only credentials provider
    ...(isDev
      ? [
          Credentials({
            name: "Development Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "dev@example.com" },
              name: { label: "Name", type: "text", placeholder: "Developer" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              
              const email = credentials.email as string;
              const name = (credentials.name as string) || "Developer";
              const id = `dev-${email.replace(/[^a-z0-9]/gi, "-")}`;
              
              return {
                id,
                email,
                name,
                image: null,
              };
            },
          }),
        ]
      : []),
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }
      
      // Create or update user in our store
      upsertUser({
        id: user.id!,
        email: user.email,
        name: user.name || "Anonymous",
        avatarUrl: user.image || null,
      });
      
      // Auto-accept any pending invitations for this email
      const invitations = getPendingInvitationsForEmail(user.email);
      for (const invitation of invitations) {
        acceptInvitation(invitation.id, user.id!);
      }
      
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
  }
}

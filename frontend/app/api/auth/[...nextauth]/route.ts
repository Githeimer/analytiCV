import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {}
      },

      async authorize(credentials) {
        const { email, password } = credentials!

        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single()

        if (!user) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ],

  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }:{session:any,token:any}) {
      session.user.id = token.id as string
      return session
    }
  },

  secret: process.env.NEXTAUTH_SECRET
})

export { handler as GET, handler as POST }

import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!email || !password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const hash = await bcrypt.hash(password, 10)

  const { error } = await supabase.from("users").insert({
    name,
    email,
    password: hash
  })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

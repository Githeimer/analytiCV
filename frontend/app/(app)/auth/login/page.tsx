"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function handleLogin(e:any) {
    e.preventDefault()

    if (!email || !password)
      return toast.error("Enter email + password")

    if (!emailRegex.test(email))
      return toast.error("Invalid email")

    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    })

    setLoading(false)

    if (res?.error)
      return toast.error("Wrong credentials")

    toast.success("Logged in 🚀")
    window.location.href = "/"
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white">

      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right,#377CF8 1px,transparent 1px),
            linear-gradient(to bottom,#377CF8 1px,transparent 1px)
          `,
          backgroundSize: "50px 50px"
        }}
      />

      <form
        onSubmit={handleLogin}
        className="relative bg-white/70 backdrop-blur-lg border border-blue-200 shadow-xl rounded-2xl p-10 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-6">
          Welcome Back
        </h1>

        <input
          placeholder="Email"
          className="input"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="input mb-6"
          onChange={e => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:scale-105 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <span className="flex flex-row items-center justify-center gap-2">Dont have an account? <Link href="/auth/signup" className="font-bold">signup</Link></span>
      </form>
    </div>
  )
}

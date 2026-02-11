"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function handleSignup(e:any) {
    e.preventDefault()

    if (!name || !email || !password || !confirm)
      return toast.error("All fields required")

    if (!emailRegex.test(email))
      return toast.error("Invalid email format")

    if (password.length < 6)
      return toast.error("Password min 6 chars")

    if (password !== confirm)
      return toast.error("Passwords don't match")

    try {
      setLoading(true)

      const res = await fetch("/api/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast.success("Account created 🎉")
      router.push("/auth/login")
    } catch (err:any) {
      toast.error(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white">

      {/* Grid BG */}
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
        onSubmit={handleSignup}
        className="relative bg-white/70 backdrop-blur-lg border border-blue-200 shadow-xl rounded-2xl p-10 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-6">Create Account</h1>

        <input
          placeholder="Name"
          className="input"
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          className="input"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="input"
          onChange={e => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="input mb-6"
          onChange={e => setConfirm(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:scale-105 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
    </div>
  )
}

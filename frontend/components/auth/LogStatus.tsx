"use client"
import { useSession } from "next-auth/react"
import Link from "next/link"

const LogStatus = () => {
  const { status } = useSession()

  const logged = status === "authenticated"

  return (
    <Link
      href={logged ? "/profile" : "/auth/login"}
      className="rounded-sm bg-(--theme-blue) ml-3 px-4 py-0.5 text-white"
    >
      {logged ? "Profile" : "Login"}
    </Link>
  )
}

export default LogStatus

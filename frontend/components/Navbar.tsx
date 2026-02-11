import Image from "next/image"
import Link from "next/link"
import LogStatus from "./auth/LogStatus"

const Navbar = () => {
  return (
    <div className="border-[#C5A7A7] border px-12 py-2 rounded-3xl flex flex-row items-center justify-center ">
        <Link href={"/"} className="flex flex-row items-center gap-2 pr-10 font-mclaren">
            <Image src={"/logo.png"} alt="logo" width={20} height={34}></Image>
            <div className="font-medium text-[18px]">analyti<span className="text-[#007DE3]">CV</span></div>
        </Link>

        <div className="font-comfortaa flex flex-row gap-5 items-center cursor-pointer ">
          <Link href="/builder">builder</Link>
          <Link href="/analyzer">analyzer</Link>
          <Link href="/editor">editor</Link>
      
          <Link href={"/#about"}>about us</Link>
          <Link href={"https://github.com/githeimer/analyticv"}>github repo</Link>
          <LogStatus></LogStatus>
        </div>

        
    </div>
  )
}

export default Navbar
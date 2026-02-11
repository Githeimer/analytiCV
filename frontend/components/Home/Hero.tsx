import Link from "next/link"

const Hero = () => {
  return (
   <div>
     <div className='flex flex-row items-center justify-between w-full pt-10'>
        <div className="font-roboto font-bold text-7xl flex flex-col gap-3">
           <span> Find the Gaps.</span>
          <span> Fill the Gaps.</span>
        </div>
        <div>
            <Link className="font-comfortaa bg-(--theme-blue) text-white p-3 rounded-sm px-4 "  href={"/analyzer"}>upload your resume</Link>
        </div>
    </div>
    <p className="font-roboto font-extralight pt-5">Know Your Weak Spots Before Recruiters Do with our AI powered Resume Analyzer and Builder. Don’t let a paper decide how capable your are.</p>
   </div>
  )
}

export default Hero
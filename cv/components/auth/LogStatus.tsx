"use client"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react";
import Link from "next/link";
const LogStatus = () => {
    const {data}= useSession();
    const [logged,SetLogged]=useState<boolean>(false)

    useEffect(()=>{
        checkUser();
    },[])

    function checkUser()
    {
        if(!data)
        {
            SetLogged(false);
            return;
        }
        SetLogged(true);
    }
    return (
    <Link href={`${!logged?"/login":"/profile"}`} className="rounded-sm bg-(--theme-blue) ml-3 px-4 py-0.5 text-white">
     {!logged?
            <div>
                login
            </div>
        :
        
            <div>
                profile
            </div>
         }
       
    </Link>
  )
}



export default LogStatus
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <div>
            <div className="py-7 flex justify-center">
                <Navbar />
             </div>
        {children}
              <Toaster position="bottom-right" />

    </div>
 
  );
}

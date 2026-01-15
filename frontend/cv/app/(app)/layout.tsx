import Navbar from "@/components/Navbar";

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
    </div>
 
  );
}

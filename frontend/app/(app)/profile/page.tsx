'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  joinedDate: string;
  status: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      // Fixed syntax: added ( before backtick
      fetch(`/api/user?email=${session.user.email}`)
        .then(res => res.json())
        .then(data => {
          // Merging API data with some extra dummy info for the "Premium" look
          if (data.user) {
            setUser({
              ...data.user,
              role: 'Product Designer',
              joinedDate: 'January 2024',
              status: 'Active',
              image:  ''
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return <p className="text-center mt-10 text-red-500 font-medium">User not found</p>;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-8">
      <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 rounded-3xl p-8 w-full max-w-lg transition-all">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img
              src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`}
              alt="Profile"
              className="relative w-28 h-28 rounded-full border-4 border-white object-cover shadow-sm"
            />
            <span className="absolute bottom-1 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></span>
          </div>
          <h1 className="text-2xl font-bold mt-4 text-slate-800">{user.name}</h1>
          <p className="text-blue-600 font-medium text-sm px-3 py-1 bg-blue-50 rounded-full mt-1">
            {user.role}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <span className="text-slate-500 text-sm font-medium">Email Address</span>
            <span className="text-slate-800 font-semibold text-sm">{user.email}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Joined</p>
              <p className="text-slate-800 font-semibold">{user.joinedDate}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
              <p className="text-green-600 font-semibold">{user.status}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
        
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full bg-white hover:bg-red-50 text-red-500 font-semibold py-3 rounded-xl border border-red-100 transition-all"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
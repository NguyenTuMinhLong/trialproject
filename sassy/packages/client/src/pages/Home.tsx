import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-6">
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold">S</div>
          <h1 className="text-5xl font-bold tracking-tight">SaaSy</h1>
        </div>

        {user ? (
          <>
            <h2 className="text-5xl font-bold mb-4">
              Chào {user.name}! 👋
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Email: {user.email}
            </p>

            <button
              onClick={handleLogout}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-lg font-semibold transition-all"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <h2 className="text-6xl font-bold mb-6 leading-tight">
              Welcome back, bro!
            </h2>
            <div className="flex gap-4 justify-center">
              <Link to="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-semibold transition-all">
                Đăng nhập
              </Link>
              <Link to="/register" className="px-8 py-4 border border-gray-700 hover:border-gray-400 rounded-2xl text-lg font-semibold transition-all">
                Đăng ký
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
import { Link } from "react-router-dom";

export default function Page404() {

  return (
    <div className="min-h-screen flex items-center justify-center px-4 transition-colors duration-200
                    bg-white text-gray-900 dark:bg-[#0d1117] dark:text-[#c9d1d9]">
      <div className="max-w-md w-full text-center p-8 rounded-2xl shadow-md bg-gray-100 dark:bg-[#161b22]">
        <div className="text-6xl font-extrabold mb-4">404</div>
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm mb-6 text-gray-600 dark:text-[#8b949e]">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          className="inline-block px-5 py-2 rounded-md font-semibold
                     bg-[#6366F1] hover:bg-[#5558E3] text-white transition-colors duration-200"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

const LoadingScreen = () => {
  return (
    <div
      className="flex items-center justify-center h-screen w-full transition-colors duration-300
                 bg-white text-gray-800 dark:bg-[#0d1117] dark:text-[#c9d1d9]"
    >
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 border-4 border-gray-300 dark:border-gray-700 border-t-[#6366F1] 
                     rounded-full animate-spin mb-3"
        ></div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Loading<span className="animate-pulse">...</span>
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;

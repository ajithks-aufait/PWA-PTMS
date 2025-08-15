import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Test Component Working!</h1>
          <p className="text-gray-600 mb-4">
            If you can see this, the routing is working correctly.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;

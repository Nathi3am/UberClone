import React from 'react';

const Check = ({ ok, children }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
      {ok ? '✓' : '✕'}
    </div>
    <div className={`text-sm ${ok ? 'text-green-200' : 'text-gray-300'}`}>{children}</div>
  </div>
);

const PasswordRequirements = ({ password }) => {
  const lengthOk = typeof password === 'string' && password.length >= 8;
  const numberOk = /\d/.test(password || '');
  const specialOk = /[^A-Za-z0-9]/.test(password || '');

  return (
    <div className="w-80 bg-[#0f1724] border border-white/10 rounded-lg p-4 shadow-lg">
      <div className="mb-2 text-sm font-semibold text-white">Password must contain:</div>
      <div className="space-y-2">
        <Check ok={lengthOk}>At least 8 characters</Check>
        <Check ok={numberOk}>At least one number</Check>
        <Check ok={specialOk}>At least one special character</Check>
      </div>
    </div>
  );
};

export default PasswordRequirements;

import React from 'react';

export const SchoolLogo: React.FC<{ className?: string; size?: number }> = ({ className = "w-10 h-10", size }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={style}>
      <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-sm" fill="none">
        <defs>
          <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="100" fill="url(#logoBg)" />
        <circle cx="256" cy="256" r="220" fill="none" stroke="url(#goldAccent)" strokeWidth="8" strokeDasharray="8 6" />
        <circle cx="256" cy="256" r="195" fill="#1e293b" stroke="#3b82f6" strokeWidth="4" />
        {/* Torch */}
        <path d="M256 120 C240 160 210 180 230 220 C240 200 250 195 256 180 C262 195 272 200 282 220 C302 180 272 160 256 120 Z" fill="url(#goldAccent)" />
        <path d="M256 145 C250 165 240 175 250 195 C254 185 258 185 256 175 C258 185 262 185 266 195 C276 175 262 165 256 145 Z" fill="#ef4444" />
        {/* Book */}
        <path d="M160 290 Q256 265 256 300 Q256 265 352 290 L345 350 Q256 325 256 355 Q256 325 167 350 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
        {/* Text */}
        <path d="M140 395 Q256 420 372 395 L365 435 Q256 460 147 435 Z" fill="#2563eb" stroke="#60a5fa" strokeWidth="2" />
        <text x="256" y="423" fontFamily="system-ui" fontSize="20" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="3">SMP PGRI 1</text>
        <text x="256" y="446" fontFamily="system-ui" fontSize="14" fontWeight="700" fill="#fcd34d" textAnchor="middle" letterSpacing="4">CIKADU</text>
      </svg>
    </div>
  );
};

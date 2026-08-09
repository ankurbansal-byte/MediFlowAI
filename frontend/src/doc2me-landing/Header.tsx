/**
 * Header.tsx
 * Minimal editorial SaaS header in dark purple.
 * Logo on left, Login & Sign Up buttons on right.
 */

interface HeaderProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export function Header({ onLoginClick, onSignUpClick }: HeaderProps) {
  return (
    <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between relative z-30">
      {/* Left: Doc2Me Logo Badge */}
      <a 
        href="#" 
        id="doc2me-logo-link"
        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white shadow-lg shadow-purple-950/30 hover:scale-[1.02] transition-transform duration-200"
      >
        <div className="w-7 h-7 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center font-bold">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 10h-3v3h-2v-3H6v-2h3V7h2v3h3v2z"/>
          </svg>
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
          doc<span className="text-[#7C3AED]">2</span>me
        </span>
      </a>

      {/* Right: Login & Sign Up buttons */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="header-login-btn"
          onClick={onLoginClick}
          type="button"
          className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-md transition-all duration-200 cursor-pointer"
        >
          Login
        </button>

        <button
          id="header-signup-btn"
          onClick={onSignUpClick}
          type="button"
          className="px-6 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-lg shadow-purple-900/50 transition-all duration-200 cursor-pointer"
        >
          Sign Up
        </button>
      </div>
    </header>
  );
}


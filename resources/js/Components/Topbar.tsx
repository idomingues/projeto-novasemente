import { Link, usePage } from '@inertiajs/react';
import { BellIcon, MagnifyingGlassIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';
import { useTheme } from '@/Contexts/ThemeContext';

interface TopbarProps {
    onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
    const user = usePage().props.auth.user;
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 h-16 md:h-24 fixed top-0 right-0 left-0 md:left-72 z-40 transition-all duration-300">
            <div className="flex items-center justify-between h-full px-4 md:px-8">
                {/* Menu button (mobile) + Search / Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="md:hidden p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                        aria-label="Abrir menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="relative w-full max-w-md hidden md:block">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 text-sm"
                        />
                    </div>
                    <div className="md:hidden flex-1 min-w-0">
                        <span className="text-lg font-bold text-zinc-900 dark:text-white truncate block">Admin</span>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {theme === 'dark' ? (
                            <SunIcon className="w-6 h-6" />
                        ) : (
                            <MoonIcon className="w-6 h-6" />
                        )}
                    </button>

                    <button className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors relative">
                        <BellIcon className="w-6 h-6" />
                        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-zinc-100 dark:border-zinc-900 rounded-full"></span>
                    </button>

                    <div className="relative">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 focus:outline-none group"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{user.name}</p>
                                        <p className="text-xs text-zinc-500">Administrador</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm ring-4 ring-zinc-100 dark:ring-zinc-900 group-hover:ring-zinc-200 dark:group-hover:ring-zinc-800 transition-all">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content contentClasses="py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                                <Dropdown.Link href={route('profile.edit')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white">Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white">
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </header>
    );
}

/**
 * Tabsome Client-Side Authentication Module
 * Built for tabsome.github.io using Supabase Auth SDK.
 */

(function (window) {
    'use strict';

    // Public Supabase Anon configuration (Safe for public client-side static web repos)
    const SUPABASE_CONFIG = {
        url: 'https://yzkwkospejkzpzxyjhau.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6a3drb3NwZWprenB6eHlqaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzODM2NDIsImV4cCI6MjA4MTk1OTY0Mn0.1ghQF8wvPpzETM6F-F00bdWpi0o2PW58BydEMwtxpgU'
    };

    let supabaseClient = null;
    let authListeners = [];
    let currentUser = null;
    let currentSession = null;
    let isInitialized = false;

    function getSupabaseClient() {
        if (supabaseClient) {
            return supabaseClient;
        }

        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            console.error('[TabsomeAuth] Supabase SDK is not loaded. Ensure @supabase/supabase-js is included via script tag.');
            return null;
        }

        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            }
        });

        return supabaseClient;
    }

    const TabsomeAuth = {
        config: SUPABASE_CONFIG,

        get client() {
            return getSupabaseClient();
        },

        async init() {
            if (isInitialized) {
                return { user: currentUser, session: currentSession };
            }

            const client = getSupabaseClient();
            if (!client) {
                return { user: null, session: null };
            }

            try {
                const { data } = await client.auth.getSession();
                currentSession = data?.session || null;
                currentUser = currentSession?.user || null;

                client.auth.onAuthStateChange((event, session) => {
                    currentSession = session || null;
                    currentUser = session?.user || null;
                    authListeners.forEach(listener => {
                        try {
                            listener(currentUser, currentSession, event);
                        } catch (err) {
                            console.error('[TabsomeAuth] Listener error:', err);
                        }
                    });
                });

                isInitialized = true;
            } catch (err) {
                console.error('[TabsomeAuth] Failed to initialize session:', err);
            }

            return { user: currentUser, session: currentSession };
        },

        async getUser() {
            if (currentUser) return currentUser;
            const client = getSupabaseClient();
            if (!client) return null;
            try {
                const { data } = await client.auth.getUser();
                currentUser = data?.user || null;
                return currentUser;
            } catch {
                return null;
            }
        },

        async getSession() {
            if (currentSession) return currentSession;
            const client = getSupabaseClient();
            if (!client) return null;
            try {
                const { data } = await client.auth.getSession();
                currentSession = data?.session || null;
                currentUser = currentSession?.user || null;
                return currentSession;
            } catch {
                return null;
            }
        },

        async getAccessToken() {
            const session = await this.getSession();
            return session?.access_token || null;
        },

        async signInWithGoogle(returnUrl) {
            const client = getSupabaseClient();
            if (!client) {
                alert('Authentication service is currently unavailable.');
                return;
            }

            // Remove hash fragments and clean target redirect
            const redirectTo = returnUrl || window.location.href.split('#')[0];

            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                console.error('[TabsomeAuth] Google Sign-In error:', error);
                alert('Sign in error: ' + (error.message || 'Unable to sign in with Google.'));
            }
        },

        async signOut() {
            const client = getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            currentUser = null;
            currentSession = null;
            window.location.reload();
        },

        onAuthStateChange(callback) {
            if (typeof callback === 'function') {
                authListeners.push(callback);
                // Call immediately with current cached state if already evaluated
                if (isInitialized) {
                    callback(currentUser, currentSession, 'INITIAL');
                }
            }
            return () => {
                authListeners = authListeners.filter(cb => cb !== callback);
            };
        },

        /**
         * Authenticated API request wrapper
         * Injects Authorization Bearer token automatically if logged in.
         */
        async apiFetch(url, options = {}) {
            const token = await this.getAccessToken();
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            return fetch(url, {
                ...options,
                headers
            });
        },

        /**
         * Mounts standard Auth button / Profile dropdown into any container
         */
        initNavbarAuth(containerId = 'tabsomeAuthNav') {
            const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
            if (!container) return;

            const render = (user) => {
                if (!user) {
                    // Render Sign in with Google Button
                    container.innerHTML = `
                        <button id="navSignInGoogleBtn"
                            class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg border border-white/20 transition-all duration-200 shadow-sm hover:shadow hover:scale-[1.02]">
                            <svg class="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            </svg>
                            <span>Sign In</span>
                        </button>
                    `;

                    const btn = container.querySelector('#navSignInGoogleBtn');
                    if (btn) {
                        btn.addEventListener('click', () => TabsomeAuth.signInWithGoogle());
                    }
                } else {
                    // Render User Profile Avatar & Dropdown
                    const metadata = user.user_metadata || {};
                    const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User';
                    const avatarUrl = metadata.avatar_url || metadata.picture || null;
                    const email = user.email || '';
                    const initials = (fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    container.innerHTML = `
                        <div class="relative inline-block text-left" id="userAuthDropdownWrapper">
                            <button id="userAuthProfileBtn" type="button"
                                class="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400">
                                ${avatarUrl
                            ? `<img src="${avatarUrl}" alt="${fullName}" class="w-7 h-7 rounded-full object-cover border border-white/30" />`
                            : `<div class="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">${initials}</div>`
                        }
                                <span class="hidden sm:inline font-semibold max-w-[120px] truncate">${fullName}</span>
                                <i class="fas fa-chevron-down text-[10px] text-white/70 ml-0.5 hidden sm:inline"></i>
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="userAuthDropdownMenu"
                                class="hidden absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-2 z-50 transform transition-all duration-200">
                                <div class="px-3 py-2.5 border-b border-white/10">
                                    <p class="text-xs font-bold text-white truncate">${fullName}</p>
                                    <p class="text-[11px] text-gray-300 truncate mt-0.5">${email}</p>
                                </div>
                                <div class="py-1">
                                    <a href="speed-dials.html" class="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition">
                                        <i class="fas fa-th-large text-purple-400 w-4 text-center"></i>
                                        <span>Speed Dials</span>
                                    </a>
                                    <a href="library.html" class="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition">
                                        <i class="fas fa-bookmark text-pink-400 w-4 text-center"></i>
                                        <span>Library</span>
                                    </a>
                                </div>
                                <div class="pt-1 border-t border-white/10">
                                    <button id="navSignOutBtn" type="button"
                                        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition text-left font-medium">
                                        <i class="fas fa-sign-out-alt w-4 text-center"></i>
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;

                    const profileBtn = container.querySelector('#userAuthProfileBtn');
                    const menu = container.querySelector('#userAuthDropdownMenu');
                    const signOutBtn = container.querySelector('#navSignOutBtn');

                    if (profileBtn && menu) {
                        profileBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            menu.classList.toggle('hidden');
                        });

                        document.addEventListener('click', (e) => {
                            if (!container.contains(e.target)) {
                                menu.classList.add('hidden');
                            }
                        });
                    }

                    if (signOutBtn) {
                        signOutBtn.addEventListener('click', () => TabsomeAuth.signOut());
                    }
                }
            };

            // Register listener and initial render
            this.onAuthStateChange((user) => {
                render(user);
            });

            this.init();
        }
    };

    // Expose globally
    window.TabsomeAuth = TabsomeAuth;

    // Auto-initialize if Supabase is present
    if (typeof window.supabase !== 'undefined') {
        TabsomeAuth.init();
    }
})(window);

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
    let isInitializing = false;

    function notifyListeners(user, session, event) {
        authListeners.forEach(listener => {
            try {
                listener(user, session, event);
            } catch (err) {
                console.error('Auth listener error');
            }
        });
    }

    function getSupabaseClient() {
        if (supabaseClient) {
            return supabaseClient;
        }

        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            console.error('Auth client error');
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

        // Listen immediately to Supabase auth events (OAuth redirect callback, token refresh, etc.)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            currentSession = session || null;
            currentUser = session?.user || null;

            if (event === 'SIGNED_OUT' || !session) {
                notifyListeners(null, null, 'SIGNED_OUT');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                notifyListeners(currentUser, currentSession, event);
            }
        });

        return supabaseClient;
    }

    const TabsomeAuth = {
        config: SUPABASE_CONFIG,

        get apiUrl() {
            return window.TabsomeConfig?.API_BASE_URL || window.API_BASE_URL || 'https://tabsome.vercel.app';
        },

        get client() {
            return getSupabaseClient();
        },

        async init(forceRevalidate = false) {
            if (isInitialized && !forceRevalidate) {
                return { user: currentUser, session: currentSession };
            }
            if (isInitializing) {
                return { user: currentUser, session: currentSession };
            }
            isInitializing = true;

            const client = getSupabaseClient();
            if (!client) {
                isInitializing = false;
                return { user: null, session: null };
            }

            try {
                const { data } = await client.auth.getSession();
                currentSession = data?.session || null;
                currentUser = currentSession?.user || null;

                // Validate session with Supabase server to prevent displaying stale cached profiles
                if (currentSession) {
                    const { data: userData, error: userError } = await client.auth.getUser();
                    if (userError || !userData?.user) {
                        console.warn('Auth session invalid');
                        currentUser = null;
                        currentSession = null;
                        try {
                            await client.auth.signOut({ scope: 'local' });
                        } catch (e) {
                            // ignore local signout error
                        }
                        notifyListeners(null, null, 'SIGNED_OUT');
                    } else {
                        currentUser = userData.user;
                        notifyListeners(currentUser, currentSession, 'INITIAL_USER');
                    }
                } else {
                    notifyListeners(null, null, 'INITIAL_ANON');
                }

                isInitialized = true;
            } catch (err) {
                console.error('Auth init error');
                currentUser = null;
                currentSession = null;
                notifyListeners(null, null, 'SIGNED_OUT');
            } finally {
                isInitializing = false;
            }

            return { user: currentUser, session: currentSession };
        },

        async getUser(forceValidate = false) {
            const client = getSupabaseClient();
            if (!client) return null;

            if (currentUser && !forceValidate) {
                // If token is about to expire or already expired, validate against server
                if (currentSession && currentSession.expires_at) {
                    const nowSec = Math.floor(Date.now() / 1000);
                    if (nowSec >= currentSession.expires_at - 10) {
                        return this.getUser(true);
                    }
                }
                return currentUser;
            }

            try {
                const { data, error } = await client.auth.getUser();
                if (error || !data?.user) {
                    if (currentUser || currentSession) {
                        console.warn('Auth session invalid');
                        await this.clearSessionAndNotify();
                    }
                    return null;
                }
                currentUser = data.user;
                return currentUser;
            } catch (err) {
                console.error('Auth user error');
                return null;
            }
        },

        async getSession() {
            const client = getSupabaseClient();
            if (!client) return null;

            try {
                const { data, error } = await client.auth.getSession();
                if (error || !data?.session) {
                    if (currentUser || currentSession) {
                        await this.clearSessionAndNotify();
                    }
                    return null;
                }
                currentSession = data.session;
                currentUser = currentSession.user || null;
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

            // Clean target redirect and resolve relative paths to absolute URL
            let redirectTo = returnUrl || window.location.href.split('#')[0];
            if (redirectTo && !redirectTo.startsWith('http://') && !redirectTo.startsWith('https://')) {
                try {
                    redirectTo = new URL(redirectTo, window.location.href).href;
                } catch (e) {
                    redirectTo = window.location.href.split('#')[0];
                }
            }

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
                console.error('Auth sign in error');
                alert('Sign in error: ' + (error.message || 'Unable to sign in with Google.'));
            }
        },

        async clearSessionAndNotify() {
            currentUser = null;
            currentSession = null;
            const client = getSupabaseClient();
            if (client) {
                try {
                    await client.auth.signOut({ scope: 'local' });
                } catch (e) {
                    // Ignore signOut cleanup errors
                }
            }
            notifyListeners(null, null, 'SIGNED_OUT');
        },

        async signOut() {
            const client = getSupabaseClient();
            if (client) {
                try {
                    await client.auth.signOut({ scope: 'local' });
                } catch (e) {
                    console.warn('Auth sign out error');
                }
            }
            await this.clearSessionAndNotify();
            window.location.reload();
        },

        onAuthStateChange(callback) {
            if (typeof callback === 'function') {
                authListeners.push(callback);
                // Call immediately with current state
                callback(currentUser, currentSession, currentUser ? 'INITIAL_USER' : (isInitialized ? 'INITIAL_ANON' : 'PENDING'));
            }
            return () => {
                authListeners = authListeners.filter(cb => cb !== callback);
            };
        },

        /**
         * Authenticated API request wrapper.
         * Injects Authorization Bearer token automatically if logged in.
         * If the server responds with 401 Unauthorized, automatically purges the stale session
         * and notifies all UI elements to switch to the signed-out state.
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

            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                // If unauthorized and we sent a token, the session was revoked or expired on backend
                if (response.status === 401 && token) {
                    console.warn('Auth session expired');
                    await this.clearSessionAndNotify();
                }

                return response;
            } catch (fetchError) {
                throw fetchError;
            }
        },

        /**
         * Mounts standard Auth button / Profile dropdown into any container
         */
        initNavbarAuth(containerId = 'tabsomeAuthNav') {
            const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
            if (!container) return;

            const render = (user) => {
                if (!user) {
                    const isLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('login.html');
                    if (isLoginPage) {
                        container.innerHTML = '';
                        return;
                    }

                    // Build redirect parameter back to current page
                    let redirectParam = '';
                    try {
                        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
                        const currentSearch = window.location.search || '';
                        const currentHash = window.location.hash || '';
                        const fullTarget = currentPath + currentSearch + currentHash;
                        if (fullTarget && !fullTarget.includes('login.html')) {
                            redirectParam = '?redirect=' + encodeURIComponent(fullTarget);
                        }
                    } catch (e) {
                        redirectParam = '';
                    }

                    const loginHref = 'login.html' + redirectParam;

                    // Render Sign In link to dedicated Login Page
                    container.innerHTML = `
                        <a href="${loginHref}" id="navSignInBtn"
                            class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg border border-white/20 transition-all duration-200 shadow-sm hover:shadow hover:scale-[1.02] cursor-pointer"
                            title="Sign In to Tabsome">
                            <i class="fas fa-right-to-bracket text-xs text-white/80"></i>
                            <span>Sign In</span>
                        </a>
                    `;
                } else {
                    // Render User Profile Avatar & Dropdown
                    const metadata = user.user_metadata || {};
                    const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User';
                    const avatarUrl = metadata.avatar_url || metadata.picture || null;
                    const email = user.email || '';
                    const initials = (fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

                    const safeFullName = fullName.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const safeEmail = email.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const safeInitials = initials.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    const isSpeedDialsActive = window.location.pathname.includes('speed-dials');

                    container.innerHTML = `
                        <div class="relative inline-block text-left" id="userAuthDropdownWrapper">
                            <button id="userAuthProfileBtn" type="button"
                                class="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer">
                                <span class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                                    ${avatarUrl
                            ? `<img src="${avatarUrl}" alt="${safeFullName}" referrerpolicy="no-referrer" class="w-7 h-7 rounded-full object-cover border border-white/30" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\\'w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-inner\\\'>${safeInitials}</div>';" />`
                            : `<div class="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">${safeInitials}</div>`
                        }
                                </span>
                                <span class="hidden sm:inline font-semibold max-w-[120px] truncate">${safeFullName}</span>
                                <i class="fas fa-chevron-down text-[10px] text-white/70 ml-0.5 hidden sm:inline"></i>
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="userAuthDropdownMenu"
                                class="hidden absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-2 z-50 transform transition-all duration-200">
                                <a href="account.html" class="block px-3 py-2.5 border-b border-white/10 rounded-t-xl transition hover:bg-white/5 cursor-pointer">
                                    <p class="text-xs font-bold text-white truncate">${safeFullName}</p>
                                    <p class="text-[11px] text-gray-300 truncate mt-0.5">${safeEmail}</p>
                                </a>
                                <div class="py-1">
                                    <a href="speed-dials.html" class="flex items-center justify-between px-3 py-2 text-xs rounded-lg transition ${isSpeedDialsActive ? 'bg-purple-600/30 text-white font-semibold border border-purple-500/30' : 'text-gray-200 hover:text-white hover:bg-white/10'}">
                                        <div class="flex items-center gap-2.5">
                                            <svg class="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                <rect x="2" y="2" width="9" height="9" rx="2.5" />
                                                <rect x="13" y="2" width="9" height="9" rx="2.5" />
                                                <rect x="2" y="13" width="9" height="9" rx="2.5" />
                                                <rect x="13" y="13" width="9" height="9" rx="2.5" />
                                            </svg>
                                            <span>Speed Dials</span>
                                        </div>
                                        ${isSpeedDialsActive ? '<span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>' : ''}
                                    </a>
                                    <a href="library.html" class="flex items-center justify-between px-3 py-2 text-xs rounded-lg transition mt-0.5 ${window.location.pathname.includes('library') ? 'bg-pink-600/30 text-white font-semibold border border-pink-500/30' : 'text-gray-200 hover:text-white hover:bg-white/10'}">
                                        <div class="flex items-center gap-2.5">
                                            <i class="fas fa-book-bookmark text-pink-400 w-4 text-center"></i>
                                            <span>Library</span>
                                        </div>
                                        ${window.location.pathname.includes('library') ? '<span class="w-1.5 h-1.5 rounded-full bg-pink-400"></span>' : ''}
                                    </a>
                                </div>
                                <div class="pt-1 border-t border-white/10">
                                    <button id="navSignOutBtn" type="button"
                                        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition text-left font-medium cursor-pointer">
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

    // Cross-tab synchronization: Listen for storage events (e.g. if user signs out in another tab)
    window.addEventListener('storage', (event) => {
        if (event.key && (event.key.includes('supabase') || event.key.includes('auth-token') || event.key.includes('sb-'))) {
            if (!event.newValue) {
                TabsomeAuth.clearSessionAndNotify();
            } else {
                TabsomeAuth.init(true);
            }
        }
    });

    // Expose globally
    window.TabsomeAuth = TabsomeAuth;

    // Auto-initialize if Supabase is present
    if (typeof window.supabase !== 'undefined') {
        TabsomeAuth.init();
    }
})(window);

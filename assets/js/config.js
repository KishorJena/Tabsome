/**
 * Tabsome Global Configuration
 * Centralized API Base URL for all pages and modules.
 * 
 * To switch between Localhost and Production during development,
 * simply comment/uncomment the ACTIVE_API_URL assignment below:
 */

// 1. Available API URLs
const LOCAL_API_URL = 'http://localhost:3000';
const PROD_API_URL = 'https://tabsome.vercel.app';

// 2. ACTIVE BASE URL (Switch manually here):
// const ACTIVE_API_URL = LOCAL_API_URL;        // <-- Localhost (Development)
const ACTIVE_API_URL = PROD_API_URL;       // <-- Production (tabsome.vercel.app)

// =========================================================================
// Centralized Export (Accessible in all pages via window.TabsomeConfig or window.API_BASE_URL)
// =========================================================================
(function (global) {
    'use strict';

    const TabsomeConfig = {
        LOCAL_API_URL: LOCAL_API_URL,
        PROD_API_URL: PROD_API_URL,
        API_BASE_URL: ACTIVE_API_URL,
        isLocal: ACTIVE_API_URL === LOCAL_API_URL
    };

    global.TabsomeConfig = TabsomeConfig;
    global.API_BASE_URL = ACTIVE_API_URL;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TabsomeConfig;
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

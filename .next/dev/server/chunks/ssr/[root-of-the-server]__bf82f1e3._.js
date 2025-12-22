module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/flipper-ai/src/lib/theme-config.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Theme Configuration System
 * Defines color themes for the application
 */ __turbopack_context__.s([
    "defaultTheme",
    ()=>defaultTheme,
    "themes",
    ()=>themes
]);
const themes = {
    purple: {
        id: "purple",
        name: "Purple Dream",
        description: "Default purple and pink gradient theme",
        colors: {
            primaryFrom: "purple-500",
            primaryTo: "pink-600",
            primaryShadow: "purple-500/50",
            secondaryFrom: "blue-500",
            secondaryTo: "purple-600",
            secondaryShadow: "blue-500/50",
            accentBlue: {
                from: "blue-400",
                to: "blue-600",
                shadow: "blue-500/50"
            },
            accentGreen: {
                from: "green-400",
                to: "emerald-600",
                shadow: "green-500/50"
            },
            accentOrange: {
                from: "yellow-400",
                to: "orange-600",
                shadow: "orange-500/50"
            },
            accentPurple: {
                from: "purple-400",
                to: "purple-600",
                shadow: "purple-500/50"
            },
            orbColors: [
                "purple-500",
                "blue-500",
                "pink-500"
            ],
            textGradient: {
                from: "purple-200",
                via: "pink-200",
                to: "blue-200"
            },
            textMuted: "blue-200/70"
        }
    },
    ocean: {
        id: "ocean",
        name: "Ocean Breeze",
        description: "Cool blue and teal gradient theme",
        colors: {
            primaryFrom: "cyan-500",
            primaryTo: "blue-600",
            primaryShadow: "cyan-500/50",
            secondaryFrom: "teal-500",
            secondaryTo: "cyan-600",
            secondaryShadow: "teal-500/50",
            accentBlue: {
                from: "cyan-400",
                to: "blue-600",
                shadow: "cyan-500/50"
            },
            accentGreen: {
                from: "teal-400",
                to: "emerald-600",
                shadow: "teal-500/50"
            },
            accentOrange: {
                from: "sky-400",
                to: "blue-600",
                shadow: "sky-500/50"
            },
            accentPurple: {
                from: "indigo-400",
                to: "blue-600",
                shadow: "indigo-500/50"
            },
            orbColors: [
                "cyan-500",
                "blue-500",
                "teal-500"
            ],
            textGradient: {
                from: "cyan-200",
                via: "blue-200",
                to: "teal-200"
            },
            textMuted: "cyan-200/70"
        }
    },
    sunset: {
        id: "sunset",
        name: "Sunset Glow",
        description: "Warm orange and red gradient theme",
        colors: {
            primaryFrom: "orange-500",
            primaryTo: "red-600",
            primaryShadow: "orange-500/50",
            secondaryFrom: "yellow-500",
            secondaryTo: "orange-600",
            secondaryShadow: "yellow-500/50",
            accentBlue: {
                from: "orange-400",
                to: "red-600",
                shadow: "orange-500/50"
            },
            accentGreen: {
                from: "lime-400",
                to: "green-600",
                shadow: "lime-500/50"
            },
            accentOrange: {
                from: "yellow-400",
                to: "orange-600",
                shadow: "yellow-500/50"
            },
            accentPurple: {
                from: "pink-400",
                to: "red-600",
                shadow: "pink-500/50"
            },
            orbColors: [
                "orange-500",
                "red-500",
                "yellow-500"
            ],
            textGradient: {
                from: "orange-200",
                via: "red-200",
                to: "yellow-200"
            },
            textMuted: "orange-200/70"
        }
    },
    forest: {
        id: "forest",
        name: "Forest Green",
        description: "Natural green and emerald gradient theme",
        colors: {
            primaryFrom: "green-500",
            primaryTo: "emerald-600",
            primaryShadow: "green-500/50",
            secondaryFrom: "lime-500",
            secondaryTo: "green-600",
            secondaryShadow: "lime-500/50",
            accentBlue: {
                from: "teal-400",
                to: "cyan-600",
                shadow: "teal-500/50"
            },
            accentGreen: {
                from: "green-400",
                to: "emerald-600",
                shadow: "green-500/50"
            },
            accentOrange: {
                from: "lime-400",
                to: "green-600",
                shadow: "lime-500/50"
            },
            accentPurple: {
                from: "emerald-400",
                to: "teal-600",
                shadow: "emerald-500/50"
            },
            orbColors: [
                "green-500",
                "emerald-500",
                "lime-500"
            ],
            textGradient: {
                from: "green-200",
                via: "emerald-200",
                to: "lime-200"
            },
            textMuted: "green-200/70"
        }
    },
    midnight: {
        id: "midnight",
        name: "Midnight Blue",
        description: "Deep blue and indigo gradient theme",
        colors: {
            primaryFrom: "indigo-500",
            primaryTo: "blue-700",
            primaryShadow: "indigo-500/50",
            secondaryFrom: "blue-600",
            secondaryTo: "indigo-700",
            secondaryShadow: "blue-600/50",
            accentBlue: {
                from: "blue-400",
                to: "indigo-600",
                shadow: "blue-500/50"
            },
            accentGreen: {
                from: "cyan-400",
                to: "blue-600",
                shadow: "cyan-500/50"
            },
            accentOrange: {
                from: "violet-400",
                to: "indigo-600",
                shadow: "violet-500/50"
            },
            accentPurple: {
                from: "indigo-400",
                to: "purple-600",
                shadow: "indigo-500/50"
            },
            orbColors: [
                "indigo-500",
                "blue-600",
                "violet-500"
            ],
            textGradient: {
                from: "indigo-200",
                via: "blue-200",
                to: "violet-200"
            },
            textMuted: "indigo-200/70"
        }
    },
    rose: {
        id: "rose",
        name: "Rose Garden",
        description: "Elegant pink and rose gradient theme",
        colors: {
            primaryFrom: "pink-500",
            primaryTo: "rose-600",
            primaryShadow: "pink-500/50",
            secondaryFrom: "fuchsia-500",
            secondaryTo: "pink-600",
            secondaryShadow: "fuchsia-500/50",
            accentBlue: {
                from: "pink-400",
                to: "rose-600",
                shadow: "pink-500/50"
            },
            accentGreen: {
                from: "emerald-400",
                to: "green-600",
                shadow: "emerald-500/50"
            },
            accentOrange: {
                from: "orange-400",
                to: "pink-600",
                shadow: "orange-500/50"
            },
            accentPurple: {
                from: "fuchsia-400",
                to: "purple-600",
                shadow: "fuchsia-500/50"
            },
            orbColors: [
                "pink-500",
                "rose-500",
                "fuchsia-500"
            ],
            textGradient: {
                from: "pink-200",
                via: "rose-200",
                to: "fuchsia-200"
            },
            textMuted: "pink-200/70"
        }
    }
};
const defaultTheme = themes.purple;
}),
"[project]/flipper-ai/src/contexts/ThemeContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/src/lib/theme-config.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function ThemeProvider({ children }) {
    const [theme, setThemeState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["defaultTheme"]);
    // Load theme from localStorage on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const savedThemeId = localStorage.getItem("flipper-theme");
        if (savedThemeId && __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["themes"][savedThemeId]) {
            setThemeState(__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["themes"][savedThemeId]);
        }
    }, []);
    const setTheme = (themeId)=>{
        if (__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["themes"][themeId]) {
            setThemeState(__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["themes"][themeId]);
            localStorage.setItem("flipper-theme", themeId);
        }
    };
    const availableThemes = Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$lib$2f$theme$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["themes"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            theme,
            setTheme,
            availableThemes
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/flipper-ai/src/contexts/ThemeContext.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
function useTheme() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
}),
"[project]/flipper-ai/src/components/ThemeStyles.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeStyles",
    ()=>ThemeStyles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$styled$2d$jsx$40$5$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$40$19$2e$2$2e$3$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.28.5_react@19.2.3/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$contexts$2f$ThemeContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/flipper-ai/src/contexts/ThemeContext.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
function ThemeStyles() {
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$src$2f$contexts$2f$ThemeContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    const { colors } = theme;
    // Map Tailwind color names to actual hex values
    const colorMap = {
        // Purple shades
        "purple-400": "#c084fc",
        "purple-500": "#a855f7",
        "purple-600": "#9333ea",
        "purple-700": "#7e22ce",
        // Pink shades
        "pink-400": "#f472b6",
        "pink-500": "#ec4899",
        "pink-600": "#db2777",
        "pink-700": "#be185d",
        // Blue shades
        "blue-400": "#60a5fa",
        "blue-500": "#3b82f6",
        "blue-600": "#2563eb",
        "blue-700": "#1d4ed8",
        // Cyan shades
        "cyan-400": "#22d3ee",
        "cyan-500": "#06b6d4",
        "cyan-600": "#0891b2",
        // Teal shades
        "teal-400": "#2dd4bf",
        "teal-500": "#14b8a6",
        "teal-600": "#0d9488",
        // Green shades
        "green-400": "#4ade80",
        "green-500": "#22c55e",
        "green-600": "#16a34a",
        // Emerald shades
        "emerald-400": "#34d399",
        "emerald-600": "#059669",
        // Lime shades
        "lime-400": "#a3e635",
        "lime-500": "#84cc16",
        // Yellow shades
        "yellow-400": "#facc15",
        "yellow-500": "#eab308",
        // Orange shades
        "orange-400": "#fb923c",
        "orange-500": "#f97316",
        "orange-600": "#ea580c",
        // Red shades
        "red-500": "#ef4444",
        "red-600": "#dc2626",
        // Indigo shades
        "indigo-400": "#818cf8",
        "indigo-500": "#6366f1",
        "indigo-600": "#4f46e5",
        "indigo-700": "#4338ca",
        // Violet shades
        "violet-400": "#a78bfa",
        "violet-500": "#8b5cf6",
        // Fuchsia shades
        "fuchsia-400": "#e879f9",
        "fuchsia-500": "#d946ef",
        "fuchsia-600": "#c026d3",
        // Rose shades
        "rose-500": "#f43f5e",
        "rose-600": "#e11d48",
        // Sky shades
        "sky-400": "#38bdf8"
    };
    const getColor = (colorName)=>{
        return colorMap[colorName] || "#a855f7"; // fallback to purple-500
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$0_$40$babel$2b$core$40$7$2e$28$2e$5_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_$40$playwright$2b$test$40$1$2e$57$2e$0_react$2d$d_da6b8d12ae64d737564ec245f57ffa10$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$flipper$2d$ai$2f$node_modules$2f2e$pnpm$2f$styled$2d$jsx$40$5$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$40$19$2e$2$2e$3$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        id: "215ed3fafc510d6f",
        dynamic: [
            getColor(colors.primaryFrom),
            getColor(colors.primaryTo),
            getColor(colors.secondaryFrom),
            getColor(colors.secondaryTo),
            getColor(colors.accentBlue.from),
            getColor(colors.accentBlue.to),
            getColor(colors.accentGreen.from),
            getColor(colors.accentGreen.to),
            getColor(colors.accentOrange.from),
            getColor(colors.accentOrange.to),
            getColor(colors.accentPurple.from),
            getColor(colors.accentPurple.to),
            getColor(colors.orbColors[0]),
            getColor(colors.orbColors[1]),
            getColor(colors.orbColors[2])
        ],
        children: `:root{--theme-primary-from:${getColor(colors.primaryFrom)};--theme-primary-to:${getColor(colors.primaryTo)};--theme-secondary-from:${getColor(colors.secondaryFrom)};--theme-secondary-to:${getColor(colors.secondaryTo)};--theme-accent-blue-from:${getColor(colors.accentBlue.from)};--theme-accent-blue-to:${getColor(colors.accentBlue.to)};--theme-accent-green-from:${getColor(colors.accentGreen.from)};--theme-accent-green-to:${getColor(colors.accentGreen.to)};--theme-accent-orange-from:${getColor(colors.accentOrange.from)};--theme-accent-orange-to:${getColor(colors.accentOrange.to)};--theme-accent-purple-from:${getColor(colors.accentPurple.from)};--theme-accent-purple-to:${getColor(colors.accentPurple.to)};--theme-orb-1:${getColor(colors.orbColors[0])};--theme-orb-2:${getColor(colors.orbColors[1])};--theme-orb-3:${getColor(colors.orbColors[2])}}`
    }, void 0, false, void 0, this);
}
}),
"[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
"[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/compiled/client-only/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[project]/flipper-ai/node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.28.5_react@19.2.3/node_modules/styled-jsx/dist/index/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

__turbopack_context__.r("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/compiled/client-only/index.js [app-ssr] (ecmascript)");
var React = __turbopack_context__.r("[project]/flipper-ai/node_modules/.pnpm/next@16.1.0_@babel+core@7.28.5_@opentelemetry+api@1.9.0_@playwright+test@1.57.0_react-d_da6b8d12ae64d737564ec245f57ffa10/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
function _interopDefaultLegacy(e) {
    return e && typeof e === 'object' && 'default' in e ? e : {
        'default': e
    };
}
var React__default = /*#__PURE__*/ _interopDefaultLegacy(React);
/*
Based on Glamor's sheet
https://github.com/threepointone/glamor/blob/667b480d31b3721a905021b26e1290ce92ca2879/src/sheet.js
*/ function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
var isProd = typeof process !== "undefined" && process.env && ("TURBOPACK compile-time value", "development") === "production";
var isString = function(o) {
    return Object.prototype.toString.call(o) === "[object String]";
};
var StyleSheet = /*#__PURE__*/ function() {
    function StyleSheet(param) {
        var ref = param === void 0 ? {} : param, _name = ref.name, name = _name === void 0 ? "stylesheet" : _name, _optimizeForSpeed = ref.optimizeForSpeed, optimizeForSpeed = _optimizeForSpeed === void 0 ? isProd : _optimizeForSpeed;
        invariant$1(isString(name), "`name` must be a string");
        this._name = name;
        this._deletedRulePlaceholder = "#" + name + "-deleted-rule____{}";
        invariant$1(typeof optimizeForSpeed === "boolean", "`optimizeForSpeed` must be a boolean");
        this._optimizeForSpeed = optimizeForSpeed;
        this._serverSheet = undefined;
        this._tags = [];
        this._injected = false;
        this._rulesCount = 0;
        var node = ("TURBOPACK compile-time value", "undefined") !== "undefined" && document.querySelector('meta[property="csp-nonce"]');
        this._nonce = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
    }
    var _proto = StyleSheet.prototype;
    _proto.setOptimizeForSpeed = function setOptimizeForSpeed(bool) {
        invariant$1(typeof bool === "boolean", "`setOptimizeForSpeed` accepts a boolean");
        invariant$1(this._rulesCount === 0, "optimizeForSpeed cannot be when rules have already been inserted");
        this.flush();
        this._optimizeForSpeed = bool;
        this.inject();
    };
    _proto.isOptimizeForSpeed = function isOptimizeForSpeed() {
        return this._optimizeForSpeed;
    };
    _proto.inject = function inject() {
        var _this = this;
        invariant$1(!this._injected, "sheet already injected");
        this._injected = true;
        if (("TURBOPACK compile-time value", "undefined") !== "undefined" && this._optimizeForSpeed) //TURBOPACK unreachable
        ;
        this._serverSheet = {
            cssRules: [],
            insertRule: function(rule, index) {
                if (typeof index === "number") {
                    _this._serverSheet.cssRules[index] = {
                        cssText: rule
                    };
                } else {
                    _this._serverSheet.cssRules.push({
                        cssText: rule
                    });
                }
                return index;
            },
            deleteRule: function(index) {
                _this._serverSheet.cssRules[index] = null;
            }
        };
    };
    _proto.getSheetForTag = function getSheetForTag(tag) {
        if (tag.sheet) {
            return tag.sheet;
        }
        // this weirdness brought to you by firefox
        for(var i = 0; i < document.styleSheets.length; i++){
            if (document.styleSheets[i].ownerNode === tag) {
                return document.styleSheets[i];
            }
        }
    };
    _proto.getSheet = function getSheet() {
        return this.getSheetForTag(this._tags[this._tags.length - 1]);
    };
    _proto.insertRule = function insertRule(rule, index) {
        invariant$1(isString(rule), "`insertRule` accepts only strings");
        if ("TURBOPACK compile-time truthy", 1) {
            if (typeof index !== "number") {
                index = this._serverSheet.cssRules.length;
            }
            this._serverSheet.insertRule(rule, index);
            return this._rulesCount++;
        }
        //TURBOPACK unreachable
        ;
        var sheet;
        var insertionPoint;
    };
    _proto.replaceRule = function replaceRule(index, rule) {
        if (this._optimizeForSpeed || ("TURBOPACK compile-time value", "undefined") === "undefined") {
            var sheet = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : this._serverSheet;
            if (!rule.trim()) {
                rule = this._deletedRulePlaceholder;
            }
            if (!sheet.cssRules[index]) {
                // @TBD Should we throw an error?
                return index;
            }
            sheet.deleteRule(index);
            try {
                sheet.insertRule(rule, index);
            } catch (error) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("StyleSheet: illegal rule: \n\n" + rule + "\n\nSee https://stackoverflow.com/q/20007992 for more info");
                }
                // In order to preserve the indices we insert a deleteRulePlaceholder
                sheet.insertRule(this._deletedRulePlaceholder, index);
            }
        } else //TURBOPACK unreachable
        {
            var tag;
        }
        return index;
    };
    _proto.deleteRule = function deleteRule(index) {
        if ("TURBOPACK compile-time truthy", 1) {
            this._serverSheet.deleteRule(index);
            return;
        }
        //TURBOPACK unreachable
        ;
        var tag;
    };
    _proto.flush = function flush() {
        this._injected = false;
        this._rulesCount = 0;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        else {
            // simpler on server
            this._serverSheet.cssRules = [];
        }
    };
    _proto.cssRules = function cssRules() {
        var _this = this;
        if ("TURBOPACK compile-time truthy", 1) {
            return this._serverSheet.cssRules;
        }
        //TURBOPACK unreachable
        ;
    };
    _proto.makeStyleTag = function makeStyleTag(name, cssString, relativeToTag) {
        if (cssString) {
            invariant$1(isString(cssString), "makeStyleTag accepts only strings as second parameter");
        }
        var tag = document.createElement("style");
        if (this._nonce) tag.setAttribute("nonce", this._nonce);
        tag.type = "text/css";
        tag.setAttribute("data-" + name, "");
        if (cssString) {
            tag.appendChild(document.createTextNode(cssString));
        }
        var head = document.head || document.getElementsByTagName("head")[0];
        if (relativeToTag) {
            head.insertBefore(tag, relativeToTag);
        } else {
            head.appendChild(tag);
        }
        return tag;
    };
    _createClass(StyleSheet, [
        {
            key: "length",
            get: function get() {
                return this._rulesCount;
            }
        }
    ]);
    return StyleSheet;
}();
function invariant$1(condition, message) {
    if (!condition) {
        throw new Error("StyleSheet: " + message + ".");
    }
}
function hash(str) {
    var _$hash = 5381, i = str.length;
    while(i){
        _$hash = _$hash * 33 ^ str.charCodeAt(--i);
    }
    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */ return _$hash >>> 0;
}
var stringHash = hash;
var sanitize = function(rule) {
    return rule.replace(/\/style/gi, "\\/style");
};
var cache = {};
/**
 * computeId
 *
 * Compute and memoize a jsx id from a basedId and optionally props.
 */ function computeId(baseId, props) {
    if (!props) {
        return "jsx-" + baseId;
    }
    var propsToString = String(props);
    var key = baseId + propsToString;
    if (!cache[key]) {
        cache[key] = "jsx-" + stringHash(baseId + "-" + propsToString);
    }
    return cache[key];
}
/**
 * computeSelector
 *
 * Compute and memoize dynamic selectors.
 */ function computeSelector(id, css) {
    var selectoPlaceholderRegexp = /__jsx-style-dynamic-selector/g;
    // Sanitize SSR-ed CSS.
    // Client side code doesn't need to be sanitized since we use
    // document.createTextNode (dev) and the CSSOM api sheet.insertRule (prod).
    if ("TURBOPACK compile-time truthy", 1) {
        css = sanitize(css);
    }
    var idcss = id + css;
    if (!cache[idcss]) {
        cache[idcss] = css.replace(selectoPlaceholderRegexp, id);
    }
    return cache[idcss];
}
function mapRulesToStyle(cssRules, options) {
    if (options === void 0) options = {};
    return cssRules.map(function(args) {
        var id = args[0];
        var css = args[1];
        return /*#__PURE__*/ React__default["default"].createElement("style", {
            id: "__" + id,
            // Avoid warnings upon render with a key
            key: "__" + id,
            nonce: options.nonce ? options.nonce : undefined,
            dangerouslySetInnerHTML: {
                __html: css
            }
        });
    });
}
var StyleSheetRegistry = /*#__PURE__*/ function() {
    function StyleSheetRegistry(param) {
        var ref = param === void 0 ? {} : param, _styleSheet = ref.styleSheet, styleSheet = _styleSheet === void 0 ? null : _styleSheet, _optimizeForSpeed = ref.optimizeForSpeed, optimizeForSpeed = _optimizeForSpeed === void 0 ? false : _optimizeForSpeed;
        this._sheet = styleSheet || new StyleSheet({
            name: "styled-jsx",
            optimizeForSpeed: optimizeForSpeed
        });
        this._sheet.inject();
        if (styleSheet && typeof optimizeForSpeed === "boolean") {
            this._sheet.setOptimizeForSpeed(optimizeForSpeed);
            this._optimizeForSpeed = this._sheet.isOptimizeForSpeed();
        }
        this._fromServer = undefined;
        this._indices = {};
        this._instancesCounts = {};
    }
    var _proto = StyleSheetRegistry.prototype;
    _proto.add = function add(props) {
        var _this = this;
        if (undefined === this._optimizeForSpeed) {
            this._optimizeForSpeed = Array.isArray(props.children);
            this._sheet.setOptimizeForSpeed(this._optimizeForSpeed);
            this._optimizeForSpeed = this._sheet.isOptimizeForSpeed();
        }
        if (("TURBOPACK compile-time value", "undefined") !== "undefined" && !this._fromServer) //TURBOPACK unreachable
        ;
        var ref = this.getIdAndRules(props), styleId = ref.styleId, rules = ref.rules;
        // Deduping: just increase the instances count.
        if (styleId in this._instancesCounts) {
            this._instancesCounts[styleId] += 1;
            return;
        }
        var indices = rules.map(function(rule) {
            return _this._sheet.insertRule(rule);
        }) // Filter out invalid rules
        .filter(function(index) {
            return index !== -1;
        });
        this._indices[styleId] = indices;
        this._instancesCounts[styleId] = 1;
    };
    _proto.remove = function remove(props) {
        var _this = this;
        var styleId = this.getIdAndRules(props).styleId;
        invariant(styleId in this._instancesCounts, "styleId: `" + styleId + "` not found");
        this._instancesCounts[styleId] -= 1;
        if (this._instancesCounts[styleId] < 1) {
            var tagFromServer = this._fromServer && this._fromServer[styleId];
            if (tagFromServer) {
                tagFromServer.parentNode.removeChild(tagFromServer);
                delete this._fromServer[styleId];
            } else {
                this._indices[styleId].forEach(function(index) {
                    return _this._sheet.deleteRule(index);
                });
                delete this._indices[styleId];
            }
            delete this._instancesCounts[styleId];
        }
    };
    _proto.update = function update(props, nextProps) {
        this.add(nextProps);
        this.remove(props);
    };
    _proto.flush = function flush() {
        this._sheet.flush();
        this._sheet.inject();
        this._fromServer = undefined;
        this._indices = {};
        this._instancesCounts = {};
    };
    _proto.cssRules = function cssRules() {
        var _this = this;
        var fromServer = this._fromServer ? Object.keys(this._fromServer).map(function(styleId) {
            return [
                styleId,
                _this._fromServer[styleId]
            ];
        }) : [];
        var cssRules = this._sheet.cssRules();
        return fromServer.concat(Object.keys(this._indices).map(function(styleId) {
            return [
                styleId,
                _this._indices[styleId].map(function(index) {
                    return cssRules[index].cssText;
                }).join(_this._optimizeForSpeed ? "" : "\n")
            ];
        }) // filter out empty rules
        .filter(function(rule) {
            return Boolean(rule[1]);
        }));
    };
    _proto.styles = function styles(options) {
        return mapRulesToStyle(this.cssRules(), options);
    };
    _proto.getIdAndRules = function getIdAndRules(props) {
        var css = props.children, dynamic = props.dynamic, id = props.id;
        if (dynamic) {
            var styleId = computeId(id, dynamic);
            return {
                styleId: styleId,
                rules: Array.isArray(css) ? css.map(function(rule) {
                    return computeSelector(styleId, rule);
                }) : [
                    computeSelector(styleId, css)
                ]
            };
        }
        return {
            styleId: computeId(id),
            rules: Array.isArray(css) ? css : [
                css
            ]
        };
    };
    /**
   * selectFromServer
   *
   * Collects style tags from the document with id __jsx-XXX
   */ _proto.selectFromServer = function selectFromServer() {
        var elements = Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]'));
        return elements.reduce(function(acc, element) {
            var id = element.id.slice(2);
            acc[id] = element;
            return acc;
        }, {});
    };
    return StyleSheetRegistry;
}();
function invariant(condition, message) {
    if (!condition) {
        throw new Error("StyleSheetRegistry: " + message + ".");
    }
}
var StyleSheetContext = /*#__PURE__*/ React.createContext(null);
StyleSheetContext.displayName = "StyleSheetContext";
function createStyleRegistry() {
    return new StyleSheetRegistry();
}
function StyleRegistry(param) {
    var configuredRegistry = param.registry, children = param.children;
    var rootRegistry = React.useContext(StyleSheetContext);
    var ref = React.useState(function() {
        return rootRegistry || configuredRegistry || createStyleRegistry();
    }), registry = ref[0];
    return /*#__PURE__*/ React__default["default"].createElement(StyleSheetContext.Provider, {
        value: registry
    }, children);
}
function useStyleRegistry() {
    return React.useContext(StyleSheetContext);
}
// Opt-into the new `useInsertionEffect` API in React 18, fallback to `useLayoutEffect`.
// https://github.com/reactwg/react-18/discussions/110
var useInsertionEffect = React__default["default"].useInsertionEffect || React__default["default"].useLayoutEffect;
var defaultRegistry = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined;
function JSXStyle(props) {
    var registry = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : useStyleRegistry();
    // If `registry` does not exist, we do nothing here.
    if (!registry) {
        return null;
    }
    if ("TURBOPACK compile-time truthy", 1) {
        registry.add(props);
        return null;
    }
    //TURBOPACK unreachable
    ;
}
JSXStyle.dynamic = function(info) {
    return info.map(function(tagInfo) {
        var baseId = tagInfo[0];
        var props = tagInfo[1];
        return computeId(baseId, props);
    }).join(" ");
};
exports.StyleRegistry = StyleRegistry;
exports.createStyleRegistry = createStyleRegistry;
exports.style = JSXStyle;
exports.useStyleRegistry = useStyleRegistry;
}),
"[project]/flipper-ai/node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.28.5_react@19.2.3/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/flipper-ai/node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.28.5_react@19.2.3/node_modules/styled-jsx/dist/index/index.js [app-ssr] (ecmascript)").style;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bf82f1e3._.js.map
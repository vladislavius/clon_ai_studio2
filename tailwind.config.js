/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            colors: {
                // Custom brand colors if needed
            },
            animation: {
                'in': 'animate-in 0.2s ease-out',
            },
        },
    },
    plugins: [],
}

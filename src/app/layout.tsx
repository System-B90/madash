import type { Metadata } from "next";
import { MuiEmotionCacheProvider } from "@/components/mui-emotion-cache-provider";
import "@/style/globals.css";

export const metadata: Metadata = {
    title: "מדש",
    description: "מדש",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    return (
        <html lang="he" className="dark" data-theme="dark" dir="rtl">
            <body
                className='antialiased w-screen h-screen overflow-hidden' dir="rtl"
            >
                <MuiEmotionCacheProvider>{ children }</MuiEmotionCacheProvider>
            </body>
        </html>
    );
}

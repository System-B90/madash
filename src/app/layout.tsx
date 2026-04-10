import type { Metadata } from "next";
import { MuiEmotionCacheProvider } from "@/components/mui-emotion-cache-provider";
import { WebSocketConfigProvider } from "@/components/websocket-config-provider";
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
    // Read the runtime environment variable securely on the server
    const wsHost = process.env.WEBSOCKET_SESSION_SERVER_HOST || "localhost";
    const wsProtcol = process.env.WEBSOCKET_PROTOCOL || "ws";
    const wsPortSuffix = process.env.WEBSOCKET_PORT_SUFFIX || ":28199";

    return (
        <html lang="he" className="dark" data-theme="dark" dir="rtl">
            <body
                className="antialiased w-screen h-screen overflow-hidden"
                dir="rtl"
            >
                <WebSocketConfigProvider host={ wsHost } protocol={ wsProtcol } portSuffix={ wsPortSuffix }>
                    <MuiEmotionCacheProvider>{ children }</MuiEmotionCacheProvider>
                </WebSocketConfigProvider>
            </body>
        </html>
    );
}
'use server';
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { authOptions } from "@/api-server/hive/sso";
import { AuthSessionUser } from "@/api-shared/session";

export default async function PostAuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    const session = await getServerSession(authOptions);

    if (!session || !session.user)
    {
        redirect("/login");
    }

    return (
        <AuthProvider userData={ session.user as AuthSessionUser }>
            { children }
        </AuthProvider>
    );
}
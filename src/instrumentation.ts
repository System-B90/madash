import { registerOTel } from '@vercel/otel';

export function register()
{
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    registerOTel('next-app');
}
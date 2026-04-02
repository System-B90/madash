import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest
{
    return {
        name: 'מדש',
        short_name: 'מדש',
        description: 'Madrat & Mevuzarim dashboard',
        start_url: '/',
        display: 'standalone',
        background_color: '#000',
        theme_color: '#000',
        icons: [
            {
                src: '/Madash.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    };
}

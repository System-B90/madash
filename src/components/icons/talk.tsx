'use client';

import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';
export default function TalkIcon(props: SvgIconProps)
{
    return (
        <SvgIcon
            { ...props }
            viewBox="0 0 48 48"
            // Ensure the stroke inherits the MUI color prop
            sx={ {
                fill: 'none',
                ...props.sx
            } }
        >
            <path
                stroke="currentColor"
                strokeMiterlimit="5"
                strokeWidth="3"
                d="M22.5,34.258c0-0.971-0.885-1.759-1.979-1.759H6.448c-1.092,0-1.979,0.787-1.979,1.759v3.083c0,2.7,3.345,5.159,9.031,5.159s9-2.5,9-5.159V34.258z"
            />
            <path
                stroke="currentColor"
                strokeLinejoin="round"
                strokeMiterlimit="5"
                strokeWidth="3"
                d="M41.532,5.5h-14c-1.105,0-2,0.896-2,2v4v4v7l5-5h11c1.105,0,2-0.896,2-2v-8C43.532,6.396,42.637,5.5,41.532,5.5z"
            />
            <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="5"
                strokeWidth="3"
                d="M21.5,22.5c0,0-4.176,5-8,5c-2.761,0-5-2.239-5-5s2.239-5,5-5C17.324,17.5,21.5,22.5,21.5,22.5z"
            />
        </SvgIcon>
    );
}

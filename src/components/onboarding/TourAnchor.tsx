"use client";

import { Box, type BoxProps } from "@mui/material";
import { useTourAnchor } from "@system-b90/onboarding";

/** A Box registered as a tour anchor, for targets that don't forward a ref. */
export function TourAnchor({ id, ...props }: BoxProps & { id: string; })
{
    return <Box ref={ useTourAnchor(id) } { ...props } />;
}

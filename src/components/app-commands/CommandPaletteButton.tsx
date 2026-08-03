"use client";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { ShortcutKeys, useCommandPalette } from "@system-b90/command-palette";
import { useSyncExternalStore } from "react";

/** The platform never changes mid-session, so there is nothing to subscribe to. */
const noopSubscribe = () => () => { };

/**
 * The mouse affordance for the command palette. Without it the palette is
 * discoverable only by already knowing the shortcut.
 */
export function CommandPaletteButton()
{
    const { open } = useCommandPalette();
    // Resolved on the client only: the server has no idea what the user is on,
    // so it renders the non-Mac hint and hydration corrects it if needed.
    const isMac = useSyncExternalStore(
        noopSubscribe,
        () => /mac/i.test(globalThis.navigator.userAgent),
        () => false,
    );

    return (
        <ButtonBase
            aria-label="פתיחת שורת הפקודות"
            onClick={ () => open(null) }
            sx={ {
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
                px: 1.5,
                py: 0.75,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
                color: "text.secondary",
                transition: "all 0.2s ease",
                "&:hover": {
                    bgcolor: "action.selected",
                    borderColor: "primary.main",
                },
            } }
        >
            <SearchIcon fontSize="small" />

            <Typography
                noWrap
                sx={ {
                    flexGrow: 1,
                    textAlign: "start",
                    fontSize: "0.85rem",
                } }
            >
                חיפוש פקודה או חניך
            </Typography>

            <Box sx={ { display: { xs: "none", sm: "flex" } } }>
                <ShortcutKeys keys={ isMac ? [ "⌘", "K" ] : [ "Ctrl", "K" ] } />
            </Box>
        </ButtonBase>
    );
}

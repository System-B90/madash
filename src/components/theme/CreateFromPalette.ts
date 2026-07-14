import { ThemeOptions } from "@mui/material/styles";

declare module "@mui/material/Chip" {
    interface ChipPropsSizeOverrides
    {
        smaller: true;
        smallest: true;
    }
}

export function createThemeOptions(): ThemeOptions
{
    return {
        direction: "rtl",
        modularCssLayers: '@layer theme, base, mui, components, utilities;',
        cssVariables: {
            colorSchemeSelector: "class",
        },
        colorSchemes: {
            light: {
                palette: {
                    primary: {
                        main: "#00C853", // Readable vibrant green for light background
                        light: "#69F0AE",
                        dark: "#009624",
                        contrastText: "#ffffff",
                    },
                    secondary: {
                        main: "#AA00FF", // Readable neon purple for light background
                        light: "#E040FB",
                        dark: "#7B00C7",
                        contrastText: "#ffffff",
                    },
                    background: {
                        default: "#F8FAFC", // Soft slate-gray/blue background
                        paper: "#FFFFFF",
                    },
                    text: {
                        primary: "#0F172A", // Slate 900
                        secondary: "#475569", // Slate 600
                    },
                },
            },
            dark: {
                palette: {
                    primary: {
                        main: "#00E676", // Vibrant Green
                        light: "#66FFA6",
                        dark: "#00B248",
                        contrastText: "#000000",
                    },
                    secondary: {
                        main: "#D500F9", // Neon Purple
                        light: "#FA51FF",
                        dark: "#9E00C5",
                        contrastText: "#FFFFFF",
                    },
                    info: {
                        main: "#00E5FF", // Cyan/Blue
                        light: "#6EFFFF",
                        dark: "#00B2CC",
                        contrastText: "#000000",
                    },
                    background: {
                        default: "#0B0F19", // Deep Blue-Tinted Background
                        paper: "#131B2F", // Elevated Blue-Gray for cards
                    },
                    text: {
                        primary: "#F8FAFC",
                        secondary: "#94A3B8",
                    },
                },
            },
        },
        typography: {
            fontFamily: [ '"Assistant"', "sans-serif" ].join(","),
            h1: { fontWeight: 700 },
            h2: { fontWeight: 700 },
            h3: { fontWeight: 600 },
            button: { fontWeight: 600 },
        },
        components: {
            MuiChip: {
                variants: [
                    {
                        props: { size: "smaller" },
                        style: {
                            height: 16,
                            fontSize: 12,
                            padding: "0 2px",
                            borderRadius: 12,
                            "& .MuiChip-label": {
                                paddingLeft: 4,
                                paddingRight: 4,
                            },
                            "& .MuiChip-icon": {
                                fontSize: 10,
                                marginLeft: 2,
                                marginRight: -2,
                            },
                        },
                    },
                    {
                        props: { size: "smallest" },
                        style: {
                            height: 12,
                            fontSize: 8,
                            padding: "0 1px",
                            borderRadius: 12,
                            "& .MuiChip-label": {
                                paddingLeft: 1,
                                paddingRight: 1,
                            },
                            "& .MuiChip-icon": { fontSize: 8 },
                        },
                    },
                ],
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        fontWeight: 600,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    rounded: {
                        borderRadius: 12,
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        borderRadius: "20px",
                        overflow: "hidden",
                        backgroundColor: theme.vars.palette.background.paper,
                        backgroundImage: "none",
                        boxShadow: "0 24px 50px rgba(0,0,0,0.15)",
                        border: "1px solid",
                        borderColor: theme.vars.palette.divider,
                    }),
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.vars.palette.background.paper,
                        backgroundImage: "none",
                        boxShadow: "none",
                        borderBottom: "1px solid",
                        borderColor: theme.vars.palette.divider,
                        color: theme.vars.palette.text.primary,
                    }),
                },
            },
        },
    };
}

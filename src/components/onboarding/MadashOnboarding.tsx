"use client";

import { HelpButton, OnboardingProvider, useHelpTopics, useTour } from "@system-b90/onboarding";
import { HE_LABELS } from "@system-b90/onboarding/he";
import type { ReactNode } from "react";

import { TourAnchor } from "@/components/onboarding/TourAnchor";
import {
    ANCHORS,
    HOME_HELP_TOPICS,
    HOME_TOUR,
    JOURNAL_HELP_TOPICS,
    JOURNAL_TOUR,
} from "@/components/onboarding/tours";

/**
 * Guided tours + help drawer (#77). Mounted inside the MUI theme so it picks up
 * the palette and RTL direction. Screens without a tour (login, access denied)
 * register none, so nothing ever starts there.
 */
export function MadashOnboardingProvider({ children }: { children: ReactNode; })
{
    return (
        <OnboardingProvider labels={ HE_LABELS } storageNamespace="madash">
            { children }
        </OnboardingProvider>
    );
}

/** Contributes the home tour and its help topics; render once on the home screen. */
export function HomeOnboarding()
{
    useTour(HOME_TOUR);
    useHelpTopics(HOME_HELP_TOPICS);
    return null;
}

/** Contributes the journal tour and its help topics. */
export function JournalOnboarding()
{
    useTour(JOURNAL_TOUR);
    useHelpTopics(JOURNAL_HELP_TOPICS);
    return null;
}

/** The help drawer's entry point, anchored so the home tour can point at it. */
export function MadashHelpButton()
{
    return (
        <TourAnchor id={ ANCHORS.helpButton } sx={ { display: "inline-flex", flexShrink: 0 } }>
            <HelpButton />
        </TourAnchor>
    );
}

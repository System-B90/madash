/**
 * Regression for #59: the repo lints on a supported ESLint (10+), and the
 * config's rules actually fire instead of crashing or silently no-op'ing
 * (eslint-plugin-import crashed on v10; import-x without TS parser settings
 * never detected cycles).
 */
import path from "path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = path.resolve( __dirname, "../.." );

async function ruleIds( files: Record<string, string> ): Promise<string[]> {
    const eslint = new ESLint( { cwd: root } );
    const ids: string[] = [];
    for ( const [ name, code ] of Object.entries( files ) ) {
        const [ result ] = await eslint.lintText( code, { filePath: path.join( root, "src", name ) } );
        ids.push( ...result.messages.map( ( m ) => m.ruleId ?? m.message ) );
    }
    return ids;
}

describe( "eslint config (#59)", () => {
    it( "runs on ESLint 10 or newer", () => {
        expect( Number( ESLint.version.split( "." )[ 0 ] ) ).toBeGreaterThanOrEqual( 10 );
    } );

    it( "reports import order, relative imports, hooks and jsx-key", async () => {
        const ids = await ruleIds( {
            "eslint-probe.tsx": [
                "import { useState } from \"react\";",
                "import fs from \"fs\";",
                "import { x } from \"../foo\";",
                "export function Probe( { items }: { items: string[] } ) {",
                "  if ( items.length ) { useState( 0 ); }",
                "  return <div>{items.map( ( i ) => <span>{i}</span> )}{fs ? x : 1}</div>;",
                "}",
            ].join( "\n" ),
        } );
        expect( ids ).toEqual( expect.arrayContaining( [
            "import-x/order",
            "no-restricted-imports",
            "react-hooks/rules-of-hooks",
            "react/jsx-key",
        ] ) );
    }, 60_000 );
} );

# Family Tree

## Project
- Next.js 16 family-tree builder app
- Tailwind CSS v4 + DaisyUI v5 for styling
- D3 v7 for tree layouts (flat + radial/circular Ahnentafel-style)
- Zustand for state (localStorage persistence, no backend)
- jsPDF + svg2pdf.js for vector-quality HD PDF export
- TypeScript with `@/*` path alias

## Domain rules
- Each person has exactly ONE parent (`parentId`, nullable for root)
- Each person may have ONE partner (`partnerId`, bidirectional)
- A person may have many children (via other persons' `parentId`)
- Partners are rendered paired but do not nest into each other's subtrees

## Package manager
Always use `yarn`, never `npm`.

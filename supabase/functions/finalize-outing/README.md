# finalize-outing

Owner-only finalization Edge Function.

The function reads the draft outing, validates present adults, payer, and items, computes the exact
centavo shares with the shared money engine, then calls the `apply_finalization` RPC. The RPC writes
immutable shares, finalizes the outing, bumps its version, and records the activity event in one
transaction. Only the service role can apply the RPC.

The `money/` folder is synced from `src/domain/money` so the browser and the server use the same code.
Do not edit it directly. After changing the engine, run:

```powershell
npm run sync:edge-money
```

Then deploy the function.

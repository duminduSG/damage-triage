'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClaimDetail } from '@/components/claim-detail';
import { StatusBadge } from '@/components/status-badge';
import { Claim, createClaim, listClaims } from '@/lib/api';
import { cn } from '@/lib/utils';

export function TriageApp() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(
    () => listClaims().then(setClaims).catch((e) => toast.error(e.message)),
    [],
  );
  useEffect(() => void refresh(), [refresh]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      const c = await createClaim(String(form.get('reference')), String(form.get('address')));
      formEl.reset();
      await refresh();
      setSelected(c.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Damage Triage</h1>
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New claim</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="reference">Reference</Label>
                  <Input id="reference" name="reference" placeholder="CLM-1234" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="address">Property address</Label>
                  <Input id="address" name="address" placeholder="1 Example St" required />
                </div>
                <Button type="submit">
                  <Plus /> Create claim
                </Button>
              </form>
            </CardContent>
          </Card>

          <nav className="grid gap-1.5">
            {claims.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                onClick={() => setSelected(c.id)}
                className={cn('h-auto w-full min-w-0 justify-between gap-2 py-2', c.id === selected && 'border-primary bg-muted')}
              >
                <span className="min-w-0 truncate" title={c.reference}>{c.reference}</span>
                <StatusBadge status={c.status} />
              </Button>
            ))}
          </nav>
        </aside>

        {selected ? (
          <ClaimDetail id={selected} onChanged={refresh} />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Select or create a claim.
          </div>
        )}
      </div>
    </main>
  );
}

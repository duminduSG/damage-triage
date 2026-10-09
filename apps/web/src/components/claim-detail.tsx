'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageUp, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { Claim, getClaim, uploadPhoto } from '@/lib/api';

export function ClaimDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => getClaim(id).then(setClaim).catch((e) => toast.error(e.message)),
    [id],
  );
  useEffect(() => void load(), [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await uploadPhoto(id, f);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      await load();
      onChanged();
    }
  }

  if (!claim) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {claim.reference} <StatusBadge status={claim.status} />
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {claim.address}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50 has-disabled:cursor-wait has-disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
          {busy ? 'Classifying…' : 'Add damage photos (JPEG, PNG or WebP, max 10 MB)'}
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        {claim.summary && claim.summary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {claim.summary.map((s) => (
              <Badge key={s.damageType} variant="outline">
                {s.count} × {s.damageType.toLowerCase()}
              </Badge>
            ))}
          </div>
        )}

        {claim.photos && claim.photos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Damage</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claim.photos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.filename}</TableCell>
                  <TableCell className="capitalize">{p.classification.damageType.toLowerCase()}</TableCell>
                  <TableCell className="capitalize">{p.classification.severity.toLowerCase()}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(p.classification.confidence * 100)}%
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground" title={p.classification.notes}>
                    {p.classification.notes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

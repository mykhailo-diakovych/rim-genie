import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { client, orpc } from "@/utils/orpc";

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ColorsTab() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery(
    orpc.catalog.colors.list.queryOptions({ input: { includeInactive: true } }),
  );
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.colors.list.key() });

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editHex, setEditHex] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      client.catalog.colors.create({
        name: newName,
        key: slug(newName),
        hex: newHex.trim() || null,
        sortOrder: rows?.length ?? 0,
        isActive: true,
      }),
    onSuccess: async () => {
      await invalidate();
      setAddMode(false);
      setNewName("");
      setNewHex("");
      toast.success("Color added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      key: string;
      hex: string | null;
      sortOrder: number;
      isActive: boolean;
    }) => client.catalog.colors.update(input),
    onSuccess: async () => {
      await invalidate();
      setEditId(null);
      toast.success("Color updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.catalog.colors.delete({ id }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Color deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <table className="w-full font-rubik text-sm">
          <thead>
            <tr className="border-b border-field-line text-left text-xs text-label">
              <th className="w-12 px-3 py-2 font-normal" />
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Hex</th>
              <th className="w-20 px-3 py-2 text-center font-normal">Active</th>
              <th className="w-32 px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className="animate-pulse border-b border-field-line last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="size-5 rounded-full bg-page" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-24 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-16 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                </tr>
              ))}
            {!isLoading && (!rows || rows.length === 0) && !addMode && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-label">
                  No colors yet. Add your first one.
                </td>
              </tr>
            )}
            {rows?.map((row) =>
              editId === row.id ? (
                <tr key={row.id} className="border-b border-field-line bg-blue/5">
                  <td className="px-3 py-2">
                    <span
                      className="block size-5 rounded-full border border-field-line"
                      style={{ background: editHex || "transparent" }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body focus:border-blue focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                      placeholder="#000000"
                      className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        disabled={updateMutation.isPending || !editName || !editKey}
                        onClick={() =>
                          updateMutation.mutate({
                            id: row.id,
                            name: editName,
                            key: editKey,
                            hex: editHex.trim() || null,
                            sortOrder: row.sortOrder,
                            isActive: row.isActive,
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-b border-field-line last:border-b-0">
                  <td className="px-3 py-2.5">
                    <span
                      className="block size-5 rounded-full border border-field-line"
                      style={{ background: row.hex ?? "transparent" }}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-body">{row.name}</td>
                  <td className="px-3 py-2.5 text-label">{row.hex ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={row.isActive}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: row.id,
                            name: row.name,
                            key: row.key,
                            hex: row.hex ?? null,
                            sortOrder: row.sortOrder,
                            isActive: checked === true,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditId(row.id);
                          setEditName(row.name);
                          setEditKey(row.key);
                          setEditHex(row.hex ?? "");
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        color="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(row.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {addMode && (
              <tr className="border-b border-field-line bg-blue/5">
                <td className="px-3 py-2">
                  <span
                    className="block size-5 rounded-full border border-field-line"
                    style={{ background: newHex || "transparent" }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Gunmetal"
                    className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                    placeholder="#000000 (optional)"
                    className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      disabled={createMutation.isPending || !newName}
                      onClick={() => createMutation.mutate()}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddMode(false);
                        setNewName("");
                        setNewHex("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!addMode && (
        <Button className="self-start" onClick={() => setAddMode(true)}>
          <Plus />
          Add Color
        </Button>
      )}
    </div>
  );
}

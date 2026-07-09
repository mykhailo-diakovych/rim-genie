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

export function VehicleSizesTab() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery(
    orpc.catalog.vehicleSizes.list.queryOptions({ input: { includeInactive: true } }),
  );
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.vehicleSizes.list.key() });

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      client.catalog.vehicleSizes.create({
        name: newName,
        key: newKey.trim() || slug(newName),
        sortOrder: rows?.length ?? 0,
        isActive: true,
      }),
    onSuccess: async () => {
      await invalidate();
      setAddMode(false);
      setNewName("");
      setNewKey("");
      toast.success("Vehicle size added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      key: string;
      sortOrder: number;
      isActive: boolean;
    }) => client.catalog.vehicleSizes.update(input),
    onSuccess: async () => {
      await invalidate();
      setEditId(null);
      toast.success("Vehicle size updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.catalog.vehicleSizes.delete({ id }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Vehicle size deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <table className="w-full font-rubik text-sm">
          <thead>
            <tr className="border-b border-field-line text-left text-xs text-label">
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Key</th>
              <th className="w-20 px-3 py-2 text-center font-normal">Active</th>
              <th className="w-32 px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className="animate-pulse border-b border-field-line last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-28 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-4 w-24 rounded bg-page" />
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                </tr>
              ))}
            {!isLoading && (!rows || rows.length === 0) && !addMode && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-label">
                  No vehicle sizes yet. Add your first one.
                </td>
              </tr>
            )}
            {rows?.map((row) =>
              editId === row.id ? (
                <tr key={row.id} className="border-b border-field-line bg-blue/5">
                  <td className="px-3 py-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body focus:border-blue focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body focus:border-blue focus:outline-none"
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
                  <td className="px-3 py-2.5 font-medium text-body">{row.name}</td>
                  <td className="px-3 py-2.5 text-label">{row.key}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={row.isActive}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: row.id,
                            name: row.name,
                            key: row.key,
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
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Pick Up Truck"
                    className="w-full rounded border border-field-line px-2 py-1.5 text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={newName ? slug(newName) : "auto from name"}
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
                        setNewKey("");
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
          Add Vehicle Size
        </Button>
      )}
    </div>
  );
}

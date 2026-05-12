"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  createCustomerAction,
  updateCustomerAction,
  getCustomerForEditAction,
} from "@/actions/customer-actions";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import { defaultBodyMeasurements } from "@/lib/body-measurements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const CELANA_FIELDS = [
  ["panjang", "Panjang (cm)"],
  ["bawah", "Bawah (cm)"],
  ["lutut", "Lutut (cm)"],
  ["paha", "Paha (cm)"],
  ["kilMistak", "Kil/mistak (cm)"],
  ["pinggang", "Pinggang (cm)"],
  ["pinggul", "Pinggul (cm)"],
] as const;

const BAJU_FIELDS = [
  ["panjang", "Panjang (cm)"],
  ["lingkarDada", "Lingkar dada (cm)"],
  ["pinggang", "Pinggang (cm)"],
  ["pinggul", "Pinggul (cm)"],
  ["bahu", "Bahu (cm)"],
  ["panjangLengan", "Panjang lengan (cm)"],
  ["lingkarLengan", "Lingkar lengan (cm)"],
  ["pergelangan", "Pergelangan (cm)"],
  ["leher", "Leher (cm)"],
] as const;

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  customerId?: string;
  remindersEnabled: boolean;
  onSaved?: () => void;
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  mode,
  customerId,
  remindersEnabled,
  onSaved,
}: CustomerFormDialogProps) {
  const [pending, startTransition] = useTransition();
  const [loadingEdit, setLoadingEdit] = useState(false);

  const form = useForm<CustomerFormValues & { nextFollowUpAt?: string | null }>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
      bodyMeasurements: defaultBodyMeasurements(),
      nextFollowUpAt: null,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      form.reset({
        name: "",
        phone: "",
        address: "",
        notes: "",
        bodyMeasurements: defaultBodyMeasurements(),
        nextFollowUpAt: null,
      });
      return;
    }

    if (!customerId) return;

    let cancelled = false;
    setLoadingEdit(true);

    void (async () => {
      const data = await getCustomerForEditAction(customerId);
      if (cancelled) return;

      if (!data) {
        setLoadingEdit(false);
        toast({
          variant: "destructive",
          title: "Tidak ditemukan",
          description: "Pelanggan tidak ada atau bukan milik bisnis Anda.",
        });
        onOpenChange(false);
        return;
      }

      form.reset({
        name: data.name,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        bodyMeasurements: data.bodyMeasurements ?? defaultBodyMeasurements(),
        nextFollowUpAt: data.nextFollowUpAt,
      });
      setLoadingEdit(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, customerId, onOpenChange, form]);

  function onSubmit(
    values: CustomerFormValues & { nextFollowUpAt?: string | null },
  ) {
    startTransition(async () => {
      if (mode === "create") {
        const res = await createCustomerAction({
          ...values,
          nextFollowUpAt: remindersEnabled ? values.nextFollowUpAt : null,
        });
        if (!res.ok) {
          toast({
            variant: "destructive",
            title: "Gagal menyimpan",
            description: res.error,
          });
          return;
        }
        toast({ title: "Pelanggan ditambahkan" });
        onOpenChange(false);
        onSaved?.();
        return;
      }

      if (!customerId) return;
      const res = await updateCustomerAction(customerId, {
        ...values,
        nextFollowUpAt: remindersEnabled ? values.nextFollowUpAt : null,
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: res.error,
        });
        return;
      }
      toast({ title: "Perubahan disimpan" });
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah pelanggan" : "Edit pelanggan"}
          </DialogTitle>
          <DialogDescription>
            Ukuran dikelompokkan: celana dan baju — tersimpan untuk bisnis Anda.
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && loadingEdit ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {mode === "edit" && loadingEdit ? null : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor HP</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Ukuran celana</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CELANA_FIELDS.map(([key, label]) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`bodyMeasurements.celana.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Ukuran baju</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BAJU_FIELDS.map(([key, label]) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`bodyMeasurements.baju.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="bodyMeasurements.tinggiBadan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tinggi badan (cm, opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan khusus</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {remindersEnabled ? (
                <FormField
                  control={form.control}
                  name="nextFollowUpAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder follow-up</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Menyimpan…" : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

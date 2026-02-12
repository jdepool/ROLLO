import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Tags } from "lucide-react";
import type { ProductCategory } from "@shared/schema";

function AddCategoryDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/categories", { name, color });
    },
    onSuccess: () => {
      toast({ title: "Category created" });
      setOpen(false);
      setName("");
      setColor("#6366f1");
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ccdd53]" data-testid="button-add-category">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" data-testid="input-category-name" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-9 rounded-md border border-border cursor-pointer"
                data-testid="input-category-color"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            data-testid="button-submit-category"
          >
            {mutation.isPending ? "Creating..." : "Create Category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-categories-title">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your products by category</p>
        </div>
        <AddCategoryDialog onSuccess={invalidate} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !categories?.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Tags className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create one to organize your products</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} data-testid={`card-category-${cat.id}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Tags className="w-5 h-5" style={{ color: cat.color || "#6366f1" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cat.color}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

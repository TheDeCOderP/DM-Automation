"use client";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const sidebarItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  icon: z.string().optional(),
  position: z.number().min(0).optional(),
  roleIds: z.array(z.string()).optional(),
});

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  position: number;
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface SidebarGroup {
  id: string;
  title: string;
  position: number;
  items: SidebarItem[];
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface Role {
  id: string;
  name: string;
}

const iconMap = {
  Home: "Home", Settings: "Settings", User: "User", Mail: "Mail", Calendar: "Calendar", FileText: "FileText", BarChart3: "BarChart3", Shield: "Shield", Database: "Database", Bell: "Bell", Search: "Search", Plus: "Plus", Edit: "Edit", Trash: "Trash", Eye: "Eye", Download: "Download", Upload: "Upload", Share: "Share", Copy: "Copy", Save: "Save", Menu: "Menu", X: "X", ChevronLeft: "ChevronLeft", ChevronRight: "ChevronRight", ChevronUp: "ChevronUp", ChevronDown: "ChevronDown", Star: "Star", Heart: "Heart", Bookmark: "Bookmark", Tag: "Tag", Folder: "Folder", Image: "Image", Video: "Video", Music: "Music", Phone: "Phone", MessageCircle: "MessageCircle", Clock: "Clock", MapPin: "MapPin", Globe: "Globe", Wifi: "Wifi", Battery: "Battery", Volume2: "Volume2", Camera: "Camera", Mic: "Mic", Lock: "Lock", Unlock: "Unlock", Key: "Key", CreditCard: "CreditCard", ShoppingCart: "ShoppingCart", Package: "Package", Truck: "Truck", Users: "Users", UserPlus: "UserPlus", Award: "Award", Trophy: "Trophy", Target: "Target", Zap: "Zap", Sun: "Sun", Moon: "Moon", Cloud: "Cloud", Umbrella: "Umbrella", Thermometer: "Thermometer", Activity: "Activity", TrendingUp: "TrendingUp", TrendingDown: "TrendingDown", PieChart: "PieChart", LineChart: "LineChart", BarChart: "BarChart", Navigation: "Navigation", Compass: "Compass", Map: "Map", Layers: "Layers", Filter: "Filter", Sliders: "Sliders", Wrench: "Wrench", Hammer: "Hammer", Paintbrush: "Paintbrush", Palette: "Palette", Code: "Code", Terminal: "Terminal", Server: "Server", HardDrive: "HardDrive", Cpu: "Cpu", Monitor: "Monitor", Smartphone: "Smartphone", Tablet: "Tablet", Laptop: "Laptop", Headphones: "Headphones", Speaker: "Speaker", Gamepad2: "Gamepad2", Joystick: "Joystick", Dice1: "Dice1", Dice2: "Dice2", Dice3: "Dice3", Dice4: "Dice4", Dice5: "Dice5", Dice6: "Dice6", PlayCircle: "PlayCircle", PauseCircle: "PauseCircle", StopCircle: "StopCircle", SkipBack: "SkipBack", SkipForward: "SkipForward", Rewind: "Rewind", FastForward: "FastForward", Volume: "Volume", VolumeX: "VolumeX", Repeat: "Repeat", Shuffle: "Shuffle", Radio: "Radio", Tv: "Tv", Film: "Film", Coffee: "Coffee", Pizza: "Pizza", Apple: "Apple", Car: "Car", Bike: "Bike", Plane: "Plane", Train: "Train", Ship: "Ship", Bus: "Bus", Fuel: "Fuel", LocationPin: "LocationPin", Route: "Route", Flag: "Flag", Anchor: "Anchor", Mountain: "Mountain", TreePine: "TreePine", Flower: "Flower", Leaf: "Leaf", Snowflake: "Snowflake", Rainbow: "Rainbow", Sunset: "Sunset", Sunrise: "Sunrise"
};

interface ItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: SidebarItem | null;
  selectedGroup: SidebarGroup | null;
  roles: Role[];
  isSubmitting: boolean;
  onSubmit: (values: z.infer<typeof sidebarItemSchema>) => void;
  onReset: () => void;
}

export function ItemModal({
  isOpen,
  onOpenChange,
  editingItem,
  selectedGroup,
  roles,
  isSubmitting,
  onSubmit,
  onReset
}: ItemModalProps) {
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<z.infer<typeof sidebarItemSchema>>({
    resolver: zodResolver(sidebarItemSchema),
    defaultValues: { roleIds: [] },
  });

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      onReset();
      reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit" : "Add"} Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="label">Label</Label>
            <Input 
              id="label" 
              {...register("label")} 
              placeholder="Enter item label"
            />
            {errors.label && (
              <p className="text-sm text-red-500">{errors.label.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="href">Href</Label>
            <Input 
              id="href" 
              {...register("href")} 
              placeholder="/example-path"
            />
            {errors.href && (
              <p className="text-sm text-red-500">{errors.href.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="icon">Icon</Label>
            <Select onValueChange={(v) => setValue("icon", v)} value={editingItem?.icon || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an icon" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="none">No icon</SelectItem>
                {Object.keys(iconMap).map(iconName => (
                  <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input 
              id="position" 
              type="number" 
              defaultValue={selectedGroup?.items.length || 0}
              {...register("position", { valueAsNumber: true })} 
            />
            {errors.position && (
              <p className="text-sm text-red-500">{errors.position.message}</p>
            )}
          </div>
          <div>
            <Label>Role Access</Label>
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <Controller
                    name="roleIds"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value?.includes(role.id)}
                        onCheckedChange={(checked) => {
                          const newRoleIds = checked
                            ? [...(field.value || []), role.id]
                            : (field.value || []).filter(
                                (id: string) => id !== role.id
                              );
                          field.onChange(newRoleIds);
                        }}
                      />
                    )}
                  />
                  <Label htmlFor={`item-role-${role.id}`}>{role.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
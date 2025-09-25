"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Search, Bell, Palette, Languages } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Import Label
import { useHeaderFeatures } from "@/hooks/useHeaderFeatures";

// --- Types and Schemas ---
interface SubHeaderItem {
  id?: string;
  label: string;
  href: string;
}

interface HeaderItem {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  isActive: boolean;
  position: number;
  subHeaderItems: SubHeaderItem[];
}

// --- Main Page Component ---
export default function HeaderSettingsPage() {
  // State for header links CRUD
  const [headerItems, setHeaderItems] = useState<HeaderItem[]>([]);
  const [editingItem, setEditingItem] = useState<HeaderItem | null>(null);
  const [linkFormData, setLinkFormData] = useState<Omit<HeaderItem, "id" | "position">>({
    label: "",
    href: "",
    icon: "",
    isActive: true,
    subHeaderItems: [],
  });

  // Use the new header features hook
  const { config, updateHeaderFeatures } = useHeaderFeatures();

  // --- Data Fetching ---
  useEffect(() => {
    // Fetch header links
    fetch("/api/site-settings/header")
      .then((res) => res.json())
      .then((data) => {
        if (data.headers) setHeaderItems(data.headers);
      })
      .catch(() => toast.error("Failed to load header links"));
  }, []);

  // --- Link Management Handlers ---
  const handleLinkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkFormData({ ...linkFormData, [e.target.name]: e.target.value });
  };

  const toggleActive = (value: boolean) => {
    setLinkFormData({ ...linkFormData, isActive: value });
  };

  const addSubHeaderItem = () => {
    setLinkFormData({
      ...linkFormData,
      subHeaderItems: [...linkFormData.subHeaderItems, { label: "", href: "" }],
    });
  };

  const updateSubHeaderItem = (index: number, field: keyof SubHeaderItem, value: string) => {
    const updated = [...linkFormData.subHeaderItems];
    updated[index][field] = value;
    setLinkFormData({ ...linkFormData, subHeaderItems: updated });
  };

  const removeSubHeaderItem = (index: number) => {
    setLinkFormData({
      ...linkFormData,
      subHeaderItems: linkFormData.subHeaderItems.filter((_, i) => i !== index),
    });
  };

  const startEdit = (item: HeaderItem) => {
    setEditingItem(item);
    setLinkFormData({
      label: item.label,
      href: item.href,
      icon: item.icon,
      isActive: item.isActive,
      subHeaderItems: item.subHeaderItems || [],
    });
  };

  const resetLinkForm = () => {
    setEditingItem(null);
    setLinkFormData({ label: "", href: "", icon: "", isActive: true, subHeaderItems: [] });
  };

  const handleLinkSubmit = async () => {
    try {
      const method = editingItem ? "PUT" : "POST";
      const body = {
        ...linkFormData,
        id: editingItem?.id,
        position: editingItem ? editingItem.position : headerItems.length + 1,
      };

      const res = await fetch("/api/site-settings/header", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Request failed");

      const result = await res.json();
      const updatedItem = result.data;

      if (editingItem) {
        setHeaderItems(headerItems.map((h) => (h.id === updatedItem.id ? updatedItem : h)));
        toast.success("Header link updated");
      } else {
        setHeaderItems([...headerItems, updatedItem]);
        toast.success("Header link added");
      }

      resetLinkForm();
    } catch (error) {
      console.log(error);
      toast.error("Failed to save header link");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch("/api/site-settings/header", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setHeaderItems(headerItems.filter((h) => h.id !== id));
      toast.success("Header link deleted");
    } catch {
      toast.error("Failed to delete header link");
    }
  };

  // --- Render ---
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="dark:text-white text-2xl font-semibold">Header Settings</h1>
        <p className="text-gray-600 dark:text-white mt-1">Manage navigation links and header features.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Link Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form for adding/editing links */}
              <div className="p-4 border rounded-md space-y-4 bg-muted/40">
                <h3 className="font-medium text-lg">{editingItem ? "Edit Link" : "Add New Link"}</h3>
                <Input name="label" placeholder="Label" value={linkFormData.label} onChange={handleLinkInputChange} />
                <Input name="href" placeholder="Href (/home, /about)" value={linkFormData.href} onChange={handleLinkInputChange} />
                <Input name="icon" placeholder="Icon name (from lucide-react)" value={linkFormData.icon || ""} onChange={handleLinkInputChange} />
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="isActive" checked={linkFormData.isActive} onCheckedChange={toggleActive} />
                  <label htmlFor="isActive">{linkFormData.isActive ? "Visible" : "Hidden"}</label>
                </div>
                {/* SubHeader Items */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Sub-menu Items</h4>
                  {linkFormData.subHeaderItems.map((item, idx) => (
                    <div key={idx} className="flex space-x-2 mb-2">
                      <Input placeholder="Sub-item Label" value={item.label} onChange={(e) => updateSubHeaderItem(idx, "label", e.target.value)} />
                      <Input placeholder="Sub-item Href" value={item.href} onChange={(e) => updateSubHeaderItem(idx, "href", e.target.value)} />
                      <Button size="icon" variant="destructive" onClick={() => removeSubHeaderItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button onClick={addSubHeaderItem} size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add Sub-item</Button>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {editingItem && <Button variant="outline" onClick={resetLinkForm}>Cancel</Button>}
                  <Button onClick={handleLinkSubmit}>{editingItem ? "Update Link" : "Add Link"}</Button>
                </div>
              </div>

              {/* List of existing links */}
              <div className="space-y-2 pt-4">
                {headerItems.sort((a, b) => a.position - b.position).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm text-gray-500">{item.href}</span>
                      {item.isActive ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="icon" variant="outline" onClick={() => startEdit(item)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="destructive" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Feature Toggles */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Header Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label><Search className="w-4 h-4 inline-block mr-2"/>Search Bar</Label>
                  </div>
                  <div>
                    <Switch 
                      checked={config?.headerSearchEnabled ?? false}
                      onCheckedChange={(checked) => updateHeaderFeatures({ headerSearchEnabled: checked })} 
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label><Bell className="w-4 h-4 inline-block mr-2"/>Notifications</Label>
                  </div>
                  <div>
                    <Switch 
                      checked={config?.headerNotificationsEnabled ?? false}
                      onCheckedChange={(checked) => updateHeaderFeatures({ headerNotificationsEnabled: checked })} 
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label><Palette className="w-4 h-4 inline-block mr-2"/>Theme Toggle</Label>
                  </div>
                  <div>
                    <Switch 
                      checked={config?.headerThemeToggleEnabled ?? false}
                      onCheckedChange={(checked) => updateHeaderFeatures({ headerThemeToggleEnabled: checked })} 
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label><Languages className="w-4 h-4 inline-block mr-2"/>Language Selector</Label>
                  </div>
                  <div>
                    <Switch 
                      checked={config?.headerLanguageEnabled ?? false}
                      onCheckedChange={(checked) => updateHeaderFeatures({ headerLanguageEnabled: checked })} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
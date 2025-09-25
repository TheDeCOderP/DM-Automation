"use client";

import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "./data-table-view-options";
import { Plus, Trash, Upload, Download } from "lucide-react";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  roles?: { label: string; value: string }[];
  categoryOptions?: { label: string; value: string }[];
  departmentOptions?: { label: string; value: string }[];
  searchColumn: string;
  onNewClick?: () => void;
  onDeleteClick?: () => void;
  onExportClick?: () => void;
  onImportClick?: () => void;
}

export function DataTableToolbar<TData>({ 
  table, 
  roles, 
  categoryOptions, 
  departmentOptions, 
  searchColumn, 
  onNewClick, 
  onDeleteClick, 
  onExportClick, 
  onImportClick 
}: DataTableToolbarProps<TData>) {

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={`Filter by ${searchColumn}...`}
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchColumn)?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {roles && table.getColumn("role") && (
          <DataTableFacetedFilter
            column={table.getColumn("role")}
            title="Role"
            options={roles}
          />
        )}
        {categoryOptions && table.getColumn("category") && (
          <DataTableFacetedFilter
            column={table.getColumn("category")}
            title="Category"
            options={categoryOptions}
          />
        )}
        {departmentOptions && table.getColumn("department") && (
          <DataTableFacetedFilter
            column={table.getColumn("department")}
            title="Department"
            options={departmentOptions}
          />
        )}
      </div>
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          {onExportClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto hidden h-8 lg:flex"
                    onClick={onExportClick}
                    >
                    <Download className="h-4 w-4" />
                    </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onImportClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto hidden h-8 lg:flex"
                    onClick={onImportClick}
                    >
                    <Upload className="h-4 w-4" />
                    </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import</p>
              </TooltipContent>
            </Tooltip>
          )}
          {table.getFilteredSelectedRowModel().rows.length > 0 && onDeleteClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto hidden h-8 lg:flex"
                  onClick={onDeleteClick}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete selected</p>
              </TooltipContent>
            </Tooltip>
          )}
          <DataTableViewOptions table={table} />
          {onNewClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" className="h-8" onClick={onNewClick}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add new</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

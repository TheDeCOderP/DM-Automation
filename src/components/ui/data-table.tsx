"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableMeta<TData> {
  onEdit?: (data: TData) => void;
  onDelete?: (id: string) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  roles?: { label: string; value: string }[];
  categoryOptions?: { label: string; value: string }[];
  departmentOptions?: { label: string; value: string }[];
  searchColumn: string;
  onNewClick?: () => void;
  onDeleteClick?: () => void;
  onExportClick?: () => void;
  onImportClick?: () => void;
  meta?: DataTableMeta<TData>;
  clientSidePagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  roles,
  categoryOptions,
  departmentOptions,
  searchColumn,
  onNewClick,
  onDeleteClick,
  onExportClick,
  onImportClick,
  meta,
  clientSidePagination,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }

      return newSearchParams.toString();
    },
    [searchParams]
  );

  // Table state
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  // Sorting state
  const sort = searchParams.get("sort");
  const [sorting, setSorting] = React.useState<SortingState>(
    sort
      ? [
          {
            id: sort.split(".")[0],
            desc: sort.split(".")[1] === "desc",
          },
        ]
      : []
  );

  React.useEffect(() => {
    if (!clientSidePagination) {
      router.push(
        `?${createQueryString({
          sort: sorting[0] ? `${sorting[0].id}.${sorting[0].desc ? "desc" : "asc"}` : null,
        })}`
      );
    }
  }, [sorting, router, createQueryString, clientSidePagination]);

  React.useEffect(() => {
    if (!clientSidePagination) {
      const filters: Record<string, string | null> = {};
      columnFilters.forEach(filter => {
        filters[filter.id] = filter.value as string;
      });
      router.push(`?${createQueryString(filters)}`);
    }
  }, [columnFilters, router, createQueryString, clientSidePagination]);

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !clientSidePagination,
    manualSorting: !clientSidePagination,
    manualFiltering: !clientSidePagination,
    meta: meta,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        roles={roles}
        categoryOptions={categoryOptions}
        departmentOptions={departmentOptions}
        searchColumn={searchColumn}
        onNewClick={onNewClick}
        onDeleteClick={onDeleteClick}
        onExportClick={onExportClick}
        onImportClick={onImportClick}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

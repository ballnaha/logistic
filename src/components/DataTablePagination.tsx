'use client';
import React from 'react';
import { TablePagination } from '@mui/material';

interface DataTablePaginationProps {
  component?: React.ElementType;
  count: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rowsPerPageOptions?: number[];
  labelRowsPerPage?: string;
  labelDisplayedRows?: (paginationInfo: {
    from: number;
    to: number;
    count: number;
  }) => string;
}

export default function DataTablePagination({
  component = 'div',
  count,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [20, 50, 100, 200],
  labelRowsPerPage = 'แสดงต่อหน้า:',
  labelDisplayedRows = ({ from, to, count }) => 
    `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`,
  ...otherProps
}: DataTablePaginationProps) {
  
  // Create the options array with "ทั้งหมด" option using label-value structure
  const processedOptions = [
    ...rowsPerPageOptions.map(option => ({ label: option.toString(), value: option })),
    ...(count > 0 ? [{ label: 'ทั้งหมด', value: count }] : [])
  ];

  return (
    <TablePagination
      component={component}
      count={count}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={processedOptions}
      labelRowsPerPage={labelRowsPerPage}
      labelDisplayedRows={labelDisplayedRows}
      SelectProps={{
        renderValue: (value: unknown) => {
          const numValue = Number(value);
          // Show "ทั้งหมด" when the selected value equals the total count
          if (numValue === count && count > 0) {
            return 'ทั้งหมด';
          }
          return String(value);
        }
      }}
      {...otherProps}
    />
  );
}

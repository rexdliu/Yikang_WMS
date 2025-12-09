{/*独立组件，清晰地只负责收集筛选条件（产品名 + 日期范围）
通过 onFilterChange 往外抛。更利于复用到其他列表页。*/}
// 筛选器组件：只负责“收集筛选条件并回传”，不做数据过滤逻辑
// - 支持产品名关键词
// - 支持日期范围（react-day-picker 的 DateRange）
// - 通过 onFilterChange 把条件回传给父组件（页面）

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface SalesHistoryFilterProps {
  // 回传筛选条件的回调（父组件接收后，自行决定如何过滤/请求后端）
  onFilterChange: (filters: { dateRange?: DateRange; productName?: string }) => void;
}

export const SalesHistoryFilter: React.FC<SalesHistoryFilterProps> = ({ onFilterChange }) => {
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [productName, setProductName] = React.useState('');

  // 点击“应用筛选”时，把条件回传给父组件
  const handleApplyFilters = () => {
    onFilterChange({ dateRange: date, productName });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center p-4 border-b">
      {/* 产品名关键词输入 */}
      <Input
        placeholder="输入产品名称搜索..."
        className="max-w-xs"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
      />

      {/* 日期范围选择（Popover + Calendar） */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[280px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {/* 已选择范围则展示格式化文本，否则显示占位 */}
            {date?.from ? (
              date.to ? (
                `${format(date.from, 'LLL dd, y')} - ${format(date.to, 'LLL dd, y')}`
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>选择日期范围</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"     // 启用“范围选择”
            selected={date}  // 受控选中值
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* 触发回传的按钮（父组件接收并执行实际过滤/发请求） */}
      <Button onClick={handleApplyFilters}>应用筛选</Button>
    </div>
  );
};
